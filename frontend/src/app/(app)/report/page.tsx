"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { CardSkeleton } from "@/components/ui/Skeleton";

interface Allocation {
  asset_class: string;
  allocation_pct: number;
  rationale: string;
  expected_return_min: number;
  expected_return_max: number;
}

interface Nudge {
  message: string;
  priority: string;
  impact_score: number;
  category: string;
}

interface MicroWin {
  type: string;
  category: string;
  message: string;
}

interface ReportData {
  generated_at: string;
  user_name: string;
  risk_score: number;
  risk_category: string;
  sub_scores: Record<string, number>;
  life_stage_modifier: number;
  profile: {
    monthly_income: number;
    monthly_expenses: number;
    monthly_savings: number;
    savings_ratio: number;
    total_liabilities: number;
    emergency_fund_months: number;
    life_stage: string;
    investment_horizon_years: number;
    investment_experience: string;
    dependents_count: number;
  };
  portfolio: {
    name: string;
    expected_return_min: number;
    expected_return_max: number;
    allocations: Allocation[];
  };
  health: {
    score: number;
    grade: string;
    tone: string;
    nudges: Nudge[];
    micro_wins: MicroWin[];
    anomaly_count: number;
  };
}

function fmt(n: number): string {
  if (Math.abs(n) >= 10000000) return `Rs. ${(n / 10000000).toFixed(2)} Cr`;
  if (Math.abs(n) >= 100000) return `Rs. ${(n / 100000).toFixed(2)} L`;
  if (Math.abs(n) >= 1000) return `Rs. ${(n / 1000).toFixed(1)}K`;
  return `Rs. ${n.toFixed(0)}`;
}

function assetLabel(key: string): string {
  const labels: Record<string, string> = {
    equity_large_cap: "Large Cap Equity", equity_mid_cap: "Mid Cap Equity",
    equity_small_cap: "Small Cap Equity", debt: "Debt / Fixed Income",
    gold_commodities: "Gold & Commodities", liquid_funds: "Liquid Funds",
  };
  return labels[key] || key.replace(/_/g, " ");
}

const ASSET_COLORS: Record<string, string> = {
  equity_large_cap: "bg-blue-500", equity_mid_cap: "bg-indigo-500",
  equity_small_cap: "bg-violet-500", debt: "bg-emerald-500",
  gold_commodities: "bg-amber-500", liquid_funds: "bg-cyan-500",
};

const RISK_COLORS: Record<string, string> = {
  conservative: "text-green-600 dark:text-green-400",
  moderate: "text-blue-600 dark:text-blue-400",
  aggressive: "text-red-600 dark:text-red-400",
};

const GRADE_COLORS: Record<string, string> = {
  A: "text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/40",
  B: "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40",
  C: "text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/40",
  D: "text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/40",
  F: "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/40",
};

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-red-500", medium: "bg-amber-500", low: "bg-blue-500",
};

const SUB_SCORE_LABELS: Record<string, { label: string; weight: string }> = {
  spending_ratio: { label: "Spending Ratio", weight: "25%" },
  savings_consistency: { label: "Savings Consistency", weight: "25%" },
  investment_discipline: { label: "Investment Discipline", weight: "30%" },
  liability_burden: { label: "Liability Burden", weight: "20%" },
};

