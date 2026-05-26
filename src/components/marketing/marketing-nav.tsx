import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export async function MarketingNav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2 font-mono text-sm font-semibold tracking-tight">
          <span className="inline-block size-2 rounded-full bg-primary shadow-[0_0_12px] shadow-primary/60" aria-hidden />
          fincenzo
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <Link href="/#how-it-works" className="hover:text-foreground transition-colors">
            How it works
          </Link>
          <Link href="/#features" className="hover:text-foreground transition-colors">
            Features
          </Link>
          <Link href="/docs" className="hover:text-foreground transition-colors">
            Docs
          </Link>
          <a
            href="https://github.com/xvrgill/fincenzo"
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground transition-colors"
          >
            GitHub
          </a>
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <Link href="/dashboard" className={cn(buttonVariants({ variant: "default", size: "sm" }))}>
              Go to app
            </Link>
          ) : (
            <>
              <Link
                href="/sign-in"
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "hidden sm:inline-flex")}
              >
                Sign in
              </Link>
              <Link href="/#waitlist" className={cn(buttonVariants({ variant: "default", size: "sm" }))}>
                Join waitlist
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
