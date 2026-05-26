import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getCategoryBreakdown,
  getCurrentAndPriorMonthTotals,
  getDailyActivity,
  getRecentTransactions,
  pctChange,
} from "@/lib/queries/dashboard";
import { computeCurrentNetWorth, getNetWorthSeries } from "@/lib/queries/net-worth";
import { getActiveScope } from "@/lib/scope";
import { StatTile } from "@/components/dashboard/stat-tile";
import { BalanceOverviewChart } from "@/components/dashboard/balance-overview-chart";
import { CategoryBreakdown } from "@/components/dashboard/category-breakdown";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { NetWorthCard } from "@/components/dashboard/net-worth-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const scope = await getActiveScope(user.id);
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  const [{ current, prior }, daily, breakdown, recent, netWorth, netWorthSeries] = await Promise.all([
    getCurrentAndPriorMonthTotals(scope),
    getDailyActivity(scope, iso(monthStart), iso(monthEnd)),
    getCategoryBreakdown(scope, now.getUTCFullYear(), now.getUTCMonth()),
    getRecentTransactions(scope, 8),
    computeCurrentNetWorth(scope),
    getNetWorthSeries(scope),
  ]);

  const monthLabel = now.toLocaleDateString("en-US", { month: "long", year: "numeric" }).toUpperCase();

  return (
    <div className="flex flex-col gap-6">
      <div className="border-b border-border pb-4">
        <p className="text-xs tracking-widest text-primary mb-1">▸ OVERVIEW</p>
        <h1 className="text-xl font-medium tracking-wide text-foreground">Dashboard</h1>
        <p className="text-xs tracking-widest text-muted-foreground mt-0.5">{monthLabel}</p>
      </div>

      <NetWorthCard currentCents={netWorth.netCents} series={netWorthSeries} />

      <div className="grid gap-4 md:grid-cols-3">
        <StatTile
          label="Income"
          amountCents={current.incomeCents}
          pctChange={pctChange(current.incomeCents, prior.incomeCents)}
        />
        <StatTile
          label="Expenses"
          amountCents={current.expensesCents}
          pctChange={pctChange(current.expensesCents, prior.expensesCents)}
          invertSentiment
        />
        <StatTile
          label="Net (saved)"
          amountCents={current.savedCents}
          pctChange={pctChange(current.savedCents, prior.savedCents)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardDescription>Activity</CardDescription>
          <CardTitle>Income vs. Expenses — {monthLabel}</CardTitle>
        </CardHeader>
        <CardContent>
          <BalanceOverviewChart data={daily} />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardDescription>Spending</CardDescription>
            <CardTitle>By Category — This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryBreakdown rows={breakdown} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Transactions</CardDescription>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentTransactions rows={recent} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
