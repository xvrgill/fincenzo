import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { waitlistSignups } from "@/lib/db/schema";

// Lightweight in-memory rate limit. One process per Vercel function instance
// keeps a sliding window of recent IPs; abuse on a single instance is throttled
// without needing Redis. For production-scale abuse we'd front this with an
// edge rate limiter, but it's enough for an invite-only waitlist.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

function isRateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > MAX_PER_WINDOW;
}

// RFC 5322 is wildly permissive; this is the practical subset that browsers
// already validate <input type="email"> against.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clientIp(req: NextRequest) {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(request: NextRequest) {
  const ip = clientIp(request);
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { ok: false, error: "Too many requests. Try again in a minute." },
      { status: 429 },
    );
  }

  let body: { email?: unknown; source?: unknown; website?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  // Honeypot — bots tend to fill every field, real users never see it.
  if (typeof body.website === "string" && body.website.length > 0) {
    return NextResponse.json({ ok: true });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { ok: false, error: "Please enter a valid email address." },
      { status: 400 },
    );
  }

  const source =
    typeof body.source === "string" && body.source.length <= 64 ? body.source : null;
  const referrer = request.headers.get("referer");

  try {
    await db
      .insert(waitlistSignups)
      .values({
        email,
        source,
        referrer: referrer && referrer.length <= 512 ? referrer : null,
      })
      .onConflictDoNothing({ target: waitlistSignups.email });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
