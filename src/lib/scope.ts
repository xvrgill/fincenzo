import { cookies } from "next/headers";
import { and, eq, inArray, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { accounts, householdMembers } from "@/lib/db/schema";

export const SCOPE_COOKIE = "fincenzo_scope";

export type Scope =
  | { kind: "user"; userId: string }
  | { kind: "household"; householdId: string; memberUserIds: string[]; userId: string };

/**
 * Resolves the active scope for a request from the cookie. If the cookie says
 * "household" but the user isn't in one, falls back to personal silently.
 */
export async function getActiveScope(userId: string): Promise<Scope> {
  const store = await cookies();
  const mode = store.get(SCOPE_COOKIE)?.value;
  if (mode !== "household") return { kind: "user", userId };

  const [me] = await db
    .select({ householdId: householdMembers.householdId })
    .from(householdMembers)
    .where(eq(householdMembers.userId, userId))
    .limit(1);
  if (!me) return { kind: "user", userId };

  const members = await db
    .select({ userId: householdMembers.userId })
    .from(householdMembers)
    .where(eq(householdMembers.householdId, me.householdId));

  return {
    kind: "household",
    householdId: me.householdId,
    memberUserIds: members.map((m) => m.userId),
    userId,
  };
}

export function scopeLabel(scope: Scope, householdName?: string): string {
  return scope.kind === "user" ? "Me" : householdName ?? "Household";
}

/**
 * SQL predicate that limits an `accounts` join/query to the accounts visible
 * in the active scope. Use everywhere we filter transactions or balances.
 */
export function accountScopeFilter(scope: Scope): SQL {
  if (scope.kind === "user") return eq(accounts.userId, scope.userId);
  return and(
    inArray(accounts.userId, scope.memberUserIds),
    eq(accounts.visibility, "household"),
  )!;
}

/** scopeType + scopeId pair for budgets / goals / snapshots. */
export function scopeRowKey(scope: Scope): { scopeType: "user" | "household"; scopeId: string } {
  return scope.kind === "user"
    ? { scopeType: "user", scopeId: scope.userId }
    : { scopeType: "household", scopeId: scope.householdId };
}
