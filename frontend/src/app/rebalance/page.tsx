"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import AppShell from "@/components/layout/AppShell";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { CardSkeleton } from "@/components/ui/Skeleton";

const ASSET_CLASSES = [
  "equity",
  "debt",
  "gold",
  "real_estate",
  "cash",
  "international",
];

interface RebalanceAction {
  asset_class: string;
  current_pct: number;
  target_pct: number;
  drift_pct: number;
  action: "buy" | "sell" | "hold";
  amount: number;
}

interface RebalanceResult {
  actions: RebalanceAction[];
  total_drift: number;
  recommendation: string;
  portfolio_value: number;
}

function getActionColor(action: string): string {
  switch (action) {
    case "buy":
      return "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20";
    case "sell":
      return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20";
    default:
      return "text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/30";
  }
}

function fmt(n: number): string {
  if (Math.abs(n) >= 10000000) return `${(n / 10000000).toFixed(2)} Cr`;
  if (Math.abs(n) >= 100000) return `${(n / 100000).toFixed(2)} L`;
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)} K`;
  return n.toFixed(0);
}

export default function RebalancePage() {
  const [portfolioValue, setPortfolioValue] = useState("1000000");
  const [allocations, setAllocations] = useState<Record<string, string>>(
    Object.fromEntries(ASSET_CLASSES.map((a) => [a, ""]))
  );
  const [result, setResult] = useState<RebalanceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAllocChange = (asset: string, value: string) => {
    setAllocations((prev) => ({ ...prev, [asset]: value }));
  };

  const totalAllocation = Object.values(allocations).reduce(
    (sum, v) => sum + (Number(v) || 0),
    0
  );

  const handleAnalyze = async () => {
    if (Math.abs(totalAllocation - 100) > 0.5) {
      setError("Allocations must sum to 100%");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const current_allocations: Record<string, number> = {};
      for (const [k, v] of Object.entries(allocations)) {
        const num = Number(v);
        if (num > 0) current_allocations[k] = num / 100;
      }
      const res = await api<RebalanceResult>("/api/v1/rebalance/analyze", {
        method: "POST",
        body: JSON.stringify({
          portfolio_value: Number(portfolioValue),
          current_allocations,
        }),
      });
      setResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Portfolio Rebalancing
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          Enter your current portfolio to see how it compares to your target
          allocation.
        </p>

        <Card title="Current Portfolio">
          <div className="mb-4">
            <Input
              label="Total Portfolio Value"
              type="number"
              value={portfolioValue}
              onChange={(e) => setPortfolioValue(e.target.value)}
              placeholder="e.g. 1000000"
            />
          </div>

          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Current Allocations (%)
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
            {ASSET_CLASSES.map((asset) => (
              <Input
                key={asset}
                label={asset.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={allocations[asset]}
                onChange={(e) => handleAllocChange(asset, e.target.value)}
                placeholder="0"
              />
            ))}
          </div>

          <div className="flex items-center justify-between mb-4">
            <p
              className={`text-sm font-medium ${
                Math.abs(totalAllocation - 100) > 0.5
                  ? "text-red-600 dark:text-red-400"
                  : "text-green-600 dark:text-green-400"
              }`}
            >
              Total: {totalAllocation.toFixed(1)}%
              {Math.abs(totalAllocation - 100) > 0.5 && " (must equal 100%)"}
            </p>
          </div>

          <Button onClick={handleAnalyze} disabled={loading}>
            {loading ? "Analyzing..." : "Analyze Drift"}
          </Button>
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-2" role="alert">
              {error}
            </p>
          )}
        </Card>

        {loading && !result && (
          <div className="mt-6 space-y-4">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        )}

        {result && (
          <>
            {/* Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
              <Card>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Total Drift
                </p>
                <p
                  className={`text-2xl font-bold ${
                    result.total_drift > 10
                      ? "text-red-600 dark:text-red-400"
                      : result.total_drift > 5
                      ? "text-orange-600 dark:text-orange-400"
                      : "text-green-600 dark:text-green-400"
                  }`}
                >
                  {result.total_drift.toFixed(1)}%
                </p>
              </Card>
              <Card>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Recommendation
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1">
                  {result.recommendation}
                </p>
              </Card>
            </div>

            {/* Rebalancing Actions Table */}
            <Card title="Rebalancing Actions" className="mt-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-2 text-gray-600 dark:text-gray-400 font-medium">
                        Asset Class
                      </th>
                      <th className="text-right py-3 px-2 text-gray-600 dark:text-gray-400 font-medium">
                        Current %
                      </th>
                      <th className="text-right py-3 px-2 text-gray-600 dark:text-gray-400 font-medium">
                        Target %
                      </th>
                      <th className="text-right py-3 px-2 text-gray-600 dark:text-gray-400 font-medium">
                        Drift %
                      </th>
                      <th className="text-right py-3 px-2 text-gray-600 dark:text-gray-400 font-medium">
                        Amount
                      </th>
                      <th className="text-center py-3 px-2 text-gray-600 dark:text-gray-400 font-medium">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.actions.map((row) => (
                      <tr
                        key={row.asset_class}
                        className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                      >
                        <td className="py-3 px-2 text-gray-900 dark:text-gray-100 font-medium capitalize">
                          {row.asset_class.replace(/_/g, " ")}
                        </td>
                        <td className="py-3 px-2 text-right text-gray-700 dark:text-gray-300">
                          {(row.current_pct * 100).toFixed(1)}%
                        </td>
                        <td className="py-3 px-2 text-right text-gray-700 dark:text-gray-300">
                          {(row.target_pct * 100).toFixed(1)}%
                        </td>
                        <td
                          className={`py-3 px-2 text-right font-medium ${
                            row.drift_pct > 0
                              ? "text-green-600 dark:text-green-400"
                              : row.drift_pct < 0
                              ? "text-red-600 dark:text-red-400"
                              : "text-gray-500 dark:text-gray-400"
                          }`}
                        >
                          {row.drift_pct > 0 ? "+" : ""}
                          {(row.drift_pct * 100).toFixed(1)}%
                        </td>
                        <td className="py-3 px-2 text-right text-gray-700 dark:text-gray-300">
                          {fmt(Math.abs(row.amount))}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase ${getActionColor(row.action)}`}
                          >
                            {row.action}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  );
}
