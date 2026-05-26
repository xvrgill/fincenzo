import { notFound } from "next/navigation";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { waitlistSignups } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InviteRowActions } from "./invite-row-actions";

type RowState = "waiting" | "invited" | "expired" | "signed_up";

export default async function AdminWaitlistPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    notFound();
  }

  const rows = await db
    .select()
    .from(waitlistSignups)
    .orderBy(desc(waitlistSignups.createdAt));

  const now = new Date().getTime();
  const counts = { waiting: 0, invited: 0, expired: 0, signed_up: 0 };

  const decorated = rows.map((r) => {
    let state: RowState;
    if (r.signedUpAt) state = "signed_up";
    else if (r.invitedTokenExpiresAt && r.invitedTokenExpiresAt.getTime() < now) state = "expired";
    else if (r.invitedAt) state = "invited";
    else state = "waiting";
    counts[state] += 1;
    return { ...r, state };
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-mono text-2xl font-semibold tracking-tight">Waitlist</h1>
        <p className="text-sm text-muted-foreground">
          Issue single-use invite links. Tokens expire 7 days after issue.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Waiting" value={counts.waiting} tone="muted" />
        <Stat label="Invited" value={counts.invited} tone="primary" />
        <Stat label="Expired" value={counts.expired} tone="muted" />
        <Stat label="Signed up" value={counts.signed_up} tone="primary" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Signups</CardTitle>
        </CardHeader>
        <CardContent>
          {decorated.length === 0 ? (
            <p className="text-sm text-muted-foreground">No waitlist signups yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="py-2 pr-4">Email</th>
                    <th className="py-2 pr-4">Source</th>
                    <th className="py-2 pr-4">Joined</th>
                    <th className="py-2 pr-4">State</th>
                    <th className="py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {decorated.map((r) => (
                    <tr key={r.id} className="align-top">
                      <td className="py-3 pr-4 font-mono text-xs">{r.email}</td>
                      <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">
                        {r.source ?? "—"}
                      </td>
                      <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">
                        {formatDate(r.createdAt)}
                      </td>
                      <td className="py-3 pr-4">
                        <StateBadge state={r.state} invitedAt={r.invitedAt} />
                      </td>
                      <td className="py-3 text-right">
                        <InviteRowActions id={r.id} state={r.state} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "muted" | "primary";
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        tone === "primary" ? "border-primary/30 bg-primary/5" : "border-border/60 bg-card/40"
      }`}
    >
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-mono text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function StateBadge({
  state,
  invitedAt,
}: {
  state: RowState;
  invitedAt: Date | null;
}) {
  const styles: Record<RowState, string> = {
    waiting: "border-border/60 bg-muted-foreground/10 text-muted-foreground",
    invited: "border-primary/30 bg-primary/10 text-primary",
    expired: "border-destructive/30 bg-destructive/10 text-destructive",
    signed_up: "border-primary/30 bg-primary/15 text-primary",
  };
  const labels: Record<RowState, string> = {
    waiting: "Waiting",
    invited: "Invited",
    expired: "Expired",
    signed_up: "Signed up",
  };
  return (
    <div className="flex flex-col items-start gap-1">
      <span
        className={`inline-flex rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${styles[state]}`}
      >
        {labels[state]}
      </span>
      {invitedAt && state !== "signed_up" ? (
        <span className="font-mono text-[10px] text-muted-foreground">{formatDate(invitedAt)}</span>
      ) : null}
    </div>
  );
}

function formatDate(d: Date) {
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
