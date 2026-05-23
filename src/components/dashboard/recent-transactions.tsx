import Link from "next/link";
import { formatDate, formatMoneyCents } from "@/lib/format";
import { cn } from "@/lib/utils";

type Row = {
  id: string;
  date: string;
  name: string;
  merchantName: string | null;
  amountCents: number;
  isoCurrencyCode: string | null;
  accountName: string;
};

export function RecentTransactions({ rows }: { rows: Row[] }) {
  if (rows.length === 0) {
    return <p className="text-xs text-muted-foreground">— no transactions yet</p>;
  }

  return (
    <div className="flex flex-col">
      <div className="mb-2 grid grid-cols-[1fr_auto] border-b border-border pb-1.5 text-xs tracking-widest uppercase text-muted-foreground">
        <span>Merchant</span>
        <span>Amount</span>
      </div>
      {rows.map((t) => {
        const outgoing = t.amountCents > 0;
        return (
          <div
            key={t.id}
            className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-border/60 py-2 last:border-b-0"
          >
            <div className="min-w-0">
              <p className="truncate text-sm">{t.merchantName ?? t.name}</p>
              <p className="text-xs text-muted-foreground">{formatDate(t.date)}</p>
            </div>
            <div
              className={cn(
                "text-sm tabular-nums shrink-0",
                outgoing ? "text-foreground" : "text-primary",
              )}
            >
              {outgoing ? "-" : "+"}
              {formatMoneyCents(Math.abs(t.amountCents), t.isoCurrencyCode ?? "USD")}
            </div>
          </div>
        );
      })}
      <Link
        href="/transactions"
        className="mt-3 text-center text-xs tracking-wide text-muted-foreground underline underline-offset-4 hover:text-primary transition-colors"
      >
        view all transactions
      </Link>
    </div>
  );
}
