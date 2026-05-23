import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncAllItems } from "@/lib/plaid/sync";
import { snapshotNetWorth } from "@/lib/queries/net-worth";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const results = await syncAllItems(user.id);
  await snapshotNetWorth(user.id);
  return NextResponse.json({ results });
}
