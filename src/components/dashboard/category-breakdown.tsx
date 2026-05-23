import type { CategoryBreakdownRow } from "@/lib/queries/dashboard";
import { formatMoneyCents, prettifyCategory } from "@/lib/format";

const palette = [
  "oklch(0.68 0.18 145)",
  "oklch(0.78 0.14 70)",
  "oklch(0.85 0.13 90)",
  "oklch(0.68 0.13 200)",
  "oklch(0.74 0.14 25)",
  "oklch(0.70 0.10 280)",
  "oklch(0.80 0.08 160)",
];

export function CategoryBreakdown({ rows }: { rows: CategoryBreakdownRow[] }) {
  if (rows.length === 0) {
    return <p className="text-xs text-muted-foreground">— no spending this month</p>;
  }

  const top = rows.slice(0, 7);
  const total = top.reduce((sum, r) => sum + r.amountCents, 0);

  return (
    <div className="flex flex-col gap-0">
      <div className="mb-2 grid grid-cols-[1fr_auto] border-b border-border pb-1.5 text-xs tracking-widest uppercase text-muted-foreground">
        <span>Category</span>
        <span className="flex gap-6">
          <span>%</span>
          <span className="w-20 text-right">Amount</span>
        </span>
      </div>
      {top.map((r, i) => {
        const pct = total === 0 ? 0 : (r.amountCents / total) * 100;
        return (
          <div key={r.category} className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-border/40 py-2 last:border-b-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className="size-1.5 shrink-0"
                style={{ background: palette[i % palette.length] }}
              />
              <span className="truncate text-sm">{prettifyCategory(r.category)}</span>
            </div>
            <div className="flex items-center gap-6 text-sm tabular-nums">
              <span className="text-muted-foreground w-6 text-right">{pct.toFixed(0)}%</span>
              <span className="w-20 text-right">{formatMoneyCents(r.amountCents)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
