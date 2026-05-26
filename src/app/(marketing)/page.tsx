import type { Metadata } from "next";
import Link from "next/link";
import { HeroPreview } from "@/components/marketing/hero-preview";
import { WaitlistForm } from "@/components/marketing/waitlist-form";
import { SectionProblem } from "@/components/marketing/section-problem";
import { SectionHowItWorks } from "@/components/marketing/section-how-it-works";
import { SectionFeatures } from "@/components/marketing/section-features";
import { SectionBuiltInOpen } from "@/components/marketing/section-built-in-open";
import { SectionPrivacy } from "@/components/marketing/section-privacy";
import { SectionFaq } from "@/components/marketing/section-faq";
import { SectionFooterCta } from "@/components/marketing/section-footer-cta";

export const metadata: Metadata = {
  title: "Fincenzo — Budgeting for individuals and the couples they live with",
  description:
    "Most money apps make you pick between mine and ours. Fincenzo lets you keep both. Track your own accounts and your own budget, then share what you choose with a partner.",
};

export default function LandingPage() {
  return (
    <>
      <Hero />
      <SectionProblem />
      <SectionHowItWorks />
      <SectionFeatures />
      <SectionBuiltInOpen />
      <SectionPrivacy />
      <SectionFaq />
      <SectionFooterCta />
    </>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border/60">
      <GridBackdrop />
      <div className="relative mx-auto grid max-w-6xl gap-12 px-4 py-20 md:grid-cols-[1.05fr_0.95fr] md:items-center md:gap-8 md:px-6 md:py-28">
        <div className="flex flex-col items-start gap-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 px-3 py-1 font-mono text-xs text-muted-foreground">
            <span className="inline-block size-1.5 rounded-full bg-primary shadow-[0_0_8px] shadow-primary/60" aria-hidden />
            Invite-only beta · built in the open
          </div>

          <h1 className="text-balance font-mono text-4xl font-semibold tracking-tight md:text-5xl lg:text-6xl">
            Money that&apos;s <span className="text-primary">mine</span>.{" "}
            <br className="hidden md:block" />
            Money that&apos;s <span className="text-primary">ours</span>.{" "}
            <span className="text-muted-foreground">One app.</span>
          </h1>

          <p className="max-w-xl text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
            Most money apps make you pick between your finances and your partner&apos;s.
            Fincenzo lets you keep both — your own accounts, your own budget, your own goals,
            and a shared household layer for the things you actually share. Nothing is shared by default.
            Everything is reversible.
          </p>

          <div id="waitlist" className="w-full">
            <WaitlistForm source="hero" size="lg" />
          </div>

          <p className="font-mono text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link href="/sign-in" className="text-foreground underline underline-offset-4 hover:text-primary">
              Sign in
            </Link>
          </p>
        </div>

        <div className="relative">
          <HeroPreview />
        </div>
      </div>
    </section>
  );
}

function GridBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]"
    >
      <div
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(to right, color-mix(in oklch, var(--border) 80%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklch, var(--border) 80%, transparent) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
    </div>
  );
}
