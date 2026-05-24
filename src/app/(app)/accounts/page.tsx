import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { accounts, plaidItems } from "@/lib/db/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LinkAccountButton } from "@/components/link-account-button";
import { SyncButton } from "@/components/sync-button";
import { VisibilityToggle } from "@/components/accounts/visibility-toggle";
import { UnlinkItemButton } from "@/components/accounts/unlink-item-button";
import { formatMoneyCents } from "@/lib/format";
import { getHouseholdState } from "@/lib/queries/household";

export default async function AccountsPage() {
  if (process.env.SENTRY_PREVIEW_TEST !== "off") {
    throw new Error("sentry preview test");
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const [items, allAccounts, household] = await Promise.all([
    db
      .select()
      .from(plaidItems)
      .where(eq(plaidItems.userId, user.id))
      .orderBy(desc(plaidItems.createdAt)),
    db
      .select()
      .from(accounts)
      .where(eq(accounts.userId, user.id))
      .orderBy(accounts.createdAt),
    getHouseholdState(user.id),
  ]);
  const inHousehold = household.inHousehold;

  const accountsByItem = new Map<string, typeof allAccounts>();
  for (const a of allAccounts) {
    if (!a.plaidItemId) continue;
    const list = accountsByItem.get(a.plaidItemId) ?? [];
    list.push(a);
    accountsByItem.set(a.plaidItemId, list);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Accounts</h1>
          <p className="text-sm text-muted-foreground">
            Linked institutions and accounts.
          </p>
        </div>
        <div className="flex gap-2">
          {items.length > 0 ? <SyncButton /> : null}
          <LinkAccountButton />
        </div>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <p className="text-sm text-muted-foreground">No accounts linked yet.</p>
            <p className="text-xs text-muted-foreground">
              Use the &ldquo;Link account&rdquo; button above. In Plaid sandbox, sign in with{" "}
              <code className="rounded bg-muted px-1">user_good</code> /{" "}
              <code className="rounded bg-muted px-1">pass_good</code>.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {items.map((item) => {
            const itemAccounts = accountsByItem.get(item.id) ?? [];
            return (
              <Card key={item.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-3">
                  <div>
                    <CardTitle>{item.institutionName ?? "Linked institution"}</CardTitle>
                    <CardDescription className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-1.5">
                      <span>
                        {itemAccounts.length} account{itemAccounts.length === 1 ? "" : "s"}
                      </span>
                      {item.lastSyncedAt ? (
                        <>
                          <span className="hidden sm:inline">•</span>
                          <span>last synced {new Date(item.lastSyncedAt).toLocaleString()}</span>
                        </>
                      ) : null}
                    </CardDescription>
                  </div>
                  <UnlinkItemButton
                    id={item.id}
                    institutionName={item.institutionName ?? "this institution"}
                  />
                </CardHeader>
                <CardContent className="divide-y">
                  {itemAccounts.map((a) => (
                    <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {a.name}
                          {a.mask ? (
                            <span className="ml-2 text-xs text-muted-foreground">••{a.mask}</span>
                          ) : null}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {a.subtype ?? a.type}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm font-medium tabular-nums">
                            {formatMoneyCents(a.currentBalanceCents, a.isoCurrencyCode ?? "USD")}
                          </p>
                        </div>
                        <VisibilityToggle
                          id={a.id}
                          visibility={a.visibility as "private" | "household"}
                          disabled={!inHousehold}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
