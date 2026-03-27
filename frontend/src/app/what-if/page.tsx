"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import AppShell from "@/components/layout/AppShell";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { CardSkeleton } from "@/components/ui/Skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface WhatIfResult {
  base_score: number;
  modified_score: number;
  base_category: string;
  modified_category: string;
  score_change: number;
  base_allocations: Record<string, number>;
  modified_allocations: Record<string, number>;
}

const LIFE_STAGES = [
  "student",
  "early_career",
  "mid_career",
  "pre_retirement",
  "retired",
];

export default function WhatIfPage() {
  const [form, setForm] = useState({
    monthly_income: 80000,
    monthly_expenses: 40000,
    liabilities: 200000,
    emergency_fund: 150000,
    investment_horizon: 10,
    life_stage: "mid_career",
  });
  const [result, setResult] = useState<WhatIfResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAnalyze = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api<WhatIfResult>("/api/v1/what-if/analyze", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const allocationChartData = result
    ? Object.keys(result.base_allocations).map((key) => ({
        name: key.replace(/_/g, " "),
        Base: +(result.base_allocations[key] * 100).toFixed(1),
        Modified: +(result.modified_allocations[key] * 100).toFixed(1),
      }))
    : [];

  return (
    <AppShell>
      <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          What-If Scenario Analysis
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          Adjust your financial parameters to see how they affect your risk
          score and portfolio allocation.
        </p>

        <Card title="Scenario Parameters">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
            {/* Monthly Income */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Monthly Income: {form.monthly_income.toLocaleString()}
              </label>
              <input
                type="range"
                min={10000}
                max={500000}
                step={5000}
                value={form.monthly_income}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    monthly_income: Number(e.target.value),
                  }))
                }
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500">
                <span>10K</span>
                <span>5L</span>
              </div>
            </div>

            {/* Monthly Expenses */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Monthly Expenses: {form.monthly_expenses.toLocaleString()}
              </label>
              <input
                type="range"
                min={5000}
                max={400000}
                step={5000}
                value={form.monthly_expenses}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    monthly_expenses: Number(e.target.value),
                  }))
                }
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500">
                <span>5K</span>
                <span>4L</span>
              </div>
            </div>

            {/* Liabilities */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Liabilities: {form.liabilities.toLocaleString()}
              </label>
              <input
                type="range"
                min={0}
                max={5000000}
                step={50000}
                value={form.liabilities}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    liabilities: Number(e.target.value),
                  }))
                }
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500">
                <span>0</span>
                <span>50L</span>
              </div>
            </div>

            {/* Emergency Fund */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Emergency Fund: {form.emergency_fund.toLocaleString()}
              </label>
              <input
                type="range"
                min={0}
                max={2000000}
                step={10000}
                value={form.emergency_fund}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    emergency_fund: Number(e.target.value),
                  }))
                }
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500">
                <span>0</span>
                <span>20L</span>
              </div>
            </div>

            {/* Investment Horizon */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Investment Horizon: {form.investment_horizon} years
              </label>
              <input
                type="range"
                min={1}
                max={30}
                step={1}
                value={form.investment_horizon}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    investment_horizon: Number(e.target.value),
                  }))
                }
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500">
                <span>1 yr</span>
                <span>30 yrs</span>
              </div>
            </div>

            {/* Life Stage */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Life Stage
              </label>
              <select
                value={form.life_stage}
                onChange={(e) =>
                  setForm((f) => ({ ...f, life_stage: e.target.value }))
                }
                className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                {LIFE_STAGES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Button onClick={handleAnalyze} disabled={loading}>
            {loading ? "Analyzing..." : "Analyze Scenario"}
          </Button>
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-2" role="alert">
              {error}
            </p>
          )}
        </Card>

        {loading && !result && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        )}

        {result && (
          <>
            {/* Score Comparison */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
              <Card title="Base Risk Score">
                <div className="text-center">
                  <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                    {result.base_score.toFixed(1)}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 capitalize">
                    {result.base_category.replace(/_/g, " ")}
                  </p>
                </div>
              </Card>
              <Card title="Modified Risk Score">
                <div className="text-center">
                  <p className="text-4xl font-bold text-green-600 dark:text-green-400">
                    {result.modified_score.toFixed(1)}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 capitalize">
                    {result.modified_category.replace(/_/g, " ")}
                  </p>
                </div>
              </Card>
            </div>

            {/* Impact Summary */}
            <Card title="Impact Summary" className="mt-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Score Change
                  </p>
                  <p
                    className={`text-2xl font-bold ${
                      result.score_change > 0
                        ? "text-green-600 dark:text-green-400"
                        : result.score_change < 0
                        ? "text-red-600 dark:text-red-400"
                        : "text-gray-600 dark:text-gray-300"
                    }`}
                  >
                    {result.score_change > 0 ? "+" : ""}
                    {result.score_change.toFixed(1)}
                  </p>
                </div>
                <div className="text-center p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Base Category
                  </p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 capitalize">
                    {result.base_category.replace(/_/g, " ")}
                  </p>
                </div>
                <div className="text-center p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Modified Category
                  </p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 capitalize">
                    {result.modified_category.replace(/_/g, " ")}
                  </p>
                </div>
              </div>
            </Card>

            {/* Allocation Comparison */}
            <Card title="Portfolio Allocation Comparison" className="mt-6">
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={allocationChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                    stroke="#9CA3AF"
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={120}
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
                  <Legend />
                  <Bar dataKey="Base" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="Modified" fill="#10B981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  );
}
