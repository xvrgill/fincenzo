"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { NetWorthPoint } from "@/lib/queries/net-worth";

const usdCompact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

const usdFull = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

type ChartPoint = { date: string; net: number };

export function NetWorthChart({ data }: { data: NetWorthPoint[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const chartData: ChartPoint[] = data.map((p) => ({
    date: p.date,
    net: p.netCents / 100,
  }));

  if (!mounted) return <div style={{ height: 320 }} />;

  return (
    <div className="w-full" style={{ height: 320 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
          <defs>
            <linearGradient id="netFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.68 0.18 145)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="oklch(0.68 0.18 145)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border)" vertical={false} strokeDasharray="2 4" />
          <XAxis
            dataKey="date"
            tickFormatter={(d: string) => {
              const date = new Date(d);
              return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
            }}
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
            formatter={(value) => [usdFull.format(Number(value) || 0), "Net worth"]}
            labelFormatter={(label) =>
              new Date(String(label)).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            }
          />
          <Area
            type="monotone"
            dataKey="net"
            stroke="oklch(0.68 0.18 145)"
            strokeWidth={1.5}
            fill="url(#netFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
