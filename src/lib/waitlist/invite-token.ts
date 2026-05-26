import { createHash, randomBytes } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { waitlistSignups } from "@/lib/db/schema";

// Invite tokens are random 32-byte URL-safe strings handed out by email. We
// store only their sha-256 hash in the DB so a leak of `waitlist_signups`
// doesn't let an attacker hijack pending invites. Tokens are single-use:
// `signed_up_at` is set on successful consumption and the lookup ignores
// rows where it's already non-null.

export function generateInviteToken(): { token: string; hash: string } {
  const token = randomBytes(24).toString("base64url");
  return { token, hash: hashInviteToken(token) };
}

export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type InviteLookup =
  | { kind: "valid"; email: string }
  | { kind: "missing" }
  | { kind: "expired" }
  | { kind: "consumed" };

export async function lookupInviteToken(token: string): Promise<InviteLookup> {
  if (!token || token.length < 16 || token.length > 128) return { kind: "missing" };
  const hash = hashInviteToken(token);
  const [row] = await db
    .select({
      email: waitlistSignups.email,
      expiresAt: waitlistSignups.invitedTokenExpiresAt,
      signedUpAt: waitlistSignups.signedUpAt,
    })
    .from(waitlistSignups)
    .where(eq(waitlistSignups.invitedTokenHash, hash))
    .limit(1);

  if (!row) return { kind: "missing" };
  if (row.signedUpAt) return { kind: "consumed" };
  if (row.expiresAt && row.expiresAt.getTime() < Date.now()) return { kind: "expired" };
  return { kind: "valid", email: row.email };
}

// Atomically consume the token: only marks signed_up_at if the row is still
// unconsumed. Returns true if this call was the one that won the race.
export async function consumeInviteToken(token: string): Promise<boolean> {
  const hash = hashInviteToken(token);
  const updated = await db
    .update(waitlistSignups)
    .set({ signedUpAt: new Date() })
    .where(
      and(
        eq(waitlistSignups.invitedTokenHash, hash),
        isNull(waitlistSignups.signedUpAt),
      ),
    )
    .returning({ id: waitlistSignups.id });
  return updated.length > 0;
}
