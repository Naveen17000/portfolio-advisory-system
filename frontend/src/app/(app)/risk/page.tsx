"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import type { RiskAssessment } from "@/types";
import Card from "@/components/ui/Card";
import { CardSkeleton } from "@/components/ui/Skeleton";
import RiskGauge from "@/components/risk/RiskGauge";
import RiskCategoryBadge from "@/components/risk/RiskCategoryBadge";
import ScoreBreakdown from "@/components/risk/ScoreBreakdown";
import RiskTimeline from "@/components/risk/RiskTimeline";

export default function RiskPage() {
  const [risk, setRisk] = useState<RiskAssessment | null>(null);
  const [history, setHistory] = useState<RiskAssessment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api<RiskAssessment>("/api/v1/risk/latest").catch(() => null),
      api<RiskAssessment[]>("/api/v1/risk/history").catch(() => []),
    ]).then(([latest, hist]) => {
      setRisk(latest);
      setHistory(hist || []);
      setLoading(false);
    });
  }, []);

  return (
    <>
        <div className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Risk Profile Analysis</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8">Detailed breakdown of your investment risk assessment</p>

          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <CardSkeleton />
              <div className="lg:col-span-2"><CardSkeleton /></div>
            </div>
          ) : !risk ? (
            <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400 py-20">
              No risk assessment found. Complete the questionnaire first.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <Card className="flex flex-col items-center">
                  <RiskGauge score={risk.overall_score} category={risk.risk_category} />
                  <div className="mt-4 text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Raw Score: {risk.score_breakdown?.raw_weighted_score ?? "-"}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Life-Stage Modifier: {risk.life_stage_modifier}x
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Stage: {risk.score_breakdown?.life_stage ?? "-"}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Horizon: {risk.score_breakdown?.investment_horizon_years ?? "-"} years
                    </p>
                  </div>
                </Card>

                <Card title="Sub-Score Breakdown" className="lg:col-span-2">
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
                  <div className="mt-4 text-xs text-gray-400 dark:text-gray-500">
                    <p>Weights: Spending Ratio (25%), Savings Consistency (25%), Investment Discipline (30%), Liability Burden (20%)</p>
                  </div>
                </Card>
              </div>

              {history.length > 1 && (
                <>
                  <Card title="Score Timeline">
                    <RiskTimeline history={history} />
                  </Card>

                  <Card title="Assessment History">
                    <div className="space-y-3">
                      {history.map((h) => (
                        <div key={h.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                          <div className="flex items-center gap-3">
                            <RiskCategoryBadge category={h.risk_category} />
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Score: {h.overall_score}</span>
                          </div>
                          <span className="text-sm text-gray-400 dark:text-gray-500">
                            {new Date(h.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </Card>
                </>
              )}
            </>
          )}
        </div>
    </>
  );
}
