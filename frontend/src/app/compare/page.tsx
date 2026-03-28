"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { downloadCSV } from "@/lib/export";
import AppShell from "@/components/layout/AppShell";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { CardSkeleton } from "@/components/ui/Skeleton";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface PortfolioData {
  risk_score: number;
  risk_category: string;
  allocations: Record<string, number>;
  expected_return_range?: { low: number; high: number };
}

interface WhatIfResult {
  base_score: number;
  modified_score: number;
  base_category: string;
  modified_category: string;
  score_change: number;
  base_allocations: Record<string, number>;
  modified_allocations: Record<string, number>;
}

const RISK_PRESETS: Record<string, { label: string; params: Record<string, unknown> }> = {
  conservative: {
    label: "Conservative",
    params: {
      monthly_income: 80000,
      monthly_expenses: 30000,
      liabilities: 50000,
      emergency_fund: 500000,
      investment_horizon: 5,
      life_stage: "pre_retirement",
    },
  },
  moderate: {
    label: "Moderate",
    params: {
      monthly_income: 80000,
      monthly_expenses: 40000,
      liabilities: 200000,
      emergency_fund: 200000,
      investment_horizon: 10,
      life_stage: "mid_career",
    },
  },
  aggressive: {
    label: "Aggressive",
    params: {
      monthly_income: 120000,
      monthly_expenses: 50000,
      liabilities: 100000,
      emergency_fund: 100000,
      investment_horizon: 25,
      life_stage: "early_career",
    },
  },
};

const PIE_COLORS = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
  "#EC4899", "#06B6D4", "#84CC16",
];

function AllocationPie({
  title,
  allocations,
}: {
  title: string;
  allocations: Record<string, number>;
}) {
  const data = Object.entries(allocations)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({
      name: name.replace(/_/g, " "),
      value: +(value * 100).toFixed(1),
    }));

  return (
    <Card title={title}>
      <div className="overflow-hidden" style={{ minHeight: 0 }}>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={100}
            dataKey="value"
            label={({ name, value }) => `${name} ${value}%`}
            labelLine={false}
          >
            {data.map((_, idx) => (
              <Cell
                key={idx}
                fill={PIE_COLORS[idx % PIE_COLORS.length]}
              />
            ))}
          </Pie>
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
        </PieChart>
      </ResponsiveContainer>
      </div>
    </Card>
  );
}

