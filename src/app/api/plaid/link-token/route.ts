import { NextResponse } from "next/server";
import { CountryCode, Products } from "plaid";
import { createClient } from "@/lib/supabase/server";
import { plaid } from "@/lib/plaid/client";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Plaid binds the webhook URL to each Item at link time. Items created
  // before this field was set will keep pinging the old URL (or none); update
  // those via /item/webhook/update or just re-link.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const webhook = siteUrl ? `${siteUrl}/api/plaid/webhook` : undefined;

  const { data } = await plaid.linkTokenCreate({
    user: { client_user_id: user.id },
    client_name: "Fincenzo",
    // Investments requires Plaid approval in production; sandbox/development
    // works out of the box. Using optional_products means brokerages return
    // holdings on link; banks-only institutions (credit cards, etc.) still
    // link successfully and just skip the product.
    products: [Products.Transactions],
    optional_products: [Products.Investments],
    country_codes: [CountryCode.Us],
    language: "en",
    webhook,
  });

  return NextResponse.json({ link_token: data.link_token });
}
