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
    return <p className="text-sm text-muted-foreground">No transactions yet.</p>;
  }

  return (
    <div className="flex flex-col">
      {rows.map((t) => {
        const outgoing = t.amountCents > 0;
        return (
          <div
            key={t.id}
            className="flex items-center justify-between gap-3 border-b py-2.5 last:border-b-0 last:pb-0 first:pt-0"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{t.merchantName ?? t.name}</p>
              <p className="text-xs text-muted-foreground">{formatDate(t.date)}</p>
            </div>
            <div
              className={cn(
                "text-sm font-medium tabular-nums shrink-0",
                outgoing ? "text-foreground" : "text-emerald-600",
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
        className="mt-3 text-center text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
      >
        View all transactions
      </Link>
    </div>
  );
}
