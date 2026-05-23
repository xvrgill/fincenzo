import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { activityLog, householdMembers, users } from "@/lib/db/schema";

export type ActivityKind =
  | "household.created"
  | "household.left"
  | "invite.sent"
  | "invite.revoked"
  | "invite.accepted"
  | "invite.declined"
  | "account.shared"
  | "account.unshared"
  | "budget.created"
  | "budget.deleted"
  | "goal.created"
  | "goal.deleted";

export async function logActivity(
  householdId: string,
  actorUserId: string,
  kind: ActivityKind,
  payload: Record<string, unknown> = {},
): Promise<void> {
  await db.insert(activityLog).values({ householdId, actorUserId, kind, payload });
}

/**
 * Look up the user's current household (if any) and log an event against it.
 * No-op when the user isn't in a household — keeps call sites simple.
 */
export async function logIfInHousehold(
  userId: string,
  kind: ActivityKind,
  payload: Record<string, unknown> = {},
): Promise<void> {
  const [row] = await db
    .select({ householdId: householdMembers.householdId })
    .from(householdMembers)
    .where(eq(householdMembers.userId, userId))
    .limit(1);
  if (!row) return;
  await logActivity(row.householdId, userId, kind, payload);
}

export type ActivityEntry = {
  id: string;
  kind: string;
  payload: Record<string, unknown>;
  createdAt: Date;
  actorUserId: string;
  actorEmail: string;
  actorDisplayName: string | null;
};

export async function getHouseholdActivity(
  householdId: string,
  limit = 30,
): Promise<ActivityEntry[]> {
  const rows = await db
    .select({
      id: activityLog.id,
      kind: activityLog.kind,
      payload: activityLog.payload,
      createdAt: activityLog.createdAt,
      actorUserId: activityLog.actorUserId,
      actorEmail: users.email,
      actorDisplayName: users.displayName,
    })
    .from(activityLog)
    .innerJoin(users, eq(users.id, activityLog.actorUserId))
    .where(and(eq(activityLog.householdId, householdId)))
    .orderBy(desc(activityLog.createdAt))
    .limit(limit);
  return rows.map((r) => ({
    ...r,
    payload: (r.payload ?? {}) as Record<string, unknown>,
  }));
}
