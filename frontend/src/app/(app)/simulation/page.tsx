"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import FanChart from "@/components/simulation/FanChart";

interface SimulationResult {
  parameters: {
    initial_investment: number;
    monthly_sip: number;
    years: number;
    portfolio_expected_return: number;
    portfolio_volatility: number;
    model?: string;
    distribution?: string;
    degrees_of_freedom?: number;
  };
  total_invested: number;
  yearly_data: { year: number; p5: number; p25: number; p50: number; p75: number; p95: number }[];
  statistics: {
    mean: number;
    median: number;
    prob_positive_return: number;
    prob_double: number;
  };
  scenarios: {
    worst_case: number;
    pessimistic: number;
    expected: number;
    optimistic: number;
    best_case: number;
  };
  regime_analysis?: {
    bull_months_pct: number;
    bear_months_pct: number;
    avg_bull_duration_months: number;
    avg_bear_duration_months: number;
  };
}

function fmt(n: number): string {
  if (n >= 10000000) return `${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `${(n / 100000).toFixed(2)} L`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)} K`;
  return n.toFixed(0);
}

export default function SimulationPage() {
  const [form, setForm] = useState({ initial: "100000", sip: "10000", years: "10" });
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRun = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api<SimulationResult>("/api/v1/simulation/run", {
        method: "POST",
        body: JSON.stringify({
          initial_investment: Number(form.initial),
          monthly_sip: Number(form.sip),
          years: Number(form.years),
        }),
      });
      setResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Simulation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
        <div className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8" role="main" aria-label="Monte Carlo Simulation">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Monte Carlo Simulation</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8">Simulate thousands of possible portfolio outcomes based on your allocation</p>

          <Card title="Simulation Parameters">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <Input
                label="Initial Investment"
                type="number"
                value={form.initial}
                onChange={(e) => setForm((f) => ({ ...f, initial: e.target.value }))}
              />
              <Input
                label="Monthly SIP"
                type="number"
                value={form.sip}
                onChange={(e) => setForm((f) => ({ ...f, sip: e.target.value }))}
              />
              <Input
                label="Years"
                type="number"
                value={form.years}
                onChange={(e) => setForm((f) => ({ ...f, years: e.target.value }))}
              />
            </div>
            <Button onClick={handleRun} disabled={loading}>
              {loading ? "Running 1,000 simulations..." : "Run Simulation"}
            </Button>
            {error && <p className="text-sm text-red-600 dark:text-red-400 mt-2" role="alert">{error}</p>}
          </Card>

          {result && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6" aria-label="Simulation summary">
                <Card>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Invested</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{fmt(result.total_invested)}</p>
                </Card>
                <Card>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Expected Value (Median)</p>
                  <p className="text-xl font-bold text-green-700 dark:text-green-400">{fmt(result.scenarios.expected)}</p>
                </Card>
                <Card>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Probability of Profit</p>
                  <p className="text-xl font-bold text-blue-700 dark:text-blue-400">{result.statistics.prob_positive_return}%</p>
                </Card>
                <Card>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Probability of 2x</p>
                  <p className="text-xl font-bold text-purple-700 dark:text-purple-400">{result.statistics.prob_double}%</p>
                </Card>
              </div>

              <Card title="Portfolio Value Projection (Fan Chart)" className="mt-6">
                <FanChart yearlyData={result.yearly_data} />
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                  Shaded bands show the range of outcomes from 1,000 simulations.
                  The darker center line is the median outcome.
                </p>
              </Card>

              <Card title="Scenario Analysis" className="mt-6">
                <div className="space-y-3">
                  {[
                    { label: "Best Case (95th percentile)", value: result.scenarios.best_case, color: "text-green-700 dark:text-green-400" },
                    { label: "Optimistic (75th percentile)", value: result.scenarios.optimistic, color: "text-green-600 dark:text-green-400" },
                    { label: "Expected (Median)", value: result.scenarios.expected, color: "text-blue-700 dark:text-blue-400" },
                    { label: "Pessimistic (25th percentile)", value: result.scenarios.pessimistic, color: "text-orange-600 dark:text-orange-400" },
                    { label: "Worst Case (5th percentile)", value: result.scenarios.worst_case, color: "text-red-600 dark:text-red-400" },
                  ].map((s) => (
                    <div key={s.label} className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-sm text-gray-600 dark:text-gray-300">{s.label}</span>
                      <span className={`text-sm font-semibold ${s.color}`}>{fmt(s.value)}</span>
                    </div>
                  ))}
                </div>
              </Card>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                <Card>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Expected Annual Return</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{result.parameters.portfolio_expected_return}%</p>
                </Card>
                <Card>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Portfolio Volatility</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{result.parameters.portfolio_volatility}%</p>
                </Card>
                <Card>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Distribution Model</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100 capitalize">{result.parameters.distribution || "normal"}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{result.parameters.degrees_of_freedom ? `df = ${result.parameters.degrees_of_freedom}` : ""}</p>
                </Card>
                <Card>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Simulation Model</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    {result.parameters.model === "fat_tailed_regime_switching" ? "Fat-Tail + Regime" : "Standard"}
                  </p>
                </Card>
              </div>

              {result.regime_analysis && (
                <Card title="Market Regime Analysis" className="mt-6">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Simulations model bull/bear market cycles using Markov chain regime switching
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Bull Market</p>
                      <p className="text-xl font-bold text-green-600 dark:text-green-400">{result.regime_analysis.bull_months_pct}%</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">of months</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Bear Market</p>
                      <p className="text-xl font-bold text-red-600 dark:text-red-400">{result.regime_analysis.bear_months_pct}%</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">of months</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Avg Bull Run</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{result.regime_analysis.avg_bull_duration_months}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">months</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Avg Bear Run</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{result.regime_analysis.avg_bear_duration_months}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">months</p>
                    </div>
                  </div>
                  <div className="mt-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-l-full"
                      style={{ width: `${result.regime_analysis.bull_months_pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-1">
                    <span>Bull ({result.regime_analysis.bull_months_pct}%)</span>
                    <span>Bear ({result.regime_analysis.bear_months_pct}%)</span>
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
    </>
  );
}
