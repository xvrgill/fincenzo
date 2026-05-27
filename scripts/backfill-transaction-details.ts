// One-shot backfill: populate the detail fields added in migration 0005
// (payment_channel, merchant_logo_url, merchant_website, original_description,
// location_*) for transactions that were synced before the schema change.
//
// /transactions/sync only emits added/modified events, so historical rows
// never get a second pass. This script pulls them via /transactions/get and
// updates in place, matched by plaid_transaction_id.
//
// Idempotent — rows whose detail fields are all already populated are skipped
// at update time (the UPDATE just no-ops). Runs against whichever database
// DATABASE_URL points at; use the same env vars the deployed app uses.
//
// Usage:
//   npx tsx --env-file=.env.local scripts/backfill-transaction-details.ts
//
// Flags:
//   --days=N    How far back to fetch (default 730 = ~2 years).
//   --item=ID   Only backfill a single plaid_items.id.
//   --dry-run   Print what would change without writing.

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { plaidItems, transactions } from "@/lib/db/schema";
import { decryptToken } from "@/lib/crypto";
import { plaid } from "@/lib/plaid/client";
import { callPlaid, PlaidApiError } from "@/lib/plaid/errors";

type Args = { days: number; itemId: string | null; dryRun: boolean };

function parseArgs(): Args {
  const out: Args = { days: 730, itemId: null, dryRun: false };
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--days=")) out.days = Number(arg.slice(7)) || out.days;
    else if (arg.startsWith("--item=")) out.itemId = arg.slice(7);
    else if (arg === "--dry-run") out.dryRun = true;
  }
  return out;
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function backfillItem(itemId: string, accessTokenEnc: string, args: Args) {
  const accessToken = decryptToken(accessTokenEnc);
  const endDate = toDateStr(new Date());
  const startDate = toDateStr(new Date(Date.now() - args.days * 86400_000));

  const pageSize = 500;
  let offset = 0;
  let total = Infinity;
  let pulled = 0;
  let updated = 0;

  while (offset < total) {
    const { data } = await callPlaid("transactions/get", () =>
      plaid.transactionsGet({
        access_token: accessToken,
        start_date: startDate,
        end_date: endDate,
        options: {
          count: pageSize,
          offset,
          include_original_description: true,
        },
      }),
    );
    total = data.total_transactions;
    pulled += data.transactions.length;

    for (const t of data.transactions) {
      const loc = t.location ?? {};
      const set = {
        paymentChannel: t.payment_channel ?? null,
        merchantLogoUrl: t.logo_url ?? null,
        merchantWebsite: t.website ?? null,
        originalDescription: t.original_description ?? null,
        locationAddress: loc.address ?? null,
        locationCity: loc.city ?? null,
        locationRegion: loc.region ?? null,
        locationPostalCode: loc.postal_code ?? null,
        locationCountry: loc.country ?? null,
        locationLat: loc.lat ?? null,
        locationLon: loc.lon ?? null,
        locationStoreNumber: loc.store_number ?? null,
      };
      // Skip the write if every field is null — saves a no-op UPDATE per row.
      const anyValue = Object.values(set).some((v) => v != null);
      if (!anyValue) continue;

      if (args.dryRun) {
        updated += 1;
        continue;
      }

      const result = await db
        .update(transactions)
        .set(set)
        .where(eq(transactions.plaidTransactionId, t.transaction_id))
        .returning({ id: transactions.id });
      if (result.length > 0) updated += 1;
    }

    offset += data.transactions.length;
    if (data.transactions.length === 0) break;
  }

  console.log(
    `  item=${itemId} pulled=${pulled}/${total} updated=${updated}${args.dryRun ? " (dry-run)" : ""}`,
  );
}

async function main() {
  const args = parseArgs();
  console.log(
    `backfill: days=${args.days} item=${args.itemId ?? "all"} dryRun=${args.dryRun}`,
  );

  const rows = args.itemId
    ? await db
        .select({ id: plaidItems.id, accessToken: plaidItems.accessToken })
        .from(plaidItems)
        .where(eq(plaidItems.id, args.itemId))
    : await db
        .select({ id: plaidItems.id, accessToken: plaidItems.accessToken })
        .from(plaidItems);

  if (rows.length === 0) {
    console.log("no plaid items to process");
    return;
  }

  for (const row of rows) {
    try {
      await backfillItem(row.id, row.accessToken, args);
    } catch (err) {
      if (err instanceof PlaidApiError) {
        console.error(
          `  item=${row.id} skipped: ${err.body.error_code ?? "ERR"} ${err.body.error_message ?? ""}`,
        );
      } else {
        console.error(`  item=${row.id} failed:`, err);
      }
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
