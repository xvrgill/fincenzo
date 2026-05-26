import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveScope } from "@/lib/scope";
import { getPortfolio } from "@/lib/queries/investments";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoneyCents } from "@/lib/format";
import { AllocationList } from "@/components/investments/allocation-list";
import { HoldingsTable } from "@/components/investments/holdings-table";

const TYPE_LABELS: Record<string, string> = {
  equity: "Equity",
  etf: "ETF",
  "mutual fund": "Mutual fund",
  "fixed income": "Fixed income",
  cash: "Cash",
  cryptocurrency: "Crypto",
  derivative: "Derivative",
  loan: "Loan",
  other: "Other",
};

export default async function InvestmentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const scope = await getActiveScope(user.id);
  const portfolio = await getPortfolio(scope);
  const empty = portfolio.holdings.length === 0;

  const gain = portfolio.totalGainCents;
  const gainPct =
    portfolio.totalCostBasisCents && portfolio.totalCostBasisCents > 0 && gain != null
      ? (gain / portfolio.totalCostBasisCents) * 100
      : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Investments</h1>
        <p className="text-sm text-muted-foreground">
          Holdings across your linked brokerage and retirement accounts.
        </p>
      </div>

      {empty ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <p className="text-sm text-muted-foreground">No investment holdings yet.</p>
            <p className="text-xs text-muted-foreground">
              Link a brokerage or retirement account on the Accounts page. Holdings sync
              automatically and update when prices change.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardDescription>Portfolio value</CardDescription>
                <CardTitle className="text-3xl tabular-nums">
                  {formatMoneyCents(portfolio.totalValueCents)}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                {portfolio.accountCount} account{portfolio.accountCount === 1 ? "" : "s"} •{" "}
                {portfolio.holdings.length} position{portfolio.holdings.length === 1 ? "" : "s"}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Cost basis</CardDescription>
                <CardTitle className="text-3xl tabular-nums">
                  {portfolio.totalCostBasisCents != null
                    ? formatMoneyCents(portfolio.totalCostBasisCents)
                    : "—"}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                {portfolio.totalCostBasisCents == null
                  ? "Cost basis not reported by all institutions."
                  : "Total amount invested across positions."}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Unrealized gain/loss</CardDescription>
                <CardTitle
                  className={`text-3xl tabular-nums ${
                    gain == null ? "" : gain < 0 ? "text-destructive" : "text-emerald-600"
                  }`}
                >
                  {gain == null
                    ? "—"
                    : `${gain >= 0 ? "+" : ""}${formatMoneyCents(gain)}`}
                </CardTitle>
              </CardHeader>
              <CardContent
                className={`text-xs ${
                  gain == null ? "text-muted-foreground" : gain < 0 ? "text-destructive" : "text-muted-foreground"
                }`}
              >
                {gain == null
                  ? "Needs cost basis from your institution."
                  : gainPct != null
                    ? `${gainPct >= 0 ? "+" : ""}${gainPct.toFixed(2)}% return`
                    : "Return on cost basis."}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
            <Card>
              <CardHeader>
                <CardTitle>Allocation</CardTitle>
                <CardDescription>By security type</CardDescription>
              </CardHeader>
              <CardContent>
                <AllocationList
                  slices={portfolio.allocation.map((s) => ({
                    label: TYPE_LABELS[s.type] ?? s.type,
                    valueCents: s.valueCents,
                  }))}
                  totalCents={portfolio.totalValueCents}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Holdings</CardTitle>
                <CardDescription>Sorted by value</CardDescription>
              </CardHeader>
              <CardContent>
                <HoldingsTable rows={portfolio.holdings} />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
