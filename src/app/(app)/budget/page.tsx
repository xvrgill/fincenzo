import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getBudgetsWithSpend,
  getPersonalBudgetsWithSpend,
  getScopeExpenseCategories,
  type BudgetWithSpend,
} from "@/lib/queries/budgets";
import { getActiveScope } from "@/lib/scope";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { AddBudgetForm } from "@/components/budget/add-budget-form";
import { EditBudgetForm } from "@/components/budget/edit-budget-form";
import { formatMoneyCents, prettifyCategory } from "@/lib/format";
import { deleteBudget } from "./actions";

function parseMonthParam(value: string | undefined): { year: number; month: number } {
  const now = new Date();
  if (value && /^\d{4}-\d{2}$/.test(value)) {
    const [y, m] = value.split("-").map(Number);
    if (y >= 1970 && m >= 1 && m <= 12) return { year: y, month: m - 1 };
  }
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() };
}

function monthParam(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function budgetColors(pct: number): { barColor: string; text: string } {
  if (pct >= 100) return { barColor: "#ef4444", text: "text-red-600" };
  if (pct >= 75) return { barColor: "#f59e0b", text: "text-amber-600" };
  return { barColor: "#10b981", text: "text-emerald-600" };
}

function BudgetList({
  rows,
  badge,
}: {
  rows: BudgetWithSpend[];
  badge?: "shared" | "personal";
}) {
  return (
    <div className="flex flex-col gap-3">
      {rows.map((b) => {
        const rawPct = b.limitCents === 0 ? 0 : (b.spentCents / b.limitCents) * 100;
        const pct = Math.min(100, rawPct);
        const over = b.spentCents > b.limitCents;
        const remaining = b.limitCents - b.spentCents;
        const { barColor, text } = budgetColors(rawPct);
        return (
          <Card key={b.id}>
            <CardContent className="flex flex-col gap-3 py-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="flex items-center gap-2 text-sm font-medium">
                    {prettifyCategory(b.category)}
                    {badge ? (
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                        {badge}
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {formatMoneyCents(b.spentCents)} of {formatMoneyCents(b.limitCents)}
                    {" • "}
                    <span className={text}>
                      {over
                        ? `${formatMoneyCents(-remaining)} over`
                        : `${formatMoneyCents(remaining)} left`}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <EditBudgetForm
                    category={b.category}
                    month={b.month}
                    limitCents={b.limitCents}
                    sharing={badge === "personal" ? "personal" : badge === "shared" ? "shared" : undefined}
                  />
                  <form action={deleteBudget}>
                    <input type="hidden" name="id" value={b.id} />
                    <Button type="submit" variant="ghost" size="icon" aria-label="Delete budget">
                      <Trash2 className="size-4" />
                    </Button>
                  </form>
                </div>
              </div>
              <div
                className="w-full overflow-hidden rounded-full bg-muted-foreground/10"
                style={{ height: 8 }}
              >
                <div
                  className="rounded-full transition-all"
                  style={{ height: 8, width: `${pct}%`, backgroundColor: barColor }}
                />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default async function BudgetPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { month: monthParamValue } = await searchParams;
  const { year, month } = parseMonthParam(monthParamValue);

  const scope = await getActiveScope(user.id);
  const inHousehold = scope.kind === "household";

  // In household scope, show shared budgets (active scope) plus the current
  // user's own personal budgets. Partner's personal budgets stay private.
  const [sharedRows, personalRows, categories] = await Promise.all([
    getBudgetsWithSpend(scope, year, month),
    inHousehold ? getPersonalBudgetsWithSpend(user.id, year, month) : Promise.resolve([]),
    getScopeExpenseCategories(scope),
  ]);

  const monthLabel = new Date(Date.UTC(year, month, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  const prev = new Date(Date.UTC(year, month - 1, 1));
  const next = new Date(Date.UTC(year, month + 1, 1));
  const prevHref = `/budget?month=${monthParam(prev.getUTCFullYear(), prev.getUTCMonth())}`;
  const nextHref = `/budget?month=${monthParam(next.getUTCFullYear(), next.getUTCMonth())}`;
  const today = new Date();
  const isCurrentMonth = year === today.getUTCFullYear() && month === today.getUTCMonth();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Budget</h1>
          <p className="text-sm text-muted-foreground">{monthLabel}</p>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href={prevHref}
            aria-label="Previous month"
            className={buttonVariants({ variant: "ghost", size: "icon" })}
          >
            <ChevronLeft className="size-4" />
          </Link>
          {!isCurrentMonth ? (
            <Link href="/budget" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              Today
            </Link>
          ) : null}
          <Link
            href={nextHref}
            aria-label="Next month"
            className={buttonVariants({ variant: "ghost", size: "icon" })}
          >
            <ChevronRight className="size-4" />
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add a budget</CardTitle>
          <CardDescription>
            {inHousehold
              ? "Shared budgets are visible and editable by both partners. Personal budgets stay private to you."
              : "Set a monthly spending limit for any category you've had transactions in."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AddBudgetForm
            availableCategories={categories}
            takenCategories={inHousehold ? [] : sharedRows.map((r) => r.category)}
            month={`${monthParam(year, month)}-01`}
            showSharingControl={inHousehold}
          />
        </CardContent>
      </Card>

      {sharedRows.length === 0 && personalRows.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No budgets yet. Add one above to start tracking.
          </CardContent>
        </Card>
      ) : (
        <>
          {inHousehold ? (
            <>
              {sharedRows.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <h2 className="text-sm font-medium text-muted-foreground">Shared</h2>
                  <BudgetList rows={sharedRows} badge="shared" />
                </div>
              ) : null}
              {personalRows.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <h2 className="text-sm font-medium text-muted-foreground">Yours (personal)</h2>
                  <BudgetList rows={personalRows} badge="personal" />
                </div>
              ) : null}
            </>
          ) : (
            <BudgetList rows={sharedRows} />
          )}
        </>
      )}
    </div>
  );
}
