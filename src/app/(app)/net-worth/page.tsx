import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  computeCurrentNetWorth,
  getNetWorthSeries,
} from "@/lib/queries/net-worth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NetWorthChart } from "@/components/net-worth/net-worth-chart";
import { formatMoneyCents } from "@/lib/format";
import { getActiveScope } from "@/lib/scope";

export default async function NetWorthPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const scope = await getActiveScope(user.id);
  const [current, series] = await Promise.all([
    computeCurrentNetWorth(scope),
    getNetWorthSeries(scope),
  ]);

  const first = series[0];
  const last = series[series.length - 1];
  const change = first && last ? last.netCents - first.netCents : 0;
  const changePct = first && first.netCents !== 0 ? (change / Math.abs(first.netCents)) * 100 : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Net worth</h1>
        <p className="text-sm text-muted-foreground">
          Assets minus liabilities across all linked accounts.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Net worth</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {formatMoneyCents(current.netCents)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {series.length < 2
              ? "Snapshot history will grow as you sync."
              : changePct === null
                ? `${change >= 0 ? "+" : ""}${formatMoneyCents(change)} since first snapshot`
                : `${change >= 0 ? "+" : ""}${formatMoneyCents(change)} (${changePct >= 0 ? "+" : ""}${changePct.toFixed(1)}%) since first snapshot`}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Assets</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {formatMoneyCents(current.assetsCents)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Cash, savings, and investment balances.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Liabilities</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {formatMoneyCents(current.liabilitiesCents)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Credit cards and loan balances owed.
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Over time</CardTitle>
          <CardDescription>
            {series.length === 0
              ? "No snapshots yet."
              : series.length === 1
                ? "Just one snapshot so far — sync again tomorrow to start a trend."
                : `${series.length} snapshots from ${series[0].date} to ${series[series.length - 1].date}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {series.length >= 2 ? (
            <NetWorthChart data={series} />
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">
              {series.length === 0
                ? "Link an account on the Accounts page; we'll take a snapshot automatically."
                : "Come back tomorrow (or sync again) to see the line take shape."}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
