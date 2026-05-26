"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { waitlistSignups } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { generateInviteToken } from "@/lib/waitlist/invite-token";

const INVITE_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    // 404 rather than 403 so the route's existence isn't a tell.
    notFound();
  }
}

function inviteBaseUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export type IssueInviteResult = {
  ok: boolean;
  url?: string;
  error?: string;
};

// Issues a fresh single-use invite for the waitlist row. Returns the raw URL
// once — the caller is responsible for delivering it (email today comes via
// copy/paste; Resend wiring is a follow-up). The token itself is never stored,
// only its sha-256 hash.
export async function issueInvite(formData: FormData): Promise<IssueInviteResult> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Missing id." };

  const [row] = await db
    .select({ email: waitlistSignups.email, signedUpAt: waitlistSignups.signedUpAt })
    .from(waitlistSignups)
    .where(eq(waitlistSignups.id, id))
    .limit(1);

  if (!row) return { ok: false, error: "Waitlist entry not found." };
  if (row.signedUpAt) {
    return { ok: false, error: "This person has already signed up." };
  }

  const { token, hash } = generateInviteToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + INVITE_TTL_MS);

  await db
    .update(waitlistSignups)
    .set({
      invitedAt: now,
      invitedTokenHash: hash,
      invitedTokenExpiresAt: expiresAt,
    })
    .where(eq(waitlistSignups.id, id));

  const url = `${inviteBaseUrl()}/sign-up?token=${token}`;
  revalidatePath("/admin/waitlist");
  return { ok: true, url };
}

export async function revokeInvite(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Missing id." };

  await db
    .update(waitlistSignups)
    .set({ invitedAt: null, invitedTokenHash: null, invitedTokenExpiresAt: null })
    .where(eq(waitlistSignups.id, id));

  revalidatePath("/admin/waitlist");
  return { ok: true };
}

