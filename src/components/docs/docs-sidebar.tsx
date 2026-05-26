"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { DocSection } from "@/lib/docs";

export function DocsSidebar({ sections }: { sections: DocSection[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-8">
      {sections.map((section) => (
        <div key={section.name} className="flex flex-col gap-1.5">
          <p className="px-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {section.name}
          </p>
          <ul className="flex flex-col gap-0.5">
            {section.pages.map((page) => {
              const active = pathname === page.href;
              return (
                <li key={page.href}>
                  <Link
                    href={page.href}
                    className={`block rounded-md border-l-2 px-3 py-1.5 text-sm transition-colors ${
                      active
                        ? "border-primary bg-primary/10 font-medium text-foreground"
                        : "border-transparent text-muted-foreground hover:border-border hover:bg-muted/30 hover:text-foreground"
                    }`}
                  >
                    {page.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
