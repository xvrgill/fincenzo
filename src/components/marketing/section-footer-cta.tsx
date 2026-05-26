import { WaitlistForm } from "./waitlist-form";

export function SectionFooterCta() {
  return (
    <section className="relative overflow-hidden border-b border-border/60 bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]"
      >
        <div
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage:
              "linear-gradient(to right, color-mix(in oklch, var(--border) 80%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklch, var(--border) 80%, transparent) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 py-24 text-center md:px-6 md:py-32">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 px-3 py-1 font-mono text-xs text-muted-foreground">
          <span className="inline-block size-1.5 rounded-full bg-primary shadow-[0_0_8px] shadow-primary/60" aria-hidden />
          Invites going out in small batches
        </div>

        <h2 className="text-balance font-mono text-3xl font-semibold tracking-tight md:text-5xl">
          Keep yours yours.{" "}
          <span className="text-muted-foreground">Share what you choose.</span>
        </h2>

        <p className="max-w-xl text-pretty text-base leading-relaxed text-muted-foreground">
          Join the waitlist and you&apos;ll get an invite the next time a batch opens. No spam, no drip campaign —
          just one email when it&apos;s your turn.
        </p>

        <div className="mt-2 flex w-full justify-center">
          <WaitlistForm source="footer" size="lg" />
        </div>
      </div>
    </section>
  );
}
