import { formatMoneyCents } from "@/lib/format";

const palette = [
  "oklch(0.68 0.18 145)",
  "oklch(0.78 0.14 70)",
  "oklch(0.85 0.13 90)",
  "oklch(0.68 0.13 200)",
  "oklch(0.74 0.14 25)",
  "oklch(0.70 0.10 280)",
  "oklch(0.80 0.08 160)",
];

type Slice = { label: string; valueCents: number };

export function AllocationList({
  slices,
  totalCents,
}: {
  slices: Slice[];
  totalCents: number;
}) {
  if (slices.length === 0) {
    return <p className="text-xs text-muted-foreground">— no positions</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted-foreground/10">
        {slices.map((s, i) => {
          const pct = totalCents === 0 ? 0 : (s.valueCents / totalCents) * 100;
          if (pct === 0) return null;
          return (
            <div
              key={s.label}
              style={{ width: `${pct}%`, background: palette[i % palette.length] }}
              title={`${s.label} • ${pct.toFixed(1)}%`}
            />
          );
        })}
      </div>
      <div className="flex flex-col gap-1.5">
        {slices.map((s, i) => {
          const pct = totalCents === 0 ? 0 : (s.valueCents / totalCents) * 100;
          return (
            <div
              key={s.label}
              className="grid grid-cols-[1fr_auto] items-center gap-3 text-sm"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="size-2 shrink-0 rounded-sm"
                  style={{ background: palette[i % palette.length] }}
                />
                <span className="truncate capitalize">{s.label}</span>
              </div>
              <div className="flex items-center gap-4 text-sm tabular-nums">
                <span className="w-10 text-right text-muted-foreground">
                  {pct.toFixed(0)}%
                </span>
                <span className="w-24 text-right">{formatMoneyCents(s.valueCents)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
