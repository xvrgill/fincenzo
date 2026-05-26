import { Plus } from "lucide-react";
import { SectionHeader } from "./section-header";

const faqs = [
  {
    q: "Is my data safe?",
    a: "Bank credentials never touch our servers — Plaid handles authentication directly with your bank. The Plaid access tokens we receive in return are encrypted at rest with AES-256-GCM. We run on Supabase (Postgres) with row-level security; every query is scoped to your user ID.",
  },
  {
    q: "What banks are supported?",
    a: "Anything Plaid supports. In the current beta, that means thousands of US institutions without OAuth (most credit unions, smaller banks, plus some major ones). Chase, Capital One, Wells Fargo, Bank of America, US Bank, Citi, USAA, and Fidelity require Plaid OAuth, which is on the post-launch roadmap.",
  },
  {
    q: "Do I need a partner to use it?",
    a: "No. Fincenzo works just as well solo — you get the full personal experience (accounts, budgets, goals, net worth) without ever touching the household features. If you partner up later, you can layer that on without redoing anything.",
  },
  {
    q: "Is it free?",
    a: "Yes, while in beta. There is no paid tier today and no plan to introduce one until the product is stable and substantially more featureful than it is now.",
  },
  {
    q: "Is it open source?",
    a: "The code is publicly viewable on GitHub. It's not currently distributed under an open-source license — you can read it, learn from it, and file issues, but please don't redeploy it as a service.",
  },
  {
    q: "How do I get an invite?",
    a: "Join the waitlist at the top of this page. Invites go out in small batches so the product gets the attention each new user deserves.",
  },
  {
    q: "Can I export my data?",
    a: "Yes. Transactions export to CSV. Account-level and snapshot exports are on the roadmap.",
  },
  {
    q: "What happens if I leave a household?",
    a: "Your data stays with you. The shared layer dissolves; previously shared accounts revert to private. Your partner stops seeing anything of yours immediately.",
  },
];

export function SectionFaq() {
  return (
    <section id="faq" className="border-b border-border/60 bg-card/20">
      <div className="mx-auto max-w-4xl px-4 py-20 md:px-6 md:py-28">
        <SectionHeader
          index="06"
          eyebrow="Questions"
          title={
            <>
              Things people <span className="text-muted-foreground">tend to ask.</span>
            </>
          }
          align="left"
        />

        <div className="mt-10 divide-y divide-border/60 rounded-xl border border-border/60 bg-card/40">
          {faqs.map(({ q, a }) => (
            <details
              key={q}
              className="group px-5 py-4 transition-colors [&[open]]:bg-card/60"
            >
              <summary className="flex cursor-pointer list-none items-start justify-between gap-4 font-mono text-sm font-medium">
                {q}
                <Plus
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-45 group-open:text-primary"
                  aria-hidden
                />
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
