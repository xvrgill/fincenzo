import { and, between, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { accounts, budgets, transactions } from "@/lib/db/schema";
import { accountScopeFilter, type Scope, scopeRowKey } from "@/lib/scope";

const TRANSFER_CATEGORIES = new Set(["TRANSFER_IN", "TRANSFER_OUT", "LOAN_PAYMENTS"]);

export type BudgetWithSpend = {
  id: string;
  category: string;
  limitCents: number;
  spentCents: number;
  month: string;
};

function monthBounds(year: number, monthZeroIndexed: number) {
  const start = new Date(Date.UTC(year, monthZeroIndexed, 1));
  const end = new Date(Date.UTC(year, monthZeroIndexed + 1, 0));
  return { startIso: start.toISOString().slice(0, 10), endIso: end.toISOString().slice(0, 10) };
}

export async function getBudgetsWithSpend(
  scope: Scope,
  year: number,
  monthZeroIndexed: number,
): Promise<BudgetWithSpend[]> {
  const { startIso, endIso } = monthBounds(year, monthZeroIndexed);
  const key = scopeRowKey(scope);

  const rows = await db
    .select()
    .from(budgets)
    .where(
      and(
        eq(budgets.scopeType, key.scopeType),
        eq(budgets.scopeId, key.scopeId),
        eq(budgets.month, startIso),
      ),
    )
    .orderBy(budgets.category);

  if (rows.length === 0) return [];

  const spendRows = await db
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
        between(transactions.date, startIso, endIso),
        sql`${transactions.amountCents} > 0`,
      ),
    )
    .groupBy(sql`1`);

  const spendByCategory = new Map<string, number>();
  for (const r of spendRows) {
    if (TRANSFER_CATEGORIES.has(r.category)) continue;
    spendByCategory.set(r.category, Number(r.amountCents));
  }

  return rows.map((b) => ({
    id: b.id,
    category: b.category,
    limitCents: Number(b.limitCents),
    spentCents: spendByCategory.get(b.category) ?? 0,
    month: b.month,
  }));
}

/**
 * Personal budgets owned by `userId` for a given month, spend computed only
 * over that user's private accounts (since the budget itself is personal).
 * Used to surface "your" personal budgets alongside shared ones in household
 * scope. Partner's personal budgets are not exposed.
 */
export async function getPersonalBudgetsWithSpend(
  userId: string,
  year: number,
  monthZeroIndexed: number,
): Promise<BudgetWithSpend[]> {
  return getBudgetsWithSpend({ kind: "user", userId }, year, monthZeroIndexed);
}

export async function getScopeExpenseCategories(scope: Scope): Promise<string[]> {
  const rows = await db
    .selectDistinct({
      category: sql<string>`coalesce(${transactions.userCategory}, ${transactions.plaidCategory}, 'Uncategorized')`,
    })
    .from(transactions)
    .innerJoin(accounts, eq(accounts.id, transactions.accountId))
    .where(and(accountScopeFilter(scope), sql`${transactions.amountCents} > 0`));

  return rows
    .map((r) => r.category)
    .filter((c) => !TRANSFER_CATEGORIES.has(c))
    .sort();
}
