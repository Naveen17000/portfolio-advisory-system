"use client";

import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import { api } from "@/lib/api";
import AppShell from "@/components/layout/AppShell";
import Card from "@/components/ui/Card";
import { CardSkeleton } from "@/components/ui/Skeleton";

interface Insight {
  feature: string;
  impact: string;
  direction: string;
  shap_value: number;
  explanation: string;
}

interface Explanation {
  base_value: number;
  feature_contributions: Record<string, {
    shap_value: number;
    feature_value: number;
    label: string;
    direction: string;
    impact: string;
  }>;
  top_insights: Insight[];
  summary: string;
}

export default function ExplainPage() {
  const [data, setData] = useState<Explanation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Explanation>("/api/v1/explain/risk")
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load explanations"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <AppShell>
        <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-8" role="main" aria-label="Loading risk explainability">
          <div className="space-y-6">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </div>
      </AppShell>
    );
  }

  if (error || !data) {
    return (
      <AppShell>
        <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400" role="main">
          {error || "No explanation data available. Complete your profile first."}
        </div>
      </AppShell>
    );
  }

  const chartData = Object.entries(data.feature_contributions)
    .map(([, v]) => ({
      name: v.label,
      value: v.shap_value,
      impact: v.impact,
    }))
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, 10);

  return (
    <AppShell>
        <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-8" role="main" aria-label="Risk score explainability">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Risk Score Explainability</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8">Understand why your risk score is what it is — powered by SHAP</p>

          <Card className="mb-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <p className="text-sm text-blue-900 dark:text-blue-300 font-medium">AI Summary</p>
              <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">{data.summary}</p>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
              Base risk score (average): {data.base_value}. Each factor pushes your score higher or lower.
            </p>
          </Card>

          <Card title="Feature Impact on Risk Score" className="mb-6">
            <div className="w-full h-96 overflow-hidden" style={{ minHeight: 0 }} aria-label="SHAP feature impact chart">
              <ResponsiveContainer width="100%" height="100%" minWidth={500}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 20, top: 5, bottom: 5 }}>
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(value) => `${Number(value) > 0 ? "+" : ""}${Number(value).toFixed(2)}`} />
                  <ReferenceLine x={0} stroke="#6b7280" />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.value > 0 ? "#22c55e" : "#ef4444"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              Green bars increase your risk score (more aggressive). Red bars decrease it (more conservative).
            </p>
          </Card>

          <Card title="Key Insights">
            <div className="space-y-4">
              {data.top_insights.map((insight, i) => (
                <div key={i} className="flex gap-4 p-4 rounded-lg bg-gray-50 dark:bg-slate-900">
                  <div className="flex-shrink-0">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                        insight.direction === "increases" ? "bg-green-500" : "bg-red-500"
                      }`}
                      aria-label={insight.direction === "increases" ? "Increases risk" : "Decreases risk"}
                    >
                      {insight.direction === "increases" ? "+" : "-"}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{insight.feature}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          insight.impact === "high"
                            ? "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                        }`}
                      >
                        {insight.impact} impact
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{insight.explanation}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
    </AppShell>
  );
}
