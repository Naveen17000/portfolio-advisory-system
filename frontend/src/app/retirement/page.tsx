"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import AppShell from "@/components/layout/AppShell";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { CardSkeleton } from "@/components/ui/Skeleton";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface GlidePathPoint {
  age: number;
  year: number;
  corpus: number;
  equity_pct: number;
  debt_pct: number;
}

interface RetirementResult {
  readiness_pct: number;
  grade: string;
  required_corpus: number;
  projected_corpus: number;
  shortfall: number;
  additional_sip_needed: number;
  safe_withdrawal_rate: number;
  monthly_retirement_income: number;
  glide_path: GlidePathPoint[];
}

function fmt(n: number): string {
  if (Math.abs(n) >= 10000000) return `\u20B9${(n / 10000000).toFixed(2)} Cr`;
  if (Math.abs(n) >= 100000) return `\u20B9${(n / 100000).toFixed(2)} L`;
  if (Math.abs(n) >= 1000) return `\u20B9${(n / 1000).toFixed(1)} K`;
  return `\u20B9${n.toFixed(0)}`;
}

function gradeColor(grade: string): string {
  switch (grade) {
    case "A":
      return "text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/40";
    case "B":
      return "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40";
    case "C":
      return "text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/40";
    case "D":
      return "text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/40";
    default:
      return "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/40";
  }
}

function gaugeColor(pct: number): string {
  if (pct >= 80) return "#22c55e";
  if (pct >= 60) return "#3b82f6";
  if (pct >= 40) return "#eab308";
  if (pct >= 20) return "#f97316";
  return "#ef4444";
}

