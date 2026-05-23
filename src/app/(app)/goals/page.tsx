import { and, asc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { CheckCircle2, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { goals } from "@/lib/db/schema";
import { getActiveScope, scopeRowKey } from "@/lib/scope";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AddGoalForm } from "@/components/goals/add-goal-form";
import { EditGoalForm } from "@/components/goals/edit-goal-form";
import { UpdateProgressForm } from "@/components/goals/update-progress-form";
import { formatDate, formatMoneyCents } from "@/lib/format";
import { deleteGoal } from "./actions";

function progressColor(pct: number): string {
  if (pct >= 100) return "#10b981";
  if (pct >= 50) return "#34d399";
  return "#86efac";
}

function daysBetween(target: string): number {
  const ms = new Date(target).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export default async function GoalsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const scope = await getActiveScope(user.id);
  const key = scopeRowKey(scope);
  const rows = await db
    .select()
    .from(goals)
    .where(and(eq(goals.scopeType, key.scopeType), eq(goals.scopeId, key.scopeId)))
    .orderBy(asc(goals.createdAt));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Goals</h1>
        <p className="text-sm text-muted-foreground">
          Savings targets you&apos;re working toward. Update progress manually as you save.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add a goal</CardTitle>
          <CardDescription>Name it, set a target, optionally pick a date.</CardDescription>
        </CardHeader>
        <CardContent>
          <AddGoalForm />
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No goals yet. Add one above to start tracking.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((g) => {
            const current = Number(g.currentCents);
            const target = Number(g.targetCents);
            const rawPct = target === 0 ? 0 : (current / target) * 100;
            const pct = Math.min(100, rawPct);
            const complete = rawPct >= 100;
            const remainingCents = Math.max(0, target - current);
            const color = progressColor(rawPct);

            let timing: string | null = null;
            if (g.targetDate) {
              const days = daysBetween(g.targetDate);
              if (complete) timing = `Reached on time`;
              else if (days < 0) timing = `${Math.abs(days)}d past target`;
              else if (days === 0) timing = `Target is today`;
              else timing = `${days}d to target`;
            }

            return (
              <Card key={g.id}>
                <CardContent className="flex flex-col gap-3 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-sm font-medium">
                        {g.name}
                        {complete ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] uppercase text-emerald-700">
                            <CheckCircle2 className="size-3" />
                            Complete
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {formatMoneyCents(current)} of {formatMoneyCents(target)}
                        {!complete ? ` • ${formatMoneyCents(remainingCents)} to go` : ""}
                        {g.targetDate ? ` • by ${formatDate(g.targetDate)}` : ""}
                        {timing ? ` • ${timing}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <UpdateProgressForm id={g.id} currentCents={current} />
                      <EditGoalForm
                        id={g.id}
                        name={g.name}
                        targetCents={target}
                        currentCents={current}
                        targetDate={g.targetDate}
                      />
                      <form action={deleteGoal}>
                        <input type="hidden" name="id" value={g.id} />
                        <Button type="submit" variant="ghost" size="icon" aria-label="Delete goal">
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
                      style={{ height: 8, width: `${pct}%`, backgroundColor: color }}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
