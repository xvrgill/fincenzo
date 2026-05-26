import { User, Users, Check, X } from "lucide-react";
import { SectionHeader } from "./section-header";

export function SectionProblem() {
  return (
    <section id="problem" className="border-b border-border/60 bg-background">
      <div className="mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-28">
        <SectionHeader
          index="01"
          eyebrow="The problem"
          title={
            <>
              Every other money app makes you pick{" "}
              <span className="text-muted-foreground">a side.</span>
            </>
          }
          description="Solo apps pretend you don't share anything. Joint apps merge everything by default. Real life is somewhere between — and that's where Fincenzo lives."
        />

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          <ComparisonCard
            tone="muted"
            icon={<User className="size-4" />}
            label="Solo apps"
            verdict="Mint, Copilot, Monarch (solo)"
            rows={[
              { label: "Your accounts", ok: true },
              { label: "Your partner's accounts", ok: false },
              { label: "Shared budgets", ok: false },
              { label: "Privacy preserved", ok: true },
            ]}
          />
          <ComparisonCard
            tone="muted"
            icon={<Users className="size-4" />}
            label="Joint apps"
            verdict="Honeydue, joint Mint, shared spreadsheets"
            rows={[
              { label: "Your accounts", ok: true },
              { label: "Your partner's accounts", ok: true },
              { label: "Shared budgets", ok: true },
              { label: "Privacy preserved", ok: false },
            ]}
          />
          <ComparisonCard
            tone="primary"
            icon={
              <span className="inline-flex items-center gap-0.5">
                <User className="size-4" />
                <span className="text-muted-foreground">+</span>
                <Users className="size-4" />
              </span>
            }
            label="Fincenzo"
            verdict="Mine + ours, opt-in sharing"
            rows={[
              { label: "Your accounts", ok: true },
              { label: "Your partner's accounts", ok: true },
              { label: "Shared budgets", ok: true },
              { label: "Privacy preserved", ok: true },
            ]}
          />
        </div>
      </div>
    </section>
  );
}

function ComparisonCard({
  icon,
  label,
  verdict,
  rows,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  verdict: string;
  rows: { label: string; ok: boolean }[];
  tone: "muted" | "primary";
}) {
  const ring =
    tone === "primary"
      ? "border-primary/40 bg-card shadow-[0_0_0_1px_var(--primary)] shadow-primary/10"
      : "border-border/60 bg-card/40";
  return (
    <div className={`relative flex flex-col gap-4 rounded-xl border p-6 ${ring}`}>
      {tone === "primary" ? (
        <span className="absolute -top-2 right-4 rounded-full bg-primary px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-primary-foreground">
          this app
        </span>
      ) : null}

      <div className="flex items-center gap-2">
        <span
          className={`inline-flex size-7 items-center justify-center rounded-md ${
            tone === "primary"
              ? "bg-primary/15 text-primary"
              : "bg-muted-foreground/10 text-muted-foreground"
          }`}
        >
          {icon}
        </span>
        <span className="font-mono text-sm font-medium">{label}</span>
      </div>

      <p className="font-mono text-[11px] text-muted-foreground">{verdict}</p>

      <ul className="mt-2 space-y-2">
        {rows.map(({ label, ok }) => (
          <li key={label} className="flex items-center gap-2 font-mono text-xs">
            <span
              className={`inline-flex size-4 items-center justify-center rounded-full ${
                ok ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"
              }`}
            >
              {ok ? <Check className="size-3" /> : <X className="size-3" />}
            </span>
            <span className={ok ? "text-foreground/90" : "text-muted-foreground line-through decoration-destructive/40"}>
              {label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
