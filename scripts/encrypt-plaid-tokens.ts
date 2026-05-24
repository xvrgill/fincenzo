// One-shot backfill: encrypt any plaintext plaid_items.access_token rows.
// Idempotent — rows already in "v1:..." form are skipped.
//
// Usage:
//   npx tsx --env-file=.env.local scripts/encrypt-plaid-tokens.ts
//
// Run locally against whichever DB your DATABASE_URL points at. Make sure
// PLAID_TOKEN_ENCRYPTION_KEY is set to the same value the app will use.

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { plaidItems } from "@/lib/db/schema";
import { encryptToken, isEncrypted } from "@/lib/crypto";

async function main() {
  const rows = await db.select({ id: plaidItems.id, accessToken: plaidItems.accessToken }).from(plaidItems);
  let encrypted = 0;
  let skipped = 0;
  for (const row of rows) {
    if (isEncrypted(row.accessToken)) {
      skipped += 1;
      continue;
    }
    const next = encryptToken(row.accessToken);
    await db.update(plaidItems).set({ accessToken: next }).where(eq(plaidItems.id, row.id));
    encrypted += 1;
  }
  console.log(`done: encrypted=${encrypted} skipped=${skipped} total=${rows.length}`);
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
