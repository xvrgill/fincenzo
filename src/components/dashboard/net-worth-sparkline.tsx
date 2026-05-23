"use client";

import { Area, AreaChart, ResponsiveContainer } from "recharts";
import type { NetWorthPoint } from "@/lib/queries/net-worth";

export function NetWorthSparkline({ data }: { data: NetWorthPoint[] }) {
  const chartData = data.map((p) => ({ date: p.date, net: p.netCents / 100 }));
  return (
    <div className="w-full" style={{ height: 64 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="net"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#sparkFill)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
