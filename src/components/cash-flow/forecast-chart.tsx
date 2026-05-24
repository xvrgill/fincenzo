"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const usdCompact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

const usdFull = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export type ForecastChartPoint = {
  date: string;
  balanceCents: number;
};

export function ForecastChart({ data }: { data: ForecastChartPoint[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const chartData = data.map((p) => ({ date: p.date, balance: p.balanceCents / 100 }));
  const hasNegative = chartData.some((p) => p.balance < 0);

  if (!mounted) return <div style={{ height: 320 }} />;

  return (
    <div className="w-full" style={{ height: 320 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
          <defs>
            <linearGradient id="forecastFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.68 0.18 145)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="oklch(0.68 0.18 145)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border)" vertical={false} strokeDasharray="2 4" />
          <XAxis
            dataKey="date"
            tickFormatter={(d: string) =>
              new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })
            }
            stroke="var(--border)"
            tick={{ fontSize: 10, fontFamily: "var(--font-geist-mono)", fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            minTickGap={32}
          />
          <YAxis
            tickFormatter={(v: number) => usdCompact.format(v)}
            stroke="var(--border)"
            tick={{ fontSize: 10, fontFamily: "var(--font-geist-mono)", fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            width={64}
          />
          {hasNegative ? <ReferenceLine y={0} stroke="oklch(0.62 0.20 25)" strokeDasharray="3 3" /> : null}
          <Tooltip
            cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 2,
              fontSize: 11,
              fontFamily: "var(--font-geist-mono)",
              color: "var(--foreground)",
            }}
            formatter={(value) => [usdFull.format(Number(value)), "Balance"]}
            labelFormatter={(d) =>
              new Date(String(d)).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            }
          />
          <Area
            type="monotone"
            dataKey="balance"
            stroke="oklch(0.68 0.18 145)"
            strokeWidth={2}
            fill="url(#forecastFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
