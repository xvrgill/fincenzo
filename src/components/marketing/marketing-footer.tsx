import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer className="border-t border-border/60 bg-background">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-4 md:px-6">
        <div className="space-y-3">
          <Link href="/" className="flex items-center gap-2 font-mono text-sm font-semibold">
            <span className="inline-block size-2 rounded-full bg-primary" aria-hidden />
            fincenzo
          </Link>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Budgeting and net-worth tracking for individuals — and the couples they live with.
          </p>
        </div>

        <FooterColumn
          title="Product"
          links={[
            { href: "/#how-it-works", label: "How it works" },
            { href: "/#features", label: "Features" },
            { href: "/#faq", label: "FAQ" },
            { href: "/#waitlist", label: "Join waitlist" },
          ]}
        />

        <FooterColumn
          title="Docs"
          links={[
            { href: "/docs", label: "Documentation" },
            { href: "/docs/getting-started", label: "Getting started" },
            { href: "/docs/households", label: "Households" },
            { href: "/docs/privacy", label: "Privacy & data" },
          ]}
        />

        <FooterColumn
          title="Company"
          links={[
            { href: "https://github.com/xvrgill/fincenzo", label: "GitHub", external: true },
            { href: "/privacy", label: "Privacy policy" },
            { href: "/terms", label: "Terms" },
            { href: "/changelog", label: "Changelog" },
          ]}
        />
      </div>
      <div className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-2 px-4 py-6 text-xs text-muted-foreground md:flex-row md:items-center md:px-6">
          <span>© {new Date().getFullYear()} Fincenzo. Built in the open.</span>
          <span className="font-mono">v0.1 · invite-only beta</span>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string; external?: boolean }[];
}) {
  return (
    <div className="space-y-3">
      <h3 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">{title}</h3>
      <ul className="space-y-2 text-sm">
        {links.map(({ href, label, external }) => (
          <li key={href}>
            {external ? (
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="text-foreground/80 hover:text-foreground transition-colors"
              >
                {label}
              </a>
            ) : (
              <Link href={href} className="text-foreground/80 hover:text-foreground transition-colors">
                {label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
