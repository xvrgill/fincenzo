import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { DocMeta } from "@/lib/docs";

export function DocsPrevNext({
  prev,
  next,
}: {
  prev: DocMeta | null;
  next: DocMeta | null;
}) {
  if (!prev && !next) return null;
  return (
    <div className="mt-16 grid gap-3 border-t border-border/60 pt-8 sm:grid-cols-2">
      {prev ? (
        <Link
          href={prev.href}
          className="group flex flex-col gap-1 rounded-lg border border-border/60 bg-card/40 p-4 transition-colors hover:border-primary/40 hover:bg-card/70"
        >
          <span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <ArrowLeft className="size-3" /> Previous
          </span>
          <span className="font-mono text-sm font-medium text-foreground group-hover:text-primary">
            {prev.title}
          </span>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link
          href={next.href}
          className="group flex flex-col items-end gap-1 rounded-lg border border-border/60 bg-card/40 p-4 text-right transition-colors hover:border-primary/40 hover:bg-card/70"
        >
          <span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Next <ArrowRight className="size-3" />
          </span>
          <span className="font-mono text-sm font-medium text-foreground group-hover:text-primary">
            {next.title}
          </span>
        </Link>
      ) : (
        <span />
      )}
    </div>
  );
}
