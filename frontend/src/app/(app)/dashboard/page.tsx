"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
  import type { RiskAssessment, Portfolio, FinancialProfile } from "@/types";
import Card from "@/components/ui/Card";
import { CardSkeleton } from "@/components/ui/Skeleton";
import RiskGauge from "@/components/risk/RiskGauge";
import ScoreBreakdown from "@/components/risk/ScoreBreakdown";
import AllocationPieChart from "@/components/portfolio/AllocationPieChart";
import ReturnRangeCard from "@/components/portfolio/ReturnRangeCard";

interface Nudge {
  priority: string;
  category: string;
  message: string;
  impact_score: number;
}

interface NudgesResponse {
  health_grade: string;
  health_score: number;
  nudges: Nudge[];
  tone: string;
  micro_wins: string[];
  summary: {
    spending_ratio: number;
    savings_ratio: number;
    liability_ratio: number;
    emergency_months: number;
  };
}

const PRIORITY_STYLES: Record<string, string> = {
  high: "border-l-red-500 bg-red-50 dark:bg-red-950/30",
  medium: "border-l-amber-500 bg-amber-50 dark:bg-amber-950/30",
  low: "border-l-blue-500 bg-blue-50 dark:bg-blue-950/30",
};

const PRIORITY_BADGE: Record<string, string> = {
  high: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
  low: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
};

const GRADE_COLORS: Record<string, string> = {
  A: "text-emerald-600 dark:text-emerald-400",
  B: "text-green-600 dark:text-green-400",
  C: "text-amber-600 dark:text-amber-400",
  D: "text-orange-600 dark:text-orange-400",
  F: "text-red-600 dark:text-red-400",
};

function gradeColor(grade: string): string {
  return GRADE_COLORS[grade.charAt(0).toUpperCase()] || "text-gray-600 dark:text-gray-400";
}

const ACTION_LINKS = [
  {
    href: "/risk",
    title: "Risk Analysis",
    description: "Detailed risk breakdown",
  },
  {
    href: "/explain",
    title: "Score Explainer",
    description: "SHAP-based insights",
  },
  {
    href: "/portfolio",
    title: "Portfolio Details",
    description: "Full allocation view",
  },
  {
    href: "/simulation",
    title: "Monte Carlo Sim",
    description: "Run return simulations",
  },
  {
    href: "/goals",
    title: "Goal Planner",
    description: "Plan financial goals",
  },
  {
    href: "/sentiment",
    title: "Market Sentiment",
    description: "Sentiment analysis",
  },
];

