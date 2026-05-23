"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DailyActivityPoint } from "@/lib/queries/dashboard";

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

type ChartPoint = {
  date: string;
  income: number;
  expenses: number;
};

export function BalanceOverviewChart({ data }: { data: DailyActivityPoint[] }) {
  const chartData: ChartPoint[] = data.map((p) => ({
    date: p.date,
    income: p.incomeCents / 100,
    expenses: p.expensesCents / 100,
  }));

  return (
    <div className="w-full" style={{ height: 288 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(d: string) => {
              const date = new Date(d);
              return `${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
            }}
            stroke="var(--muted-foreground)"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tickFormatter={(v: number) => usdCompact.format(v)}
            stroke="var(--muted-foreground)"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={56}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.4 }}
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value, name) => [usdFull.format(Number(value) || 0), String(name)]}
            labelFormatter={(label) =>
              new Date(String(label)).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })
            }
          />
          <Bar dataKey="income" name="Income" fill="oklch(0.72 0.17 145)" radius={[3, 3, 0, 0]} />
          <Bar dataKey="expenses" name="Expenses" fill="oklch(0.78 0.14 70)" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
