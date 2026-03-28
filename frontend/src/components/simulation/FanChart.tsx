"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface FanChartProps {
  yearlyData: {
    year: number;
    p5: number;
    p25: number;
    p50: number;
    p75: number;
    p95: number;
  }[];
}

function formatCurrency(value: number): string {
  if (value >= 10000000) return `${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return value.toFixed(0);
}

export default function FanChart({ yearlyData }: FanChartProps) {
  return (
    <div className="w-full h-72 sm:h-80 overflow-hidden" style={{ minHeight: 0 }} role="img" aria-label="Portfolio projection fan chart showing percentile ranges over time">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={yearlyData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} className="dark:opacity-20" />
          <XAxis
            dataKey="year"
            tick={{ fontSize: 11 }}
            label={{ value: "Year", position: "insideBottom", offset: -10, fontSize: 11 }}
          />
          <YAxis
            tickFormatter={formatCurrency}
            tick={{ fontSize: 10 }}
            width={55}
          />
          <Tooltip
            formatter={(value) => formatCurrency(Number(value))}
            labelFormatter={(label) => `Year ${label}`}
            contentStyle={{ backgroundColor: "var(--tooltip-bg, #fff)", borderColor: "var(--tooltip-border, #e5e7eb)" }}
          />
          <Area type="monotone" dataKey="p95" stackId="1" stroke="none" fill="#dbeafe" name="95th pctl" className="dark:fill-blue-900/40" />
          <Area type="monotone" dataKey="p75" stackId="2" stroke="none" fill="#93c5fd" name="75th pctl" className="dark:fill-blue-800/50" />
          <Area type="monotone" dataKey="p50" stackId="3" stroke="#3b82f6" fill="#60a5fa" strokeWidth={2} name="Median" className="dark:fill-blue-700/60" />
          <Area type="monotone" dataKey="p25" stackId="4" stroke="none" fill="#93c5fd" name="25th pctl" className="dark:fill-blue-800/50" />
          <Area type="monotone" dataKey="p5" stackId="5" stroke="none" fill="#dbeafe" name="5th pctl" className="dark:fill-blue-900/40" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
