"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import Card from "@/components/ui/Card";
import Tip from "@/components/ui/Tooltip";
import { PageSkeleton } from "@/components/ui/Skeleton";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
  LabelList,
} from "recharts";

interface FrontierPoint {
  volatility: number;
  return: number;
  sharpe: number;
  weights?: Record<string, number>;
}

interface AssetPoint {
  name: string;
  volatility: number;
  return: number;
}

interface FrontierData {
  frontier_points: FrontierPoint[];
  asset_points: AssetPoint[];
  optimal_portfolio: FrontierPoint;
  min_variance_portfolio: FrontierPoint;
  risk_free_rate: number;
}

interface CorrelationData {
  labels?: string[];
  assets?: string[];
  matrix: number[][];
}

function getCorrelationColor(value: number): string {
  if (value >= 0.8) return "bg-red-600";
  if (value >= 0.5) return "bg-red-400 dark:bg-red-500";
  if (value >= 0.2) return "bg-orange-300 dark:bg-orange-400";
  if (value >= -0.2) return "bg-gray-200 dark:bg-gray-600";
  if (value >= -0.5) return "bg-blue-300 dark:bg-blue-400";
  return "bg-blue-600";
}

function getCorrelationTextColor(value: number): string {
  if (value >= 0.8 || value < -0.5) return "text-white";
  return "text-gray-900 dark:text-gray-100";
}