function ReadinessGauge({ pct }: { pct: number }) {
  const clamped = Math.min(Math.max(pct, 0), 100);
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = (clamped / 100) * circumference;
  const color = gaugeColor(clamped);

  return (
    <div className="flex flex-col items-center">
      <svg width="180" height="180" viewBox="0 0 180 180" className="transform -rotate-90">
        <circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="12"
          className="text-gray-200 dark:text-gray-700"
        />
        <circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${strokeDash} ${circumference}`}
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ marginTop: 50 }}>
        <span className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          {clamped.toFixed(0)}%
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">Readiness</span>
      </div>
    </div>
  );
}

export default function RetirementPage() {
  const [form, setForm] = useState({
    current_age: "30",
    retirement_age: "60",
    monthly_expenses: "50000",
    monthly_savings: "20000",
    current_corpus: "500000",
    expected_return: "12",
    inflation_rate: "6",
  });
  const [result, setResult] = useState<RetirementResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handlePlan = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api<RetirementResult>("/api/v1/retirement/plan", {
        method: "POST",
        body: JSON.stringify({
          current_age: Number(form.current_age),
          retirement_age: Number(form.retirement_age),
          monthly_expenses: Number(form.monthly_expenses),
          monthly_savings: Number(form.monthly_savings),
          current_corpus: Number(form.current_corpus),
          expected_return: Number(form.expected_return),
          inflation_rate: Number(form.inflation_rate),
        }),
      });
      setResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Retirement planning failed");
    } finally {
      setLoading(false);
    }
  };

  const chartData = result?.glide_path.map((p) => ({
    age: p.age,
    corpus: Math.round(p.corpus),
    equity: p.equity_pct,
    debt: p.debt_pct,
  }));

  return (
    <AppShell>
      <div className="flex-1 max-w-6xl mx-auto w-full px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Retirement Planner</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Plan your retirement with personalized projections and asset allocation glide paths
          </p>
        </div>

        <Card title="Your Details">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <Input
              label="Current Age"
              type="number"
              value={form.current_age}
              onChange={(e) => updateField("current_age", e.target.value)}
            />
            <Input
              label="Retirement Age"
              type="number"
              value={form.retirement_age}
              onChange={(e) => updateField("retirement_age", e.target.value)}
            />
            <Input
              label="Monthly Expenses (INR)"
              type="number"
              value={form.monthly_expenses}
              onChange={(e) => updateField("monthly_expenses", e.target.value)}
            />
            <Input
              label="Monthly Savings (INR)"
              type="number"
              value={form.monthly_savings}
              onChange={(e) => updateField("monthly_savings", e.target.value)}
            />
            <Input
              label="Current Corpus (INR)"
              type="number"
              value={form.current_corpus}
              onChange={(e) => updateField("current_corpus", e.target.value)}
            />
            <Input
              label="Expected Return (%)"
              type="number"
              value={form.expected_return}
              onChange={(e) => updateField("expected_return", e.target.value)}
            />
            <Input
              label="Inflation Rate (%)"
              type="number"
              value={form.inflation_rate}
              onChange={(e) => updateField("inflation_rate", e.target.value)}
            />
          </div>
          <Button onClick={handlePlan} disabled={loading}>
            {loading ? "Calculating plan..." : "Plan Retirement"}
          </Button>
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-2" role="alert">
              {error}
            </p>
          )}
        </Card>

        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        )}

        {result && !loading && (
          <>
            {/* Readiness Gauge + Grade */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Card className="flex flex-col items-center justify-center py-8">
                <div className="relative">
                  <ReadinessGauge pct={result.readiness_pct} />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                  Retirement Readiness Score
                </p>
              </Card>
              <Card className="flex flex-col items-center justify-center py-8">
                <span
                  className={`text-6xl font-bold px-6 py-3 rounded-2xl ${gradeColor(result.grade)}`}
                >
                  {result.grade}
                </span>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                  Retirement Readiness Grade
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Safe withdrawal rate: {result.safe_withdrawal_rate}%
                </p>
              </Card>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Required Corpus
                </p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                  {fmt(result.required_corpus)}
                </p>
              </Card>
              <Card>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Projected Corpus
                </p>
                <p className="text-xl font-bold text-green-600 dark:text-green-400 mt-1">
                  {fmt(result.projected_corpus)}
                </p>
              </Card>
              <Card>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {result.shortfall > 0 ? "Shortfall" : "Surplus"}
                </p>
                <p
                  className={`text-xl font-bold mt-1 ${
                    result.shortfall > 0
                      ? "text-red-600 dark:text-red-400"
                      : "text-green-600 dark:text-green-400"
                  }`}
                >
                  {fmt(Math.abs(result.shortfall))}
                </p>
              </Card>
              <Card>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Additional SIP Needed
                </p>
                <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                  {result.additional_sip_needed > 0
                    ? fmt(result.additional_sip_needed)
                    : "None"}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">per month</p>
              </Card>
            </div>

            {/* Glide Path Chart */}
            {chartData && chartData.length > 0 && (
              <Card title="Corpus Growth & Asset Allocation Glide Path">
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis
                      dataKey="age"
                      tick={{ fontSize: 12 }}
                      className="text-gray-500 dark:text-gray-400"
                      label={{ value: "Age", position: "insideBottom", offset: -5 }}
                    />
                    <YAxis
                      yAxisId="corpus"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(v: number) =>
                        v >= 10000000
                          ? `${(v / 10000000).toFixed(0)}Cr`
                          : v >= 100000
                          ? `${(v / 100000).toFixed(0)}L`
                          : `${(v / 1000).toFixed(0)}K`
                      }
                      className="text-gray-500 dark:text-gray-400"
                    />
                    <YAxis
                      yAxisId="allocation"
                      orientation="right"
                      domain={[0, 100]}
                      tick={{ fontSize: 12 }}
                      tickFormatter={(v: number) => `${v}%`}
                      className="text-gray-500 dark:text-gray-400"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(31, 41, 55, 0.95)",
                        border: "none",
                        borderRadius: "8px",
                        color: "#f3f4f6",
                      }}
                      formatter={(value: number, name: string) => {
                        if (name === "corpus") return [fmt(value), "Corpus"];
                        return [`${value}%`, name === "equity" ? "Equity %" : "Debt %"];
                      }}
                      labelFormatter={(label: number) => `Age ${label}`}
                    />
                    <Legend />
                    <Line
                      yAxisId="corpus"
                      type="monotone"
                      dataKey="corpus"
                      name="Corpus"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      dot={false}
                    />
                    <Line
                      yAxisId="allocation"
                      type="monotone"
                      dataKey="equity"
                      name="Equity %"
                      stroke="#22c55e"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                    />
                    <Line
                      yAxisId="allocation"
                      type="monotone"
                      dataKey="debt"
                      name="Debt %"
                      stroke="#f97316"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-center">
                  Solid line shows corpus growth. Dashed lines show equity/debt allocation shift over time.
                </p>
              </Card>
            )}

            {/* Monthly Retirement Income */}
            <Card>
              <div className="text-center py-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Estimated Monthly Retirement Income
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">
                  {fmt(result.monthly_retirement_income)}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Based on {result.safe_withdrawal_rate}% safe withdrawal rate from projected corpus
                </p>
              </div>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  );
}
