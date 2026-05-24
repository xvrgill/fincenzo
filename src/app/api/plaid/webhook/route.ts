import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { plaidItems } from "@/lib/db/schema";
import { syncItem } from "@/lib/plaid/sync";
import { snapshotNetWorth } from "@/lib/queries/net-worth";
import { verifyWebhook } from "@/lib/plaid/webhook-verify";

// Plaid sends webhooks for many event types. We act on the transactions-sync
// signals and ignore the rest (acknowledged with 200 so Plaid stops retrying).
//
// See: https://plaid.com/docs/api/products/transactions/#webhooks
type PlaidWebhookBody = {
  webhook_type?: string;
  webhook_code?: string;
  item_id?: string;
};

export async function POST(request: Request) {
  const rawBody = await request.text();
  const verified = await verifyWebhook(rawBody, request.headers.get("plaid-verification"));
  if (!verified) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let body: PlaidWebhookBody;
  try {
    body = JSON.parse(rawBody) as PlaidWebhookBody;
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const { webhook_type, webhook_code, item_id } = body;
  if (!item_id) {
    return NextResponse.json({ ok: true, ignored: "missing item_id" });
  }

  // Triggers that mean "new or changed transaction data is available."
  const shouldSync =
    webhook_type === "TRANSACTIONS" &&
    (webhook_code === "SYNC_UPDATES_AVAILABLE" ||
      webhook_code === "INITIAL_UPDATE" ||
      webhook_code === "HISTORICAL_UPDATE" ||
      webhook_code === "DEFAULT_UPDATE");

  if (!shouldSync) {
    return NextResponse.json({ ok: true, ignored: `${webhook_type}/${webhook_code}` });
  }

  const item = await db.query.plaidItems.findFirst({
    where: eq(plaidItems.plaidItemId, item_id),
  });
  if (!item) {
    // Not one of ours — return 200 so Plaid stops retrying.
    return NextResponse.json({ ok: true, ignored: "unknown item" });
  }

  try {
    await syncItem(item.id);
    await snapshotNetWorth(item.userId);
  } catch (err) {
    Sentry.captureException(err, {
      tags: { area: "plaid-webhook", webhook_code: webhook_code ?? "unknown" },
      extra: { itemId: item.id },
    });
    throw err;
  }
  return NextResponse.json({ ok: true, synced: item.id });
}