export default function FrontierPage() {
  const [frontier, setFrontier] = useState<FrontierData | null>(null);
  const [correlation, setCorrelation] = useState<CorrelationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api<FrontierData>("/api/v1/frontier/"),
      api<CorrelationData>("/api/v1/frontier/correlation"),
    ])
      .then(([f, c]) => {
        setFrontier(f);
        setCorrelation(c);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load frontier data")
      )
      .finally(() => setLoading(false));
  }, []);

  const frontierScatterData = frontier
    ? frontier.frontier_points.map((p) => ({
        x: +p.volatility.toFixed(2),
        y: +p.return.toFixed(2),
      }))
    : [];

  const assetScatterData = frontier
    ? frontier.asset_points.map((a) => ({
        x: +a.volatility.toFixed(2),
        y: +a.return.toFixed(2),
        name: a.name,
      }))
    : [];

  const optimalPoint = frontier?.optimal_portfolio
    ? {
        x: +frontier.optimal_portfolio.volatility.toFixed(2),
        y: +frontier.optimal_portfolio.return.toFixed(2),
        name: "Max Sharpe",
      }
    : null;

  const minVarPoint = frontier?.min_variance_portfolio
    ? {
        x: +frontier.min_variance_portfolio.volatility.toFixed(2),
        y: +frontier.min_variance_portfolio.return.toFixed(2),
        name: "Min Variance",
      }
    : null;

  return (
    <>
      <div className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          <Tip term="Efficient Frontier">Efficient Frontier</Tip>
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          Visualize the risk-return tradeoff and optimal portfolio allocations.
        </p>

        {loading && <PageSkeleton />}

        {error && (
          <Card>
            <p className="text-red-600 dark:text-red-400" role="alert">{error}</p>
          </Card>
        )}

        {frontier && (
          <>
            {/* Efficient Frontier Scatter Chart */}
            <Card title="Risk vs Return" className="mb-6">
              <div className="overflow-hidden" style={{ minHeight: 0 }}>
              <ResponsiveContainer width="100%" height={500}>
                <ScatterChart margin={{ top: 20, right: 30, bottom: 50, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="x"
                    type="number"
                    name="Risk"
                    tickFormatter={(v) => `${v}%`}
                    stroke="#9CA3AF"
                    label={{
                      value: "Risk (Std Dev %)",
                      position: "insideBottom",
                      offset: -5,
                      dy: 15,
                      style: { fill: "#9CA3AF", fontSize: 13 },
                    }}
                  />
                  <YAxis
                    dataKey="y"
                    type="number"
                    name="Return"
                    tickFormatter={(v) => `${v}%`}
                    stroke="#9CA3AF"
                    label={{
                      value: "Expected Return %",
                      angle: -90,
                      position: "insideLeft",
                      style: { fill: "#9CA3AF" },
                    }}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: "var(--tooltip-bg, #fff)", borderColor: "var(--tooltip-border, #e5e7eb)", borderRadius: "8px", color: "var(--tooltip-text, #111)" }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const point = payload[0]?.payload as { x?: number; y?: number; name?: string };
                      return (
                        <div style={{ backgroundColor: "var(--tooltip-bg, #1f2937)", border: "1px solid var(--tooltip-border, #374151)", borderRadius: 8, padding: "8px 12px", color: "var(--tooltip-text, #f3f4f6)", fontSize: 13 }}>
                          {point.name && <div style={{ fontWeight: 600, marginBottom: 4 }}>{point.name}</div>}
                          <div>Risk (Volatility): <strong>{point.x?.toFixed(2)}%</strong></div>
                          <div>Expected Return: <strong>{point.y?.toFixed(2)}%</strong></div>
                        </div>
                      );
                    }}
                  />
                  <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: 30 }} />

                  {/* Frontier curve points */}
                  <Scatter
                    name="Frontier"
                    data={frontierScatterData}
                    fill="#3B82F6"
                    line={{ stroke: "#3B82F6", strokeWidth: 2 }}
                    lineType="fitting"
                    r={3}
                  />

                  {/* Asset class points */}
                  <Scatter
                    name="Asset Classes"
                    data={assetScatterData}
                    fill="#F59E0B"
                    r={6}
                    shape="diamond"
                  >
                    <LabelList
                      dataKey="name"
                      position="top"
                      style={{ fontSize: 11, fill: "#9CA3AF" }}
                    />
                  </Scatter>

                  {/* Optimal portfolio (max Sharpe) */}
                  {optimalPoint && (
                    <Scatter
                      name="Max Sharpe (Optimal)"
                      data={[optimalPoint]}
                      fill="#10B981"
                      r={10}
                      shape="star"
                    />
                  )}

                  {/* Min variance portfolio */}
                  {minVarPoint && (
                    <Scatter
                      name="Min Variance"
                      data={[minVarPoint]}
                      fill="#EF4444"
                      r={10}
                      shape="triangle"
                    />
                  )}
                </ScatterChart>
              </ResponsiveContainer>
              </div>
            </Card>

            {/* Optimal Portfolio Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
              <Card title="Optimal Portfolio (Max Sharpe)">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Expected Return</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {frontier.optimal_portfolio.return.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Risk (Std Dev)</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {frontier.optimal_portfolio.volatility.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400"><Tip term="Sharpe Ratio">Sharpe Ratio</Tip></span>
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      {frontier.optimal_portfolio.sharpe.toFixed(3)}
                    </span>
                  </div>
                </div>
              </Card>

              <Card title="Min Variance Portfolio">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Expected Return</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {frontier.min_variance_portfolio.return.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Risk (Std Dev)</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {frontier.min_variance_portfolio.volatility.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400"><Tip term="Sharpe Ratio">Sharpe Ratio</Tip></span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                      {frontier.min_variance_portfolio.sharpe.toFixed(3)}
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          </>
        )}

        {/* Correlation Heatmap */}
        {correlation && (
          <Card title={<>Asset <Tip term="Correlation">Correlation</Tip> Heatmap</>}>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="py-2 px-2 text-left text-gray-600 dark:text-gray-400" />
                    {(correlation.labels ?? correlation.assets ?? []).map((a) => (
                      <th
                        key={a}
                        className="py-2 px-2 text-center text-gray-600 dark:text-gray-400 font-medium capitalize"
                      >
                        {a.replace(/_/g, " ")}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(correlation.labels ?? correlation.assets ?? []).map((rowAsset, i) => {
                    const row = correlation.matrix?.[i];
                    const labels = correlation.labels ?? correlation.assets ?? [];
                    return (
                    <tr key={rowAsset}>
                      <td className="py-2 px-2 text-gray-700 dark:text-gray-300 font-medium capitalize whitespace-nowrap">
                        {rowAsset.replace(/_/g, " ")}
                      </td>
                      {labels.map((colAsset, j) => {
                        const val = Array.isArray(row) ? (row[j] ?? 0) : (row?.correlations?.[colAsset] ?? 0);
                        return (
                        <td key={j} className="py-2 px-1 text-center">
                          <div
                            className={`rounded px-2 py-1 font-mono ${getCorrelationColor(val)} ${getCorrelationTextColor(val)}`}
                          >
                            {(typeof val === "number" ? val : 0).toFixed(2)}
                          </div>
                        </td>
                        );
                      })}
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center gap-2 mt-4 text-xs text-gray-500 dark:text-gray-400">
              <span>-1.0</span>
              <div className="flex-1 h-3 rounded bg-gradient-to-r from-blue-600 via-gray-300 to-red-600 dark:via-gray-600" />
              <span>+1.0</span>
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
