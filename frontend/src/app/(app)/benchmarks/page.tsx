"use client";

import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { api } from "@/lib/api";
import Card from "@/components/ui/Card";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { ASSET_CLASS_LABELS, ASSET_CLASS_COLORS } from "@/lib/constants";

interface Comparison {
  metric: string;
  user_value: number;
  cohort_avg: number;
  unit: string;
  percentile: number;
  better: boolean | null;
  insight: string;
}

interface BenchmarkData {
  cohort: { label: string; sample_size: number };
  comparisons: Comparison[];
  allocation_benchmark: Record<string, number>;
  top_goals: string[];
  overall: {
    rating: string;
    better_count: number;
    total_compared: number;
    summary: string;
    strengths: string[];
    weaknesses: string[];
  };
}

const RATING_STYLES: Record<string, { bg: string; text: string }> = {
  above_average: { bg: "bg-green-100 dark:bg-green-900/40", text: "text-green-700 dark:text-green-400" },
  average: { bg: "bg-blue-100 dark:bg-blue-900/40", text: "text-blue-700 dark:text-blue-400" },
  below_average: { bg: "bg-orange-100 dark:bg-orange-900/40", text: "text-orange-700 dark:text-orange-400" },
};

export default function BenchmarksPage() {
  const [data, setData] = useState<BenchmarkData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<BenchmarkData>("/api/v1/benchmark/")
      .then(setData)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <>
        <div className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8" role="main" aria-label="Loading benchmarks">
          <div className="space-y-6">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </div>
      </>
    );
  }

  if (!data) {
    return (
      <>
        <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400" role="main">
          Complete your profile to see peer benchmarks.
        </div>
      </>
    );
  }

  const chartData = data.comparisons.map((c) => ({
    name: c.metric,
    You: c.user_value,
    Peers: c.cohort_avg,
  }));

  const ratingStyle = RATING_STYLES[data.overall.rating] || RATING_STYLES.average;

  return (
    <>
        <div className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8" role="main" aria-label="Peer benchmarking">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Peer Benchmarking</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            See how you compare to {data.cohort.sample_size.toLocaleString()} anonymized users in the{" "}
            <strong>{data.cohort.label}</strong> cohort
          </p>

          {/* Overall Rating */}
          <Card className="mb-6">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <span className={`px-4 py-2 rounded-full text-sm font-semibold ${ratingStyle.bg} ${ratingStyle.text}`}>
                {data.overall.rating.replace("_", " ").toUpperCase()}
              </span>
              <p className="text-sm text-gray-700 dark:text-gray-300">{data.overall.summary}</p>
            </div>
            <div className="flex flex-wrap gap-4 mt-4">
              {data.overall.strengths.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-1">Strengths</p>
                  <div className="flex flex-wrap gap-1">
                    {data.overall.strengths.map((s) => (
                      <span key={s} className="text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full">{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {data.overall.weaknesses.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-orange-700 dark:text-orange-400 mb-1">Areas to Improve</p>
                  <div className="flex flex-wrap gap-1">
                    {data.overall.weaknesses.map((w) => (
                      <span key={w} className="text-xs bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400 px-2 py-0.5 rounded-full">{w}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Comparison Chart */}
          <Card title="You vs Peers" className="mb-6">
            <div className="w-full h-72 overflow-hidden" style={{ minHeight: 0 }} aria-label="Comparison bar chart">
              <ResponsiveContainer width="100%" height="100%" minWidth={400}>
                <BarChart data={chartData} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="You" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Peers" fill="#d1d5db" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Detailed Comparisons */}
          <Card title="Detailed Comparison" className="mb-6">
            <div className="space-y-4">
              {data.comparisons.map((c) => (
                <div key={c.metric} className="flex flex-col sm:flex-row sm:items-center gap-2 py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <div className="sm:w-40 flex-shrink-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{c.metric}</p>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 text-sm">
                      <span className="font-semibold text-blue-700 dark:text-blue-400">
                        You: {c.user_value}{c.unit}
                      </span>
                      <span className="text-gray-400 dark:text-gray-500">vs</span>
                      <span className="text-gray-600 dark:text-gray-300">
                        Peers: {c.cohort_avg}{c.unit}
                      </span>
                      {c.better !== null && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          c.better ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400" : "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400"
                        }`}>
                          {c.better ? "Above avg" : "Below avg"}
                        </span>
                      )}
                    </div>
                    {/* Percentile bar */}
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2" role="progressbar" aria-valuenow={c.percentile} aria-valuemin={0} aria-valuemax={100}>
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all"
                          style={{ width: `${c.percentile}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 w-12">{c.percentile}th</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Cohort Allocation */}
          <Card title="Typical Peer Allocation" className="mb-6">
            <div className="flex flex-wrap gap-3">
              {Object.entries(data.allocation_benchmark).map(([asset, pct]) => (
                <div key={asset} className="flex items-center gap-2 text-sm">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: ASSET_CLASS_COLORS[asset] || "#94a3b8" }}
                  />
                  <span className="text-gray-700 dark:text-gray-300">{ASSET_CLASS_LABELS[asset] || asset}</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{pct}%</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Top Goals */}
          <Card title="Popular Goals in Your Cohort">
            <div className="flex flex-wrap gap-2">
              {data.top_goals.map((g, i) => (
                <span key={g} className="text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 px-3 py-1.5 rounded-full">
                  #{i + 1} {g}
                </span>
              ))}
            </div>
          </Card>

          <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-6">
            All peer data is anonymized and aggregated. Individual privacy is fully protected.
          </p>
        </div>
    </>
  );
}
