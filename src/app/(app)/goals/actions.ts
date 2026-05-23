"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { goals } from "@/lib/db/schema";
import { getActiveScope, scopeRowKey } from "@/lib/scope";
import { logActivity } from "@/lib/activity";

function dollarsToCents(value: FormDataEntryValue | null): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error("amount must be a non-negative number");
  }
  return Math.round(n * 100);
}

async function requireUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");
  return user.id;
}

export async function createGoal(formData: FormData) {
  const userId = await requireUserId();
  const scope = await getActiveScope(userId);
  const key = scopeRowKey(scope);

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("name required");
  const targetCents = dollarsToCents(formData.get("targetDollars"));
  if (targetCents === 0) throw new Error("target must be greater than zero");
  const targetDateRaw = String(formData.get("targetDate") ?? "").trim();
  const targetDate = targetDateRaw || null;
  const startingCents = formData.get("startingDollars")
    ? dollarsToCents(formData.get("startingDollars"))
    : 0;

  await db.insert(goals).values({
    scopeType: key.scopeType,
    scopeId: key.scopeId,
    name,
    targetCents,
    currentCents: startingCents,
    targetDate,
  });

  if (scope.kind === "household") {
    await logActivity(scope.householdId, userId, "goal.created", { name, targetCents });
  }

  revalidatePath("/goals");
  revalidatePath("/");
}

export async function updateGoal(formData: FormData) {
  const userId = await requireUserId();
  const scope = await getActiveScope(userId);
  const key = scopeRowKey(scope);

  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("id required");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("name required");
  const targetCents = dollarsToCents(formData.get("targetDollars"));
  if (targetCents === 0) throw new Error("target must be greater than zero");
  const currentCents = dollarsToCents(formData.get("currentDollars"));
  const targetDateRaw = String(formData.get("targetDate") ?? "").trim();
  const targetDate = targetDateRaw || null;

  await db
    .update(goals)
    .set({ name, targetCents, currentCents, targetDate })
    .where(
      and(
        eq(goals.id, id),
        eq(goals.scopeType, key.scopeType),
        eq(goals.scopeId, key.scopeId),
      ),
    );

  revalidatePath("/goals");
  revalidatePath("/");
}

export async function updateGoalProgress(formData: FormData) {
  const userId = await requireUserId();
  const scope = await getActiveScope(userId);
  const key = scopeRowKey(scope);

  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("id required");
  const currentCents = dollarsToCents(formData.get("currentDollars"));

  await db
    .update(goals)
    .set({ currentCents })
    .where(
      and(
        eq(goals.id, id),
        eq(goals.scopeType, key.scopeType),
        eq(goals.scopeId, key.scopeId),
      ),
    );

  revalidatePath("/goals");
  revalidatePath("/");
}

export async function deleteGoal(formData: FormData) {
  const userId = await requireUserId();
  const scope = await getActiveScope(userId);
  const key = scopeRowKey(scope);

  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("id required");

  const [deleted] = await db
    .delete(goals)
    .where(
      and(
        eq(goals.id, id),
        eq(goals.scopeType, key.scopeType),
        eq(goals.scopeId, key.scopeId),
      ),
    )
    .returning({ name: goals.name });

  if (deleted && scope.kind === "household") {
    await logActivity(scope.householdId, userId, "goal.deleted", { name: deleted.name });
  }

  revalidatePath("/goals");
  revalidatePath("/");
}
