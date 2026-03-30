"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import Card from "@/components/ui/Card";
import { CardSkeleton } from "@/components/ui/Skeleton";

interface Fund {
  name: string;
  type: string;
  expense_ratio: number;
}

interface SipItem {
  asset_class: string;
  allocation_pct: number;
  monthly_sip: number;
  funds: Fund[];
}

interface Action {
  action: string;
  priority: "high" | "medium" | "low";
}

interface InvestData {
  risk_score: number;
  risk_category: string;
  life_stage: string;
  monthly_income: number;
  monthly_savings: number;
  investable_range: { min: number; max: number; note: string };
  total_recommended_sip: number;
  expected_return_range: { min: number; max: number };
  sip_breakdown: SipItem[];
  priority_actions: Action[];
}

function fmt(n: number): string {
  if (Math.abs(n) >= 10000000) return `Rs. ${(n / 10000000).toFixed(2)} Cr`;
  if (Math.abs(n) >= 100000) return `Rs. ${(n / 100000).toFixed(2)} L`;
  if (Math.abs(n) >= 1000) return `Rs. ${(n / 1000).toFixed(1)}K`;
  return `Rs. ${n.toFixed(0)}`;
}

function assetLabel(key: string): string {
  const labels: Record<string, string> = {
    equity_large_cap: "Large Cap Equity",
    equity_mid_cap: "Mid Cap Equity",
    equity_small_cap: "Small Cap Equity",
    debt: "Debt / Fixed Income",
    gold_commodities: "Gold & Commodities",
    liquid_funds: "Liquid Funds",
  };
  return labels[key] || key.replace(/_/g, " ");
}

const ASSET_COLORS: Record<string, string> = {
  equity_large_cap: "bg-blue-500",
  equity_mid_cap: "bg-indigo-500",
  equity_small_cap: "bg-violet-500",
  debt: "bg-emerald-500",
  gold_commodities: "bg-amber-500",
  liquid_funds: "bg-cyan-500",
};

const PRIORITY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  high: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-300", label: "High" },
  medium: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-300", label: "Medium" },
  low: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-300", label: "Low" },
};

export default function InvestPage() {
  const [data, setData] = useState<InvestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api<InvestData>("/api/v1/invest/")
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load recommendations"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div><h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Investment Recommendations</h1></div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <CardSkeleton /><CardSkeleton /><CardSkeleton />
        </div>
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Investment Recommendations</h1>
        <Card>
          <p className="text-red-600 dark:text-red-400">{error || "Unable to generate recommendations."}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Please complete your financial profile and risk assessment first.
          </p>
        </Card>
      </div>
    );
  }

  const lifeStageLabels: Record<string, string> = {
    student: "Student",
    early_career: "Early Career",
    family: "Family / Mid-Career",
    pre_retirement: "Pre-Retirement",
  };

  return (
    <div className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Investment Recommendations
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Personalized investment plan based on your income, risk profile, and life stage
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Risk Profile
          </p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
            {data.risk_score.toFixed(0)}/100
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 capitalize mt-0.5">
            {data.risk_category} &middot; {lifeStageLabels[data.life_stage] || data.life_stage}
          </p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Monthly Savings
          </p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {fmt(data.monthly_savings)}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            of {fmt(data.monthly_income)} income
          </p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Recommended SIP
          </p>
          <p className="text-2xl font-bold text-violet-600 dark:text-violet-400 mt-1">
            {fmt(data.total_recommended_sip)}/mo
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Expected {data.expected_return_range.min.toFixed(1)}% - {data.expected_return_range.max.toFixed(1)}% p.a.
          </p>
        </Card>
      </div>

      {/* Investable Range Note */}
      <Card>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              You can invest between {fmt(data.investable_range.min)} - {fmt(data.investable_range.max)} per month
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {data.investable_range.note}
            </p>
          </div>
        </div>
      </Card>

      {/* SIP Breakdown */}
      <Card title="Where to Invest — Monthly SIP Breakdown">
        <div className="space-y-4">
          {data.sip_breakdown.map((item) => (
            <div
              key={item.asset_class}
              className="border border-gray-100 dark:border-gray-700 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${ASSET_COLORS[item.asset_class] || "bg-gray-400"}`} />
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {assetLabel(item.asset_class)}
                  </h3>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {item.allocation_pct.toFixed(1)}% allocation
                  </span>
                </div>
                <span className="text-base font-bold text-gray-900 dark:text-gray-100">
                  {fmt(item.monthly_sip)}/mo
                </span>
              </div>

              {/* Allocation bar */}
              <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full mb-3">
                <div
                  className={`h-full rounded-full ${ASSET_COLORS[item.asset_class] || "bg-gray-400"} transition-all`}
                  style={{ width: `${item.allocation_pct}%` }}
                />
              </div>

              {/* Fund suggestions */}
              {item.funds.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Suggested Instruments
                  </p>
                  {item.funds.map((fund) => (
                    <div
                      key={fund.name}
                      className="flex items-center justify-between py-1.5 px-2 bg-gray-50 dark:bg-gray-700/40 rounded text-sm"
                    >
                      <div>
                        <span className="text-gray-900 dark:text-gray-100">{fund.name}</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">
                          {fund.type}
                        </span>
                      </div>
                      {fund.expense_ratio > 0 && (
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {fund.expense_ratio}% ER
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Priority Actions */}
      <Card title="Action Plan — What to Do Next">
        <div className="space-y-2">
          {data.priority_actions.map((action, i) => {
            const style = PRIORITY_STYLES[action.priority] || PRIORITY_STYLES.medium;
            return (
              <div
                key={i}
                className="flex items-center gap-3 py-2.5 px-3 rounded-lg bg-gray-50 dark:bg-gray-700/30"
              >
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>
                  {style.label}
                </span>
                <span className="text-sm text-gray-800 dark:text-gray-200">{action.action}</span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Disclaimer */}
      <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
              Important Disclaimer
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1 leading-relaxed">
              These recommendations are generated algorithmically for <strong>educational purposes only</strong> and
              do not constitute certified financial advice. Mutual fund investments are subject to market risks.
              Past performance does not guarantee future results. Please read all scheme-related documents carefully
              and consult a SEBI-registered financial advisor before making investment decisions. The fund names
              shown are illustrative examples and not specific buy/sell recommendations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
