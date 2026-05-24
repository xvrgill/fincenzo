import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { snapshotNetWorth } from "@/lib/queries/net-worth";

// Daily net-worth snapshot job, invoked by Vercel Cron (see vercel.json).
// Guarded by CRON_SECRET — Vercel sends `Authorization: Bearer ${CRON_SECRET}`
// automatically when the env var is set in the project.
export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const rows = await db.select({ id: users.id }).from(users);
  let succeeded = 0;
  let failed = 0;
  for (const u of rows) {
    try {
      await snapshotNetWorth(u.id);
      succeeded += 1;
    } catch (err) {
      failed += 1;
      console.error(`snapshot failed for user ${u.id}:`, err);
    }
  }
  return NextResponse.json({ total: rows.length, succeeded, failed });
}
