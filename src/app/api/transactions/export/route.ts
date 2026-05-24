import { desc, eq, sql } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { accounts, transactions } from "@/lib/db/schema";
import { accountScopeFilter, getActiveScope } from "@/lib/scope";
import { csvRow } from "@/lib/csv";
import { prettifyCategory } from "@/lib/format";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("unauthorized", { status: 401 });
  }

  const scope = await getActiveScope(user.id);

  const rows = await db
    .select({
      date: transactions.date,
      name: transactions.name,
      merchantName: transactions.merchantName,
      amountCents: transactions.amountCents,
      isoCurrencyCode: transactions.isoCurrencyCode,
      effectiveCategory: sql<
        string | null
      >`coalesce(${transactions.userCategory}, ${transactions.plaidCategory})`,
      pending: transactions.pending,
      accountName: accounts.name,
      accountMask: accounts.mask,
    })
    .from(transactions)
    .innerJoin(accounts, eq(accounts.id, transactions.accountId))
    .where(accountScopeFilter(scope))
    .orderBy(desc(transactions.date), desc(transactions.createdAt));

  const header = csvRow([
    "date",
    "account",
    "mask",
    "merchant",
    "description",
    "category",
    "amount",
    "currency",
    "pending",
  ]);

  const body = rows
    .map((r) =>
      csvRow([
        r.date,
        r.accountName,
        r.accountMask ?? "",
        r.merchantName ?? "",
        r.name,
        r.effectiveCategory ? prettifyCategory(r.effectiveCategory) : "",
        // Plaid stores outflows as positive; flip so negative = money out,
        // matching Mint/YNAB exports.
        (-r.amountCents / 100).toFixed(2),
        r.isoCurrencyCode ?? "USD",
        r.pending ? "true" : "false",
      ]),
    )
    .join("\n");

  const csv = `${header}\n${body}${body ? "\n" : ""}`;

  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const scopeSlug = scope.kind === "user" ? "personal" : "household";
  const filename = `fincenzo-transactions-${scopeSlug}-${today}.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
