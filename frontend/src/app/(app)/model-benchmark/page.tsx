"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import Card from "@/components/ui/Card";
import { CardSkeleton, PageSkeleton } from "@/components/ui/Skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface BenchmarkResult {
  profile: string;
  rule_based_score: number;
  ml_score: number | null;
  blended_score: number | null;
  rule_category: string;
  agreement: boolean | null;
}

interface BlendWeights {
  rule_based: number;
  ml: number;
}

interface BenchmarkMetrics {
  agreement_rate_pct: number | null;
  avg_score_difference: number | null;
  max_score_difference: number | null;
  correlation: number | null;
  blend_weights: BlendWeights;
}

interface FeatureImportance {
  feature: string;
  importance: number;
}

interface ModelInfo {
  rule_based: string;
  ml: string;
  blending: string;
}

interface BenchmarkData {
  benchmark_results: BenchmarkResult[];
  metrics: BenchmarkMetrics;
  feature_importance: FeatureImportance[];
  model_info: ModelInfo;
}

export default function ModelBenchmarkPage() {
  const [data, setData] = useState<BenchmarkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api<BenchmarkData>("/api/v1/model-benchmark/")
      .then(setData)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load benchmark data")
      )
      .finally(() => setLoading(false));
  }, []);

  const featureChartData = data
    ? [...data.feature_importance]
        .sort((a, b) => a.importance - b.importance)
        .map((f) => ({
          feature: f.feature.replace(/_/g, " "),
          importance: +(f.importance * 100).toFixed(1),
        }))
    : [];

  return (
    <>
      <div className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Model Benchmark
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          Compare rule-based and ML model risk scoring approaches.
        </p>

        {loading && <PageSkeleton />}

        {error && (
          <Card>
            <p className="text-red-600 dark:text-red-400" role="alert">{error}</p>
          </Card>
        )}

        {data && (
          <>
            {/* Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <Card>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Agreement Rate
                </p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {data.metrics.agreement_rate_pct?.toFixed(1) ?? "N/A"}%
                </p>
              </Card>
              <Card>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Avg Score Difference
                </p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {data.metrics.avg_score_difference?.toFixed(2) ?? "N/A"}
                </p>
              </Card>
              <Card>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Correlation
                </p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {data.metrics.correlation?.toFixed(3) ?? "N/A"}
                </p>
              </Card>
            </div>

            {/* Comparison Table */}
            <Card title="Profile Score Comparisons" className="mb-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-2 text-gray-600 dark:text-gray-400 font-medium">
                        Profile
                      </th>
                      <th className="text-right py-3 px-2 text-gray-600 dark:text-gray-400 font-medium">
                        Rule-Based
                      </th>
                      <th className="text-right py-3 px-2 text-gray-600 dark:text-gray-400 font-medium">
                        ML Score
                      </th>
                      <th className="text-right py-3 px-2 text-gray-600 dark:text-gray-400 font-medium">
                        Blended
                      </th>
                      <th className="text-center py-3 px-2 text-gray-600 dark:text-gray-400 font-medium">
                        Agreement
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.benchmark_results.map((row) => (
                      <tr
                        key={row.profile}
                        className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                      >
                        <td className="py-3 px-2 text-gray-900 dark:text-gray-100 font-medium capitalize">
                          {row.profile.replace(/_/g, " ")}
                        </td>
                        <td className="py-3 px-2 text-right text-gray-700 dark:text-gray-300">
                          {row.rule_based_score.toFixed(1)}
                        </td>
                        <td className="py-3 px-2 text-right text-gray-700 dark:text-gray-300">
                          {row.ml_score?.toFixed(1) ?? "N/A"}
                        </td>
                        <td className="py-3 px-2 text-right font-semibold text-gray-900 dark:text-gray-100">
                          {row.blended_score?.toFixed(1) ?? "N/A"}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                              row.agreement === true
                                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                : row.agreement === false
                                ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                                : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                            }`}
                          >
                            {row.agreement === true ? "Yes" : row.agreement === false ? "No" : "N/A"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Feature Importance Chart */}
            <Card title="Feature Importance" className="mb-6">
              <div className="overflow-hidden" style={{ minHeight: 0 }}>
              <ResponsiveContainer width="100%" height={Math.max(300, featureChartData.length * 40)}>
                <BarChart
                  data={featureChartData}
                  layout="vertical"
                  margin={{ left: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    type="number"
                    tickFormatter={(v) => `${v}%`}
                    stroke="#9CA3AF"
                  />
                  <YAxis
                    dataKey="feature"
                    type="category"
                    width={150}
                    stroke="#9CA3AF"
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value: number) => `${value}%`}
                    contentStyle={{ backgroundColor: "var(--tooltip-bg, #fff)", borderColor: "var(--tooltip-border, #e5e7eb)", borderRadius: "8px", color: "var(--tooltip-text, #111)" }}
                  />
                  <Bar dataKey="importance" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
              </div>
            </Card>

            {/* Model Info */}
            <Card title="Model Information">
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Rule-Based</p>
                  <p className="text-sm text-gray-900 dark:text-gray-100">{data.model_info.rule_based}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">ML Model</p>
                  <p className="text-sm text-gray-900 dark:text-gray-100">{data.model_info.ml}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Blending Strategy</p>
                  <p className="text-sm text-gray-900 dark:text-gray-100">{data.model_info.blending}</p>
                </div>
              </div>
            </Card>
          </>
        )}
      </div>
    </>
  );
}
