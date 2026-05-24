import { and, asc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { Check, RotateCcw, Search, X } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { recurringTransactions } from "@/lib/db/schema";
import { getActiveScope, scopeRowKey } from "@/lib/scope";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatMoneyCents, prettifyCategory } from "@/lib/format";
import {
  confirmSubscription,
  detectSubscriptions,
  dismissSubscription,
  restoreSubscription,
} from "./actions";

type Row = typeof recurringTransactions.$inferSelect;

const CADENCE_LABEL: Record<Row["cadence"], string> = {
  weekly: "Weekly",
  biweekly: "Every 2 weeks",
  monthly: "Monthly",
  yearly: "Yearly",
};

const MONTHLY_FACTOR: Record<Row["cadence"], number> = {
  weekly: 52 / 12,
  biweekly: 26 / 12,
  monthly: 1,
  yearly: 1 / 12,
};

function monthlyCents(row: Row): number {
  return Math.round(row.averageAmountCents * MONTHLY_FACTOR[row.cadence]);
}

export default async function SubscriptionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const scope = await getActiveScope(user.id);
  const key = scopeRowKey(scope);

  const rows = await db
    .select()
    .from(recurringTransactions)
    .where(
      and(
        eq(recurringTransactions.scopeType, key.scopeType),
        eq(recurringTransactions.scopeId, key.scopeId),
      ),
    )
    .orderBy(asc(recurringTransactions.nextExpectedDate));

  const confirmed = rows.filter((r) => r.status === "confirmed");
  const suggested = rows.filter((r) => r.status === "suggested");
  const dismissed = rows.filter((r) => r.status === "dismissed");

  const confirmedMonthly = confirmed.reduce((s, r) => s + monthlyCents(r), 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">Subscriptions</h1>
          <p className="text-sm text-muted-foreground">
            Recurring charges detected from your transactions. Confirm the ones you want to track or
            dismiss the false positives.
          </p>
        </div>
        <form action={detectSubscriptions}>
          <Button type="submit" variant="outline" size="sm">
            <Search className="mr-2 size-4" />
            Find subscriptions
          </Button>
        </form>
      </div>

      {confirmed.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Confirmed</CardTitle>
            <CardDescription>
              {formatMoneyCents(confirmedMonthly)}/mo across {confirmed.length}{" "}
              {confirmed.length === 1 ? "subscription" : "subscriptions"}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RowList rows={confirmed} kind="confirmed" />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Suggested</CardTitle>
          <CardDescription>
            Detected from at least 3 charges on a consistent cadence and stable amount.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {suggested.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {rows.length === 0
                ? "Click “Find subscriptions” to scan your transactions."
                : "Nothing new to suggest."}
            </p>
          ) : (
            <RowList rows={suggested} kind="suggested" />
          )}
        </CardContent>
      </Card>

      {dismissed.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Dismissed</CardTitle>
            <CardDescription>
              Detector hits you ignored. Restore one if you change your mind.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RowList rows={dismissed} kind="dismissed" />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function RowList({ rows, kind }: { rows: Row[]; kind: "confirmed" | "suggested" | "dismissed" }) {
  return (
    <ul className="divide-y">
      {rows.map((r) => (
        <li key={r.id} className="flex items-center justify-between gap-3 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{r.merchantName}</p>
            <p className="break-words text-xs text-muted-foreground tabular-nums">
              {CADENCE_LABEL[r.cadence]} • {formatMoneyCents(r.averageAmountCents)} •{" "}
              {r.sampleCount} charges
              {r.category ? ` • ${prettifyCategory(r.category)}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium tabular-nums">
                {formatMoneyCents(monthlyCents(r))}/mo
              </p>
              <p className="text-xs text-muted-foreground">
                Next ~{formatDate(r.nextExpectedDate)}
              </p>
            </div>
            <RowActions id={r.id} kind={kind} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function RowActions({ id, kind }: { id: string; kind: "confirmed" | "suggested" | "dismissed" }) {
  if (kind === "suggested") {
    return (
      <div className="flex items-center gap-1">
        <form action={confirmSubscription}>
          <input type="hidden" name="id" value={id} />
          <Button type="submit" variant="ghost" size="icon" aria-label="Confirm">
            <Check className="size-4" />
          </Button>
        </form>
        <form action={dismissSubscription}>
          <input type="hidden" name="id" value={id} />
          <Button type="submit" variant="ghost" size="icon" aria-label="Dismiss">
            <X className="size-4" />
          </Button>
        </form>
      </div>
    );
  }
  if (kind === "confirmed") {
    return (
      <form action={dismissSubscription}>
        <input type="hidden" name="id" value={id} />
        <Button type="submit" variant="ghost" size="icon" aria-label="Dismiss">
          <X className="size-4" />
        </Button>
      </form>
    );
  }
  return (
    <form action={restoreSubscription}>
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="ghost" size="icon" aria-label="Restore">
        <RotateCcw className="size-4" />
      </Button>
    </form>
  );
}
