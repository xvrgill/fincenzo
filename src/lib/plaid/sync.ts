import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { accounts, plaidItems, transactions } from "@/lib/db/schema";
import { loadUserRules, matchRule } from "@/lib/rules";
import * as Sentry from "@sentry/nextjs";
import { decryptToken } from "@/lib/crypto";
import { plaid } from "./client";
import { callPlaid, PlaidApiError } from "./errors";

type PlaidAccountType = "depository" | "credit" | "loan" | "investment" | "brokerage" | "other";

const accountTypeMap: Record<PlaidAccountType, typeof accounts.$inferInsert.type> = {
  depository: "depository",
  credit: "credit",
  loan: "loan",
  investment: "investment",
  brokerage: "investment",
  other: "other",
};

function toCents(amount: number | null | undefined): number | null {
  if (amount === null || amount === undefined) return null;
  return Math.round(amount * 100);
}

// Pull account list from Plaid and upsert into our accounts table.
export async function syncAccounts(itemId: string) {
  const item = await db.query.plaidItems.findFirst({ where: eq(plaidItems.id, itemId) });
  if (!item) throw new Error(`plaid_item ${itemId} not found`);

  const { data } = await callPlaid("accounts/get", () =>
    plaid.accountsGet({ access_token: decryptToken(item.accessToken) }),
  );

  for (const acct of data.accounts) {
    const mappedType = accountTypeMap[acct.type as PlaidAccountType] ?? "other";
    await db
      .insert(accounts)
      .values({
        userId: item.userId,
        plaidItemId: item.id,
        plaidAccountId: acct.account_id,
        name: acct.name,
        officialName: acct.official_name,
        mask: acct.mask,
        type: mappedType,
        subtype: acct.subtype,
        currentBalanceCents: toCents(acct.balances.current),
        availableBalanceCents: toCents(acct.balances.available),
        isoCurrencyCode: acct.balances.iso_currency_code ?? "USD",
      })
      .onConflictDoUpdate({
        target: accounts.plaidAccountId,
        set: {
          name: acct.name,
          officialName: acct.official_name,
          mask: acct.mask,
          type: mappedType,
          subtype: acct.subtype,
          currentBalanceCents: toCents(acct.balances.current),
          availableBalanceCents: toCents(acct.balances.available),
          isoCurrencyCode: acct.balances.iso_currency_code ?? "USD",
        },
      });
  }
}

