import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { plaidItems } from "@/lib/db/schema";
import { syncItem } from "@/lib/plaid/sync";
import { snapshotNetWorth } from "@/lib/queries/net-worth";
import { PlaidApiError } from "@/lib/plaid/errors";

// Called by the client after Link update-mode closes successfully. Re-syncs
// the item; if sync succeeds it sets status back to healthy (handled inside
// syncItem). On failure we surface the Plaid error so the UI can react.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { item_id?: string };
  if (!body.item_id) {
    return NextResponse.json({ error: "item_id required" }, { status: 400 });
  }

  const item = await db.query.plaidItems.findFirst({
    where: and(eq(plaidItems.id, body.item_id), eq(plaidItems.userId, user.id)),
  });
  if (!item) return NextResponse.json({ error: "not found" }, { status: 404 });

  try {
    const result = await syncItem(item.id);
    await snapshotNetWorth(user.id);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof PlaidApiError) {
      return NextResponse.json(
        {
          ok: false,
          errorCode: err.body.error_code ?? "UNKNOWN",
          errorMessage: err.body.error_message,
        },
        { status: 502 },
      );
    }
    throw err;
  }
}
