// Cash-flow forecast. Project the running balance forward day-by-day from a
// starting cash balance, applying:
//   1. Scheduled instances of confirmed recurring charges.
//   2. A daily baseline = avgDailyIncome - avgDailyDiscretionary.
//
// Pure — DB I/O lives in src/lib/queries/forecast.ts.

import type { RecurringCadence } from "@/lib/recurring";

export type RecurringInput = {
  merchantName: string;
  cadence: RecurringCadence;
  averageAmountCents: number;
  lastSeenDate: string; // yyyy-mm-dd
};

export type ForecastInput = {
  startDate: string; // yyyy-mm-dd, inclusive
  horizonDays: number;
  startingBalanceCents: number;
  avgDailyIncomeCents: number;
  avgDailyDiscretionaryCents: number;
  recurring: RecurringInput[];
};

export type ForecastPoint = {
  date: string;
  balanceCents: number;
  scheduledChargeCents: number;
};

export type ScheduledCharge = {
  date: string;
  merchantName: string;
  amountCents: number;
  cadence: RecurringCadence;
};

const CADENCE_DAYS: Record<RecurringCadence, number> = {
  weekly: 7,
  biweekly: 14,
  monthly: 30,
  yearly: 365,
};

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  const ms = new Date(b + "T00:00:00Z").getTime() - new Date(a + "T00:00:00Z").getTime();
  return Math.round(ms / 86_400_000);
}

/**
 * Walk forward from `lastSeenDate` by the cadence interval, emitting every
 * occurrence that lands inside [startDate, startDate + horizonDays).
 */
export function scheduleRecurring(
  recurring: RecurringInput[],
  startDate: string,
  horizonDays: number,
): ScheduledCharge[] {
  const endExclusive = addDays(startDate, horizonDays);
  const out: ScheduledCharge[] = [];

  for (const r of recurring) {
    const step = CADENCE_DAYS[r.cadence];
    // Find the first occurrence at or after startDate.
    const gap = daysBetween(r.lastSeenDate, startDate);
    const stepsAhead = gap <= 0 ? 1 : Math.ceil(gap / step);
    let next = addDays(r.lastSeenDate, stepsAhead * step);

    while (next < endExclusive) {
      if (next >= startDate) {
        out.push({
          date: next,
          merchantName: r.merchantName,
          amountCents: r.averageAmountCents,
          cadence: r.cadence,
        });
      }
      next = addDays(next, step);
    }
  }

  return out.sort((a, b) => a.date.localeCompare(b.date));
}

export function forecastCashFlow(input: ForecastInput): ForecastPoint[] {
  const scheduled = scheduleRecurring(input.recurring, input.startDate, input.horizonDays);
  const chargesByDate = new Map<string, number>();
  for (const c of scheduled) {
    chargesByDate.set(c.date, (chargesByDate.get(c.date) ?? 0) + c.amountCents);
  }

  const dailyBaseline = input.avgDailyIncomeCents - input.avgDailyDiscretionaryCents;

  const points: ForecastPoint[] = [];
  let balance = input.startingBalanceCents;
  for (let i = 0; i < input.horizonDays; i++) {
    const date = addDays(input.startDate, i);
    const charge = chargesByDate.get(date) ?? 0;
    balance = balance + dailyBaseline - charge;
    points.push({ date, balanceCents: Math.round(balance), scheduledChargeCents: charge });
  }
  return points;
}
