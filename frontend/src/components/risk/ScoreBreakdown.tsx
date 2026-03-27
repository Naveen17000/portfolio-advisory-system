"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface ScoreBreakdownProps {
  scores: {
    spending_ratio: number;
    savings_consistency: number;
    investment_discipline: number;
    liability_burden: number;
  };
}

const LABELS: Record<string, string> = {
  spending_ratio: "Spending",
  savings_consistency: "Savings",
  investment_discipline: "Discipline",
  liability_burden: "Liabilities",
};

const FULL_LABELS: Record<string, string> = {
  spending_ratio: "Spending Ratio",
  savings_consistency: "Savings Consistency",
  investment_discipline: "Investment Discipline",
  liability_burden: "Liability Burden",
};

const COLORS = ["#3b82f6", "#22c55e", "#8b5cf6", "#f59e0b"];

export default function ScoreBreakdown({ scores }: ScoreBreakdownProps) {
  const data = Object.entries(scores).map(([key, value]) => ({
    name: LABELS[key] || key,
    fullName: FULL_LABELS[key] || key,
    score: Math.round(value),
  }));

  return (
    <div className="w-full" role="img" aria-label="Score breakdown chart">
      <div className="w-full h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 0, right: 20, top: 5, bottom: 5 }}>
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "#9ca3af" }} />
            <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11, fill: "#9ca3af" }} />
            <Tooltip
              formatter={(value) => `${value}/100`}
              labelFormatter={(label) => {
                const item = data.find(d => d.name === label);
                return item?.fullName || label;
              }}
              contentStyle={{ backgroundColor: "var(--background)", borderColor: "#4b5563" }}
            />
            <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={20}>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-3 mt-2">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} aria-hidden="true" />
            <span>{d.fullName}: <strong>{d.score}</strong></span>
          </div>
        ))}
      </div>
    </div>
  );
}
