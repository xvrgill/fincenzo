import { Analytics } from "@vercel/analytics/next";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { MarketingFooter } from "@/components/marketing/marketing-footer";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <MarketingNav />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
      {/* Marketing-only analytics. The app shell deliberately stays untracked. */}
      <Analytics />
    </div>
  );
}
