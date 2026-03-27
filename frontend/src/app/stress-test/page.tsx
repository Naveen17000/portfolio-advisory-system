"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import AppShell from "@/components/layout/AppShell";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { CardSkeleton } from "@/components/ui/Skeleton";

interface AssetImpact {
  asset: string;
  impact_pct: number;
}

interface Scenario {
  name: string;
  description: string;
  impact_pct: number;
  loss_amount: number;
  duration_months: number;
  recovery_months: number;
  asset_impacts: AssetImpact[];
}

interface StressTestResult {
  portfolio_value: number;
  worst_case: { impact_pct: number; loss_amount: number };
  best_case: { impact_pct: number; loss_amount: number };
  average_impact: { impact_pct: number; loss_amount: number };
  scenarios: Scenario[];
}

function fmt(n: number): string {
  if (Math.abs(n) >= 10000000) return `${(n / 10000000).toFixed(2)} Cr`;
  if (Math.abs(n) >= 100000) return `${(n / 100000).toFixed(2)} L`;
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)} K`;
  return n.toFixed(0);
}

function impactColor(pct: number): string {
  if (pct <= -20) return "text-red-600 dark:text-red-400";
  if (pct < 0) return "text-orange-600 dark:text-orange-400";
  if (pct === 0) return "text-gray-600 dark:text-gray-400";
  return "text-green-600 dark:text-green-400";
}

function impactBg(pct: number): string {
  if (pct <= -20) return "bg-red-500";
  if (pct < 0) return "bg-orange-500";
  if (pct === 0) return "bg-gray-400";
  return "bg-green-500";
}

export default function StressTestPage() {
  const [portfolioValue, setPortfolioValue] = useState("1000000");
  const [result, setResult] = useState<StressTestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRun = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api<StressTestResult>("/api/v1/stress-test/run", {
        method: "POST",
        body: JSON.stringify({ portfolio_value: Number(portfolioValue) }),
      });
      res.scenarios.sort((a, b) => a.impact_pct - b.impact_pct);
      setResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Stress test failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="flex-1 max-w-6xl mx-auto w-full px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Stress Testing</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Analyze how your portfolio performs under historical crisis scenarios
          </p>
        </div>

        <Card title="Portfolio Parameters">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <Input
                label="Portfolio Value (INR)"
                type="number"
                value={portfolioValue}
                onChange={(e) => setPortfolioValue(e.target.value)}
                placeholder="1000000"
              />
            </div>
            <Button onClick={handleRun} disabled={loading}>
              {loading ? "Running stress test..." : "Run Stress Test"}
            </Button>
          </div>
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-2" role="alert">
              {error}
            </p>
          )}
        </Card>

        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        )}

        {result && !loading && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Worst Case
                </p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                  {result.worst_case.impact_pct.toFixed(1)}%
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Loss: {fmt(Math.abs(result.worst_case.loss_amount))}
                </p>
              </Card>
              <Card>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Average Impact
                </p>
                <p className={`text-2xl font-bold mt-1 ${impactColor(result.average_impact.impact_pct)}`}>
                  {result.average_impact.impact_pct.toFixed(1)}%
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Loss: {fmt(Math.abs(result.average_impact.loss_amount))}
                </p>
              </Card>
              <Card>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Best Case
                </p>
                <p className={`text-2xl font-bold mt-1 ${impactColor(result.best_case.impact_pct)}`}>
                  {result.best_case.impact_pct.toFixed(1)}%
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {result.best_case.impact_pct >= 0 ? "Gain" : "Loss"}: {fmt(Math.abs(result.best_case.loss_amount))}
                </p>
              </Card>
            </div>

            {/* Scenario Cards */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Scenario Analysis ({result.scenarios.length} scenarios)
              </h2>
              {result.scenarios.map((scenario) => (
                <Card key={scenario.name} className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                        {scenario.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        {scenario.description}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span
                        className={`text-2xl font-bold ${impactColor(scenario.impact_pct)}`}
                      >
                        {scenario.impact_pct > 0 ? "+" : ""}
                        {scenario.impact_pct.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Loss Amount</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {fmt(Math.abs(scenario.loss_amount))}
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Duration</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {scenario.duration_months} months
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Recovery</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {scenario.recovery_months} months
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Remaining Value</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {fmt(result.portfolio_value + scenario.loss_amount)}
                      </p>
                    </div>
                  </div>

                  {/* Asset-level impact breakdown */}
                  {scenario.asset_impacts && scenario.asset_impacts.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Asset Impact Breakdown
                      </p>
                      {scenario.asset_impacts.map((asset) => (
                        <div key={asset.asset} className="flex items-center gap-3">
                          <span className="text-sm text-gray-600 dark:text-gray-300 w-28 truncate flex-shrink-0">
                            {asset.asset}
                          </span>
                          <div className="flex-1 h-4 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden relative">
                            <div
                              className={`h-full rounded-full ${impactBg(asset.impact_pct)} transition-all`}
                              style={{ width: `${Math.min(Math.abs(asset.impact_pct), 100)}%` }}
                            />
                          </div>
                          <span
                            className={`text-sm font-medium w-16 text-right flex-shrink-0 ${impactColor(asset.impact_pct)}`}
                          >
                            {asset.impact_pct > 0 ? "+" : ""}
                            {asset.impact_pct.toFixed(1)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
