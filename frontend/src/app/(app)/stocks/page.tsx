"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { CardSkeleton } from "@/components/ui/Skeleton";
import Tip from "@/components/ui/Tooltip";

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
  cap_category?: string;
  reasons: string[];
  recommendation: string;
  reason: string;
}

interface RecommendedData {
  risk_category: string;
  risk_score: number;
  life_stage: string;
  advice: string;
  recommended: ClassifiedStock[];
  explore: ClassifiedStock[];
  caution: ClassifiedStock[];
  total_analyzed: number;
}

const TAB_STYLES: Record<string, { badge: string; label: string; icon: string }> = {
  recommended: {
    badge: "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300",
    label: "Recommended for You",
    icon: "M5 13l4 4L19 7",
  },
  explore: {
    badge: "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300",
    label: "Worth Exploring",
    icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  },
  caution: {
    badge: "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300",
    label: "Use Caution",
    icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z",
  },
};

function fmtCap(n: number): string {
  if (n >= 1e12) return `${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(0)}M`;
  return n.toFixed(0);
}

function StockRow({ stock }: { stock: ClassifiedStock }) {
  const riskStyle =
    stock.risk_score <= 30
      ? "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300"
      : stock.risk_score <= 60
      ? "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300"
      : "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300";

  return (
    <tr className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
      <td className="py-3 px-3">
        <div>
          <span className="font-medium text-gray-900 dark:text-gray-100">{stock.name}</span>
          <span className="text-xs text-gray-400 dark:text-gray-500 ml-1.5">{stock.ticker.replace(".NS", "")}</span>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{stock.reason}</p>
      </td>
      <td className="py-3 px-2 text-sm text-gray-600 dark:text-gray-300">{stock.sector}</td>
      <td className="text-right py-3 px-2 text-sm text-gray-700 dark:text-gray-300">{stock.beta.toFixed(2)}</td>
      <td className="text-right py-3 px-2 text-sm text-gray-700 dark:text-gray-300">{stock.volatility.toFixed(1)}%</td>
      <td className={`text-right py-3 px-2 text-sm font-medium ${stock.annualized_return >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
        {stock.annualized_return >= 0 ? "+" : ""}{stock.annualized_return.toFixed(1)}%
      </td>
      <td className="text-right py-3 px-2 text-sm text-gray-700 dark:text-gray-300">{stock.sharpe_ratio.toFixed(2)}</td>
      <td className="text-right py-3 px-2 text-sm text-gray-600 dark:text-gray-300">{fmtCap(stock.market_cap)}</td>
      <td className="text-right py-3 px-2">
        <span className={`text-xs px-2 py-0.5 rounded-full ${riskStyle}`}>{stock.risk_score}</span>
      </td>
    </tr>
  );
}

export default function StocksPage() {
  const [data, setData] = useState<RecommendedData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("recommended");

  const loadStocks = () => {
    setLoading(true);
    setError("");
    api<RecommendedData>("/api/v1/stocks/recommended")
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  };

  const currentStocks =
    activeTab === "recommended"
      ? data?.recommended
      : activeTab === "explore"
      ? data?.explore
      : data?.caution;

  const lifeStageLabels: Record<string, string> = {
    student: "Student",
    early_career: "Early Career",
    family: "Family",
    pre_retirement: "Pre-Retirement",
  };

  return (
    <>
      <div className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Stock Picks for You</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Personalized stock recommendations based on your risk profile
            </p>
          </div>
          <Button onClick={loadStocks} disabled={loading} size="sm">
            {loading ? "Analyzing..." : data ? "Refresh" : "Get Recommendations"}
          </Button>
        </div>

        {error && <p className="text-red-600 dark:text-red-400 text-sm" role="alert">{error}</p>}

        {loading && (
          <div className="space-y-4">
            <Card className="text-center py-6">
              <div className="flex flex-col items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Analyzing {">"}45 stocks from Yahoo Finance...
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Computing beta, volatility, Sharpe ratio, and matching to your risk profile. This may take 30-60 seconds.
                </p>
              </div>
            </Card>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </div>
          </div>
        )}

        {data && !loading && (
          <>
            {/* Profile Summary */}
            <Card>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                    <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {data.risk_score.toFixed(0)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 capitalize">
                      {data.risk_category} Investor
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {lifeStageLabels[data.life_stage] || data.life_stage} &middot; {data.total_analyzed} stocks analyzed
                    </p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 sm:ml-auto sm:max-w-md sm:text-right">
                  {data.advice}
                </p>
              </div>
            </Card>

            {/* Tabs */}
            <div className="flex gap-2" role="tablist">
              {Object.entries(TAB_STYLES).map(([key, style]) => {
                const count =
                  key === "recommended" ? data.recommended.length :
                  key === "explore" ? data.explore.length :
                  data.caution.length;
                if (count === 0) return null;
                return (
                  <Button
                    key={key}
                    variant={activeTab === key ? "primary" : "outline"}
                    size="sm"
                    onClick={() => setActiveTab(key)}
                    role="tab"
                    aria-selected={activeTab === key}
                  >
                    <span className="flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={style.icon} />
                      </svg>
                      {style.label} ({count})
                    </span>
                  </Button>
                );
              })}
            </div>

            {/* Stock Table */}
            {currentStocks && currentStocks.length > 0 && (
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-2 px-3 font-medium text-gray-500 dark:text-gray-400">Stock</th>
                        <th className="text-left py-2 px-2 font-medium text-gray-500 dark:text-gray-400">Sector</th>
                        <th className="text-right py-2 px-2 font-medium text-gray-500 dark:text-gray-400"><Tip term="Beta">Beta</Tip></th>
                        <th className="text-right py-2 px-2 font-medium text-gray-500 dark:text-gray-400"><Tip term="Volatility">Volatility</Tip></th>
                        <th className="text-right py-2 px-2 font-medium text-gray-500 dark:text-gray-400"><Tip term="Annualized Return">Return (1Y)</Tip></th>
                        <th className="text-right py-2 px-2 font-medium text-gray-500 dark:text-gray-400"><Tip term="Sharpe Ratio">Sharpe</Tip></th>
                        <th className="text-right py-2 px-2 font-medium text-gray-500 dark:text-gray-400"><Tip term="Market Cap">Mkt Cap</Tip></th>
                        <th className="text-right py-2 px-2 font-medium text-gray-500 dark:text-gray-400">Risk</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentStocks.map((stock) => (
                        <StockRow key={stock.ticker} stock={stock} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* Disclaimer */}
            <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4">
              <div className="flex gap-3">
                <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">Disclaimer</p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-1 leading-relaxed">
                    These stock picks are generated algorithmically for <strong>educational purposes only</strong>.
                    They are NOT buy/sell recommendations. Stock prices are subject to market risks.
                    Past performance does not guarantee future results. Always do your own research
                    and consult a SEBI-registered advisor before investing. Data sourced from Yahoo Finance.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {!data && !loading && (
          <Card className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Click &quot;Get Recommendations&quot; to analyze 45+ Indian stocks and get personalized picks
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Stocks are classified using real-time beta, volatility, Sharpe ratio, and market cap data,
              then matched to your risk profile and investment style.
            </p>
          </Card>
        )}
      </div>
    </>
  );
}
