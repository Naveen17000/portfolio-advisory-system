"use client";

import { RadialBarChart, RadialBar, ResponsiveContainer } from "recharts";
import { RISK_CATEGORIES } from "@/lib/constants";

interface RiskGaugeProps {
  score: number;
  category: string;
}

export default function RiskGauge({ score, category }: RiskGaugeProps) {
  const info = RISK_CATEGORIES[category] || RISK_CATEGORIES.moderate;

  const data = [
    { name: "score", value: score, fill: info.color },
  ];

  return (
    <div className="flex flex-col items-center w-full">
      <div className="w-52 h-28 relative">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="100%"
            innerRadius="70%"
            outerRadius="100%"
            startAngle={180}
            endAngle={0}
            barSize={12}
            data={data}
          >
            <RadialBar
              dataKey="value"
              cornerRadius={6}
              background={{ fill: "#e5e7eb" }}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-end">
          <span className="text-3xl font-bold" style={{ color: info.color }}>
            {Math.round(score)}
          </span>
        </div>
      </div>
      <span
        className="mt-3 text-sm font-semibold px-3 py-1 rounded-full"
        style={{ backgroundColor: info.color + "20", color: info.color }}
      >
        {info.label}
      </span>
    </div>
  );
}
