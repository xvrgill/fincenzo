import { redirect } from "next/navigation";
import { LogOut, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getHouseholdState } from "@/lib/queries/household";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InviteForm } from "@/components/household/invite-form";
import { ActivityFeed } from "@/components/household/activity-feed";
import { formatDate } from "@/lib/format";
import { getHouseholdActivity } from "@/lib/activity";
import { createHousehold, leaveHousehold, revokeInvite } from "./actions";

export default async function HouseholdPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const state = await getHouseholdState(user.id);

  if (!state.inHousehold) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Household</h1>
          <p className="text-sm text-muted-foreground">
            Share specific accounts and budgets with a partner. Each of you keeps a private view too.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Create a household</CardTitle>
            <CardDescription>You become the owner. You can invite one partner after creating it.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              action={createHousehold}
              className="grid items-end gap-3 sm:grid-cols-[1fr_auto]"
            >
              <div className="grid gap-1.5">
                <Label htmlFor="name">Household name</Label>
                <Input id="name" name="name" placeholder="The Smiths" required />
              </div>
              <Button type="submit">Create</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { household, myRole, members, pendingInvites } = state;
  const activity = await getHouseholdActivity(household.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{household.name}</h1>
        <p className="text-sm text-muted-foreground">
          You&apos;re the {myRole}. {members.length} member{members.length === 1 ? "" : "s"}.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {members.map((m) => (
              <div key={m.userId} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{m.displayName ?? m.email}</p>
                  <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                </div>
                <div className="text-xs text-muted-foreground capitalize">{m.role}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {members.length < 2 ? (
        <Card>
          <CardHeader>
            <CardTitle>Invite a partner</CardTitle>
            <CardDescription>
              We&apos;ll email them a sign-in link. If they already have an account, they&apos;ll see
              the invite in-app the next time they sign in.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InviteForm />
          </CardContent>
        </Card>
      ) : null}

      {pendingInvites.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Pending invites</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {pendingInvites.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm">{inv.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Expires {formatDate(inv.expiresAt)}
                    </p>
                  </div>
                  <form action={revokeInvite}>
                    <input type="hidden" name="id" value={inv.id} />
                    <Button type="submit" variant="ghost" size="icon" aria-label="Revoke invite">
                      <Trash2 className="size-4" />
                    </Button>
                  </form>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
          <CardDescription>
            Significant household events from both members. Newest first.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ActivityFeed entries={activity} currentUserId={user.id} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <div>
            <p className="text-sm font-medium">Leave household</p>
            <p className="text-xs text-muted-foreground">
              You&apos;ll keep your own accounts and data; they just stop being shared.
              {members.length === 1 ? " The empty household will be deleted." : ""}
            </p>
          </div>
          <form action={leaveHousehold}>
            <Button type="submit" variant="outline">
              <LogOut className="size-4" />
              Leave
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
