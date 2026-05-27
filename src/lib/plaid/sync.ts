import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { accounts, holdings, plaidItems, securities, transactions } from "@/lib/db/schema";
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

// Pull the optional detail fields off a Plaid transaction. Returned as a
// partial so callers can spread it into insert/update payloads.
type PlaidTxn = {
  payment_channel?: string | null;
  logo_url?: string | null;
  website?: string | null;
  original_description?: string | null;
  location?: {
    address?: string | null;
    city?: string | null;
    region?: string | null;
    postal_code?: string | null;
    country?: string | null;
    lat?: number | null;
    lon?: number | null;
    store_number?: string | null;
  } | null;
};

function extractDetailFields(t: PlaidTxn): Partial<typeof transactions.$inferInsert> {
  const loc = t.location ?? {};
  return {
    paymentChannel: t.payment_channel ?? null,
    merchantLogoUrl: t.logo_url ?? null,
    merchantWebsite: t.website ?? null,
    originalDescription: t.original_description ?? null,
    locationAddress: loc.address ?? null,
    locationCity: loc.city ?? null,
    locationRegion: loc.region ?? null,
    locationPostalCode: loc.postal_code ?? null,
    locationCountry: loc.country ?? null,
    locationLat: loc.lat ?? null,
    locationLon: loc.lon ?? null,
    locationStoreNumber: loc.store_number ?? null,
  };
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
      const detail = extractDetailFields(t);
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
          ...detail,
        })
        .onConflictDoNothing({ target: transactions.plaidTransactionId });
      totalAdded += 1;
    }

    for (const t of data.modified) {
      // Re-evaluate rule on modify in case merchant name changed — but only
      // overwrite userCategory when there's a rule match; don't blow away a
      // manual override set on this transaction alone.
      const userCategory = ruleCategoryFor(t.merchant_name, t.name);
      const detail = extractDetailFields(t);
      await db
        .update(transactions)
        .set({
          amountCents: Math.round(t.amount * 100),
          date: t.date,
          name: t.name,
          merchantName: t.merchant_name,
          plaidCategory: t.personal_finance_category?.primary ?? t.category?.[0] ?? null,
          pending: t.pending,
          ...detail,
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

// Pull investment holdings for an item and replace the per-account snapshot.
// Plaid models holdings as a snapshot, not events: each call returns the full
// current set of positions, so we delete + insert per account inside a tx.
// Returns null if the item doesn't expose investments (no investment accounts
// or product not yet ready), so callers can treat it as a no-op.
export async function syncHoldings(itemId: string): Promise<{
  holdings: number;
  securities: number;
} | null> {
  const item = await db.query.plaidItems.findFirst({ where: eq(plaidItems.id, itemId) });
  if (!item) throw new Error(`plaid_item ${itemId} not found`);

  let data;
  try {
    const res = await callPlaid("investments/holdings/get", () =>
      plaid.investmentsHoldingsGet({ access_token: decryptToken(item.accessToken) }),
    );
    data = res.data;
  } catch (err) {
    // Items without investments (most banks) return these — treat as no-op.
    if (err instanceof PlaidApiError) {
      const code = err.body.error_code;
      if (
        code === "PRODUCT_NOT_READY" ||
        code === "PRODUCTS_NOT_SUPPORTED" ||
        code === "NO_INVESTMENT_ACCOUNTS" ||
        code === "NO_ACCOUNTS"
      ) {
        return null;
      }
    }
    throw err;
  }

  // Map Plaid account_id -> our internal id, filtered to investment accounts
  // for this item only.
  const itemAccounts = await db
    .select({ id: accounts.id, plaidAccountId: accounts.plaidAccountId, type: accounts.type })
    .from(accounts)
    .where(eq(accounts.plaidItemId, item.id));
  const acctByPlaidId = new Map(itemAccounts.map((a) => [a.plaidAccountId!, a.id]));
  const investmentAccountIds = new Set(
    itemAccounts.filter((a) => a.type === "investment").map((a) => a.id),
  );
  if (investmentAccountIds.size === 0) return null;

  // Upsert all securities returned. One row per security globally; multiple
  // users holding the same ticker share a row.
  const securityIdByPlaidId = new Map<string, string>();
  for (const s of data.securities) {
    const [row] = await db
      .insert(securities)
      .values({
        plaidSecurityId: s.security_id,
        tickerSymbol: s.ticker_symbol,
        name: s.name,
        type: s.type,
        closePriceCents: s.close_price != null ? Math.round(s.close_price * 100) : null,
        closePriceAsOf: s.close_price_as_of,
        isoCurrencyCode: s.iso_currency_code ?? "USD",
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: securities.plaidSecurityId,
        set: {
          tickerSymbol: s.ticker_symbol,
          name: s.name,
          type: s.type,
          closePriceCents: s.close_price != null ? Math.round(s.close_price * 100) : null,
          closePriceAsOf: s.close_price_as_of,
          isoCurrencyCode: s.iso_currency_code ?? "USD",
          updatedAt: new Date(),
        },
      })
      .returning({ id: securities.id });
    securityIdByPlaidId.set(s.security_id, row.id);
  }

  // Group incoming holdings by our account id (skip any whose account isn't
  // an investment account we know about — Plaid sometimes includes the cash
  // sweep depository alongside).
  const byAccount = new Map<string, typeof data.holdings>();
  for (const h of data.holdings) {
    const accountId = acctByPlaidId.get(h.account_id);
    if (!accountId || !investmentAccountIds.has(accountId)) continue;
    const list = byAccount.get(accountId) ?? [];
    list.push(h);
    byAccount.set(accountId, list);
  }

  let inserted = 0;
  await db.transaction(async (tx) => {
    // Wipe existing rows for every investment account on this item, even ones
    // with no incoming holdings (an account may have been fully liquidated).
    await tx.delete(holdings).where(inArray(holdings.accountId, Array.from(investmentAccountIds)));

    for (const [accountId, rows] of byAccount) {
      if (rows.length === 0) continue;
      await tx.insert(holdings).values(
        rows.map((h) => ({
          accountId,
          securityId: securityIdByPlaidId.get(h.security_id)!,
          quantity: h.quantity,
          institutionValueCents: Math.round(h.institution_value * 100),
          costBasisCents: h.cost_basis != null ? Math.round(h.cost_basis * 100) : null,
          isoCurrencyCode: h.iso_currency_code ?? "USD",
          asOf: new Date(),
        })),
      );
      inserted += rows.length;
    }
  });

  return { holdings: inserted, securities: data.securities.length };
}

export async function syncItem(itemId: string) {
  await syncAccounts(itemId);
  const txResult = await syncTransactions(itemId);
  // Holdings sync is best-effort — never block transaction sync on it.
  try {
    await syncHoldings(itemId);
  } catch (err) {
    Sentry.captureException(err, { tags: { area: "plaid-sync-holdings" }, extra: { itemId } });
  }
  return txResult;
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