export default function ReportPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadReport = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("access_token");
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${API_URL}/api/v1/report/data`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Failed to load" }));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }
      setData(await res.json());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadHTML = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${API_URL}/api/v1/report/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `portfolio-report-${new Date().toISOString().slice(0, 10)}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      /* best effort */
    }
  };

  if (!data && !loading) {
    return (
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Portfolio Report</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">Generate a comprehensive report of your financial profile, risk analysis, and portfolio recommendations.</p>
        <Card className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-4">
            <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Generate Your Report</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
            Includes risk analysis, portfolio allocation, health grade, action items, and personalized insights.
          </p>
          <Button onClick={loadReport} size="lg">Generate Report</Button>
          {error && <p className="text-sm text-red-600 dark:text-red-400 mt-3" role="alert">{error}</p>}
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Generating Report...</h1>
        <div className="grid grid-cols-3 gap-4"><CardSkeleton /><CardSkeleton /><CardSkeleton /></div>
        <CardSkeleton /><CardSkeleton />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Portfolio Advisory Report</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Prepared for <strong>{data.user_name}</strong> &middot; {new Date(data.generated_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <Button variant="outline" size="sm" onClick={() => window.print()}>Print</Button>
          <Button variant="outline" size="sm" onClick={handleDownloadHTML}>Download HTML</Button>
          <Button variant="outline" size="sm" onClick={loadReport}>Refresh</Button>
        </div>
      </div>

      {/* 1. Executive Summary */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold">1</span>
          Executive Summary
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="text-center py-6">
            <p className={`text-4xl font-extrabold ${RISK_COLORS[data.risk_category] || "text-gray-600"}`}>
              {data.risk_score.toFixed(0)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-1">Risk Score</p>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 capitalize">{data.risk_category} Investor</p>
          </Card>
          <Card className="text-center py-6">
            <p className={`text-4xl font-extrabold inline-block px-4 py-1 rounded-xl ${GRADE_COLORS[data.health.grade] || ""}`}>
              {data.health.grade}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-2">Health Grade</p>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Score: {data.health.score}/100</p>
          </Card>
          <Card className="text-center py-6">
            <p className="text-4xl font-extrabold text-emerald-600 dark:text-emerald-400">{data.profile.savings_ratio}%</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-1">Savings Rate</p>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{fmt(data.profile.monthly_savings)}/month</p>
          </Card>
        </div>
      </div>

      {/* 2. Financial Profile */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold">2</span>
          Financial Profile
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            ["Monthly Income", fmt(data.profile.monthly_income)],
            ["Monthly Expenses", fmt(data.profile.monthly_expenses)],
            ["Monthly Savings", fmt(data.profile.monthly_savings)],
            ["Total Liabilities", fmt(data.profile.total_liabilities)],
            ["Emergency Fund", `${data.profile.emergency_fund_months} months`],
            ["Life Stage", data.profile.life_stage.replace(/_/g, " ")],
            ["Investment Horizon", `${data.profile.investment_horizon_years} years`],
            ["Experience", data.profile.investment_experience.replace(/_/g, " ")],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between items-center px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 capitalize">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Risk Score Breakdown */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold">3</span>
          Risk Score Breakdown
        </h2>
        <Card>
          <div className="space-y-4">
            {Object.entries(data.sub_scores).map(([key, score]) => {
              const info = SUB_SCORE_LABELS[key];
              return (
                <div key={key} className="flex items-center gap-4">
                  <div className="w-44 flex-shrink-0">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{info?.label || key}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">Weight: {info?.weight || "—"}</p>
                  </div>
                  <div className="flex-1 h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${score}%` }} />
                  </div>
                  <span className="w-10 text-right text-sm font-bold text-gray-900 dark:text-gray-100">{score.toFixed(0)}</span>
                </div>
              );
            })}
            <div className="pt-4 mt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <span className="text-sm text-gray-500 dark:text-gray-400">Life Stage Modifier</span>
              <span className={`text-lg font-bold ${RISK_COLORS[data.risk_category] || ""}`}>{data.life_stage_modifier.toFixed(2)}x</span>
            </div>
          </div>
        </Card>
      </div>

      {/* 4. Portfolio Allocation */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold">4</span>
          Recommended Portfolio
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          Expected Return: <strong className="text-gray-900 dark:text-gray-100">{data.portfolio.expected_return_min.toFixed(1)}% — {data.portfolio.expected_return_max.toFixed(1)}% p.a.</strong>
        </p>
        <Card>
          <div className="space-y-3">
            {data.portfolio.allocations.filter(a => a.allocation_pct > 0).map((a) => (
              <div key={a.asset_class} className="flex items-center gap-4">
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${ASSET_COLORS[a.asset_class] || "bg-gray-400"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{assetLabel(a.asset_class)}</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{a.allocation_pct.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${ASSET_COLORS[a.asset_class] || "bg-gray-400"}`} style={{ width: `${a.allocation_pct}%` }} />
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{a.rationale}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* 5. Health Analysis */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold">5</span>
          Financial Health Analysis
        </h2>

        {/* Micro Wins */}
        {data.health.micro_wins.length > 0 && (
          <Card className="mb-4 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20">
            <h3 className="text-sm font-bold text-green-800 dark:text-green-300 mb-3">What You're Doing Well</h3>
            <div className="space-y-2">
              {data.health.micro_wins.map((w, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0">&#10003;</span>
                  <span className="text-sm text-green-900 dark:text-green-200">{w.message}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Nudges */}
        {data.health.nudges.length > 0 && (
          <Card>
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3">Recommended Actions</h3>
            <div className="space-y-3">
              {data.health.nudges.map((n, i) => (
                <div key={i} className="flex items-start gap-3 py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-2 ${PRIORITY_COLORS[n.priority] || "bg-gray-400"}`} />
                  <div className="flex-1">
                    <p className="text-sm text-gray-800 dark:text-gray-200">{n.message}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {n.priority.charAt(0).toUpperCase() + n.priority.slice(1)} priority &middot; Impact: {n.impact_score}/100
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Disclaimer */}
      <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4">
        <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
          <strong>Disclaimer:</strong> This report is generated algorithmically for educational purposes only and does not constitute certified financial advice.
          Mutual fund investments are subject to market risks. Past performance does not guarantee future results.
          Please consult a SEBI-registered financial advisor before making investment decisions.
        </p>
      </div>

      {/* Footer */}
      <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-400 dark:text-gray-500">
          PortfolioAdvisor &middot; AI-Driven Investment Risk Profiling & Portfolio Advisory System
        </p>
      </div>
    </div>
  );
}
