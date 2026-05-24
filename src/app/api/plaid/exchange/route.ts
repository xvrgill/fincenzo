import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { plaid } from "@/lib/plaid/client";
import { db } from "@/lib/db";
import { plaidItems } from "@/lib/db/schema";
import { syncItem } from "@/lib/plaid/sync";
import { snapshotNetWorth } from "@/lib/queries/net-worth";
import { encryptToken } from "@/lib/crypto";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    public_token?: string;
    institution?: { institution_id?: string; name?: string };
  };
  if (!body.public_token) {
    return NextResponse.json({ error: "public_token required" }, { status: 400 });
  }

  const exchange = await plaid.itemPublicTokenExchange({ public_token: body.public_token });

  const [inserted] = await db
    .insert(plaidItems)
    .values({
      userId: user.id,
      plaidItemId: exchange.data.item_id,
      accessToken: encryptToken(exchange.data.access_token),
      institutionId: body.institution?.institution_id,
      institutionName: body.institution?.name,
    })
    .returning({ id: plaidItems.id });

  const syncResult = await syncItem(inserted.id);
  await snapshotNetWorth(user.id);

  return NextResponse.json({ item_id: inserted.id, ...syncResult });
}
