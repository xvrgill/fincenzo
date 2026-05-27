import { and, asc, desc, eq, inArray, ne } from "drizzle-orm";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { accounts, plaidItems, users } from "@/lib/db/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LinkAccountButton } from "@/components/link-account-button";
import { SyncButton } from "@/components/sync-button";
import { VisibilityToggle } from "@/components/accounts/visibility-toggle";
import { UnlinkItemButton } from "@/components/accounts/unlink-item-button";
import { ReconnectButton } from "@/components/accounts/reconnect-button";
import { OwnerAvatar } from "@/components/owner-avatar";
import { formatMoneyCents } from "@/lib/format";
import { getHouseholdState } from "@/lib/queries/household";
import { getActiveScope } from "@/lib/scope";

export default async function AccountsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const [scope, household] = await Promise.all([
    getActiveScope(user.id),
    getHouseholdState(user.id),
  ]);
  const inHousehold = household.inHousehold;
  const isHouseholdScope = scope.kind === "household";

  // Always show the user's own items. In household scope, also show shared
  // accounts owned by other members (read-only).
  const [items, myAccounts] = await Promise.all([
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
  ]);

  const otherMemberIds =
    isHouseholdScope && scope.kind === "household"
      ? scope.memberUserIds.filter((id) => id !== user.id)
      : [];

  type SharedAccount = typeof accounts.$inferSelect & {
    institutionName: string | null;
    ownerDisplayName: string | null;
    ownerEmail: string;
  };
  let sharedAccounts: SharedAccount[] = [];
  if (otherMemberIds.length > 0) {
    sharedAccounts = (await db
      .select({
        id: accounts.id,
        userId: accounts.userId,
        plaidItemId: accounts.plaidItemId,
        plaidAccountId: accounts.plaidAccountId,
        name: accounts.name,
        officialName: accounts.officialName,
        mask: accounts.mask,
        type: accounts.type,
        subtype: accounts.subtype,
        currentBalanceCents: accounts.currentBalanceCents,
        availableBalanceCents: accounts.availableBalanceCents,
        isoCurrencyCode: accounts.isoCurrencyCode,
        visibility: accounts.visibility,
        archivedAt: accounts.archivedAt,
        createdAt: accounts.createdAt,
        institutionName: plaidItems.institutionName,
        ownerDisplayName: users.displayName,
        ownerEmail: users.email,
      })
      .from(accounts)
      .leftJoin(plaidItems, eq(plaidItems.id, accounts.plaidItemId))
      .innerJoin(users, eq(users.id, accounts.userId))
      .where(
        and(
          inArray(accounts.userId, otherMemberIds),
          eq(accounts.visibility, "household"),
          ne(accounts.userId, user.id),
        ),
      )
      .orderBy(asc(users.displayName), accounts.createdAt)) as SharedAccount[];
  }

  const accountsByItem = new Map<string, typeof myAccounts>();
  for (const a of myAccounts) {
    if (!a.plaidItemId) continue;
    const list = accountsByItem.get(a.plaidItemId) ?? [];
    list.push(a);
    accountsByItem.set(a.plaidItemId, list);
  }

  // Group shared accounts by owner so each partner gets one card.
  const sharedByOwner = new Map<
    string,
    { displayName: string | null; email: string; rows: SharedAccount[] }
  >();
  for (const a of sharedAccounts) {
    const bucket = sharedByOwner.get(a.userId) ?? {
      displayName: a.ownerDisplayName,
      email: a.ownerEmail,
      rows: [],
    };
    bucket.rows.push(a);
    sharedByOwner.set(a.userId, bucket);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Accounts</h1>
          <p className="text-sm text-muted-foreground">
            {isHouseholdScope
              ? "Your linked accounts plus anything shared by your household."
              : "Linked institutions and accounts."}
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
              Use the &ldquo;Link account&rdquo; button above — pick &ldquo;Bank or
              credit card&rdquo; or &ldquo;Investment account&rdquo; depending on
              the institution. In Plaid sandbox, sign in with{" "}
              <code className="rounded bg-muted px-1">user_good</code> /{" "}
              <code className="rounded bg-muted px-1">pass_good</code>.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {isHouseholdScope ? (
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Your accounts
            </h2>
          ) : null}
          {items.map((item) => {
            const itemAccounts = accountsByItem.get(item.id) ?? [];
            return (
              <Card key={item.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {item.institutionName ?? "Linked institution"}
                      {item.status !== "healthy" ? (
                        <span
                          className={
                            item.status === "login_required"
                              ? "rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive"
                              : "rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive"
                          }
                        >
                          {item.status === "login_required" ? "Reconnect required" : "Error"}
                        </span>
                      ) : null}
                    </CardTitle>
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
                  <div className="flex items-center gap-2">
                    {item.status !== "healthy" ? <ReconnectButton itemId={item.id} /> : null}
                    <UnlinkItemButton
                      id={item.id}
                      institutionName={item.institutionName ?? "this institution"}
                    />
                  </div>
                </CardHeader>
                {item.status === "login_required" ? (
                  <CardContent className="border-t bg-destructive/5 py-3 text-sm text-destructive">
                    Your bank needs you to sign in again. Balances and transactions will stop
                    updating until you reconnect.
                  </CardContent>
                ) : null}
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

          {sharedByOwner.size > 0 ? (
            <>
              <h2 className="mt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Shared with you
              </h2>
              {Array.from(sharedByOwner.entries()).map(([ownerId, group]) => {
                const ownerLabel = group.displayName ?? group.email;
                // Sub-group by institution within an owner so the card structure
                // mirrors "Your accounts": one block per institution.
                const byInstitution = new Map<string, SharedAccount[]>();
                for (const a of group.rows) {
                  const key = a.institutionName ?? "Other";
                  const list = byInstitution.get(key) ?? [];
                  list.push(a);
                  byInstitution.set(key, list);
                }
                return (
                  <Card key={ownerId} className="border-dashed">
                    <CardHeader className="flex flex-row items-center gap-3">
                      <OwnerAvatar
                        userId={ownerId}
                        name={group.displayName}
                        email={group.email}
                        size="md"
                      />
                      <div className="min-w-0">
                        <CardTitle className="truncate">Shared by {ownerLabel}</CardTitle>
                        <CardDescription>
                          {group.rows.length} account{group.rows.length === 1 ? "" : "s"} · read-only
                        </CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                      {Array.from(byInstitution.entries()).map(([institution, rows]) => (
                        <div key={institution}>
                          <p className="mb-1 text-xs font-medium text-muted-foreground">
                            {institution}
                          </p>
                          <div className="divide-y rounded-md border bg-muted/30">
                            {rows.map((a) => (
                              <div
                                key={a.id}
                                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5"
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium">
                                    {a.name}
                                    {a.mask ? (
                                      <span className="ml-2 text-xs text-muted-foreground">
                                        ••{a.mask}
                                      </span>
                                    ) : null}
                                  </p>
                                  <p className="text-xs text-muted-foreground capitalize">
                                    {a.subtype ?? a.type}
                                  </p>
                                </div>
                                <p className="text-sm font-medium tabular-nums">
                                  {formatMoneyCents(
                                    a.currentBalanceCents,
                                    a.isoCurrencyCode ?? "USD",
                                  )}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                );
              })}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
