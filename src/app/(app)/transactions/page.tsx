import Link from "next/link";
import { and, desc, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { Settings2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { accounts, transactions } from "@/lib/db/schema";
import { Card, CardContent } from "@/components/ui/card";
import { CategoryPicker } from "@/components/transactions/category-picker";
import { formatDate, formatMoneyCents } from "@/lib/format";
import { getAllUserCategories } from "@/lib/queries/categories";
import { accountScopeFilter, getActiveScope } from "@/lib/scope";
import { cn } from "@/lib/utils";

export default async function TransactionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const scope = await getActiveScope(user.id);

  const [rows, availableCategories] = await Promise.all([
    db
      .select({
        id: transactions.id,
        date: transactions.date,
        name: transactions.name,
        merchantName: transactions.merchantName,
        amountCents: transactions.amountCents,
        isoCurrencyCode: transactions.isoCurrencyCode,
        effectiveCategory: sql<string | null>`coalesce(${transactions.userCategory}, ${transactions.plaidCategory})`,
        pending: transactions.pending,
        accountName: accounts.name,
        accountMask: accounts.mask,
        ownerUserId: accounts.userId,
      })
      .from(transactions)
      .innerJoin(accounts, eq(accounts.id, transactions.accountId))
      .where(and(accountScopeFilter(scope), sql`true`))
      .orderBy(desc(transactions.date), desc(transactions.createdAt))
      .limit(200),
    getAllUserCategories(user.id),
  ]);

  // In household scope, partners' transactions are read-only (you can't edit
  // their categories). We still show them, just without the picker.
  const canEdit = (ownerUserId: string) => ownerUserId === user.id;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
          <p className="text-sm text-muted-foreground">
            {rows.length === 0
              ? "No transactions yet. Link an account on the Accounts page to start."
              : `Latest ${rows.length} transactions across all accounts. Click a category to change it.`}
          </p>
        </div>
        <Link
          href="/transactions/rules"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Settings2 className="size-3.5" />
          Manage rules
        </Link>
      </div>

      {rows.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {rows.map((t) => {
                const outgoing = t.amountCents > 0;
                const merchantLabel = t.merchantName ?? t.name;
                return (
                  <div key={t.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-4 px-4 py-3">
                    <div className="w-20 text-xs text-muted-foreground">{formatDate(t.date)}</div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {merchantLabel}
                        {t.pending ? (
                          <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                            pending
                          </span>
                        ) : null}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span className="truncate">
                          {t.accountName}
                          {t.accountMask ? ` ••${t.accountMask}` : ""}
                        </span>
                        <span>•</span>
                        {canEdit(t.ownerUserId) ? (
                          <CategoryPicker
                            transactionId={t.id}
                            currentCategory={t.effectiveCategory}
                            merchantLabel={merchantLabel}
                            availableCategories={availableCategories}
                          />
                        ) : (
                          <span className="italic">
                            {t.effectiveCategory ?? "Uncategorized"}
                          </span>
                        )}
                      </div>
                    </div>
                    <div
                      className={cn(
                        "text-sm font-medium tabular-nums",
                        outgoing ? "text-foreground" : "text-emerald-600",
                      )}
                    >
                      {outgoing ? "-" : "+"}
                      {formatMoneyCents(Math.abs(t.amountCents), t.isoCurrencyCode ?? "USD")}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
