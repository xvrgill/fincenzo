import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { categoryRules } from "@/lib/db/schema";

export type LoadedRule = {
  matchType: "merchant_equals" | "name_contains";
  matchValue: string;
  category: string;
};

export async function loadUserRules(userId: string): Promise<LoadedRule[]> {
  const rows = await db
    .select({
      matchType: categoryRules.matchType,
      matchValue: categoryRules.matchValue,
      category: categoryRules.category,
    })
    .from(categoryRules)
    .where(eq(categoryRules.userId, userId));
  return rows;
}

// Apply rules to a transaction. merchant_equals wins over name_contains since
// it's a tighter match; among same-type rules, the first hit wins (rules are
// typically few per user).
export function matchRule(
  rules: LoadedRule[],
  merchantName: string | null | undefined,
  name: string,
): string | null {
  const merchantKey = (merchantName ?? name).trim();
  if (merchantKey) {
    for (const r of rules) {
      if (r.matchType === "merchant_equals" && r.matchValue.trim() === merchantKey) {
        return r.category;
      }
    }
  }
  const haystack = `${merchantName ?? ""} ${name}`.toLowerCase();
  for (const r of rules) {
    if (r.matchType === "name_contains") {
      const needle = r.matchValue.trim().toLowerCase();
      if (needle && haystack.includes(needle)) return r.category;
    }
  }
  return null;
}
