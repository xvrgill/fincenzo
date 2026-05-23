import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoneyCents } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  amountCents: number;
  pctChange: number | null;
  /** When true, a negative pct change is "good" (e.g. expenses going down). */
  invertSentiment?: boolean;
};

export function StatTile({ label, amountCents, pctChange, invertSentiment }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl tabular-nums">{formatMoneyCents(amountCents)}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChangeIndicator pctChange={pctChange} invertSentiment={invertSentiment} />
      </CardContent>
    </Card>
  );
}

function ChangeIndicator({
  pctChange,
  invertSentiment,
}: {
  pctChange: number | null;
  invertSentiment?: boolean;
}) {
  if (pctChange === null) {
    return <p className="text-xs text-muted-foreground">No prior-month data</p>;
  }
  // Round to one decimal before comparing so 0.04% doesn't render an arrow.
  const rounded = Math.round(pctChange * 10) / 10;
  if (rounded === 0) {
    return <p className="text-xs text-muted-foreground">No change from last month</p>;
  }
  const positive = invertSentiment ? rounded < 0 : rounded > 0;
  return (
    <p
      className={cn(
        "flex items-center gap-1 text-xs",
        positive ? "text-emerald-600" : "text-amber-600",
      )}
    >
      {rounded > 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
      {Math.abs(rounded).toFixed(1)}% from last month
    </p>
  );
}
