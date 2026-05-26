import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { CountryCode } from "plaid";
import { createClient } from "@/lib/supabase/server";
import { plaid } from "@/lib/plaid/client";
import { db } from "@/lib/db";
import { plaidItems } from "@/lib/db/schema";
import { decryptToken } from "@/lib/crypto";

// Create a Link token in "update mode" so the user can re-authenticate an
// existing item without unlinking. Triggered when an item is in
// `login_required` (Plaid's ITEM_LOGIN_REQUIRED) or pending expiration.
// See: https://plaid.com/docs/link/update-mode/
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { item_id?: string };
  if (!body.item_id) {
    return NextResponse.json({ error: "item_id required" }, { status: 400 });
  }

  const item = await db.query.plaidItems.findFirst({
    where: and(eq(plaidItems.id, body.item_id), eq(plaidItems.userId, user.id)),
  });
  if (!item) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const webhook = siteUrl ? `${siteUrl}/api/plaid/webhook` : undefined;
  const redirectUri = siteUrl ? `${siteUrl}/plaid-oauth` : undefined;

  const { data } = await plaid.linkTokenCreate({
    user: { client_user_id: user.id },
    client_name: "Fincenzo",
    // In update mode, products MUST be omitted; access_token identifies the item.
    country_codes: [CountryCode.Us],
    language: "en",
    access_token: decryptToken(item.accessToken),
    webhook,
    redirect_uri: redirectUri,
  });

  return NextResponse.json({ link_token: data.link_token });
}
