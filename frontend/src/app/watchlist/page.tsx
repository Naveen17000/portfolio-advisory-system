"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { downloadCSV } from "@/lib/export";
import AppShell from "@/components/layout/AppShell";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";

interface StockMetrics {
  ticker: string;
  name: string;
  sector: string;
  beta: number;
  volatility: number;
  annualized_return: number;
  sharpe_ratio: number;
  risk_score: number;
}

interface WatchlistEntry {
  ticker: string;
  metrics: StockMetrics | null;
  loading: boolean;
  error: string;
}

const SUGGESTIONS = ["RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ITC.NS"];
const STORAGE_KEY = "portfolio_watchlist";

function loadWatchlist(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveWatchlist(tickers: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tickers));
}

export default function WatchlistPage() {
  const [entries, setEntries] = useState<WatchlistEntry[]>([]);
  const [input, setInput] = useState("");
  const [initialized, setInitialized] = useState(false);

  const fetchMetrics = useCallback(async (ticker: string): Promise<WatchlistEntry> => {
    try {
      const metrics = await api<StockMetrics>(`/api/v1/stocks/metrics/${encodeURIComponent(ticker)}`);
      return { ticker, metrics, loading: false, error: "" };
    } catch (err) {
      return { ticker, metrics: null, loading: false, error: err instanceof Error ? err.message : "Failed to fetch" };
    }
  }, []);

  useEffect(() => {
    const tickers = loadWatchlist();
    if (tickers.length > 0) {
      setEntries(tickers.map((t) => ({ ticker: t, metrics: null, loading: true, error: "" })));
      tickers.forEach(async (ticker) => {
        const entry = await fetchMetrics(ticker);
        setEntries((prev) => prev.map((e) => (e.ticker === ticker ? entry : e)));
      });
    }
    setInitialized(true);
  }, [fetchMetrics]);

  const addTicker = async (ticker: string) => {
    const t = ticker.trim().toUpperCase();
    if (!t) return;
    if (entries.some((e) => e.ticker === t)) return;

    const updated = [...entries, { ticker: t, metrics: null, loading: true, error: "" }];
    setEntries(updated);
    saveWatchlist(updated.map((e) => e.ticker));
    setInput("");

    const entry = await fetchMetrics(t);
    setEntries((prev) => prev.map((e) => (e.ticker === t ? entry : e)));
  };

  const removeTicker = (ticker: string) => {
    const updated = entries.filter((e) => e.ticker !== ticker);
    setEntries(updated);
    saveWatchlist(updated.map((e) => e.ticker));
  };

  const refreshAll = () => {
    const tickers = entries.map((e) => e.ticker);
    setEntries(tickers.map((t) => ({ ticker: t, metrics: null, loading: true, error: "" })));
    tickers.forEach(async (ticker) => {
      const entry = await fetchMetrics(ticker);
      setEntries((prev) => prev.map((e) => (e.ticker === ticker ? entry : e)));
    });
  };

  const handleExport = () => {
    const data = entries
      .filter((e) => e.metrics)
      .map((e) => ({
        Ticker: e.ticker,
        Name: e.metrics!.name,
        Sector: e.metrics!.sector,
        Beta: e.metrics!.beta,
        "Volatility (%)": e.metrics!.volatility,
        "Annual Return (%)": e.metrics!.annualized_return,
        "Sharpe Ratio": e.metrics!.sharpe_ratio,
        "Risk Score": e.metrics!.risk_score,
      }));
    downloadCSV(data, "watchlist");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      addTicker(input);
    }
  };

  const availableSuggestions = SUGGESTIONS.filter(
    (s) => !entries.some((e) => e.ticker === s)
  );

  if (!initialized) return null;

  return (
    <AppShell>
      <div className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Stock Watchlist
          </h1>
          <div className="flex gap-2">
            {entries.length > 0 && (
              <>
                <Button variant="outline" size="sm" onClick={refreshAll}>
                  Refresh All
                </Button>
                <Button variant="outline" size="sm" onClick={handleExport}>
                  Export CSV
                </Button>
              </>
            )}
          </div>
        </div>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          Track your favorite stocks with real-time metrics from Yahoo Finance
        </p>

        {/* Add ticker input */}
        <Card className="mb-6">
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label
                htmlFor="ticker-input"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Add Ticker
              </label>
              <input
                id="ticker-input"
                type="text"
                placeholder="e.g. RELIANCE.NS"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <Button onClick={() => addTicker(input)} disabled={!input.trim()}>
              Add
            </Button>
          </div>

          {availableSuggestions.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
                Quick add:
              </p>
              <div className="flex flex-wrap gap-2">
                {availableSuggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => addTicker(s)}
                    className="px-3 py-1 text-xs rounded-full border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-600 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                  >
                    + {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Watchlist table */}
        {entries.length === 0 ? (
          <Card className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 mb-2">
              Your watchlist is empty
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Add stock tickers above to start tracking their metrics
            </p>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table
                className="w-full text-sm"
                aria-label="Watchlist stocks table"
              >
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 px-2 font-medium text-gray-500 dark:text-gray-400">
                      Ticker
                    </th>
                    <th className="text-left py-2 px-2 font-medium text-gray-500 dark:text-gray-400">
                      Name
                    </th>
                    <th className="text-left py-2 px-2 font-medium text-gray-500 dark:text-gray-400">
                      Sector
                    </th>
                    <th className="text-right py-2 px-2 font-medium text-gray-500 dark:text-gray-400">
                      Beta
                    </th>
                    <th className="text-right py-2 px-2 font-medium text-gray-500 dark:text-gray-400">
                      Volatility
                    </th>
                    <th className="text-right py-2 px-2 font-medium text-gray-500 dark:text-gray-400">
                      Annual Return
                    </th>
                    <th className="text-right py-2 px-2 font-medium text-gray-500 dark:text-gray-400">
                      Sharpe
                    </th>
                    <th className="text-right py-2 px-2 font-medium text-gray-500 dark:text-gray-400">
                      Risk Score
                    </th>
                    <th className="text-center py-2 px-2 font-medium text-gray-500 dark:text-gray-400">
                      Status
                    </th>
                    <th className="text-center py-2 px-2 font-medium text-gray-500 dark:text-gray-400">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr
                      key={entry.ticker}
                      className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <td className="py-2 px-2 font-medium text-gray-900 dark:text-gray-100">
                        {entry.ticker}
                      </td>
                      {entry.loading ? (
                        <td colSpan={7} className="py-2 px-2">
                          <Skeleton className="h-4 w-full" />
                        </td>
                      ) : entry.error ? (
                        <td
                          colSpan={7}
                          className="py-2 px-2 text-red-500 dark:text-red-400 text-xs"
                        >
                          {entry.error}
                        </td>
                      ) : entry.metrics ? (
                        <>
                          <td className="py-2 px-2 text-gray-700 dark:text-gray-300">
                            {entry.metrics.name}
                          </td>
                          <td className="py-2 px-2 text-gray-600 dark:text-gray-300">
                            {entry.metrics.sector}
                          </td>
                          <td className="text-right py-2 px-2 text-gray-700 dark:text-gray-300">
                            {entry.metrics.beta.toFixed(2)}
                          </td>
                          <td className="text-right py-2 px-2 text-gray-700 dark:text-gray-300">
                            {entry.metrics.volatility.toFixed(1)}%
                          </td>
                          <td
                            className={`text-right py-2 px-2 font-medium ${
                              entry.metrics.annualized_return >= 0
                                ? "text-green-600 dark:text-green-400"
                                : "text-red-600 dark:text-red-400"
                            }`}
                          >
                            {entry.metrics.annualized_return >= 0 ? "+" : ""}
                            {entry.metrics.annualized_return.toFixed(1)}%
                          </td>
                          <td className="text-right py-2 px-2 text-gray-700 dark:text-gray-300">
                            {entry.metrics.sharpe_ratio.toFixed(2)}
                          </td>
                          <td className="text-right py-2 px-2">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                entry.metrics.risk_score <= 40
                                  ? "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300"
                                  : entry.metrics.risk_score <= 65
                                  ? "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300"
                                  : "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300"
                              }`}
                            >
                              {entry.metrics.risk_score}
                            </span>
                          </td>
                        </>
                      ) : (
                        <td
                          colSpan={7}
                          className="py-2 px-2 text-gray-400 dark:text-gray-500 text-xs"
                        >
                          No data
                        </td>
                      )}
                      <td className="text-center py-2 px-2">
                        {entry.loading ? (
                          <span className="text-xs text-blue-500 dark:text-blue-400">
                            Loading...
                          </span>
                        ) : entry.error ? (
                          <span className="text-xs text-red-500 dark:text-red-400">
                            Error
                          </span>
                        ) : (
                          <span className="text-xs text-green-500 dark:text-green-400">
                            OK
                          </span>
                        )}
                      </td>
                      <td className="text-center py-2 px-2">
                        <button
                          onClick={() => removeTicker(entry.ticker)}
                          className="p-1 rounded text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          aria-label={`Remove ${entry.ticker}`}
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-6">
          Data sourced from Yahoo Finance. Metrics are for educational purposes
          only.
        </p>
      </div>
    </AppShell>
  );
}
