// Recurring-charge detection. Given a list of transactions, find merchants
// that charge on a consistent cadence (weekly / biweekly / monthly / yearly)
// with a stable amount.
//
// Pure: no DB, no I/O. The API route is responsible for fetching transactions
// and persisting candidates.

export type RecurringCadence = "weekly" | "biweekly" | "monthly" | "yearly";

export type DetectorTx = {
  date: string; // ISO yyyy-mm-dd
  amountCents: number; // Plaid convention: positive = money out
  merchantName: string | null;
  name: string;
  category?: string | null;
};

export type RecurringCandidate = {
  merchantKey: string;
  merchantName: string;
  category: string | null;
  cadence: RecurringCadence;
  averageAmountCents: number;
  firstSeenDate: string;
  lastSeenDate: string;
  nextExpectedDate: string;
  sampleCount: number;
};

// [minDays, idealDays, maxDays] — the window around a typical interval for
// each cadence. Loose enough to absorb weekend shifts and 28/30/31-day months.
const CADENCE_BOUNDS: Record<RecurringCadence, readonly [number, number, number]> = {
  weekly: [5, 7, 10],
  biweekly: [12, 14, 17],
  monthly: [25, 30, 35],
  yearly: [340, 365, 400],
};
const CADENCES: RecurringCadence[] = ["weekly", "biweekly", "monthly", "yearly"];

const MIN_OCCURRENCES = 3;
const MIN_CADENCE_MATCH_RATIO = 0.6; // ≥60% of intervals must hit the window
const AMOUNT_TOLERANCE = 0.15; // stddev / mean ≤ 15%

/**
 * Normalize a merchant string so "STARBUCKS #1234" and "starbucks store" both
 * collapse to "starbucks". The goal is dedupe, not display.
 */
export function normalizeMerchant(merchantName: string | null, fallbackName: string): string {
  const raw = (merchantName ?? fallbackName ?? "").toLowerCase().trim();
  if (!raw) return "";
  return raw
    .replace(/[#*][a-z0-9]+/g, " ") // store numbers, "*ABC123" suffixes
    .replace(/\b\d{3,}\b/g, " ") // bare numeric runs
    .replace(/[^a-z0-9.]+/g, " ") // punctuation -> space (keep dots in "amazon.com")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 3) // first few tokens — kills location suffixes
    .join(" ");
}

function daysBetween(a: string, b: string): number {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.round(ms / 86_400_000);
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function mean(xs: number[]): number {
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}

function stddev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  const variance = xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length;
  return Math.sqrt(variance);
}

function classifyCadence(intervals: number[]): RecurringCadence | null {
  // Try each cadence; pick the one that captures the most intervals inside its
  // window. Tie-break by tightness (closer to ideal wins).
  let best: { cadence: RecurringCadence; matches: number; closeness: number } | null = null;
  for (const cadence of CADENCES) {
    const [min, ideal, max] = CADENCE_BOUNDS[cadence];
    const hits = intervals.filter((d) => d >= min && d <= max);
    if (hits.length / intervals.length < MIN_CADENCE_MATCH_RATIO) continue;
    const closeness = -hits.reduce((s, d) => s + Math.abs(d - ideal), 0);
    if (
      !best ||
      hits.length > best.matches ||
      (hits.length === best.matches && closeness > best.closeness)
    ) {
      best = { cadence, matches: hits.length, closeness };
    }
  }
  return best?.cadence ?? null;
}

export function detectRecurring(transactions: DetectorTx[]): RecurringCandidate[] {
  // Expenses only — refunds and incoming transfers don't belong here.
  const expenses = transactions.filter((t) => t.amountCents > 0);

  const groups = new Map<string, DetectorTx[]>();
  for (const t of expenses) {
    const key = normalizeMerchant(t.merchantName, t.name);
    if (!key) continue;
    const list = groups.get(key) ?? [];
    list.push(t);
    groups.set(key, list);
  }

  const candidates: RecurringCandidate[] = [];
  for (const [key, group] of groups) {
    if (group.length < MIN_OCCURRENCES) continue;

    const sorted = [...group].sort((a, b) => a.date.localeCompare(b.date));
    const intervals: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      intervals.push(daysBetween(sorted[i - 1].date, sorted[i].date));
    }

    const cadence = classifyCadence(intervals);
    if (!cadence) continue;

    const amounts = sorted.map((t) => t.amountCents);
    const avg = mean(amounts);
    if (avg <= 0) continue;
    // Allow either a tight stddev OR all amounts within $1 of mean (catches
    // subscriptions where tax shifts the cents).
    const tight = stddev(amounts) / avg <= AMOUNT_TOLERANCE;
    const withinDollar = amounts.every((a) => Math.abs(a - avg) <= 100);
    if (!tight && !withinDollar) continue;

    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const [, ideal] = CADENCE_BOUNDS[cadence];

    candidates.push({
      merchantKey: key,
      merchantName: first.merchantName ?? first.name,
      category: last.category ?? null,
      cadence,
      averageAmountCents: Math.round(avg),
      firstSeenDate: first.date,
      lastSeenDate: last.date,
      nextExpectedDate: addDays(last.date, ideal),
      sampleCount: sorted.length,
    });
  }

  return candidates.sort((a, b) => b.averageAmountCents - a.averageAmountCents);
}
