"use client";

import { useEffect, useState } from "react";
import type { TocItem } from "@/lib/docs";

export function DocsToc({ items }: { items: TocItem[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (items.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "0px 0px -70% 0px", threshold: [0, 1] },
    );
    for (const item of items) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [items]);

  if (items.length === 0) return null;

  return (
    <nav className="sticky top-20 flex flex-col gap-2 text-sm">
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        On this page
      </p>
      <ul className="flex flex-col gap-1">
        {items.map((item) => {
          const active = activeId === item.id;
          return (
            <li key={item.id} className={item.depth === 3 ? "pl-3" : ""}>
              <a
                href={`#${item.id}`}
                className={`block border-l py-1 pl-3 text-[13px] transition-colors ${
                  active
                    ? "border-primary text-foreground"
                    : "border-border/40 text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.text}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