export default function DashboardPage() {
  const [risk, setRisk] = useState<RiskAssessment | null>(null);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [profile, setProfile] = useState<FinancialProfile | null>(null);
  const [nudges, setNudges] = useState<NudgesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    Promise.all([
      api<RiskAssessment>("/api/v1/risk/latest").catch(() => null),
      api<Portfolio>("/api/v1/portfolio/latest").catch(() => null),
      api<FinancialProfile>("/api/v1/profile/").catch(() => null),
      api<NudgesResponse>("/api/v1/nudges/").catch(() => null),
    ]).then(([r, p, prof, n]) => {
      setRisk(r);
      setPortfolio(p);
      setProfile(prof);
      setNudges(n);
      setLoading(false);
      if (!r) router.push("/questionnaire");
    });
  }, [router]);

  const savingsRate =
    profile && profile.monthly_income > 0
      ? ((profile.monthly_savings / profile.monthly_income) * 100).toFixed(1)
      : null;

  const emergencyMonths =
    nudges?.summary?.emergency_months ?? profile?.emergency_fund_months ?? null;

  const topNudges = nudges?.nudges
    ?.slice()
    .sort((a, b) => b.impact_score - a.impact_score)
    .slice(0, 3);

  return (
    <>
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-4 w-72 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
            {/* KPI strip skeleton */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"
                />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <CardSkeleton />
              <div className="lg:col-span-2">
                <CardSkeleton />
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CardSkeleton />
              <CardSkeleton />
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Dashboard
                </h1>
                <p className="text-gray-500 dark:text-gray-400">
                  Your investment risk profile and portfolio overview
                </p>
              </div>
              <Link
                href="/questionnaire"
                className="text-sm text-blue-600 hover:underline"
              >
                Retake Questionnaire
              </Link>
            </div>

            {/* ── KPI Strip ─────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
              {/* Financial Health Grade */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Health Grade
                </p>
                <p
                  className={`mt-1 text-3xl font-bold ${
                    nudges?.health_grade
                      ? gradeColor(nudges.health_grade)
                      : "text-gray-400 dark:text-gray-500"
                  }`}
                >
                  {nudges?.health_grade ?? "--"}
                </p>
                {nudges?.health_score != null && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Score: {nudges.health_score}/100
                  </p>
                )}
              </div>

              {/* Monthly Savings Rate */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Savings Rate
                </p>
                <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {savingsRate != null ? `${savingsRate}%` : "--"}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Monthly
                </p>
              </div>

              {/* Emergency Fund */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Emergency Fund
                </p>
                <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {emergencyMonths != null ? emergencyMonths : "--"}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {emergencyMonths != null ? "months covered" : "No data"}
                </p>
              </div>

              {/* Risk Category */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Risk Category
                </p>
                <p className="mt-1 text-lg font-bold text-gray-900 dark:text-gray-100 leading-tight">
                  {risk?.risk_category ?? "--"}
                </p>
                {risk && (
                  <span className="inline-block mt-2 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                    Score: {risk.overall_score}
                  </span>
                )}
              </div>

              {/* Portfolio Return Range */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Return Range
                </p>
                <p className="mt-1 text-lg font-bold text-gray-900 dark:text-gray-100 leading-tight">
                  {portfolio
                    ? `${portfolio.expected_return_min}% - ${portfolio.expected_return_max}%`
                    : "--"}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Expected annual
                </p>
              </div>
            </div>

            {/* ── Risk Section ──────────────────────────────────── */}
            {risk && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <Card
                  title="Risk Score"
                  className="flex flex-col items-center"
                >
                  <RiskGauge
                    score={risk.overall_score}
                    category={risk.risk_category}
                  />
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-4 text-center">
                    Life-stage modifier: {risk.life_stage_modifier}x
                  </p>
                </Card>

                <Card title="Score Breakdown" className="lg:col-span-2">
                  <ScoreBreakdown
                    scores={
                      (risk.score_breakdown?.sub_scores || {
                        spending_ratio: 0,
                        savings_consistency: 0,
                        investment_discipline: 0,
                        liability_burden: 0,
                      }) as {
                        spending_ratio: number;
                        savings_consistency: number;
                        investment_discipline: number;
                        liability_burden: number;
                      }
                    }
                  />
                </Card>
              </div>
            )}

            {/* ── Portfolio Section ─────────────────────────────── */}
            {portfolio && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <Card title="Portfolio Allocation">
                  <AllocationPieChart allocations={portfolio.allocations} />
                </Card>

                <ReturnRangeCard
                  min={portfolio.expected_return_min}
                  max={portfolio.expected_return_max}
                />
              </div>
            )}

            {/* ── Needs Attention ───────────────────────────────── */}
            {topNudges && topNudges.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Needs Attention
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {topNudges.map((nudge, idx) => (
                    <div
                      key={idx}
                      className={`rounded-lg border-l-4 border border-gray-200 dark:border-gray-700 p-4 ${
                        PRIORITY_STYLES[nudge.priority] ??
                        "border-l-gray-400 bg-gray-50 dark:bg-gray-800"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          {nudge.category}
                        </span>
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            PRIORITY_BADGE[nudge.priority] ??
                            "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {nudge.priority}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                        {nudge.message}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                        Impact: {nudge.impact_score}/10
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Action Grid ───────────────────────────────────── */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Quick Actions
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {ACTION_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="group rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 transition-colors hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                  >
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      {link.title}
                    </h3>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {link.description}
                    </p>
                  </Link>
                ))}
              </div>
              <div className="mt-3 text-right">
                <Link
                  href="/profile"
                  className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                >
                  Edit Financial Profile
                </Link>
              </div>
            </div>

            <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-8">
              This platform provides educational insights only. Not a substitute
              for certified financial advice.
            </p>
          </>
        )}
      </div>
    </>
  );
}
