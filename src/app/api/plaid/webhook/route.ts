import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { plaidItems } from "@/lib/db/schema";
import { syncHoldings, syncItem } from "@/lib/plaid/sync";
import { snapshotNetWorth } from "@/lib/queries/net-worth";
import { verifyWebhook } from "@/lib/plaid/webhook-verify";
import { PlaidApiError } from "@/lib/plaid/errors";

// Plaid sends webhooks for many event types. We act on the transactions-sync
// signals and on ITEM lifecycle events that change reconnection state; the
// rest are acknowledged with 200 so Plaid stops retrying.
//
// See: https://plaid.com/docs/api/products/transactions/#webhooks
//      https://plaid.com/docs/api/items/#webhooks
type PlaidWebhookBody = {
  webhook_type?: string;
  webhook_code?: string;
  item_id?: string;
  error?: { error_code?: string; error_type?: string } | null;
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

  const item = await db.query.plaidItems.findFirst({
    where: eq(plaidItems.plaidItemId, item_id),
  });
  if (!item) {
    // Not one of ours — return 200 so Plaid stops retrying.
    return NextResponse.json({ ok: true, ignored: "unknown item" });
  }

  if (webhook_type === "HOLDINGS" && webhook_code === "DEFAULT_UPDATE") {
    try {
      await syncHoldings(item.id);
      await snapshotNetWorth(item.userId);
    } catch (err) {
      Sentry.captureException(err, {
        tags: { area: "plaid-webhook-holdings", webhook_code },
        extra: { itemId: item.id },
      });
      throw err;
    }
    return NextResponse.json({ ok: true, synced: item.id });
  }

  if (webhook_type === "ITEM") {
    const nextStatus = mapItemWebhookToStatus(webhook_code, body.error?.error_code);
    if (nextStatus && nextStatus !== item.status) {
      await db.update(plaidItems).set({ status: nextStatus }).where(eq(plaidItems.id, item.id));
    }
    return NextResponse.json({ ok: true, item: item.id, status: nextStatus ?? item.status });
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

  try {
    await syncItem(item.id);
    await snapshotNetWorth(item.userId);
  } catch (err) {
    const tags: Record<string, string> = {
      area: "plaid-webhook",
      webhook_code: webhook_code ?? "unknown",
    };
    const extra: Record<string, unknown> = { itemId: item.id };
    if (err instanceof PlaidApiError) {
      tags.endpoint = err.endpoint;
      tags.plaid_error_code = err.body.error_code ?? "UNKNOWN";
      tags.plaid_error_type = err.body.error_type ?? "UNKNOWN";
      extra.status = err.status;
      extra.body = err.body;
    }
    Sentry.captureException(err, { tags, extra });
    throw err;
  }
  return NextResponse.json({ ok: true, synced: item.id });
}

function mapItemWebhookToStatus(
  code: string | undefined,
  errorCode: string | undefined,
): "healthy" | "login_required" | "error" | null {
  switch (code) {
    case "ERROR":
      // Only ITEM_LOGIN_REQUIRED is recoverable via Link update mode; other
      // errors (INSTITUTION_DOWN, etc.) are transient and shouldn't flip status.
      return errorCode === "ITEM_LOGIN_REQUIRED" ? "login_required" : null;
    case "PENDING_EXPIRATION":
    case "PENDING_DISCONNECT":
      return "login_required";
    case "USER_PERMISSION_REVOKED":
    case "USER_ACCOUNT_REVOKED":
      return "error";
    case "LOGIN_REPAIRED":
      return "healthy";
    default:
      return null;
  }
}
