"use server";

import { and, eq, gt, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { db } from "@/lib/db";
import {
  accounts,
  householdInvites,
  householdMembers,
  households,
  users,
} from "@/lib/db/schema";
import { backfillHouseholdSnapshots, snapshotNetWorth } from "@/lib/queries/net-worth";
import { logActivity } from "@/lib/activity";

const INVITE_TTL_DAYS = 14;
const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");
  return user;
}

async function householdForUser(userId: string) {
  const rows = await db
    .select({ householdId: householdMembers.householdId, role: householdMembers.role })
    .from(householdMembers)
    .where(eq(householdMembers.userId, userId))
    .limit(1);
  return rows[0] ?? null;
}

export async function createHousehold(formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("name required");

  const existing = await householdForUser(user.id);
  if (existing) throw new Error("You are already in a household");

  const [household] = await db
    .insert(households)
    .values({ name, createdById: user.id })
    .returning({ id: households.id });

  await db.insert(householdMembers).values({
    householdId: household.id,
    userId: user.id,
    role: "owner",
  });

  await snapshotNetWorth(user.id);
  await logActivity(household.id, user.id, "household.created", { name });

  revalidatePath("/household");
  revalidatePath("/", "layout");
}

export async function inviteToHousehold(formData: FormData) {
  const user = await requireUser();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!email) throw new Error("email required");
  if (email === (user.email ?? "").toLowerCase()) {
    throw new Error("You can't invite yourself");
  }

  const membership = await householdForUser(user.id);
  if (!membership) throw new Error("You're not in a household yet");

  // Don't send duplicate pending invites to the same email.
  const dup = await db
    .select({ id: householdInvites.id })
    .from(householdInvites)
    .where(
      and(
        eq(householdInvites.householdId, membership.householdId),
        eq(householdInvites.email, email),
        eq(householdInvites.status, "pending"),
      ),
    )
    .limit(1);
  if (dup[0]) throw new Error("That email already has a pending invite");

  // Don't invite someone who's already a member of this household.
  const alreadyMember = await db
    .select({ userId: householdMembers.userId })
    .from(householdMembers)
    .innerJoin(users, eq(users.id, householdMembers.userId))
    .where(
      and(
        eq(householdMembers.householdId, membership.householdId),
        sql`lower(${users.email}) = ${email}`,
      ),
    )
    .limit(1);
  if (alreadyMember[0]) throw new Error("That person is already in this household");

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITE_TTL_DAYS);

  await db.insert(householdInvites).values({
    householdId: membership.householdId,
    email,
    invitedById: user.id,
    expiresAt,
  });

  // Try to send an email. If the recipient already has an account, Supabase
  // returns an error and we silently fall back to the in-app banner.
  try {
    const admin = createAdminClient();
    await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${siteUrl()}/household?invited=1`,
    });
  } catch {
    // Email send failed (most often: user already exists). The invite row is
    // still in the DB and the in-app banner will pick it up on next sign-in.
  }

  await logActivity(membership.householdId, user.id, "invite.sent", { email });

  revalidatePath("/household");
}

export async function revokeInvite(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("id required");

  const membership = await householdForUser(user.id);
  if (!membership) throw new Error("You're not in a household");

  const [revoked] = await db
    .update(householdInvites)
    .set({ status: "revoked" })
    .where(
      and(
        eq(householdInvites.id, id),
        eq(householdInvites.householdId, membership.householdId),
      ),
    )
    .returning({ email: householdInvites.email });

  if (revoked) {
    await logActivity(membership.householdId, user.id, "invite.revoked", { email: revoked.email });
  }

  revalidatePath("/household");
}

export async function acceptInvite(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("id required");

  if (!user.email) throw new Error("Your account has no email on file");
  const email = user.email.toLowerCase();

  // Look up the pending invite and make sure it's addressed to this user and
  // not expired.
  const [invite] = await db
    .select({
      id: householdInvites.id,
      householdId: householdInvites.householdId,
      email: householdInvites.email,
      status: householdInvites.status,
      expiresAt: householdInvites.expiresAt,
    })
    .from(householdInvites)
    .where(
      and(
        eq(householdInvites.id, id),
        eq(householdInvites.status, "pending"),
        gt(householdInvites.expiresAt, new Date()),
      ),
    )
    .limit(1);
  if (!invite) throw new Error("Invite not found or expired");
  if (invite.email.toLowerCase() !== email) throw new Error("Invite isn't for you");

  const existing = await householdForUser(user.id);
  if (existing) throw new Error("Leave your current household before accepting another invite");

  await db.insert(householdMembers).values({
    householdId: invite.householdId,
    userId: user.id,
    role: "member",
  });
  await db
    .update(householdInvites)
    .set({ status: "accepted" })
    .where(eq(householdInvites.id, id));

  // Now that two members exist, backfill historical household snapshots and
  // take a fresh one today so the chart isn't empty.
  await snapshotNetWorth(user.id);
  await backfillHouseholdSnapshots(invite.householdId);
  await logActivity(invite.householdId, user.id, "invite.accepted", { email });

  revalidatePath("/household");
  revalidatePath("/net-worth");
  revalidatePath("/", "layout");
}

export async function declineInvite(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("id required");
  if (!user.email) throw new Error("Your account has no email on file");
  const email = user.email.toLowerCase();

  const [declined] = await db
    .update(householdInvites)
    .set({ status: "revoked" })
    .where(
      and(
        eq(householdInvites.id, id),
        eq(householdInvites.status, "pending"),
        sql`lower(${householdInvites.email}) = ${email}`,
      ),
    )
    .returning({ householdId: householdInvites.householdId });

  if (declined) {
    await logActivity(declined.householdId, user.id, "invite.declined", { email });
  }

  revalidatePath("/household");
  revalidatePath("/", "layout");
}

export async function leaveHousehold() {
  const user = await requireUser();
  const membership = await householdForUser(user.id);
  if (!membership) throw new Error("You're not in a household");

  // Log before removing membership so the household row still exists in case
  // this is the last member (the log row references the household via FK).
  await logActivity(membership.householdId, user.id, "household.left");

  // Auto-revoke account sharing so we don't leave accounts marked "household"
  // that no longer belong to any household.
  await db
    .update(accounts)
    .set({ visibility: "private" })
    .where(and(eq(accounts.userId, user.id), eq(accounts.visibility, "household")));

  await db
    .delete(householdMembers)
    .where(
      and(
        eq(householdMembers.householdId, membership.householdId),
        eq(householdMembers.userId, user.id),
      ),
    );

  // If that was the last member, delete the household entirely so we don't
  // leave orphans. Also revoke any of its still-pending invites.
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(householdMembers)
    .where(eq(householdMembers.householdId, membership.householdId));
  if (Number(count) === 0) {
    await db
      .update(householdInvites)
      .set({ status: "revoked" })
      .where(
        and(
          eq(householdInvites.householdId, membership.householdId),
          eq(householdInvites.status, "pending"),
        ),
      );
    await db.delete(households).where(eq(households.id, membership.householdId));
  }

  revalidatePath("/household");
  revalidatePath("/", "layout");
}
