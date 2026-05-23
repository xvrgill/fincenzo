import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { accounts, categoryRules, transactions } from "@/lib/db/schema";

/**
 * Every category string the user has interacted with — Plaid-supplied,
 * manually overridden, or referenced by a rule. Used to seed the picker so
 * the user doesn't have to remember exact spellings of categories they've
 * already used.
 */
export async function getAllUserCategories(userId: string): Promise<string[]> {
  const txnCategoriesP = db
    .selectDistinct({
      category: sql<string>`coalesce(${transactions.userCategory}, ${transactions.plaidCategory})`,
    })
    .from(transactions)
    .innerJoin(accounts, eq(accounts.id, transactions.accountId))
    .where(eq(accounts.userId, userId));

  const ruleCategoriesP = db
    .selectDistinct({ category: categoryRules.category })
    .from(categoryRules)
    .where(eq(categoryRules.userId, userId));

  const [txnRows, ruleRows] = await Promise.all([txnCategoriesP, ruleCategoriesP]);

  const set = new Set<string>();
  for (const r of txnRows) if (r.category) set.add(r.category);
  for (const r of ruleRows) if (r.category) set.add(r.category);

  return Array.from(set).sort();
}
