import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { accounts, categoryRules, transactions } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, prettifyCategory } from "@/lib/format";
import { AddSubstringRuleForm } from "@/components/transactions/add-substring-rule-form";
import { getScopeExpenseCategories } from "@/lib/queries/budgets";
import { getActiveScope } from "@/lib/scope";
import { deleteCategoryRule } from "../actions";

export default async function RulesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const ruleRows = await db
    .select({
      id: categoryRules.id,
      matchType: categoryRules.matchType,
      matchValue: categoryRules.matchValue,
      category: categoryRules.category,
      createdAt: categoryRules.createdAt,
    })
    .from(categoryRules)
    .where(eq(categoryRules.userId, user.id))
    .orderBy(desc(categoryRules.createdAt));

  // Count matches per rule. For merchant_equals we can do a single GROUP BY;
  // for name_contains we fall back to a per-rule count query (substring rules
  // are typically few per user).
  const eqRules = ruleRows.filter((r) => r.matchType === "merchant_equals");
  const countByMerchant = new Map<string, number>();
  if (eqRules.length > 0) {
    const values = eqRules.map((r) => r.matchValue);
    const countRows = await db
      .select({
        merchant: sql<string>`coalesce(${transactions.merchantName}, ${transactions.name})`,
        count: sql<number>`count(*)::int`,
      })
      .from(transactions)
      .innerJoin(accounts, eq(accounts.id, transactions.accountId))
      .where(
        sql`${accounts.userId} = ${user.id} and coalesce(${transactions.merchantName}, ${transactions.name}) in ${values}`,
      )
      .groupBy(sql`1`);
    for (const c of countRows) countByMerchant.set(c.merchant, Number(c.count));
  }

  const substringCounts = new Map<string, number>();
  for (const r of ruleRows) {
    if (r.matchType !== "name_contains") continue;
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(transactions)
      .innerJoin(accounts, eq(accounts.id, transactions.accountId))
      .where(
        sql`${accounts.userId} = ${user.id} and (coalesce(${transactions.merchantName}, '') || ' ' || ${transactions.name}) ilike ${"%" + r.matchValue + "%"}`,
      );
    substringCounts.set(r.id, Number(count));
  }

  const rows = ruleRows.map((r) => ({
    ...r,
    matchCount:
      r.matchType === "merchant_equals"
        ? countByMerchant.get(r.matchValue) ?? 0
        : substringCounts.get(r.id) ?? 0,
  }));

  const scope = await getActiveScope(user.id);
  const categories = await getScopeExpenseCategories(scope);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/transactions"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3" />
          Back to transactions
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Category rules</h1>
        <p className="text-sm text-muted-foreground">
          Rules auto-categorize transactions on every sync. Exact merchant rules come from
          ticking &ldquo;Apply to all from this merchant&rdquo; on a transaction; substring
          rules can be added below.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add a substring rule</CardTitle>
          <CardDescription>
            Match any transaction whose name or merchant contains the text (case-insensitive).
            Useful when the merchant name varies — e.g. &ldquo;UBER&rdquo; → Transportation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AddSubstringRuleForm availableCategories={categories} />
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No rules yet.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              <div className="hidden grid-cols-[1fr_1fr_auto_auto] items-center gap-4 px-4 py-2 text-xs uppercase text-muted-foreground sm:grid">
                <span>Match</span>
                <span>Category</span>
                <span className="text-right">Matches</span>
                <span className="sr-only">Actions</span>
              </div>
              {rows.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-col gap-2 px-4 py-3 sm:grid sm:grid-cols-[1fr_1fr_auto_auto] sm:items-center sm:gap-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      <span className="mr-2 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                        {r.matchType === "merchant_equals" ? "merchant" : "contains"}
                      </span>
                      {r.matchValue}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Created {formatDate(r.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:contents">
                    <div className="text-sm">{prettifyCategory(r.category)}</div>
                    <div className="text-sm tabular-nums text-muted-foreground sm:text-right">
                      <span className="sm:hidden">{r.matchCount} matches</span>
                      <span className="hidden sm:inline">{r.matchCount}</span>
                    </div>
                    <form action={deleteCategoryRule}>
                      <input type="hidden" name="id" value={r.id} />
                      <Button type="submit" variant="ghost" size="icon" aria-label="Delete rule">
                        <Trash2 className="size-4" />
                      </Button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
