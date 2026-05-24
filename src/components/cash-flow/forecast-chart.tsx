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
  const values = chartData.map((p) => p.balance);
  const dataMax = values.length ? Math.max(...values) : 0;
  const dataMin = values.length ? Math.min(...values) : 0;
  const hasNegative = dataMin < 0;
  // Offset along the y-axis (0% = top, 100% = bottom) where balance crosses zero.
  // Clamp so we still get a clean single-color fill when all values share a sign.
  const zeroOffset =
    dataMax <= 0 ? 0 : dataMin >= 0 ? 1 : dataMax / (dataMax - dataMin);

  const green = "oklch(0.68 0.18 145)";
  const red = "oklch(0.62 0.20 25)";

  if (!mounted) return <div style={{ height: 320 }} />;

  return (
    <div className="w-full" style={{ height: 320 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
          <defs>
            <linearGradient id="forecastFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={green} stopOpacity={0.3} />
              <stop offset={`${zeroOffset * 100}%`} stopColor={green} stopOpacity={0} />
              <stop offset={`${zeroOffset * 100}%`} stopColor={red} stopOpacity={0} />
              <stop offset="100%" stopColor={red} stopOpacity={0.3} />
            </linearGradient>
            <linearGradient id="forecastStroke" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={green} />
              <stop offset={`${zeroOffset * 100}%`} stopColor={green} />
              <stop offset={`${zeroOffset * 100}%`} stopColor={red} />
              <stop offset="100%" stopColor={red} />
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
          {hasNegative ? <ReferenceLine y={0} stroke={red} strokeDasharray="3 3" /> : null}
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
            stroke="url(#forecastStroke)"
            strokeWidth={2}
            fill="url(#forecastFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
