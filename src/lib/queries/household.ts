import { and, asc, eq, gt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { householdInvites, householdMembers, households, users } from "@/lib/db/schema";

export type HouseholdState =
  | {
      inHousehold: true;
      household: { id: string; name: string };
      myRole: "owner" | "member";
      members: Array<{
        userId: string;
        email: string;
        displayName: string | null;
        role: "owner" | "member";
        joinedAt: Date;
      }>;
      pendingInvites: Array<{
        id: string;
        email: string;
        expiresAt: Date;
      }>;
    }
  | { inHousehold: false };

export async function getHouseholdState(userId: string): Promise<HouseholdState> {
  const [me] = await db
    .select({
      householdId: householdMembers.householdId,
      role: householdMembers.role,
    })
    .from(householdMembers)
    .where(eq(householdMembers.userId, userId))
    .limit(1);

  if (!me) return { inHousehold: false };

  const [householdRow] = await db
    .select({ id: households.id, name: households.name })
    .from(households)
    .where(eq(households.id, me.householdId))
    .limit(1);
  if (!householdRow) return { inHousehold: false };

  const members = await db
    .select({
      userId: householdMembers.userId,
      role: householdMembers.role,
      joinedAt: householdMembers.joinedAt,
      email: users.email,
      displayName: users.displayName,
    })
    .from(householdMembers)
    .innerJoin(users, eq(users.id, householdMembers.userId))
    .where(eq(householdMembers.householdId, me.householdId))
    .orderBy(asc(householdMembers.joinedAt));

  const pendingInvites = await db
    .select({
      id: householdInvites.id,
      email: householdInvites.email,
      expiresAt: householdInvites.expiresAt,
    })
    .from(householdInvites)
    .where(
      and(
        eq(householdInvites.householdId, me.householdId),
        eq(householdInvites.status, "pending"),
        gt(householdInvites.expiresAt, new Date()),
      ),
    )
    .orderBy(asc(householdInvites.createdAt));

  return {
    inHousehold: true,
    household: householdRow,
    myRole: me.role,
    members,
    pendingInvites,
  };
}

export type PendingInviteForUser = {
  id: string;
  householdId: string;
  householdName: string;
  invitedByEmail: string | null;
  expiresAt: Date;
};

/**
 * Pending invites addressed to this email — used to render the accept/decline
 * banner. Excludes invites for households the user is already in.
 */
export async function getPendingInvitesForEmail(
  email: string,
  userId: string,
): Promise<PendingInviteForUser[]> {
  const rows = await db
    .select({
      id: householdInvites.id,
      householdId: householdInvites.householdId,
      householdName: households.name,
      invitedByEmail: users.email,
      expiresAt: householdInvites.expiresAt,
    })
    .from(householdInvites)
    .innerJoin(households, eq(households.id, householdInvites.householdId))
    .innerJoin(users, eq(users.id, householdInvites.invitedById))
    .where(
      and(
        sql`lower(${householdInvites.email}) = ${email.toLowerCase()}`,
        eq(householdInvites.status, "pending"),
        gt(householdInvites.expiresAt, new Date()),
      ),
    )
    .orderBy(asc(householdInvites.createdAt));

  if (rows.length === 0) return [];

  // Exclude households the user is already in (shouldn't happen given
  // inviteToHousehold checks, but defense in depth).
  const myHouseholds = await db
    .select({ householdId: householdMembers.householdId })
    .from(householdMembers)
    .where(eq(householdMembers.userId, userId));
  const mine = new Set(myHouseholds.map((m) => m.householdId));

  return rows.filter((r) => !mine.has(r.householdId));
}
