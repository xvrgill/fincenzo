import type { CategoryBreakdownRow } from "@/lib/queries/dashboard";
import { formatMoneyCents, prettifyCategory } from "@/lib/format";

const palette = [
  "oklch(0.72 0.17 145)",
  "oklch(0.78 0.14 70)",
  "oklch(0.85 0.13 90)",
  "oklch(0.68 0.13 200)",
  "oklch(0.74 0.14 25)",
  "oklch(0.70 0.10 280)",
  "oklch(0.80 0.08 160)",
];

export function CategoryBreakdown({ rows }: { rows: CategoryBreakdownRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No spending this month yet.</p>;
  }

  const top = rows.slice(0, 7);
  const total = top.reduce((sum, r) => sum + r.amountCents, 0);

  return (
    <div className="flex flex-col gap-3">
      {top.map((r, i) => {
        const pct = total === 0 ? 0 : (r.amountCents / total) * 100;
        return (
          <div key={r.category} className="grid grid-cols-[1fr_auto] items-center gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span
                className="size-2 rounded-full shrink-0"
                style={{ background: palette[i % palette.length] }}
              />
              <span className="truncate text-sm">{prettifyCategory(r.category)}</span>
            </div>
            <div className="flex items-center gap-3 text-sm tabular-nums">
              <span className="text-muted-foreground">{pct.toFixed(0)}%</span>
              <span className="w-20 text-right">{formatMoneyCents(r.amountCents)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
