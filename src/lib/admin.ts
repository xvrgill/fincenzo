// Admin allowlist driven by the ADMIN_EMAILS env var. Comma-separated list,
// matched case-insensitively. Empty/unset means no admins — admin routes
// 404 by default rather than silently letting any signed-in user through.

export function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAdminEmails().includes(email.toLowerCase());
}
