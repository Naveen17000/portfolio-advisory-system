"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart } from "recharts";
import type { RiskAssessment } from "@/types";

interface RiskTimelineProps {
  history: RiskAssessment[];
}

export default function RiskTimeline({ history }: RiskTimelineProps) {
  const data = [...history]
    .reverse()
    .map((h) => ({
      date: new Date(h.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      score: h.overall_score,
      category: h.risk_category,
    }));

  if (data.length < 2) return null;

  return (
    <div className="w-full" role="img" aria-label="Risk score history timeline">
      <div className="w-full h-64 overflow-hidden" style={{ minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#9ca3af" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--background)",
                borderColor: "#4b5563",
                borderRadius: "8px",
                fontSize: "13px",
              }}
              formatter={(value: number) => [`${value}/100`, "Risk Score"]}
            />
            {/* Conservative / Moderate / Aggressive zone lines */}
            <ReferenceLine y={35} stroke="#22c55e" strokeDasharray="3 3" label={{ value: "Conservative", position: "right", fontSize: 10, fill: "#22c55e" }} />
            <ReferenceLine y={65} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: "Aggressive", position: "right", fontSize: 10, fill: "#f59e0b" }} />
            <Area
              type="monotone"
              dataKey="score"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#scoreGradient)"
              dot={{ r: 4, fill: "#3b82f6", strokeWidth: 2, stroke: "#fff" }}
              activeDot={{ r: 6 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-center gap-6 mt-2 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-green-500" />
          <span>Conservative (&lt;35)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-blue-500" />
          <span>Moderate (35-65)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-amber-500" />
          <span>Aggressive (&gt;65)</span>
        </div>
      </div>
    </div>
  );
}
