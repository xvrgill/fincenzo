import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { accounts, holdings, securities } from "@/lib/db/schema";
import { accountScopeFilter, type Scope } from "@/lib/scope";

export type HoldingRow = {
  id: string;
  accountId: string;
  accountName: string;
  accountMask: string | null;
  tickerSymbol: string | null;
  securityName: string | null;
  securityType: string | null;
  quantity: number;
  valueCents: number;
  costBasisCents: number | null;
  gainCents: number | null;
  isoCurrencyCode: string;
};

export type AllocationSlice = {
  type: string;
  valueCents: number;
};

export type Portfolio = {
  totalValueCents: number;
  totalCostBasisCents: number | null;
  totalGainCents: number | null;
  accountCount: number;
  holdings: HoldingRow[];
  allocation: AllocationSlice[];
};

// Aggregate investment holdings for the active scope. In household scope we
// only include holdings whose owning account is shared (handled by
// accountScopeFilter on accounts.visibility).
export async function getPortfolio(scope: Scope): Promise<Portfolio> {
  const rows = await db
    .select({
      id: holdings.id,
      accountId: accounts.id,
      accountName: accounts.name,
      accountMask: accounts.mask,
      quantity: holdings.quantity,
      valueCents: holdings.institutionValueCents,
      costBasisCents: holdings.costBasisCents,
      isoCurrencyCode: holdings.isoCurrencyCode,
      tickerSymbol: securities.tickerSymbol,
      securityName: securities.name,
      securityType: securities.type,
    })
    .from(holdings)
    .innerJoin(accounts, eq(accounts.id, holdings.accountId))
    .innerJoin(securities, eq(securities.id, holdings.securityId))
    .where(and(accountScopeFilter(scope), isNull(accounts.archivedAt)))
    .orderBy(desc(holdings.institutionValueCents));

  const holdingRows: HoldingRow[] = rows.map((r) => ({
    id: r.id,
    accountId: r.accountId,
    accountName: r.accountName,
    accountMask: r.accountMask,
    tickerSymbol: r.tickerSymbol,
    securityName: r.securityName,
    securityType: r.securityType,
    quantity: Number(r.quantity),
    valueCents: Number(r.valueCents),
    costBasisCents: r.costBasisCents != null ? Number(r.costBasisCents) : null,
    gainCents:
      r.costBasisCents != null ? Number(r.valueCents) - Number(r.costBasisCents) : null,
    isoCurrencyCode: r.isoCurrencyCode ?? "USD",
  }));

  let totalValue = 0;
  let totalBasis = 0;
  let basisRowCount = 0;
  const byType = new Map<string, number>();
  const accountIds = new Set<string>();
  for (const h of holdingRows) {
    totalValue += h.valueCents;
    if (h.costBasisCents != null) {
      totalBasis += h.costBasisCents;
      basisRowCount += 1;
    }
    accountIds.add(h.accountId);
    const key = h.securityType ?? "other";
    byType.set(key, (byType.get(key) ?? 0) + h.valueCents);
  }

  const allocation: AllocationSlice[] = Array.from(byType.entries())
    .map(([type, valueCents]) => ({ type, valueCents }))
    .sort((a, b) => b.valueCents - a.valueCents);

  // Cost basis is optional per row; only expose totals when at least one row
  // reported it. Otherwise we'd report a misleading gain against partial basis.
  const hasBasis = basisRowCount > 0 && basisRowCount === holdingRows.length;

  return {
    totalValueCents: totalValue,
    totalCostBasisCents: hasBasis ? totalBasis : null,
    totalGainCents: hasBasis ? totalValue - totalBasis : null,
    accountCount: accountIds.size,
    holdings: holdingRows,
    allocation,
  };
}
