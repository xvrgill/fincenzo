"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  LayoutDashboard,
  LineChart,
  LogOut,
  Menu,
  PiggyBank,
  RotateCw,
  Scale,
  Target,
  TrendingUp,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { signOut } from "@/app/(auth)/actions";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/accounts", label: "Accounts", icon: Wallet },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/cash-flow", label: "Cash Flow", icon: LineChart },
  { href: "/budget", label: "Budget", icon: PiggyBank },
  { href: "/investments", label: "Investments", icon: TrendingUp },
  { href: "/net-worth", label: "Net Worth", icon: Scale },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/subscriptions", label: "Subscriptions", icon: RotateCw },
  { href: "/household", label: "Household", icon: Users },
] as const;

function NavList({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-1 flex-col gap-0.5">
      {nav.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "group flex items-center gap-3 border-l-2 px-3 py-2 text-sm transition-colors cursor-pointer",
              active
                ? "border-primary bg-muted/80 text-foreground"
                : "border-transparent text-muted-foreground hover:border-border hover:bg-muted/50 hover:text-foreground",
            )}
          >
            <Icon
              className={cn(
                "size-4 shrink-0 transition-colors",
                active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
              )}
            />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function SignOut() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="flex w-full items-center gap-3 border-l-2 border-transparent px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-border hover:bg-muted/50 hover:text-foreground cursor-pointer"
      >
        <LogOut className="size-4 shrink-0" />
        Sign out
      </button>
    </form>
  );
}

function Logo() {
  return (
    <span className="text-sm font-medium tracking-widest text-foreground">
      <span className="text-primary">▸</span> FINCENZO
    </span>
  );
}

export function AppSidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      {/* Desktop sidebar — always in DOM but visually shown/hidden via CSS */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-sidebar py-6 md:flex">
        <div className="px-5 pb-8">
          <Logo />
        </div>
        <NavList pathname={pathname} />
        <div className="mt-6 border-t border-border pt-4">
          <div className="truncate px-5 pb-3 text-xs tracking-wide text-muted-foreground">
            {userEmail}
          </div>
          <SignOut />
        </div>
      </aside>

      {/* Mobile top bar — only renders markup in DOM at <md */}
      <div className="md:hidden">
        <header className="sticky top-0 z-30 flex min-h-12 items-center justify-between border-b border-border bg-sidebar px-4 pt-[env(safe-area-inset-top)]">
          <Logo />
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="inline-flex size-8 items-center justify-center text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
          >
            <Menu className="size-4" />
          </button>
        </header>

        {open && (
          <div className="fixed inset-0 z-40">
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="absolute inset-0 bg-black/60"
            />
            <aside className="absolute inset-y-0 left-0 flex w-64 max-w-[85%] flex-col border-r border-border bg-sidebar py-6 shadow-xl">
              <div className="flex items-center justify-between px-5 pb-8">
                <Logo />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                  className="inline-flex size-7 items-center justify-center text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>
              <NavList pathname={pathname} onNavigate={() => setOpen(false)} />
              <div className="mt-6 border-t border-border pt-4">
                <div className="truncate px-5 pb-3 text-xs tracking-wide text-muted-foreground">
                  {userEmail}
                </div>
                <SignOut />
              </div>
            </aside>
          </div>
        )}
      </div>
    </>
  );
}