// Pull transactions via /transactions/sync, looping until has_more is false.
// Persists added/modified as upserts; deletes removed.
export async function syncTransactions(itemId: string) {
  const item = await db.query.plaidItems.findFirst({ where: eq(plaidItems.id, itemId) });
  if (!item) throw new Error(`plaid_item ${itemId} not found`);

  // Map plaid_account_id -> our internal accounts.id for this item.
  const itemAccounts = await db.query.accounts.findFirst({
    where: eq(accounts.plaidItemId, item.id),
  });
  if (!itemAccounts) {
    // No accounts yet — caller should syncAccounts first.
    return { added: 0, modified: 0, removed: 0 };
  }
  const allAccounts = await db
    .select({ id: accounts.id, plaidAccountId: accounts.plaidAccountId })
    .from(accounts)
    .where(eq(accounts.plaidItemId, item.id));
  const acctByPlaidId = new Map(allAccounts.map((a) => [a.plaidAccountId!, a.id]));

  const rules = await loadUserRules(item.userId);
  const ruleCategoryFor = (merchantName: string | null | undefined, name: string) =>
    matchRule(rules, merchantName, name);

  const accessToken = decryptToken(item.accessToken);
  let cursor = item.syncCursor ?? undefined;
  let hasMore = true;
  let totalAdded = 0;
  let totalModified = 0;
  let totalRemoved = 0;

  while (hasMore) {
    const { data } = await callPlaid("transactions/sync", () =>
      plaid.transactionsSync({
        access_token: accessToken,
        cursor,
      }),
    );

    for (const t of data.added) {
      const accountId = acctByPlaidId.get(t.account_id);
      if (!accountId) continue;
      const userCategory = ruleCategoryFor(t.merchant_name, t.name);
      await db
        .insert(transactions)
        .values({
          accountId,
          plaidTransactionId: t.transaction_id,
          amountCents: Math.round(t.amount * 100),
          isoCurrencyCode: t.iso_currency_code ?? "USD",
          date: t.date,
          name: t.name,
          merchantName: t.merchant_name,
          plaidCategory: t.personal_finance_category?.primary ?? t.category?.[0] ?? null,
          userCategory,
          pending: t.pending,
        })
        .onConflictDoNothing({ target: transactions.plaidTransactionId });
      totalAdded += 1;
    }

    for (const t of data.modified) {
      // Re-evaluate rule on modify in case merchant name changed — but only
      // overwrite userCategory when there's a rule match; don't blow away a
      // manual override set on this transaction alone.
      const userCategory = ruleCategoryFor(t.merchant_name, t.name);
      await db
        .update(transactions)
        .set({
          amountCents: Math.round(t.amount * 100),
          date: t.date,
          name: t.name,
          merchantName: t.merchant_name,
          plaidCategory: t.personal_finance_category?.primary ?? t.category?.[0] ?? null,
          pending: t.pending,
          ...(userCategory ? { userCategory } : {}),
        })
        .where(eq(transactions.plaidTransactionId, t.transaction_id));
      totalModified += 1;
    }

    for (const r of data.removed) {
      if (!r.transaction_id) continue;
      await db.delete(transactions).where(eq(transactions.plaidTransactionId, r.transaction_id));
      totalRemoved += 1;
    }

    cursor = data.next_cursor;
    hasMore = data.has_more;
  }

  await db
    .update(plaidItems)
    .set({ syncCursor: cursor, lastSyncedAt: new Date(), status: "healthy" })
    .where(eq(plaidItems.id, item.id));

  return { added: totalAdded, modified: totalModified, removed: totalRemoved };
}

export async function syncItem(itemId: string) {
  await syncAccounts(itemId);
  return await syncTransactions(itemId);
}

export type SyncItemResult =
  | { itemId: string; ok: true; added: number; modified: number; removed: number }
  | { itemId: string; ok: false; errorCode: string; errorType?: string; errorMessage?: string; requestId?: string };

export async function syncAllItems(userId: string): Promise<SyncItemResult[]> {
  const items = await db.select({ id: plaidItems.id }).from(plaidItems).where(eq(plaidItems.userId, userId));
  const results: SyncItemResult[] = [];
  for (const it of items) {
    try {
      const r = await syncItem(it.id);
      results.push({ itemId: it.id, ok: true, ...r });
    } catch (err) {
      if (err instanceof PlaidApiError) {
        if (err.body.error_code === "ITEM_LOGIN_REQUIRED") {
          await db
            .update(plaidItems)
            .set({ status: "login_required" })
            .where(eq(plaidItems.id, it.id));
        }
        Sentry.captureException(err, {
          tags: {
            area: "plaid-sync",
            endpoint: err.endpoint,
            plaid_error_code: err.body.error_code ?? "UNKNOWN",
            plaid_error_type: err.body.error_type ?? "UNKNOWN",
          },
          extra: { itemId: it.id, status: err.status, body: err.body },
        });
        results.push({
          itemId: it.id,
          ok: false,
          errorCode: err.body.error_code ?? "UNKNOWN",
          errorType: err.body.error_type,
          errorMessage: err.body.error_message,
          requestId: err.body.request_id,
        });
      } else {
        Sentry.captureException(err, {
          tags: { area: "plaid-sync" },
          extra: { itemId: it.id },
        });
        results.push({ itemId: it.id, ok: false, errorCode: "UNEXPECTED" });
      }
    }
  }
  return results;
}
