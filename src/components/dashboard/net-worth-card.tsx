import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NetWorthSparkline } from "@/components/dashboard/net-worth-sparkline";
import { formatMoneyCents } from "@/lib/format";
import type { NetWorthPoint } from "@/lib/queries/net-worth";
import { cn } from "@/lib/utils";

type Props = {
  currentCents: number;
  series: NetWorthPoint[];
};

export function NetWorthCard({ currentCents, series }: Props) {
  const first = series[0];
  const last = series[series.length - 1];
  const change = first && last ? last.netCents - first.netCents : 0;
  const positive = change >= 0;

  return (
    <Link href="/net-worth" className="group">
      <Card className="transition-colors group-hover:bg-muted/20 cursor-pointer">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardDescription>Net Worth</CardDescription>
            <ArrowRight className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
          <CardTitle className="text-3xl tabular-nums font-medium">
            {formatMoneyCents(currentCents)}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-end gap-4">
          <div className="flex-1">
            {series.length >= 2 ? (
              <NetWorthSparkline data={series} />
            ) : (
              <p className="text-xs text-muted-foreground">— awaiting sync data</p>
            )}
          </div>
          {series.length >= 2 ? (
            <div className={cn("shrink-0 text-xs tabular-nums tracking-wide", positive ? "text-primary" : "text-red-500")}>
              {positive ? "+" : ""}
              {formatMoneyCents(change)}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </Link>
  );
}
