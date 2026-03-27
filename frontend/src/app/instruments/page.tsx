"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import AuthGuard from "@/components/layout/AuthGuard";
import Navbar from "@/components/layout/Navbar";
import ErrorBoundary from "@/components/layout/ErrorBoundary";
import Card from "@/components/ui/Card";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { ASSET_CLASS_LABELS, ASSET_CLASS_COLORS } from "@/lib/constants";

interface Fund { name: string; type: string; ticker: string | null; expense_ratio: number }
interface Stock { ticker: string; name: string; sector: string; beta: number; annualized_return: number; sharpe_ratio: number; risk_category: string }
interface Recommendation { asset_class: string; allocation_pct: number; funds: Fund[]; stocks: Stock[] }

export default function InstrumentsPage() {
  const [data, setData] = useState<Recommendation[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<Recommendation[]>("/api/v1/instruments/")
      .then(setData)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <AuthGuard><Navbar />
        <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-8" role="main" aria-label="Loading instruments">
          <div className="space-y-6">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <Navbar />
      <ErrorBoundary>
        <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-8" role="main" aria-label="Suggested instruments">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Suggested Instruments</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">Specific fund and stock recommendations mapped to your portfolio allocation</p>

          {!data ? (
            <p className="text-gray-500 dark:text-gray-400">Generate a portfolio first to see instrument recommendations.</p>
          ) : (
            <div className="space-y-6">
              {data.map((rec) => (
                <Card key={rec.asset_class}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ASSET_CLASS_COLORS[rec.asset_class] || "#94a3b8" }} />
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                      {ASSET_CLASS_LABELS[rec.asset_class] || rec.asset_class}
                    </h3>
                    <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">{rec.allocation_pct}%</span>
                  </div>

                  {/* Funds */}
                  <div className="mb-4">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">Recommended Funds</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {rec.funds.map((f) => (
                        <div key={f.name} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-900 rounded-lg">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{f.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{f.type}</p>
                          </div>
                          {f.expense_ratio > 0 && (
                            <span className="text-xs text-gray-400 dark:text-gray-500">ER: {f.expense_ratio}%</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Stocks */}
                  {rec.stocks.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">Top Stock Picks</p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm" aria-label={`Stock picks for ${ASSET_CLASS_LABELS[rec.asset_class] || rec.asset_class}`}>
                          <thead>
                            <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                              <th className="py-2 px-2 font-medium">Stock</th>
                              <th className="py-2 px-2 font-medium">Sector</th>
                              <th className="py-2 px-2 text-right font-medium">Beta</th>
                              <th className="py-2 px-2 text-right font-medium">Return</th>
                              <th className="py-2 px-2 text-right font-medium">Sharpe</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rec.stocks.map((s) => (
                              <tr key={s.ticker} className="border-b border-gray-100 dark:border-gray-700">
                                <td className="py-2 px-2 font-medium text-gray-900 dark:text-gray-100">{s.name}</td>
                                <td className="py-2 px-2 text-gray-600 dark:text-gray-300">{s.sector}</td>
                                <td className="py-2 px-2 text-right text-gray-700 dark:text-gray-300">{s.beta.toFixed(2)}</td>
                                <td className={`py-2 px-2 text-right ${s.annualized_return >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                                  {s.annualized_return.toFixed(1)}%
                                </td>
                                <td className="py-2 px-2 text-right text-gray-700 dark:text-gray-300">{s.sharpe_ratio.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}

          <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-6">
            For educational purposes only. Do your own research before investing.
          </p>
        </div>
      </ErrorBoundary>
    </AuthGuard>
  );
}
