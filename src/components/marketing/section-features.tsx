import {
  Landmark,
  LayoutDashboard,
  PiggyBank,
  Target,
  TrendingUp,
  Users,
  ArrowUpRight,
} from "lucide-react";
import { SectionHeader } from "./section-header";

export function SectionFeatures() {
  return (
    <section id="features" className="border-b border-border/60 bg-background">
      <div className="mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-28">
        <SectionHeader
          index="03"
          eyebrow="What's inside"
          title={
            <>
              Everything you need, <span className="text-muted-foreground">nothing you don&apos;t.</span>
            </>
          }
          description="Calm, modern, designed to be checked in 30 seconds — not lived in."
        />

        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            icon={<Landmark className="size-4" />}
            title="Bank aggregation"
            description="Checking, savings, credit, investment. Linked once via Plaid, synced automatically in the background."
            visual={<AggregationVisual />}
          />
          <FeatureCard
            icon={<LayoutDashboard className="size-4" />}
            title="Dashboard"
            description="Net worth, income vs. expense, recent transactions, category breakdown — at a glance."
            visual={<DashboardVisual />}
          />
          <FeatureCard
            icon={<PiggyBank className="size-4" />}
            title="Budgets"
            description="Monthly category budgets with progress bars. Over-budget shows up immediately, in red."
            visual={<BudgetsVisual />}
          />
          <FeatureCard
            icon={<Target className="size-4" />}
            title="Goals"
            description="Set savings targets, watch progress charts fill. Tied to real account balances, not wishful thinking."
            visual={<GoalsVisual />}
          />
          <FeatureCard
            icon={<TrendingUp className="size-4" />}
            title="Net worth over time"
            description="Daily snapshots, charted. The line keeps moving even when you don't log in."
            visual={<NetWorthVisual />}
          />
          <FeatureCard
            icon={<Users className="size-4" />}
            title="Households"
            description="Invite a partner. Share what you choose. Keep the rest private. Reversible at any time."
            visual={<HouseholdsVisual />}
          />
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  visual,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  visual?: React.ReactNode;
}) {
  return (
    <div className="group relative flex flex-col gap-4 overflow-hidden rounded-xl border border-border/60 bg-card/40 p-5 transition-colors hover:border-primary/40 hover:bg-card/70">
      <div className="flex items-center justify-between">
        <span className="inline-flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
          {icon}
        </span>
        <ArrowUpRight className="size-4 text-muted-foreground/40 transition-all group-hover:text-primary group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </div>
      <div>
        <h3 className="font-mono text-base font-medium tracking-tight">{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      {visual ? (
        <div className="mt-auto flex h-20 items-end justify-center border-t border-border/40 pt-4">{visual}</div>
      ) : null}
    </div>
  );
}

function AggregationVisual() {
  const colors = [
    "oklch(0.68 0.18 145)",
    "oklch(0.78 0.14 70)",
    "oklch(0.68 0.13 200)",
    "oklch(0.74 0.14 25)",
    "oklch(0.70 0.10 280)",
  ];
  return (
    <div className="flex -space-x-2">
      {colors.map((c, i) => (
        <span
          key={i}
          className="inline-flex size-7 items-center justify-center rounded-full ring-2 ring-card font-mono text-[10px] font-semibold text-background"
          style={{ background: c }}
        >
          {["AMX", "C1", "FID", "BoA", "VG"][i]}
        </span>
      ))}
      <span className="ml-1 inline-flex size-7 items-center justify-center rounded-full bg-muted-foreground/10 font-mono text-[10px] text-muted-foreground">
        +
      </span>
    </div>
  );
}

function DashboardVisual() {
  const bars = [40, 65, 35, 80, 55, 70, 90, 60, 75];
  return (
    <div className="flex h-full w-full items-end gap-1.5">
      {bars.map((h, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm bg-primary/70"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}

function BudgetsVisual() {
  return (
    <div className="w-full space-y-2">
      <Bar pct={45} />
      <Bar pct={78} />
      <Bar pct={110} over />
    </div>
  );
}

function Bar({ pct, over }: { pct: number; over?: boolean }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted-foreground/10">
      <div
        className={`h-full rounded-full ${over ? "bg-destructive" : "bg-primary"}`}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  );
}

function GoalsVisual() {
  return (
    <div className="flex items-end gap-3">
      <RingProgress pct={72} />
      <div className="flex flex-col font-mono text-[10px]">
        <span className="text-foreground/90">Emergency fund</span>
        <span className="text-muted-foreground">$7,200 / $10,000</span>
      </div>
    </div>
  );
}

function RingProgress({ pct }: { pct: number }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  return (
    <svg width="50" height="50" viewBox="0 0 50 50" className="-rotate-90">
      <circle cx="25" cy="25" r={r} fill="none" stroke="color-mix(in oklch, var(--muted-foreground) 15%, transparent)" strokeWidth="4" />
      <circle
        cx="25"
        cy="25"
        r={r}
        fill="none"
        stroke="oklch(0.68 0.18 145)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c}`}
      />
    </svg>
  );
}

function NetWorthVisual() {
  const points = [
    [0, 40],
    [20, 36],
    [40, 38],
    [60, 30],
    [80, 26],
    [100, 28],
    [120, 22],
    [140, 18],
    [160, 12],
    [180, 8],
  ];
  const d = points.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x} ${y}`).join(" ");
  const area = `${d} L 180 50 L 0 50 Z`;
  return (
    <svg viewBox="0 0 180 50" className="h-full w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="feat-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.68 0.18 145)" stopOpacity="0.4" />
          <stop offset="100%" stopColor="oklch(0.68 0.18 145)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#feat-area)" />
      <path d={d} fill="none" stroke="oklch(0.68 0.18 145)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HouseholdsVisual() {
  return (
    <div className="flex items-center gap-4 font-mono text-[10px]">
      <span
        className="inline-flex size-9 items-center justify-center rounded-full font-semibold text-background"
        style={{ background: "oklch(0.68 0.18 145)" }}
      >
        A
      </span>
      <div className="flex flex-1 flex-col items-center">
        <div className="h-px w-full bg-primary/40" />
        <span className="-mt-2 rounded-full border border-primary/40 bg-card px-2 py-0.5 text-primary">
          shared
        </span>
      </div>
      <span
        className="inline-flex size-9 items-center justify-center rounded-full font-semibold text-background"
        style={{ background: "oklch(0.78 0.14 70)" }}
      >
        B
      </span>
    </div>
  );
}
