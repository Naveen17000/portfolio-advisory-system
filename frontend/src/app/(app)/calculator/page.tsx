"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { CardSkeleton } from "@/components/ui/Skeleton";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface YearlyBreakdown {
  year: number;
  total_invested: number;
  value: number;
  real_value: number;
  interest_earned: number;
}

interface CompoundingResult {
  final_value: number;
  total_invested: number;
  wealth_gain: number;
  growth_multiplier: number;
  real_final_value: number;
  yearly_breakdown: YearlyBreakdown[];
}

function fmt(n: number): string {
  if (Math.abs(n) >= 10000000) return `\u20B9${(n / 10000000).toFixed(2)} Cr`;
  if (Math.abs(n) >= 100000) return `\u20B9${(n / 100000).toFixed(2)} L`;
  if (Math.abs(n) >= 1000) return `\u20B9${(n / 1000).toFixed(1)} K`;
  return `\u20B9${n.toFixed(0)}`;
}

export default function CalculatorPage() {
  const [form, setForm] = useState({
    principal: "100000",
    monthly_sip: "10000",
    annual_rate: "12",
    years: "20",
    inflation_rate: "6",
  });
  const [result, setResult] = useState<CompoundingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCalculate = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api<CompoundingResult>("/api/v1/compounding/calculate", {
        method: "POST",
        body: JSON.stringify({
          principal: Number(form.principal),
          monthly_sip: Number(form.monthly_sip),
          annual_rate: Number(form.annual_rate),
          years: Number(form.years),
          inflation_rate: Number(form.inflation_rate),
        }),
      });
      setResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Calculation failed");
    } finally {
      setLoading(false);
    }
  };

  const chartData = result?.yearly_breakdown.map((y) => ({
    year: `Yr ${y.year}`,
    invested: Math.round(y.total_invested),
    value: Math.round(y.value),
    realValue: Math.round(y.real_value),
  }));

  return (
    <>
      <div className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Compounding Calculator
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            See the power of compounding on your investments over time
          </p>
        </div>

        <Card title="Investment Parameters">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
            <Input
              label="Principal (INR)"
              type="number"
              value={form.principal}
              onChange={(e) => updateField("principal", e.target.value)}
              placeholder="100000"
            />
            <Input
              label="Monthly SIP (INR)"
              type="number"
              value={form.monthly_sip}
              onChange={(e) => updateField("monthly_sip", e.target.value)}
              placeholder="10000"
            />
            <Input
              label="Annual Return (%)"
              type="number"
              value={form.annual_rate}
              onChange={(e) => updateField("annual_rate", e.target.value)}
              placeholder="12"
            />
            <Input
              label="Time Period (Years)"
              type="number"
              value={form.years}
              onChange={(e) => updateField("years", e.target.value)}
              placeholder="20"
            />
            <Input
              label="Inflation Rate (%)"
              type="number"
              value={form.inflation_rate}
              onChange={(e) => updateField("inflation_rate", e.target.value)}
              placeholder="6"
            />
          </div>
          <Button onClick={handleCalculate} disabled={loading}>
            {loading ? "Calculating..." : "Calculate"}
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
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Final Value
                </p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                  {fmt(result.final_value)}
                </p>
              </Card>
              <Card>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Total Invested
                </p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                  {fmt(result.total_invested)}
                </p>
              </Card>
              <Card>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Wealth Gain
                </p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                  {fmt(result.wealth_gain)}
                </p>
              </Card>
              <Card>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Growth Multiplier
                </p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">
                  {result.growth_multiplier.toFixed(1)}x
                </p>
              </Card>
            </div>

            {/* Area Chart: Invested vs Value Growth */}
            {chartData && (
              <Card title="Investment Growth Over Time">
                <div className="overflow-hidden" style={{ minHeight: 0 }}>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
                    <defs>
                      <linearGradient id="gradInvested" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id="gradValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis
                      dataKey="year"
                      tick={{ fontSize: 12 }}
                      className="text-gray-500 dark:text-gray-400"
                    />
                    <YAxis
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
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(31, 41, 55, 0.95)",
                        border: "none",
                        borderRadius: "8px",
                        color: "#f3f4f6",
                      }}
                      formatter={(value: number, name: string) => {
                        const labels: Record<string, string> = {
                          invested: "Total Invested",
                          value: "Portfolio Value",
                          realValue: "Real Value (Inflation Adj.)",
                        };
                        return [fmt(value), labels[name] || name];
                      }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="invested"
                      name="Total Invested"
                      stroke="#3b82f6"
                      fill="url(#gradInvested)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      name="Portfolio Value"
                      stroke="#22c55e"
                      fill="url(#gradValue)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
                </div>
              </Card>
            )}

            {/* Inflation-adjusted line */}
            {chartData && (
              <Card title="Inflation-Adjusted (Real) Value">
                <div className="overflow-hidden" style={{ minHeight: 0 }}>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis
                      dataKey="year"
                      tick={{ fontSize: 12 }}
                      className="text-gray-500 dark:text-gray-400"
                    />
                    <YAxis
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
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(31, 41, 55, 0.95)",
                        border: "none",
                        borderRadius: "8px",
                        color: "#f3f4f6",
                      }}
                      formatter={(value: number, name: string) => {
                        const labels: Record<string, string> = {
                          value: "Nominal Value",
                          realValue: "Real Value",
                        };
                        return [fmt(value), labels[name] || name];
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="value"
                      name="Nominal Value"
                      stroke="#22c55e"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="realValue"
                      name="Real Value"
                      stroke="#f97316"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-center">
                  Real value adjusted for {form.inflation_rate}% annual inflation
                </p>
              </Card>
            )}

            {/* Year-by-Year Breakdown Table */}
            <Card title="Year-by-Year Breakdown">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">
                        Year
                      </th>
                      <th className="text-right py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">
                        Total Invested
                      </th>
                      <th className="text-right py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">
                        Portfolio Value
                      </th>
                      <th className="text-right py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">
                        Interest Earned
                      </th>
                      <th className="text-right py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">
                        Real Value
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.yearly_breakdown.map((row) => (
                      <tr
                        key={row.year}
                        className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                      >
                        <td className="py-2 px-3 text-gray-700 dark:text-gray-300">
                          {row.year}
                        </td>
                        <td className="py-2 px-3 text-right text-gray-700 dark:text-gray-300">
                          {fmt(row.total_invested)}
                        </td>
                        <td className="py-2 px-3 text-right font-medium text-green-600 dark:text-green-400">
                          {fmt(row.value)}
                        </td>
                        <td className="py-2 px-3 text-right text-purple-600 dark:text-purple-400">
                          {fmt(row.interest_earned)}
                        </td>
                        <td className="py-2 px-3 text-right text-orange-600 dark:text-orange-400">
                          {fmt(row.real_value)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
      </div>
    </>
  );
}
