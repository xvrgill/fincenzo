import { redirect } from "next/navigation";
import { AlertTriangle, CalendarClock, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveScope } from "@/lib/scope";
import { getForecastInputs } from "@/lib/queries/forecast";
import { forecastCashFlow, scheduleRecurring } from "@/lib/forecast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ForecastChart } from "@/components/cash-flow/forecast-chart";
import { formatDate, formatMoneyCents } from "@/lib/format";

const HORIZON_DAYS = 90;

const CADENCE_LABEL = {
  weekly: "weekly",
  biweekly: "every 2 weeks",
  monthly: "monthly",
  yearly: "yearly",
} as const;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function CashFlowPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const scope = await getActiveScope(user.id);
  const inputs = await getForecastInputs(scope);

  // Discretionary = total avg daily spend minus the daily share of confirmed
  // recurring outflows. We don't want to double-count: recurring instances are
  // applied separately, on their actual due dates.
  const recurringDaily = inputs.recurring.reduce((s, r) => {
    const perMonth =
      r.cadence === "weekly"
        ? (r.averageAmountCents * 52) / 12
        : r.cadence === "biweekly"
        ? (r.averageAmountCents * 26) / 12
        : r.cadence === "monthly"
        ? r.averageAmountCents
        : r.averageAmountCents / 12;
    return s + perMonth / 30;
  }, 0);
  const avgDailyDiscretionaryCents = Math.max(
    0,
    Math.round(inputs.avgDailyExpenseCents - recurringDaily),
  );

  const start = todayIso();
  const points = forecastCashFlow({
    startDate: start,
    horizonDays: HORIZON_DAYS,
    startingBalanceCents: inputs.startingCashCents,
    avgDailyIncomeCents: inputs.avgDailyIncomeCents,
    avgDailyDiscretionaryCents,
    recurring: inputs.recurring,
  });

  const upcoming = scheduleRecurring(inputs.recurring, start, 30);

  const at30 = points[29]?.balanceCents ?? inputs.startingCashCents;
  const at90 = points[points.length - 1]?.balanceCents ?? inputs.startingCashCents;

  // Find first day the balance goes negative (if any).
  const runwayEnd = points.find((p) => p.balanceCents < 0)?.date ?? null;

  const dailyNet = inputs.avgDailyIncomeCents - avgDailyDiscretionaryCents;
  const trendingUp = dailyNet >= 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Cash flow</h1>
        <p className="text-sm text-muted-foreground">
          Projected cash balance over the next {HORIZON_DAYS} days, combining your average daily
          spend with confirmed recurring charges.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi
          icon={<Wallet className="size-4" />}
          label="Cash today"
          value={formatMoneyCents(inputs.startingCashCents)}
          sub={`${formatMoneyCents(inputs.avgDailyIncomeCents)}/d in • ${formatMoneyCents(inputs.avgDailyExpenseCents)}/d out`}
        />
        <Kpi
          icon={trendingUp ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
          label="Projected in 30 days"
          value={formatMoneyCents(at30)}
          sub={`${trendingUp ? "+" : ""}${formatMoneyCents(at30 - inputs.startingCashCents)}`}
          tone={at30 < 0 ? "warn" : trendingUp ? "good" : "neutral"}
        />
        <Kpi
          icon={runwayEnd ? <AlertTriangle className="size-4" /> : <CalendarClock className="size-4" />}
          label={runwayEnd ? "Cash runs out" : "Projected in 90 days"}
          value={runwayEnd ? formatDate(runwayEnd) : formatMoneyCents(at90)}
          sub={runwayEnd ? "at current pace" : `${trendingUp ? "+" : ""}${formatMoneyCents(at90 - inputs.startingCashCents)}`}
          tone={runwayEnd ? "warn" : trendingUp ? "good" : "neutral"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Projected balance</CardTitle>
          <CardDescription>
            Baseline of {formatMoneyCents(inputs.avgDailyIncomeCents)}/d in,{" "}
            {formatMoneyCents(avgDailyDiscretionaryCents)}/d discretionary out, plus{" "}
            {inputs.recurring.length}{" "}
            {inputs.recurring.length === 1 ? "confirmed recurring charge" : "confirmed recurring charges"}{" "}
            on their due dates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {inputs.startingCashCents === 0 && inputs.avgDailyIncomeCents === 0 && inputs.avgDailyExpenseCents === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Link a checking account and confirm a few subscriptions to see your forecast.
            </p>
          ) : (
            <ForecastChart data={points} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming charges (next 30 days)</CardTitle>
          <CardDescription>
            Scheduled instances of your confirmed subscriptions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nothing scheduled. Confirm subscriptions on the{" "}
              <a className="underline underline-offset-4" href="/subscriptions">
                Subscriptions
              </a>{" "}
              page to see them here.
            </p>
          ) : (
            <ul className="divide-y">
              {upcoming.map((c, i) => (
                <li key={`${c.date}-${c.merchantName}-${i}`} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{c.merchantName}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(c.date)} • {CADENCE_LABEL[c.cadence]}
                    </p>
                  </div>
                  <p className="text-sm tabular-nums">{formatMoneyCents(c.amountCents)}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  sub,
  tone = "neutral",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  tone?: "neutral" | "good" | "warn";
}) {
  const toneClass =
    tone === "warn"
      ? "text-red-600"
      : tone === "good"
      ? "text-emerald-600"
      : "text-foreground";
  return (
    <Card>
      <CardContent className="flex flex-col gap-2 py-4">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
          {icon}
          {label}
        </div>
        <p className={`text-2xl font-semibold tabular-nums ${toneClass}`}>{value}</p>
        {sub ? <p className="text-xs text-muted-foreground tabular-nums">{sub}</p> : null}
      </CardContent>
    </Card>
  );
}
