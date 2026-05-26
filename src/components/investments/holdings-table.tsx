import type { HoldingRow } from "@/lib/queries/investments";
import { formatMoneyCents } from "@/lib/format";

function formatQuantity(q: number): string {
  // Show up to 4 fractional digits for partial shares but strip trailing zeros.
  if (Number.isInteger(q)) return q.toLocaleString();
  return q.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

export function HoldingsTable({ rows }: { rows: HoldingRow[] }) {
  if (rows.length === 0) {
    return <p className="text-xs text-muted-foreground">— no positions</p>;
  }

  // Group by account so the table mirrors how brokerage statements read.
  const groups = new Map<string, { name: string; mask: string | null; items: HoldingRow[] }>();
  for (const r of rows) {
    const g = groups.get(r.accountId) ?? { name: r.accountName, mask: r.accountMask, items: [] };
    g.items.push(r);
    groups.set(r.accountId, g);
  }

  return (
    <div className="flex flex-col gap-6">
      {Array.from(groups.entries()).map(([accountId, group]) => {
        const subtotal = group.items.reduce((sum, r) => sum + r.valueCents, 0);
        return (
          <div key={accountId} className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm font-medium">
                {group.name}
                {group.mask ? (
                  <span className="ml-2 text-xs text-muted-foreground">••{group.mask}</span>
                ) : null}
              </p>
              <p className="text-sm tabular-nums">{formatMoneyCents(subtotal)}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase tracking-widest text-muted-foreground">
                    <th className="py-1.5 text-left font-normal">Symbol</th>
                    <th className="py-1.5 text-left font-normal">Name</th>
                    <th className="py-1.5 text-right font-normal">Qty</th>
                    <th className="py-1.5 text-right font-normal">Value</th>
                    <th className="py-1.5 text-right font-normal">Gain/loss</th>
                  </tr>
                </thead>
                <tbody>
                  {group.items.map((h) => (
                    <tr key={h.id} className="border-b border-border/40 last:border-b-0">
                      <td className="py-2 font-medium">
                        {h.tickerSymbol ?? <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="py-2 text-muted-foreground">
                        <span className="line-clamp-1">{h.securityName ?? "—"}</span>
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {formatQuantity(h.quantity)}
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {formatMoneyCents(h.valueCents)}
                      </td>
                      <td
                        className={`py-2 text-right tabular-nums ${
                          h.gainCents == null
                            ? "text-muted-foreground"
                            : h.gainCents < 0
                              ? "text-destructive"
                              : "text-emerald-600"
                        }`}
                      >
                        {h.gainCents == null
                          ? "—"
                          : `${h.gainCents >= 0 ? "+" : ""}${formatMoneyCents(h.gainCents)}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
