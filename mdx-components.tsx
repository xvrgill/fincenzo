import type { MDXComponents } from "mdx/types";
import Link from "next/link";

// Global MDX component map. Markdown elements get styled like docs prose; we
// also expose a few helpers (callouts) that content pages can use directly.
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: (props) => (
      <h1
        {...props}
        className="mt-2 mb-6 scroll-mt-24 font-mono text-3xl font-semibold tracking-tight md:text-4xl"
      />
    ),
    h2: (props) => (
      <h2
        {...props}
        className="mt-12 mb-4 scroll-mt-24 border-b border-border/60 pb-2 font-mono text-2xl font-semibold tracking-tight"
      />
    ),
    h3: (props) => (
      <h3
        {...props}
        className="mt-8 mb-3 scroll-mt-24 font-mono text-lg font-semibold tracking-tight"
      />
    ),
    h4: (props) => (
      <h4 {...props} className="mt-6 mb-2 scroll-mt-24 font-mono text-base font-semibold" />
    ),
    p: (props) => <p {...props} className="my-4 leading-relaxed text-foreground/90" />,
    a: ({ href, children, ...rest }) => {
      const external = typeof href === "string" && /^https?:\/\//.test(href);
      if (external) {
        return (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="text-primary underline underline-offset-4 hover:text-primary/80"
            {...rest}
          >
            {children}
          </a>
        );
      }
      return (
        <Link
          href={href ?? "#"}
          className="text-primary underline underline-offset-4 hover:text-primary/80"
          {...rest}
        >
          {children}
        </Link>
      );
    },
    ul: (props) => <ul {...props} className="my-4 list-disc space-y-2 pl-6 text-foreground/90" />,
    ol: (props) => <ol {...props} className="my-4 list-decimal space-y-2 pl-6 text-foreground/90" />,
    li: (props) => <li {...props} className="leading-relaxed" />,
    blockquote: (props) => (
      <blockquote
        {...props}
        className="my-6 border-l-2 border-primary/60 bg-card/40 px-4 py-2 text-muted-foreground italic"
      />
    ),
    hr: (props) => <hr {...props} className="my-8 border-border/60" />,
    code: (props) => {
      // rehype-pretty-code wraps block code in <pre><code>; this branch styles
      // only inline code. Block-level code already has data-language set.
      const { className, ...rest } = props as { className?: string };
      if (className?.includes("language-")) return <code className={className} {...rest} />;
      return (
        <code
          {...rest}
          className="rounded-sm border border-border/60 bg-muted-foreground/10 px-1 py-0.5 font-mono text-[0.85em] text-foreground/90"
        />
      );
    },
    pre: (props) => (
      <pre
        {...props}
        className="my-6 overflow-x-auto rounded-lg border border-border/60 bg-card/60 p-4 font-mono text-[13px] leading-relaxed"
      />
    ),
    table: (props) => (
      <div className="my-6 overflow-x-auto rounded-lg border border-border/60">
        <table {...props} className="w-full text-sm" />
      </div>
    ),
    thead: (props) => <thead {...props} className="border-b border-border/60 bg-card/40" />,
    th: (props) => (
      <th
        {...props}
        className="px-4 py-2 text-left font-mono text-[11px] uppercase tracking-wider text-muted-foreground"
      />
    ),
    td: (props) => <td {...props} className="border-t border-border/40 px-4 py-2" />,
    img: (props) => (
      // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
      <img {...props} className="my-6 rounded-lg border border-border/60" />
    ),
    Callout,
    ...components,
  };
}

function Callout({
  type = "note",
  children,
}: {
  type?: "note" | "warn" | "tip";
  children: React.ReactNode;
}) {
  const styles = {
    note: "border-border/60 bg-card/40 text-foreground/90",
    warn: "border-destructive/30 bg-destructive/5 text-foreground/90",
    tip: "border-primary/30 bg-primary/5 text-foreground/90",
  } as const;
  const labels = { note: "Note", warn: "Heads up", tip: "Tip" } as const;
  return (
    <div className={`my-6 rounded-lg border px-4 py-3 ${styles[type]}`}>
      <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {labels[type]}
      </p>
      <div className="[&>p:first-child]:mt-0 [&>p:last-child]:mb-0">{children}</div>
    </div>
  );
}
