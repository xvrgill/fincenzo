import { and, between, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { accounts, transactions } from "@/lib/db/schema";
import { accountScopeFilter, type Scope } from "@/lib/scope";

const TRANSFER_CATEGORIES = new Set(["TRANSFER_IN", "TRANSFER_OUT", "LOAN_PAYMENTS"]);

export type MonthlyTotals = {
  incomeCents: number;
  expensesCents: number;
  savedCents: number;
};

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function monthBounds(year: number, monthZeroIndexed: number): { start: string; end: string } {
  const start = new Date(Date.UTC(year, monthZeroIndexed, 1));
  const end = new Date(Date.UTC(year, monthZeroIndexed + 1, 0));
  return { start: isoDate(start), end: isoDate(end) };
}

export async function getMonthlyTotals(
  scope: Scope,
  year: number,
  monthZeroIndexed: number,
): Promise<MonthlyTotals> {
  const { start, end } = monthBounds(year, monthZeroIndexed);

  const rows = await db
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
        between(transactions.date, start, end),
      ),
    );

  let income = 0;
  let expenses = 0;
  for (const r of rows) {
    if (r.category && TRANSFER_CATEGORIES.has(r.category)) continue;
    if (r.amountCents < 0) income += -r.amountCents;
    else expenses += r.amountCents;
  }
  return { incomeCents: income, expensesCents: expenses, savedCents: income - expenses };
}

export async function getCurrentAndPriorMonthTotals(scope: Scope) {
  const now = new Date();
  const current = await getMonthlyTotals(scope, now.getUTCFullYear(), now.getUTCMonth());
  const prior = await getMonthlyTotals(
    scope,
    now.getUTCMonth() === 0 ? now.getUTCFullYear() - 1 : now.getUTCFullYear(),
    now.getUTCMonth() === 0 ? 11 : now.getUTCMonth() - 1,
  );
  return { current, prior };
}

export type DailyActivityPoint = {
  date: string;
  incomeCents: number;
  expensesCents: number;
};

export async function getDailyActivity(
  scope: Scope,
  startIso: string,
  endIso: string,
): Promise<DailyActivityPoint[]> {
  const rows = await db
    .select({
      date: transactions.date,
      amountCents: transactions.amountCents,
      category: transactions.plaidCategory,
    })
    .from(transactions)
    .innerJoin(accounts, eq(accounts.id, transactions.accountId))
    .where(
      and(
        accountScopeFilter(scope),
        eq(transactions.pending, false),
        between(transactions.date, startIso, endIso),
      ),
    );

  const byDate = new Map<string, { income: number; expenses: number }>();
  const start = new Date(`${startIso}T00:00:00Z`);
  const end = new Date(`${endIso}T00:00:00Z`);
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    byDate.set(isoDate(d), { income: 0, expenses: 0 });
  }
  for (const r of rows) {
    if (r.category && TRANSFER_CATEGORIES.has(r.category)) continue;
    const bucket = byDate.get(r.date);
    if (!bucket) continue;
    if (r.amountCents < 0) bucket.income += -r.amountCents;
    else bucket.expenses += r.amountCents;
  }

  return Array.from(byDate.entries()).map(([date, v]) => ({
    date,
    incomeCents: v.income,
    expensesCents: v.expenses,
  }));
}

export type CategoryBreakdownRow = {
  category: string;
  amountCents: number;
};

export async function getCategoryBreakdown(
  scope: Scope,
  year: number,
  monthZeroIndexed: number,
): Promise<CategoryBreakdownRow[]> {
  const { start, end } = monthBounds(year, monthZeroIndexed);

  const rows = await db
    .select({
      category: sql<string>`coalesce(${transactions.userCategory}, ${transactions.plaidCategory}, 'Uncategorized')`,
      amountCents: sql<number>`sum(${transactions.amountCents})::bigint`,
    })
    .from(transactions)
    .innerJoin(accounts, eq(accounts.id, transactions.accountId))
    .where(
      and(
        accountScopeFilter(scope),
        eq(transactions.pending, false),
        between(transactions.date, start, end),
        sql`${transactions.amountCents} > 0`,
      ),
    )
    .groupBy(sql`1`)
    .orderBy(sql`2 desc`);

  return rows
    .map((r) => ({ category: r.category, amountCents: Number(r.amountCents) }))
    .filter((r) => !TRANSFER_CATEGORIES.has(r.category));
}

export async function getRecentTransactions(scope: Scope, limit = 8) {
  return db
    .select({
      id: transactions.id,
      date: transactions.date,
      name: transactions.name,
      merchantName: transactions.merchantName,
      amountCents: transactions.amountCents,
      isoCurrencyCode: transactions.isoCurrencyCode,
      category: transactions.plaidCategory,
      accountName: accounts.name,
    })
    .from(transactions)
    .innerJoin(accounts, eq(accounts.id, transactions.accountId))
    .where(and(accountScopeFilter(scope), eq(transactions.pending, false)))
    .orderBy(desc(transactions.date), desc(transactions.createdAt))
    .limit(limit);
}

export function pctChange(current: number, prior: number): number | null {
  if (prior === 0) return null;
  return ((current - prior) / prior) * 100;
}
