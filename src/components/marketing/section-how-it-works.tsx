import { Eye, EyeOff, ArrowDown } from "lucide-react";
import { SectionHeader } from "./section-header";

type Account = {
  label: string;
  balance: string;
  shared: boolean;
};

const aliceAccounts: Account[] = [
  { label: "Joint checking", balance: "$8,420", shared: true },
  { label: "Personal credit card", balance: "$1,140", shared: false },
  { label: "Emergency savings", balance: "$12,300", shared: false },
  { label: "Roth IRA", balance: "$48,900", shared: false },
];

const bobAccounts: Account[] = [
  { label: "Joint checking", balance: "$8,420", shared: true },
  { label: "Personal credit card", balance: "$640", shared: false },
  { label: "Shared savings", balance: "$22,800", shared: true },
  { label: "Brokerage", balance: "$74,200", shared: false },
];

export function SectionHowItWorks() {
  return (
    <section id="how-it-works" className="border-b border-border/60 bg-card/20">
      <div className="mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-28">
        <SectionHeader
          index="02"
          eyebrow="How sharing works"
          title={
            <>
              Two logins. Two private worlds.{" "}
              <span className="text-primary">One shared household.</span>
            </>
          }
          description={
            <>
              Alice and Bob each sign up separately and link their own accounts. Alice creates a household and invites
              Bob. They each choose, per account, what to share. The household view shows only what they&apos;ve both
              opted to share — nothing else.
            </>
          }
        />

        {/* The two personal panels */}
        <div className="mt-14 grid gap-6 md:grid-cols-2">
          <PersonalPanel name="Alice" tone="primary" accounts={aliceAccounts} />
          <PersonalPanel name="Bob" tone="secondary" accounts={bobAccounts} />
        </div>

        {/* Flow indicator */}
        <div className="my-8 flex items-center justify-center" aria-hidden>
          <FlowIndicator />
        </div>

        {/* Household panel */}
        <HouseholdPanel />

        <p className="mt-10 text-center font-mono text-xs text-muted-foreground">
          Sharing is per-account, opt-in, and reversible. A partner never sees what you haven&apos;t explicitly shared.
        </p>
      </div>
    </section>
  );
}

function PersonalPanel({
  name,
  tone,
  accounts,
}: {
  name: string;
  tone: "primary" | "secondary";
  accounts: Account[];
}) {
  const dotColor = tone === "primary" ? "oklch(0.68 0.18 145)" : "oklch(0.78 0.14 70)";
  return (
    <div className="relative rounded-xl border border-border/60 bg-card/60 p-6 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.5)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span
            className="inline-flex size-8 items-center justify-center rounded-full font-mono text-xs font-semibold text-background"
            style={{ background: dotColor }}
          >
            {name[0]}
          </span>
          <div>
            <p className="font-mono text-sm font-medium">{name}&apos;s view</p>
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Personal</p>
          </div>
        </div>
        <span className="rounded-full border border-border/60 bg-background/60 px-2 py-1 font-mono text-[10px] text-muted-foreground">
          {accounts.length} accounts
        </span>
      </div>

      <ul className="mt-5 space-y-2">
        {accounts.map((a) => (
          <li
            key={a.label}
            className={`flex items-center justify-between rounded-lg border px-3 py-2 font-mono text-xs ${
              a.shared
                ? "border-primary/30 bg-primary/5"
                : "border-border/40 bg-background/40"
            }`}
          >
            <span className="flex items-center gap-2">
              {a.shared ? (
                <Eye className="size-3.5 text-primary" />
              ) : (
                <EyeOff className="size-3.5 text-muted-foreground/60" />
              )}
              <span>{a.label}</span>
              {a.shared ? (
                <span className="rounded-sm bg-primary/15 px-1 py-px text-[9px] uppercase tracking-wider text-primary">
                  shared
                </span>
              ) : (
                <span className="rounded-sm bg-muted-foreground/10 px-1 py-px text-[9px] uppercase tracking-wider text-muted-foreground">
                  private
                </span>
              )}
            </span>
            <span className={a.shared ? "text-foreground/90" : "text-muted-foreground"}>{a.balance}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FlowIndicator() {
  return (
    <div className="relative flex flex-col items-center gap-3">
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        <span className="size-1 rounded-full bg-primary motion-safe:animate-[flowPulse_1.6s_ease-in-out_infinite]" />
        <span>shared accounts only</span>
        <span className="size-1 rounded-full bg-primary motion-safe:animate-[flowPulse_1.6s_ease-in-out_infinite_0.5s]" />
      </div>
      <div className="flex h-8 items-center justify-center">
        <ArrowDown className="size-5 text-primary motion-safe:animate-[flowBob_2s_ease-in-out_infinite]" />
      </div>
    </div>
  );
}

function HouseholdPanel() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-primary/30 bg-card/80 p-6 shadow-[0_0_0_1px_var(--primary)] shadow-primary/10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          background:
            "radial-gradient(circle at 50% 0%, oklch(0.68 0.18 145 / 0.25), transparent 60%)",
        }}
      />

      <div className="relative flex flex-col items-start gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            <span
              className="inline-flex size-8 items-center justify-center rounded-full ring-2 ring-card font-mono text-xs font-semibold text-background"
              style={{ background: "oklch(0.68 0.18 145)" }}
            >
              A
            </span>
            <span
              className="inline-flex size-8 items-center justify-center rounded-full ring-2 ring-card font-mono text-xs font-semibold text-background"
              style={{ background: "oklch(0.78 0.14 70)" }}
            >
              B
            </span>
          </div>
          <div>
            <p className="font-mono text-sm font-medium">Household view</p>
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Shared between Alice &amp; Bob
            </p>
          </div>
        </div>
        <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-primary">
          2 accounts shared
        </span>
      </div>

      <div className="relative mt-6 grid gap-3 md:grid-cols-2">
        <SharedAccountRow
          label="Joint checking"
          balance="$8,420"
          contributors={[
            { initial: "A", color: "oklch(0.68 0.18 145)" },
            { initial: "B", color: "oklch(0.78 0.14 70)" },
          ]}
        />
        <SharedAccountRow
          label="Shared savings"
          balance="$22,800"
          contributors={[{ initial: "B", color: "oklch(0.78 0.14 70)" }]}
        />
      </div>

      <div className="relative mt-6 grid gap-4 border-t border-border/60 pt-5 md:grid-cols-3">
        <Stat label="Joint net worth" value="$31,220" delta="+2.1%" />
        <Stat label="Joint budget remaining" value="$1,840" delta="of $2,400" />
        <Stat label="This month flow" value="+$3,920" delta="cash in − out" />
      </div>
    </div>
  );
}

function SharedAccountRow({
  label,
  balance,
  contributors,
}: {
  label: string;
  balance: string;
  contributors: { initial: string; color: string }[];
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/40 bg-background/50 px-3 py-2.5 font-mono text-xs">
      <div className="flex items-center gap-2.5">
        <Eye className="size-3.5 text-primary" />
        <span>{label}</span>
        <div className="flex -space-x-1.5">
          {contributors.map((c, i) => (
            <span
              key={i}
              className="inline-flex size-4 items-center justify-center rounded-full ring-2 ring-card font-mono text-[8px] font-bold text-background"
              style={{ background: c.color }}
            >
              {c.initial}
            </span>
          ))}
        </div>
      </div>
      <span className="text-foreground/90">{balance}</span>
    </div>
  );
}

function Stat({ label, value, delta }: { label: string; value: string; delta: string }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-lg font-semibold tracking-tight">{value}</p>
      <p className="font-mono text-[10px] text-primary">{delta}</p>
    </div>
  );
}
