import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { accounts, recurringTransactions, transactions } from "@/lib/db/schema";
import { accountScopeFilter, type Scope, scopeRowKey } from "@/lib/scope";
import type { RecurringCadence } from "@/lib/recurring";

const TRANSFER_CATEGORIES = ["TRANSFER_IN", "TRANSFER_OUT", "LOAN_PAYMENTS"];
const HISTORY_DAYS = 90;

export type ForecastInputs = {
  startingCashCents: number;
  avgDailyIncomeCents: number;
  avgDailyExpenseCents: number;
  recurring: {
    merchantName: string;
    cadence: RecurringCadence;
    averageAmountCents: number;
    lastSeenDate: string;
  }[];
};

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function getForecastInputs(scope: Scope): Promise<ForecastInputs> {
  // Cash = depository accounts only (checking + savings). Credit/loan/investment
  // don't count toward day-to-day runway.
  const cashRows = await db
    .select({
      cents: sql<number | null>`sum(${accounts.currentBalanceCents})::bigint`,
    })
    .from(accounts)
    .where(
      and(
        accountScopeFilter(scope),
        eq(accounts.type, "depository"),
        sql`${accounts.archivedAt} is null`,
      ),
    );
  const startingCashCents = Number(cashRows[0]?.cents ?? 0);

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - HISTORY_DAYS);

  const historyRows = await db
    .select({
      amountCents: transactions.amountCents,
      category: transactions.plaidCategory,
    })
    .from(transactions)
    .innerJoin(accounts, eq(accounts.id, transactions.accountId))
    .where(
      and(
        accountScopeFilter(scope),
        eq(transactions.pending, false),
        gte(transactions.date, isoDate(since)),
      ),
    );

  let income = 0;
  let expense = 0;
  for (const r of historyRows) {
    if (r.category && TRANSFER_CATEGORIES.includes(r.category)) continue;
    const amount = Number(r.amountCents);
    if (amount < 0) income += -amount;
    else expense += amount;
  }

  const key = scopeRowKey(scope);
  const recurring = await db
    .select({
      merchantName: recurringTransactions.merchantName,
      cadence: recurringTransactions.cadence,
      averageAmountCents: recurringTransactions.averageAmountCents,
      lastSeenDate: recurringTransactions.lastSeenDate,
    })
    .from(recurringTransactions)
    .where(
      and(
        eq(recurringTransactions.scopeType, key.scopeType),
        eq(recurringTransactions.scopeId, key.scopeId),
        eq(recurringTransactions.status, "confirmed"),
      ),
    );

  return {
    startingCashCents,
    avgDailyIncomeCents: Math.round(income / HISTORY_DAYS),
    avgDailyExpenseCents: Math.round(expense / HISTORY_DAYS),
    recurring: recurring.map((r) => ({
      merchantName: r.merchantName,
      cadence: r.cadence,
      averageAmountCents: Number(r.averageAmountCents),
      lastSeenDate: r.lastSeenDate,
    })),
  };
}
