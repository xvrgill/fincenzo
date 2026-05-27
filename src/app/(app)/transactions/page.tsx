import Link from "next/link";
import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { Download, Settings2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { accounts, transactions, users as usersTable } from "@/lib/db/schema";
import { Card, CardContent } from "@/components/ui/card";
import { getAllUserCategories } from "@/lib/queries/categories";
import { accountScopeFilter, getActiveScope } from "@/lib/scope";
import { buildOrderBy, buildWhere, parseFiltersFromSearchParams } from "@/lib/transactions/filters";
import { TransactionsView } from "@/components/transactions/transactions-view";

const PAGE_LIMIT = 300;

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const sp = await searchParams;
  const filters = parseFiltersFromSearchParams(sp);
  const scope = await getActiveScope(user.id);
  const baseScope = accountScopeFilter(scope);
  const where = buildWhere(filters, baseScope);
  const orderBy = buildOrderBy(filters.sort);

  const [rows, availableCategories, scopedAccounts] = await Promise.all([
    db
      .select({
        id: transactions.id,
        date: transactions.date,
        name: transactions.name,
        merchantName: transactions.merchantName,
        amountCents: transactions.amountCents,
        isoCurrencyCode: transactions.isoCurrencyCode,
        effectiveCategory: sql<string | null>`coalesce(${transactions.userCategory}, ${transactions.plaidCategory})`,
        pending: transactions.pending,
        accountId: transactions.accountId,
        accountName: accounts.name,
        accountMask: accounts.mask,
        ownerUserId: accounts.userId,
        ownerDisplayName: usersTable.displayName,
        ownerEmail: usersTable.email,
        paymentChannel: transactions.paymentChannel,
        merchantLogoUrl: transactions.merchantLogoUrl,
        merchantWebsite: transactions.merchantWebsite,
        originalDescription: transactions.originalDescription,
        locationAddress: transactions.locationAddress,
        locationCity: transactions.locationCity,
        locationRegion: transactions.locationRegion,
        locationPostalCode: transactions.locationPostalCode,
        locationCountry: transactions.locationCountry,
        locationLat: transactions.locationLat,
        locationLon: transactions.locationLon,
        locationStoreNumber: transactions.locationStoreNumber,
      })
      .from(transactions)
      .innerJoin(accounts, eq(accounts.id, transactions.accountId))
      .innerJoin(usersTable, eq(usersTable.id, accounts.userId))
      .where(where)
      .orderBy(...orderBy)
      .limit(PAGE_LIMIT),
    getAllUserCategories(user.id),
    db
      .select({
        id: accounts.id,
        name: accounts.name,
        mask: accounts.mask,
        ownerUserId: accounts.userId,
        ownerDisplayName: usersTable.displayName,
        ownerEmail: usersTable.email,
      })
      .from(accounts)
      .innerJoin(usersTable, eq(usersTable.id, accounts.userId))
      .where(baseScope)
      .orderBy(accounts.name),
  ]);

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
          <p className="text-sm text-muted-foreground">
            {rows.length === 0
              ? "No transactions match. Try clearing filters, or link an account on the Accounts page."
              : `Showing ${rows.length} transactions. Click any row for details.`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <a
            href="/api/transactions/export"
            download
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Download className="size-3.5" />
            Export CSV
          </a>
          <Link
            href="/transactions/rules"
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Settings2 className="size-3.5" />
            Manage rules
          </Link>
        </div>
      </div>

      <TransactionsView
        currentUserId={user.id}
        rows={rows}
        accounts={scopedAccounts}
        availableCategories={availableCategories}
        isHouseholdScope={scope.kind === "household"}
        mapboxToken={mapboxToken}
      />

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nothing here yet.
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
