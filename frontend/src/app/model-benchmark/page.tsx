"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import AppShell from "@/components/layout/AppShell";
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

interface ProfileComparison {
  profile_name: string;
  rule_based_score: number;
  ml_score: number;
  blended_score: number;
  agreement: boolean;
}

interface BenchmarkMetrics {
  agreement_rate: number;
  avg_difference: number;
  correlation: number;
}

interface FeatureImportance {
  feature: string;
  importance: number;
}

interface ModelInfo {
  model_type: string;
  version: string;
  trained_at: string;
  features_used: string[];
}

interface BenchmarkData {
  comparisons: ProfileComparison[];
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
    <AppShell>
      <div className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
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
                  {(data.metrics.agreement_rate * 100).toFixed(1)}%
                </p>
              </Card>
              <Card>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Avg Score Difference
                </p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {data.metrics.avg_difference.toFixed(2)}
                </p>
              </Card>
              <Card>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Correlation
                </p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {data.metrics.correlation.toFixed(3)}
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
                    {data.comparisons.map((row) => (
                      <tr
                        key={row.profile_name}
                        className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                      >
                        <td className="py-3 px-2 text-gray-900 dark:text-gray-100 font-medium capitalize">
                          {row.profile_name.replace(/_/g, " ")}
                        </td>
                        <td className="py-3 px-2 text-right text-gray-700 dark:text-gray-300">
                          {row.rule_based_score.toFixed(1)}
                        </td>
                        <td className="py-3 px-2 text-right text-gray-700 dark:text-gray-300">
                          {row.ml_score.toFixed(1)}
                        </td>
                        <td className="py-3 px-2 text-right font-semibold text-gray-900 dark:text-gray-100">
                          {row.blended_score.toFixed(1)}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                              row.agreement
                                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                            }`}
                          >
                            {row.agreement ? "Yes" : "No"}
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
                    contentStyle={{
                      backgroundColor: "#1F2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                      color: "#F3F4F6",
                    }}
                  />
                  <Bar dataKey="importance" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Model Info */}
            <Card title="Model Information">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Model Type
                  </p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {data.model_info.model_type}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Version
                  </p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {data.model_info.version}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Last Trained
                  </p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {new Date(data.model_info.trained_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Features Used
                </p>
                <div className="flex flex-wrap gap-2">
                  {data.model_info.features_used.map((f) => (
                    <span
                      key={f}
                      className="inline-block px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-xs text-gray-700 dark:text-gray-300"
                    >
                      {f.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              </div>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  );
}
