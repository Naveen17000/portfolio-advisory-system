"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { CardSkeleton } from "@/components/ui/Skeleton";

interface ClassifiedStock {
  ticker: string;
  name: string;
  sector: string;
  market_cap: number;
  beta: number;
  volatility: number;
  annualized_return: number;
  sharpe_ratio: number;
  max_drawdown: number;
  risk_category: string;
  risk_score: number;
  cap_category: string;
  reasons: string[];
}

interface StockData {
  safe: ClassifiedStock[];
  moderate: ClassifiedStock[];
  high_risk: ClassifiedStock[];
  errors: { ticker: string; error: string }[];
  summary: {
    total_analyzed: number;
    safe_count: number;
    moderate_count: number;
    high_risk_count: number;
  };
}

const RISK_STYLES: Record<string, { bg: string; text: string; badge: string }> = {
  safe: { bg: "bg-green-50 dark:bg-green-900/20", text: "text-green-700 dark:text-green-400", badge: "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300" },
  moderate: { bg: "bg-yellow-50 dark:bg-yellow-900/20", text: "text-yellow-700 dark:text-yellow-400", badge: "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300" },
  high_risk: { bg: "bg-red-50 dark:bg-red-900/20", text: "text-red-700 dark:text-red-400", badge: "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300" },
};

function fmtCap(n: number): string {
  if (n >= 1e12) return `${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(0)}M`;
  return n.toFixed(0);
}

function StockTable({ stocks, category }: { stocks: ClassifiedStock[]; category: string }) {
  const style = RISK_STYLES[category] || RISK_STYLES.moderate;
  const labels: Record<string, string> = { safe: "Safe", moderate: "Moderate", high_risk: "High Risk" };

  if (stocks.length === 0) {
    return (
      <Card>
        <p className="text-sm text-gray-500 dark:text-gray-400">No stocks classified as {labels[category]}. Data may still be loading.</p>
      </Card>
    );
  }

  return (
    <Card title={`${labels[category]} Stocks (${stocks.length})`}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" aria-label={`${labels[category]} stocks table`}>
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-2 px-2 font-medium text-gray-500 dark:text-gray-400">Stock</th>
              <th className="text-left py-2 px-2 font-medium text-gray-500 dark:text-gray-400">Sector</th>
              <th className="text-right py-2 px-2 font-medium text-gray-500 dark:text-gray-400">Beta</th>
              <th className="text-right py-2 px-2 font-medium text-gray-500 dark:text-gray-400">Volatility</th>
              <th className="text-right py-2 px-2 font-medium text-gray-500 dark:text-gray-400">Return (1Y)</th>
              <th className="text-right py-2 px-2 font-medium text-gray-500 dark:text-gray-400">Sharpe</th>
              <th className="text-right py-2 px-2 font-medium text-gray-500 dark:text-gray-400">Max DD</th>
              <th className="text-right py-2 px-2 font-medium text-gray-500 dark:text-gray-400">Mkt Cap</th>
              <th className="text-right py-2 px-2 font-medium text-gray-500 dark:text-gray-400">Risk Score</th>
            </tr>
          </thead>
          <tbody>
            {stocks.map((stock) => (
              <tr key={stock.ticker} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="py-2 px-2">
                  <div>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{stock.name}</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">{stock.ticker.replace(".NS", "")}</span>
                  </div>
                </td>
                <td className="py-2 px-2 text-gray-600 dark:text-gray-300">{stock.sector}</td>
                <td className="text-right py-2 px-2 text-gray-700 dark:text-gray-300">{stock.beta.toFixed(2)}</td>
                <td className="text-right py-2 px-2 text-gray-700 dark:text-gray-300">{stock.volatility.toFixed(1)}%</td>
                <td className={`text-right py-2 px-2 font-medium ${stock.annualized_return >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                  {stock.annualized_return >= 0 ? "+" : ""}{stock.annualized_return.toFixed(1)}%
                </td>
                <td className="text-right py-2 px-2 text-gray-700 dark:text-gray-300">{stock.sharpe_ratio.toFixed(2)}</td>
                <td className="text-right py-2 px-2 text-red-500 dark:text-red-400">{stock.max_drawdown.toFixed(1)}%</td>
                <td className="text-right py-2 px-2 text-gray-600 dark:text-gray-300">{fmtCap(stock.market_cap)}</td>
                <td className="text-right py-2 px-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${style.badge}`}>
                    {stock.risk_score}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default function StocksPage() {
  const [data, setData] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("safe");

  const loadStocks = () => {
    setLoading(true);
    setError("");
    api<StockData>("/api/v1/stocks/classified")
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  };

  return (
    <>
        <div className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8" role="main" aria-label="Stock classification">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Stock Classification</h1>
            <Button onClick={loadStocks} disabled={loading} size="sm">
              {loading ? "Analyzing stocks..." : data ? "Refresh" : "Load Stock Data"}
            </Button>
          </div>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Stocks classified using real-time beta, volatility, Sharpe ratio, and market cap from Yahoo Finance
          </p>

          {error && <p className="text-red-600 dark:text-red-400 text-sm mb-4" role="alert">{error}</p>}

          {loading && (
            <div className="space-y-4" aria-label="Loading stock data">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
              </div>
              <CardSkeleton />
            </div>
          )}

          {data && !loading && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <Card>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Analyzed</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{data.summary.total_analyzed}</p>
                </Card>
                <Card>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Safe</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{data.summary.safe_count}</p>
                </Card>
                <Card>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Moderate</p>
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{data.summary.moderate_count}</p>
                </Card>
                <Card>
                  <p className="text-xs text-gray-500 dark:text-gray-400">High Risk</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{data.summary.high_risk_count}</p>
                </Card>
              </div>

              <div className="flex gap-2 mb-4" role="tablist" aria-label="Risk category tabs">
                {(["safe", "moderate", "high_risk"] as const).map((tab) => (
                  <Button
                    key={tab}
                    variant={activeTab === tab ? "primary" : "outline"}
                    size="sm"
                    onClick={() => setActiveTab(tab)}
                    aria-selected={activeTab === tab}
                    role="tab"
                  >
                    {tab === "high_risk" ? "High Risk" : tab.charAt(0).toUpperCase() + tab.slice(1)}
                    {" "}({data[tab].length})
                  </Button>
                ))}
              </div>

              <StockTable stocks={data[activeTab as keyof Pick<StockData, "safe" | "moderate" | "high_risk">]} category={activeTab} />

              <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-6">
                Data sourced from Yahoo Finance. Classifications are for educational purposes only.
                Past performance does not guarantee future results.
              </p>
            </>
          )}

          {!data && !loading && (
            <Card className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400 mb-4">Click &quot;Load Stock Data&quot; to fetch and classify real Indian market stocks</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Analyzes 45 stocks across large cap, mid cap, and small cap categories using real Yahoo Finance data.
                No API key required.
              </p>
            </Card>
          )}
        </div>
    </>
  );
}
