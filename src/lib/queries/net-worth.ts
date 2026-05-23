import { and, asc, eq, gte, inArray, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { accounts, householdMembers, netWorthSnapshots } from "@/lib/db/schema";
import { accountScopeFilter, type Scope, scopeRowKey } from "@/lib/scope";

export type NetWorth = {
  assetsCents: number;
  liabilitiesCents: number;
  netCents: number;
};

const ASSET_TYPES = new Set(["depository", "investment"]);
const LIABILITY_TYPES = new Set(["credit", "loan"]);

/**
 * Compute net worth from current account balances in the active scope.
 * - User scope: every (non-archived) account the user owns.
 * - Household scope: every account marked `household` across all members.
 */
export async function computeCurrentNetWorth(scope: Scope): Promise<NetWorth> {
  const rows = await db
    .select({ type: accounts.type, balance: accounts.currentBalanceCents })
    .from(accounts)
    .where(and(accountScopeFilter(scope), isNull(accounts.archivedAt)));

  let assets = 0;
  let liabilities = 0;
  for (const r of rows) {
    if (r.balance === null) continue;
    if (ASSET_TYPES.has(r.type)) assets += r.balance;
    else if (LIABILITY_TYPES.has(r.type)) liabilities += r.balance;
  }
  return { assetsCents: assets, liabilitiesCents: liabilities, netCents: assets - liabilities };
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

async function upsertSnapshot(
  scopeType: "user" | "household",
  scopeId: string,
  nw: NetWorth,
) {
  await db
    .insert(netWorthSnapshots)
    .values({
      scopeType,
      scopeId,
      date: todayIso(),
      assetsCents: nw.assetsCents,
      liabilitiesCents: nw.liabilitiesCents,
      netCents: nw.netCents,
    })
    .onConflictDoUpdate({
      target: [netWorthSnapshots.scopeType, netWorthSnapshots.scopeId, netWorthSnapshots.date],
      set: {
        assetsCents: nw.assetsCents,
        liabilitiesCents: nw.liabilitiesCents,
        netCents: nw.netCents,
      },
    });
}

/**
 * Backfill household snapshots from members' existing personal snapshots.
 *
 * We don't keep per-account historical balances, so we can't reconstruct what
 * "shared accounts only" looked like in the past. Approximation: for each
 * member, compute their *current* shared/total ratio (e.g. 60% of their
 * balances are in shared accounts), then scale their historical personal NW
 * by that ratio. Sum across members per date → household snapshot.
 *
 * Going forward, real snapshots from `snapshotNetWorth` (which compute over
 * the current shared-account set) take over. The two are upserted onto the
 * same (scope_type, scope_id, date) key, so newer real snapshots overwrite
 * the approximation as they arrive.
 */
export async function backfillHouseholdSnapshots(householdId: string): Promise<void> {
  const members = await db
    .select({ userId: householdMembers.userId })
    .from(householdMembers)
    .where(eq(householdMembers.householdId, householdId));
  if (members.length === 0) return;

  // Per-member shared ratio from current balances.
  const ratios = new Map<string, number>();
  for (const m of members) {
    const total = await computeCurrentNetWorth({ kind: "user", userId: m.userId });
    const shared = await computeCurrentNetWorth({
      kind: "household",
      householdId,
      memberUserIds: [m.userId],
      userId: m.userId,
    });
    const denom = Math.abs(total.netCents);
    ratios.set(m.userId, denom === 0 ? 0 : shared.netCents / total.netCents);
  }

  // Pull every personal snapshot belonging to any member.
  const memberIds = members.map((m) => m.userId);
  const personals = await db
    .select({
      userId: netWorthSnapshots.scopeId,
      date: netWorthSnapshots.date,
      assetsCents: netWorthSnapshots.assetsCents,
      liabilitiesCents: netWorthSnapshots.liabilitiesCents,
      netCents: netWorthSnapshots.netCents,
    })
    .from(netWorthSnapshots)
    .where(
      and(
        eq(netWorthSnapshots.scopeType, "user"),
        inArray(netWorthSnapshots.scopeId, memberIds),
      ),
    )
    .orderBy(asc(netWorthSnapshots.date));

  // Bucket by date, scaling each member's contribution by their ratio.
  type Agg = { assets: number; liabilities: number; net: number };
  const byDate = new Map<string, Agg>();
  for (const row of personals) {
    const r = ratios.get(row.userId) ?? 0;
    if (r === 0) continue;
    const cur = byDate.get(row.date) ?? { assets: 0, liabilities: 0, net: 0 };
    cur.assets += Math.round(Number(row.assetsCents) * r);
    cur.liabilities += Math.round(Number(row.liabilitiesCents) * r);
    cur.net += Math.round(Number(row.netCents) * r);
    byDate.set(row.date, cur);
  }

  for (const [date, agg] of byDate) {
    await db
      .insert(netWorthSnapshots)
      .values({
        scopeType: "household",
        scopeId: householdId,
        date,
        assetsCents: agg.assets,
        liabilitiesCents: agg.liabilities,
        netCents: agg.net,
      })
      .onConflictDoNothing({
        target: [netWorthSnapshots.scopeType, netWorthSnapshots.scopeId, netWorthSnapshots.date],
      });
  }
}

/**
 * Upsert today's snapshot for a user. If the user is in a household, also
 * upserts today's household snapshot using the union of shared accounts across
 * all members.
 */
export async function snapshotNetWorth(userId: string): Promise<void> {
  // 1. Personal snapshot — always.
  const personal = await computeCurrentNetWorth({ kind: "user", userId });
  await upsertSnapshot("user", userId, personal);

  // 2. Household snapshot, if applicable.
  const [me] = await db
    .select({ householdId: householdMembers.householdId })
    .from(householdMembers)
    .where(eq(householdMembers.userId, userId))
    .limit(1);
  if (!me) return;

  const members = await db
    .select({ userId: householdMembers.userId })
    .from(householdMembers)
    .where(eq(householdMembers.householdId, me.householdId));
  if (members.length === 0) return;

  const householdScope: Scope = {
    kind: "household",
    householdId: me.householdId,
    memberUserIds: members.map((m) => m.userId),
    userId,
  };
  const household = await computeCurrentNetWorth(householdScope);
  await upsertSnapshot("household", me.householdId, household);
}

export type NetWorthPoint = {
  date: string;
  assetsCents: number;
  liabilitiesCents: number;
  netCents: number;
};

export async function getNetWorthSeries(
  scope: Scope,
  sinceIso?: string,
): Promise<NetWorthPoint[]> {
  const key = scopeRowKey(scope);
  const conditions = [
    eq(netWorthSnapshots.scopeType, key.scopeType),
    eq(netWorthSnapshots.scopeId, key.scopeId),
  ];
  if (sinceIso) conditions.push(gte(netWorthSnapshots.date, sinceIso));

  const rows = await db
    .select({
      date: netWorthSnapshots.date,
      assetsCents: netWorthSnapshots.assetsCents,
      liabilitiesCents: netWorthSnapshots.liabilitiesCents,
      netCents: netWorthSnapshots.netCents,
    })
    .from(netWorthSnapshots)
    .where(and(...conditions))
    .orderBy(asc(netWorthSnapshots.date));

  return rows.map((r) => ({
    date: r.date,
    assetsCents: Number(r.assetsCents),
    liabilitiesCents: Number(r.liabilitiesCents),
    netCents: Number(r.netCents),
  }));
}
