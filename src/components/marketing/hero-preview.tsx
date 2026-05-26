import { ArrowUpRight, Eye, EyeOff } from "lucide-react";

export function HeroPreview() {
  return (
    <div className="relative w-full select-none [perspective:1600px]">
      <Glow />

      <div
        className="
          relative mx-auto w-full max-w-[520px]
          [transform-style:preserve-3d]
          [transform:rotateX(14deg)_rotateY(-18deg)_rotateZ(2deg)]
          motion-safe:animate-[heroTilt_14s_ease-in-out_infinite]
        "
      >
        {/* Back card — household / shared view */}
        <div
          className="
            absolute -right-6 -top-6 hidden h-[340px] w-[300px] rounded-xl border border-border/60
            bg-card/60 p-4 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)]
            backdrop-blur md:block
            [transform:translateZ(-60px)_translateX(40px)]
          "
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Household
            </span>
            <span className="font-mono text-[10px] text-primary">shared</span>
          </div>
          <div className="mt-3 space-y-3">
            <PreviewRow label="Joint checking" amount="$8,420" shared />
            <PreviewRow label="Rent" amount="$2,400 / $2,400" shared />
            <PreviewRow label="Groceries" amount="$612 / $800" shared />
            <PreviewRow label="Personal CC" amount="—" hidden />
            <PreviewRow label="Brokerage" amount="—" hidden />
          </div>
        </div>

        {/* Front card — personal dashboard */}
        <div
          className="
            relative rounded-xl border border-border bg-card/95 p-5
            shadow-[0_50px_120px_-30px_rgba(0,0,0,0.7)]
            [transform:translateZ(40px)]
          "
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Net worth
              </p>
              <p className="mt-1 font-mono text-2xl font-semibold tracking-tight">
                $142,308
                <span className="ml-2 inline-flex items-center gap-0.5 align-middle text-xs font-medium text-primary">
                  <ArrowUpRight className="size-3" />
                  +4.2%
                </span>
              </p>
            </div>
            <div className="rounded-full border border-border/60 bg-background/60 px-2 py-1 font-mono text-[10px] text-muted-foreground">
              30d
            </div>
          </div>

          <NetWorthChart />

          <div className="mt-4 space-y-3">
            <BudgetBar label="Groceries" pct={62} amount="$496 / $800" />
            <BudgetBar label="Dining" pct={88} amount="$352 / $400" />
            <BudgetBar label="Transit" pct={120} amount="$240 / $200" over />
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              5 accounts linked
            </span>
            <div className="flex -space-x-1.5">
              <Dot color="oklch(0.68 0.18 145)" />
              <Dot color="oklch(0.78 0.14 70)" />
              <Dot color="oklch(0.68 0.13 200)" />
              <Dot color="oklch(0.74 0.14 25)" />
              <Dot color="oklch(0.70 0.10 280)" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NetWorthChart() {
  // Pre-computed sparkline path. The polyline below it animates a stroke-dash
  // reveal so the line "draws itself" on mount.
  const points = [
    [0, 64],
    [30, 58],
    [60, 60],
    [90, 52],
    [120, 48],
    [150, 50],
    [180, 42],
    [210, 36],
    [240, 30],
    [270, 32],
    [300, 22],
    [330, 18],
    [360, 12],
  ];
  const d = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x} ${y}`)
    .join(" ");
  const area = `${d} L 360 80 L 0 80 Z`;

  return (
    <div className="mt-4 h-20 w-full">
      <svg viewBox="0 0 360 80" className="h-full w-full overflow-visible" preserveAspectRatio="none">
        <defs>
          <linearGradient id="hero-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.68 0.18 145)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="oklch(0.68 0.18 145)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#hero-area)" className="motion-safe:animate-[heroFade_900ms_ease-out_both]" />
        <path
          d={d}
          fill="none"
          stroke="oklch(0.68 0.18 145)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          className="
            [stroke-dasharray:1]
            motion-safe:[stroke-dashoffset:1]
            motion-safe:animate-[heroDraw_1600ms_ease-out_forwards]
          "
        />
        <circle
          cx={points[points.length - 1][0]}
          cy={points[points.length - 1][1]}
          r="3"
          fill="oklch(0.68 0.18 145)"
          className="motion-safe:animate-[heroPulse_2.4s_ease-in-out_infinite]"
        />
      </svg>
    </div>
  );
}

function BudgetBar({
  label,
  pct,
  amount,
  over,
}: {
  label: string;
  pct: number;
  amount: string;
  over?: boolean;
}) {
  const clamped = Math.min(pct, 100);
  return (
    <div>
      <div className="flex items-center justify-between font-mono text-[11px]">
        <span className="text-foreground/90">{label}</span>
        <span className={over ? "text-destructive" : "text-muted-foreground"}>{amount}</span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted-foreground/10">
        <div
          className={`h-full rounded-full ${over ? "bg-destructive" : "bg-primary"} motion-safe:animate-[heroFill_1400ms_cubic-bezier(0.22,1,0.36,1)_forwards]`}
          style={{ width: `${clamped}%`, transformOrigin: "left" }}
        />
      </div>
    </div>
  );
}

function PreviewRow({
  label,
  amount,
  shared,
  hidden,
}: {
  label: string;
  amount: string;
  shared?: boolean;
  hidden?: boolean;
}) {
  return (
    <div className="flex items-center justify-between font-mono text-[11px]">
      <span className="flex items-center gap-1.5 text-foreground/90">
        {shared ? (
          <Eye className="size-3 text-primary" />
        ) : (
          <EyeOff className="size-3 text-muted-foreground/60" />
        )}
        {label}
      </span>
      <span className={hidden ? "text-muted-foreground/40" : "text-muted-foreground"}>{amount}</span>
    </div>
  );
}

function Dot({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      className="inline-block size-3 rounded-full ring-2 ring-card"
      style={{ background: color }}
    />
  );
}

function Glow() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      <div
        className="absolute left-1/2 top-1/2 size-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-50 blur-3xl motion-safe:animate-[heroGlow_8s_ease-in-out_infinite]"
        style={{
          background:
            "radial-gradient(closest-side, oklch(0.68 0.18 145 / 0.35), transparent 70%)",
        }}
      />
    </div>
  );
}
