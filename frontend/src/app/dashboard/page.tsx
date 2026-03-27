"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import type { RiskAssessment, Portfolio } from "@/types";
import AppShell from "@/components/layout/AppShell";
import Card from "@/components/ui/Card";
import { CardSkeleton } from "@/components/ui/Skeleton";
import RiskGauge from "@/components/risk/RiskGauge";
import ScoreBreakdown from "@/components/risk/ScoreBreakdown";
import AllocationPieChart from "@/components/portfolio/AllocationPieChart";
import ReturnRangeCard from "@/components/portfolio/ReturnRangeCard";

export default function DashboardPage() {
  const [risk, setRisk] = useState<RiskAssessment | null>(null);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    Promise.all([
      api<RiskAssessment>("/api/v1/risk/latest").catch(() => null),
      api<Portfolio>("/api/v1/portfolio/latest").catch(() => null),
    ]).then(([r, p]) => {
      setRisk(r);
      setPortfolio(p);
      setLoading(false);
      if (!r) router.push("/questionnaire");
    });
  }, [router]);

  return (
    <AppShell>
        <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
          {loading ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-4 w-72 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <CardSkeleton />
                <div className="lg:col-span-2"><CardSkeleton /></div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <CardSkeleton />
                <CardSkeleton />
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
                  <p className="text-gray-500 dark:text-gray-400">Your investment risk profile and portfolio overview</p>
                </div>
                <Link
                  href="/questionnaire"
                  className="text-sm text-blue-600 hover:underline"
                >
                  Retake Questionnaire
                </Link>
              </div>

              {risk && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                  <Card title="Risk Score" className="flex flex-col items-center">
                    <RiskGauge score={risk.overall_score} category={risk.risk_category} />
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-4 text-center">
                      Life-stage modifier: {risk.life_stage_modifier}x
                    </p>
                  </Card>

                  <Card title="Score Breakdown" className="lg:col-span-2">
                    <ScoreBreakdown scores={(risk.score_breakdown?.sub_scores || {
                      spending_ratio: 0,
                      savings_consistency: 0,
                      investment_discipline: 0,
                      liability_burden: 0,
                    }) as {
                      spending_ratio: number;
                      savings_consistency: number;
                      investment_discipline: number;
                      liability_burden: number;
                    }} />
                  </Card>
                </div>
              )}

              {portfolio && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card title="Portfolio Allocation">
                    <AllocationPieChart allocations={portfolio.allocations} />
                  </Card>

                  <div className="space-y-6">
                    <ReturnRangeCard min={portfolio.expected_return_min} max={portfolio.expected_return_max} />

                    <Card title="Quick Links">
                      <nav className="space-y-2" aria-label="Quick links">
                        <Link href="/risk" className="block text-sm text-blue-600 hover:underline">
                          View detailed risk analysis
                        </Link>
                        <Link href="/explain" className="block text-sm text-blue-600 hover:underline">
                          Understand your risk score (SHAP)
                        </Link>
                        <Link href="/portfolio" className="block text-sm text-blue-600 hover:underline">
                          View full portfolio details
                        </Link>
                        <Link href="/simulation" className="block text-sm text-blue-600 hover:underline">
                          Run Monte Carlo simulation
                        </Link>
                        <Link href="/goals" className="block text-sm text-blue-600 hover:underline">
                          Plan your financial goals
                        </Link>
                        <Link href="/sentiment" className="block text-sm text-blue-600 hover:underline">
                          Market sentiment analysis
                        </Link>
                        <Link href="/profile" className="block text-sm text-blue-600 hover:underline">
                          Edit financial profile
                        </Link>
                      </nav>
                    </Card>
                  </div>
                </div>
              )}

              <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-8">
                This platform provides educational insights only. Not a substitute for certified financial advice.
              </p>
            </>
          )}
        </div>
    </AppShell>
  );
}
