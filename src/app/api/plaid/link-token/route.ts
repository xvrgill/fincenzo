import { NextResponse } from "next/server";
import { CountryCode, Products } from "plaid";
import { createClient } from "@/lib/supabase/server";
import { plaid } from "@/lib/plaid/client";

type LinkMode = "banking" | "investments";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let mode: LinkMode = "banking";
  try {
    const body = (await request.json()) as { mode?: LinkMode } | null;
    if (body?.mode === "investments") mode = "investments";
  } catch {
    // No body / not JSON — keep default.
  }

  // Plaid binds the webhook URL to each Item at link time. Items created
  // before this field was set will keep pinging the old URL (or none); update
  // those via /item/webhook/update or just re-link.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const webhook = siteUrl ? `${siteUrl}/api/plaid/webhook` : undefined;

  // Plaid filters institutions to those supporting every entry in `products`.
  // Brokers like Fidelity/Vanguard/Schwab don't support Transactions, so a
  // banking-style token hides them. Investments mode flips which product is
  // required and keeps the other best-effort.
  const products =
    mode === "investments" ? [Products.Investments] : [Products.Transactions];
  const requiredIfSupported =
    mode === "investments" ? [Products.Transactions] : undefined;
  const optional =
    mode === "investments" ? undefined : [Products.Investments];

  const { data } = await plaid.linkTokenCreate({
    user: { client_user_id: user.id },
    client_name: "Fincenzo",
    products,
    optional_products: optional,
    required_if_supported_products: requiredIfSupported,
    country_codes: [CountryCode.Us],
    language: "en",
    webhook,
  });

  return NextResponse.json({ link_token: data.link_token });
}
