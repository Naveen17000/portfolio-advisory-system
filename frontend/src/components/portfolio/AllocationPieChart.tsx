"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { ASSET_CLASS_LABELS, ASSET_CLASS_COLORS } from "@/lib/constants";
import type { PortfolioAllocation } from "@/types";

interface AllocationPieChartProps {
  allocations: PortfolioAllocation[];
}

export default function AllocationPieChart({ allocations }: AllocationPieChartProps) {
  const data = allocations
    .filter((a) => a.allocation_pct > 0)
    .map((a) => ({
      name: ASSET_CLASS_LABELS[a.asset_class] || a.asset_class,
      value: a.allocation_pct,
      color: ASSET_CLASS_COLORS[a.asset_class] || "#94a3b8",
    }));

  if (data.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">No allocations to display.</p>;
  }

  return (
    <div className="w-full" role="img" aria-label="Portfolio allocation pie chart">
      <div className="w-full h-64 overflow-hidden" style={{ minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={85}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      {/* Custom legend that wraps properly */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-2">
        {data.map((entry) => (
          <div key={entry.name} className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
            <span className="truncate">{entry.name}</span>
            <span className="font-semibold">{entry.value.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
