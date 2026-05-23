import { acceptInvite, declineInvite } from "@/app/(app)/household/actions";
import { Button } from "@/components/ui/button";
import type { PendingInviteForUser } from "@/lib/queries/household";

export function InviteBanner({ invites }: { invites: PendingInviteForUser[] }) {
  if (invites.length === 0) return null;
  const invite = invites[0];

  return (
    <div className="border-b bg-emerald-50">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-3 text-sm">
        <div>
          <span className="font-medium">
            {invite.invitedByEmail ?? "Someone"}
          </span>{" "}
          invited you to join{" "}
          <span className="font-medium">{invite.householdName}</span>.
        </div>
        <div className="flex items-center gap-2">
          <form action={declineInvite}>
            <input type="hidden" name="id" value={invite.id} />
            <Button type="submit" variant="ghost" size="sm">
              Decline
            </Button>
          </form>
          <form action={acceptInvite}>
            <input type="hidden" name="id" value={invite.id} />
            <Button type="submit" size="sm">
              Accept
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