export default function ComparePage() {
  const [currentPortfolio, setCurrentPortfolio] = useState<PortfolioData | null>(null);
  const [alternative, setAlternative] = useState<WhatIfResult | null>(null);
  const [selectedPreset, setSelectedPreset] = useState("moderate");
  const [loadingCurrent, setLoadingCurrent] = useState(false);
  const [loadingAlt, setLoadingAlt] = useState(false);
  const [errorCurrent, setErrorCurrent] = useState("");
  const [errorAlt, setErrorAlt] = useState("");

  useEffect(() => {
    setLoadingCurrent(true);
    api<PortfolioData>("/api/v1/portfolio/latest")
      .then(setCurrentPortfolio)
      .catch((err) =>
        setErrorCurrent(err instanceof Error ? err.message : "Failed to load portfolio")
      )
      .finally(() => setLoadingCurrent(false));
  }, []);

  const generateAlternative = async () => {
    setLoadingAlt(true);
    setErrorAlt("");
    try {
      const preset = RISK_PRESETS[selectedPreset];
      const result = await api<WhatIfResult>("/api/v1/what-if/analyze", {
        method: "POST",
        body: JSON.stringify(preset.params),
      });
      setAlternative(result);
    } catch (err) {
      setErrorAlt(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoadingAlt(false);
    }
  };

  const currentAllocations = currentPortfolio?.allocations ?? alternative?.base_allocations ?? {};
  const altAllocations = alternative?.modified_allocations ?? {};

  const allAssetClasses = [
    ...new Set([
      ...Object.keys(currentAllocations),
      ...Object.keys(altAllocations),
    ]),
  ];

  const comparisonData = allAssetClasses.map((asset) => {
    const currentPct = +(((currentAllocations[asset] ?? 0) * 100).toFixed(1));
    const altPct = +(((altAllocations[asset] ?? 0) * 100).toFixed(1));
    return {
      asset: asset.replace(/_/g, " "),
      currentPct,
      altPct,
      diff: +(altPct - currentPct).toFixed(1),
    };
  });

  const handleExport = () => {
    const data = comparisonData.map((row) => ({
      "Asset Class": row.asset,
      "Current (%)": row.currentPct,
      "Alternative (%)": row.altPct,
      "Difference (%)": row.diff,
    }));
    downloadCSV(data, "portfolio-comparison");
  };

  return (
    <AppShell>
      <div className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Portfolio Comparison
          </h1>
          {alternative && (
            <Button variant="outline" size="sm" onClick={handleExport}>
              Export CSV
            </Button>
          )}
        </div>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          Compare your current portfolio against alternative risk scenarios
        </p>

        {/* Scenario selector */}
        <Card title="Alternative Scenario" className="mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <label
                htmlFor="risk-preset"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Risk Category
              </label>
              <select
                id="risk-preset"
                value={selectedPreset}
                onChange={(e) => setSelectedPreset(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                {Object.entries(RISK_PRESETS).map(([key, preset]) => (
                  <option key={key} value={key}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </div>
            <Button onClick={generateAlternative} disabled={loadingAlt}>
              {loadingAlt ? "Generating..." : "Generate Comparison"}
            </Button>
          </div>
          {errorAlt && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-2" role="alert">
              {errorAlt}
            </p>
          )}
        </Card>

        {/* Loading states */}
        {(loadingCurrent || loadingAlt) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        )}

        {errorCurrent && (
          <Card className="mb-6">
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              Current portfolio: {errorCurrent}
            </p>
          </Card>
        )}

        {/* Score comparison cards */}
        {(currentPortfolio || alternative) && !loadingCurrent && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
            <Card title="Current Portfolio">
              <div className="text-center">
                <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                  {currentPortfolio
                    ? currentPortfolio.risk_score.toFixed(1)
                    : alternative
                    ? alternative.base_score.toFixed(1)
                    : "--"}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 capitalize">
                  {currentPortfolio
                    ? currentPortfolio.risk_category.replace(/_/g, " ")
                    : alternative
                    ? alternative.base_category.replace(/_/g, " ")
                    : "Not loaded"}
                </p>
                {currentPortfolio?.expected_return_range && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                    Expected return: {currentPortfolio.expected_return_range.low.toFixed(1)}% -{" "}
                    {currentPortfolio.expected_return_range.high.toFixed(1)}%
                  </p>
                )}
              </div>
            </Card>
            {alternative && (
              <Card title={`Alternative (${RISK_PRESETS[selectedPreset].label})`}>
                <div className="text-center">
                  <p className="text-4xl font-bold text-green-600 dark:text-green-400">
                    {alternative.modified_score.toFixed(1)}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 capitalize">
                    {alternative.modified_category.replace(/_/g, " ")}
                  </p>
                  <p className="text-xs mt-2">
                    <span
                      className={
                        alternative.score_change > 0
                          ? "text-green-500 dark:text-green-400"
                          : alternative.score_change < 0
                          ? "text-red-500 dark:text-red-400"
                          : "text-gray-500 dark:text-gray-400"
                      }
                    >
                      {alternative.score_change > 0 ? "+" : ""}
                      {alternative.score_change.toFixed(1)} from current
                    </span>
                  </p>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Pie charts side by side */}
        {alternative && Object.keys(currentAllocations).length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <AllocationPie
              title="Current Allocation"
              allocations={currentAllocations}
            />
            <AllocationPie
              title={`Alternative Allocation (${RISK_PRESETS[selectedPreset].label})`}
              allocations={altAllocations}
            />
          </div>
        )}

        {/* Comparison table */}
        {alternative && comparisonData.length > 0 && (
          <Card title="Allocation Comparison">
            <div className="overflow-x-auto">
              <table
                className="w-full text-sm"
                aria-label="Portfolio allocation comparison"
              >
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-3 font-medium text-gray-500 dark:text-gray-400">
                      Asset Class
                    </th>
                    <th className="text-right py-3 px-3 font-medium text-gray-500 dark:text-gray-400">
                      Current (%)
                    </th>
                    <th className="text-right py-3 px-3 font-medium text-gray-500 dark:text-gray-400">
                      Alternative (%)
                    </th>
                    <th className="text-right py-3 px-3 font-medium text-gray-500 dark:text-gray-400">
                      Difference
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.map((row) => (
                    <tr
                      key={row.asset}
                      className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <td className="py-3 px-3 font-medium text-gray-900 dark:text-gray-100 capitalize">
                        {row.asset}
                      </td>
                      <td className="text-right py-3 px-3 text-gray-700 dark:text-gray-300">
                        {row.currentPct.toFixed(1)}%
                      </td>
                      <td className="text-right py-3 px-3 text-gray-700 dark:text-gray-300">
                        {row.altPct.toFixed(1)}%
                      </td>
                      <td className="text-right py-3 px-3 font-medium">
                        <span
                          className={
                            row.diff > 0
                              ? "text-green-600 dark:text-green-400"
                              : row.diff < 0
                              ? "text-red-600 dark:text-red-400"
                              : "text-gray-500 dark:text-gray-400"
                          }
                        >
                          {row.diff > 0 ? "+" : ""}
                          {row.diff.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Empty state */}
        {!alternative && !loadingAlt && (
          <Card className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 mb-2">
              Select a risk category and click &quot;Generate Comparison&quot; to
              see how an alternative portfolio would differ
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Uses the What-If engine to model portfolio allocations under
              different risk profiles
            </p>
          </Card>
        )}

        <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-6">
          Comparisons are for educational purposes only. Actual returns may vary.
        </p>
      </div>
    </AppShell>
  );
}
