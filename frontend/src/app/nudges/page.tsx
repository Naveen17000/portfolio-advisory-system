"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import AppShell from "@/components/layout/AppShell";
import Card from "@/components/ui/Card";
import { CardSkeleton } from "@/components/ui/Skeleton";

interface Trend {
  label: string;
  status: string;
  direction: string;
}

interface NudgeData {
  anomalies: { type: string; category: string; message: string; value?: number; threshold?: number }[];
  nudges: { type: string; priority: string; category: string; message: string; impact_score?: number }[];
  health_score: number;
  health_grade: string;
  tone?: string;
  micro_wins?: { type: string; category: string; message: string }[];
  trends?: Record<string, Trend>;
  summary: {
    spending_ratio: number;
    savings_ratio: number;
    liability_ratio: number;
    emergency_months: number;
  };
}

const PRIORITY_STYLES: Record<string, string> = {
  high: "border-l-red-500 bg-red-50 dark:bg-red-900/20",
  medium: "border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20",
  low: "border-l-blue-500 bg-blue-50 dark:bg-blue-900/20",
};

const TYPE_ICONS: Record<string, string> = {
  warning: "!",
  caution: "~",
  info: "i",
};

const GRADE_COLORS: Record<string, string> = {
  A: "text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/40",
  B: "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40",
  C: "text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/40",
  D: "text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/40",
  F: "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/40",
};

export default function NudgesPage() {
  const [data, setData] = useState<NudgeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<NudgeData>("/api/v1/nudges/")
      .then(setData)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <AppShell>
        <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-8" role="main" aria-label="Loading financial health check">
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </div>
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </div>
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell>
        <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400" role="main">
          Complete your financial profile to get personalized nudges.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
        <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-8" role="main" aria-label="Financial health check">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Financial Health Check</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">Personalized alerts and actionable nudges based on your financial profile</p>

          {/* Health Score */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8" aria-label="Health score overview">
            <Card className="flex flex-col items-center col-span-2 sm:col-span-1">
              <span className={`text-4xl font-bold w-16 h-16 rounded-full flex items-center justify-center ${GRADE_COLORS[data.health_grade] || GRADE_COLORS.C}`}>
                {data.health_grade}
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Health Grade</p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{data.health_score}/100</p>
              {data.tone && (
                <span className={`text-xs mt-1 px-2 py-0.5 rounded-full font-medium ${
                  data.tone === "encouraging" ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300" :
                  data.tone === "concerning" ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300" :
                  "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300"
                }`}>{data.tone}</span>
              )}
            </Card>
            <Card>
              <p className="text-xs text-gray-500 dark:text-gray-400">Spending</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{data.summary.spending_ratio}%</p>
            </Card>
            <Card>
              <p className="text-xs text-gray-500 dark:text-gray-400">Savings</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{data.summary.savings_ratio}%</p>
            </Card>
            <Card>
              <p className="text-xs text-gray-500 dark:text-gray-400">Debt Ratio</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{data.summary.liability_ratio}x</p>
            </Card>
            <Card>
              <p className="text-xs text-gray-500 dark:text-gray-400">Emergency</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{data.summary.emergency_months}mo</p>
            </Card>
          </div>

          {/* Trends */}
          {data.trends && (
            <Card title="Financial Trends" className="mb-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {Object.entries(data.trends).map(([key, trend]) => {
                  const statusColor: Record<string, string> = {
                    excellent: "text-green-600 dark:text-green-400",
                    healthy: "text-green-600 dark:text-green-400",
                    fair: "text-yellow-600 dark:text-yellow-400",
                    elevated: "text-orange-600 dark:text-orange-400",
                    critical: "text-red-600 dark:text-red-400",
                  };
                  const arrow: Record<string, string> = { up: "\u2191", down: "\u2193", flat: "\u2192" };
                  return (
                    <div key={key} className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-700/30">
                      <p className="text-xs text-gray-500 dark:text-gray-400 capitalize mb-1">{key.replace("_", " ")}</p>
                      <span className={`text-lg font-bold ${statusColor[trend.status] || "text-gray-600"}`}>
                        {arrow[trend.direction] || ""} {trend.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Micro-Wins */}
          {data.micro_wins && data.micro_wins.length > 0 && (
            <Card title="What You're Doing Well" className="mb-6">
              <div className="space-y-2" role="list" aria-label="Positive findings">
                {data.micro_wins.map((w, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20" role="listitem">
                    <span className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white bg-green-500" aria-hidden="true">
                      &#10003;
                    </span>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{w.message}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Anomalies */}
          {data.anomalies.length > 0 && (
            <Card title="Alerts" className="mb-6">
              <div className="space-y-3" role="list" aria-label="Financial alerts">
                {data.anomalies.map((a, i) => (
                  <div key={i} className={`flex items-start gap-3 p-3 rounded-lg ${
                    a.type === "warning" ? "bg-red-50 dark:bg-red-900/30" : a.type === "caution" ? "bg-yellow-50 dark:bg-yellow-900/20" : "bg-blue-50 dark:bg-blue-900/20"
                  }`} role="listitem">
                    <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                      a.type === "warning" ? "bg-red-500" : a.type === "caution" ? "bg-yellow-500" : "bg-blue-500"
                    }`} aria-hidden="true">
                      {TYPE_ICONS[a.type] || "?"}
                    </span>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{a.message}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Nudges */}
          <Card title="Action Items">
            <div className="space-y-3" role="list" aria-label="Action items">
              {data.nudges.map((n, i) => (
                <div key={i} className={`border-l-4 rounded-r-lg p-4 ${PRIORITY_STYLES[n.priority] || PRIORITY_STYLES.low}`} role="listitem">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      n.priority === "high" ? "bg-red-200 dark:bg-red-900/50 text-red-800 dark:text-red-300" :
                      n.priority === "medium" ? "bg-yellow-200 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300" :
                      "bg-blue-200 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300"
                    }`}>
                      {n.priority}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 capitalize">{n.category.replace("_", " ")}</span>
                    {n.impact_score != null && (
                      <span className="ml-auto text-xs text-gray-400 dark:text-gray-500 font-mono">impact: {n.impact_score}/100</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{n.message}</p>
                </div>
              ))}
              {data.nudges.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  No action items — your finances look healthy!
                </p>
              )}
            </div>
          </Card>
        </div>
    </AppShell>
  );
}
