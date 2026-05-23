import {
  ArrowUpRight,
  Eye,
  EyeOff,
  Home,
  LogOut,
  Mail,
  PiggyBank,
  Target,
  Undo2,
  UserMinus,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import type { ActivityEntry } from "@/lib/activity";
import { formatMoneyCents, prettifyCategory } from "@/lib/format";

const ICON_BY_KIND: Record<string, LucideIcon> = {
  "household.created": Home,
  "household.left": LogOut,
  "invite.sent": Mail,
  "invite.revoked": Undo2,
  "invite.accepted": UserPlus,
  "invite.declined": UserMinus,
  "account.shared": Eye,
  "account.unshared": EyeOff,
  "budget.created": PiggyBank,
  "budget.deleted": PiggyBank,
  "goal.created": Target,
  "goal.deleted": Target,
};

function formatRelative(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function describe(entry: ActivityEntry): string {
  const p = entry.payload;
  switch (entry.kind) {
    case "household.created":
      return `created the household "${p.name ?? ""}"`;
    case "household.left":
      return "left the household";
    case "invite.sent":
      return `invited ${p.email ?? "someone"}`;
    case "invite.revoked":
      return `revoked the invite to ${p.email ?? "someone"}`;
    case "invite.accepted":
      return "accepted the invite";
    case "invite.declined":
      return "declined the invite";
    case "account.shared":
      return `shared account ${p.accountName ?? ""}${p.mask ? ` ••${p.mask}` : ""}`;
    case "account.unshared":
      return `unshared account ${p.accountName ?? ""}${p.mask ? ` ••${p.mask}` : ""}`;
    case "budget.created":
      return `set a ${formatMoneyCents(Number(p.limitCents ?? 0))} budget for ${prettifyCategory(String(p.category ?? ""))}`;
    case "budget.deleted":
      return `removed the ${prettifyCategory(String(p.category ?? ""))} budget`;
    case "goal.created":
      return `added goal "${p.name ?? ""}" (${formatMoneyCents(Number(p.targetCents ?? 0))})`;
    case "goal.deleted":
      return `deleted goal "${p.name ?? ""}"`;
    default:
      return entry.kind;
  }
}

export function ActivityFeed({
  entries,
  currentUserId,
}: {
  entries: ActivityEntry[];
  currentUserId: string;
}) {
  if (entries.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        Nothing yet. Activity shows up as you and your partner make changes.
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-3">
      {entries.map((e) => {
        const Icon = ICON_BY_KIND[e.kind] ?? ArrowUpRight;
        const who = e.actorUserId === currentUserId ? "You" : e.actorDisplayName ?? e.actorEmail;
        return (
          <li key={e.id} className="flex items-start gap-3 text-sm">
            <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Icon className="size-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-foreground">
                <span className="font-medium">{who}</span>{" "}
                <span className="text-muted-foreground">{describe(e)}</span>
              </p>
              <p className="text-xs text-muted-foreground">{formatRelative(new Date(e.createdAt))}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
