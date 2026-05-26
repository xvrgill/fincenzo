import { GitCommit } from "lucide-react";
import { SectionHeader } from "./section-header";

function GithubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-2c-3.2.7-3.88-1.36-3.88-1.36-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.24 3.34.95.1-.74.4-1.25.73-1.54-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.18 1.18.92-.26 1.92-.39 2.9-.39.98 0 1.98.13 2.9.39 2.2-1.49 3.18-1.18 3.18-1.18.62 1.58.23 2.75.11 3.04.74.81 1.18 1.83 1.18 3.09 0 4.41-2.68 5.38-5.24 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.68.8.56C20.21 21.38 23.5 17.07 23.5 12 23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

export function SectionBuiltInOpen() {
  return (
    <section className="border-b border-border/60 bg-card/20">
      <div className="mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-28">
        <div className="grid gap-12 md:grid-cols-2 md:items-center">
          <SectionHeader
            index="04"
            eyebrow="Built in the open"
            title={
              <>
                A real product, <br className="hidden md:block" />
                <span className="text-muted-foreground">not a demo.</span>
              </>
            }
            description={
              <>
                Fincenzo is being built by one person, in public, as their actual money tool. The code is on GitHub.
                The roadmap is in the repo. There&apos;s no growth team, no VC, no growth-hacking dark patterns —
                just a product designed for how real households actually work.
              </>
            }
          />

          <div className="relative">
            <RepoCard />
          </div>
        </div>
      </div>
    </section>
  );
}

function RepoCard() {
  const commits = [
    { sha: "b04d20d", msg: "Merge Plaid production webhook verify" },
    { sha: "038ded1", msg: "Add logo" },
    { sha: "120b49d", msg: "Harden Plaid webhook JWT verification" },
    { sha: "9fb8d56", msg: "Clarify SENTRY_ORG is the org slug" },
  ];

  return (
    <a
      href="https://github.com/xvrgill/fincenzo"
      target="_blank"
      rel="noreferrer"
      className="group relative block overflow-hidden rounded-xl border border-border/60 bg-card/80 p-6 transition-colors hover:border-primary/40"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex size-8 items-center justify-center rounded-md bg-muted-foreground/10 text-foreground">
            <GithubMark className="size-4" />
          </span>
          <div>
            <p className="font-mono text-sm font-medium">xvrgill / fincenzo</p>
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              main · TypeScript · Next.js 16
            </p>
          </div>
        </div>
        <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-primary">
          Phase 3.5
        </span>
      </div>

      <ul className="mt-6 space-y-2">
        {commits.map((c) => (
          <li key={c.sha} className="flex items-start gap-3 font-mono text-xs">
            <span className="mt-0.5 flex items-center gap-1.5 text-muted-foreground">
              <GitCommit className="size-3" />
              <span>{c.sha}</span>
            </span>
            <span className="flex-1 text-foreground/80">{c.msg}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex items-center justify-between border-t border-border/60 pt-4 font-mono text-[10px] text-muted-foreground">
        <span>Updated daily</span>
        <span className="text-primary group-hover:underline">View on GitHub →</span>
      </div>
    </a>
  );
}
