"use client";

import { useEffect, useState } from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import type { NetWorthPoint } from "@/lib/queries/net-worth";

export function NetWorthSparkline({ data }: { data: NetWorthPoint[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const chartData = data.map((p) => ({ date: p.date, net: p.netCents / 100 }));

  if (!mounted) return <div style={{ height: 64 }} />;

  return (
    <div className="w-full" style={{ height: 64 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.68 0.18 145)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="oklch(0.68 0.18 145)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="net"
            stroke="oklch(0.68 0.18 145)"
            strokeWidth={1.5}
            fill="url(#sparkFill)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
