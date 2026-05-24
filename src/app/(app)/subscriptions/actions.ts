"use server";

import { and, eq, gte, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { accounts, recurringTransactions, transactions } from "@/lib/db/schema";
import { accountScopeFilter, getActiveScope, scopeRowKey } from "@/lib/scope";
import { detectRecurring, type DetectorTx } from "@/lib/recurring";

// We scan the last ~13 months so yearly subscriptions get at least two hits.
const LOOKBACK_DAYS = 400;

async function requireUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");
  return user.id;
}

export async function detectSubscriptions() {
  const userId = await requireUserId();
  const scope = await getActiveScope(userId);
  const key = scopeRowKey(scope);

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - LOOKBACK_DAYS);
  const sinceIso = since.toISOString().slice(0, 10);

  const rows = await db
    .select({
      date: transactions.date,
      amountCents: transactions.amountCents,
      merchantName: transactions.merchantName,
      name: transactions.name,
      category: sql<string | null>`coalesce(${transactions.userCategory}, ${transactions.plaidCategory})`,
    })
    .from(transactions)
    .innerJoin(accounts, eq(accounts.id, transactions.accountId))
    .where(and(accountScopeFilter(scope), gte(transactions.date, sinceIso)));

  const txs: DetectorTx[] = rows.map((r) => ({
    date: r.date,
    amountCents: Number(r.amountCents),
    merchantName: r.merchantName,
    name: r.name,
    category: r.category,
  }));

  const candidates = detectRecurring(txs);

  // Upsert: refresh metadata on every run, but preserve a row's status (so
  // confirmed/dismissed decisions stick across re-detections).
  for (const c of candidates) {
    await db
      .insert(recurringTransactions)
      .values({
        scopeType: key.scopeType,
        scopeId: key.scopeId,
        merchantKey: c.merchantKey,
        merchantName: c.merchantName,
        category: c.category,
        averageAmountCents: c.averageAmountCents,
        cadence: c.cadence,
        firstSeenDate: c.firstSeenDate,
        lastSeenDate: c.lastSeenDate,
        nextExpectedDate: c.nextExpectedDate,
        sampleCount: c.sampleCount,
      })
      .onConflictDoUpdate({
        target: [
          recurringTransactions.scopeType,
          recurringTransactions.scopeId,
          recurringTransactions.merchantKey,
          recurringTransactions.cadence,
        ],
        set: {
          merchantName: c.merchantName,
          category: c.category,
          averageAmountCents: c.averageAmountCents,
          firstSeenDate: c.firstSeenDate,
          lastSeenDate: c.lastSeenDate,
          nextExpectedDate: c.nextExpectedDate,
          sampleCount: c.sampleCount,
          updatedAt: new Date(),
        },
      });
  }

  revalidatePath("/subscriptions");
}

async function setStatus(id: string, status: "suggested" | "confirmed" | "dismissed") {
  const userId = await requireUserId();
  const scope = await getActiveScope(userId);
  const key = scopeRowKey(scope);

  await db
    .update(recurringTransactions)
    .set({ status, updatedAt: new Date() })
    .where(
      and(
        eq(recurringTransactions.id, id),
        eq(recurringTransactions.scopeType, key.scopeType),
        eq(recurringTransactions.scopeId, key.scopeId),
      ),
    );

  revalidatePath("/subscriptions");
}

export async function confirmSubscription(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("id required");
  await setStatus(id, "confirmed");
}

export async function dismissSubscription(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("id required");
  await setStatus(id, "dismissed");
}

export async function restoreSubscription(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("id required");
  await setStatus(id, "suggested");
}
