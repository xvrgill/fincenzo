"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { budgets } from "@/lib/db/schema";
import { getActiveScope, scopeRowKey } from "@/lib/scope";
import { logActivity } from "@/lib/activity";

function currentMonthIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
}

export async function setBudget(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");

  const activeScope = await getActiveScope(user.id);
  // "sharing" lets the user opt a budget into personal-only even while the
  // household scope is active. Defaults to whatever the active scope is.
  const sharingRaw = String(formData.get("sharing") ?? "").trim();
  const sharing =
    sharingRaw === "personal" || sharingRaw === "shared" ? sharingRaw : null;
  const scope =
    sharing === "personal"
      ? ({ kind: "user", userId: user.id } as const)
      : sharing === "shared" && activeScope.kind === "household"
        ? activeScope
        : activeScope;
  const key = scopeRowKey(scope);

  const category = String(formData.get("category") ?? "").trim();
  const limitDollars = Number(formData.get("limitDollars"));
  const month = String(formData.get("month") ?? "").trim() || currentMonthIso();

  if (!category) throw new Error("category required");
  if (!Number.isFinite(limitDollars) || limitDollars <= 0) {
    throw new Error("limit must be a positive number");
  }
  const limitCents = Math.round(limitDollars * 100);

  await db
    .insert(budgets)
    .values({
      scopeType: key.scopeType,
      scopeId: key.scopeId,
      category,
      month,
      limitCents,
    })
    .onConflictDoUpdate({
      target: [budgets.scopeType, budgets.scopeId, budgets.category, budgets.month],
      set: { limitCents },
    });

  if (scope.kind === "household") {
    await logActivity(scope.householdId, user.id, "budget.created", {
      category,
      limitCents,
      month,
    });
  }

  revalidatePath("/budget");
  revalidatePath("/");
}

export async function deleteBudget(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");

  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("id required");

  // Look up the budget first so we can verify the caller is allowed to delete
  // it. Allowed = personal budget owned by the user, or household budget for
  // the household they belong to.
  const [row] = await db
    .select({
      id: budgets.id,
      scopeType: budgets.scopeType,
      scopeId: budgets.scopeId,
      category: budgets.category,
      month: budgets.month,
    })
    .from(budgets)
    .where(eq(budgets.id, id))
    .limit(1);
  if (!row) return;

  const scope = await getActiveScope(user.id);
  const ownsAsPersonal = row.scopeType === "user" && row.scopeId === user.id;
  const ownsAsHousehold =
    row.scopeType === "household" && scope.kind === "household" && row.scopeId === scope.householdId;
  if (!ownsAsPersonal && !ownsAsHousehold) throw new Error("not allowed");

  await db.delete(budgets).where(eq(budgets.id, id));

  if (row.scopeType === "household") {
    await logActivity(row.scopeId, user.id, "budget.deleted", {
      category: row.category,
      month: row.month,
    });
  }

  revalidatePath("/budget");
  revalidatePath("/");
}
