"use client";

import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { api } from "@/lib/api";
import AppShell from "@/components/layout/AppShell";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { CardSkeleton } from "@/components/ui/Skeleton";
import Link from "next/link";

interface SpendingData {
  history: { month: string; income: number; expenses: number; savings: number; savings_rate: number }[];
  trend: { income_change: number; expense_change: number; savings_change: number; direction: string } | null;
  summary: { total_months: number; avg_savings_rate: number; avg_income: number; avg_expenses: number };
}

function fmt(n: number): string {
  if (Math.abs(n) >= 100000) return `${(n / 100000).toFixed(1)}L`;
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toFixed(0);
}

export default function SpendingPage() {
  const [data, setData] = useState<SpendingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ month: "", income: "", expenses: "" });
  const [saving, setSaving] = useState(false);

  const fetchData = () => {
    api<SpendingData>("/api/v1/spending/history")
      .then(setData)
      .catch(() => null)
      .finally(() => setLoading(false));
  };

  useEffect(fetchData, []);

  const handleAdd = async () => {
    if (!form.month || !form.income || !form.expenses) return;
    setSaving(true);
    try {
      await api("/api/v1/spending/monthly", {
        method: "POST",
        body: JSON.stringify({
          month: form.month,
          income: Number(form.income),
          expenses: Number(form.expenses),
        }),
      });
      setForm({ month: "", income: "", expenses: "" });
      fetchData();
    } catch { /* ignore */ }
    setSaving(false);
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-8" role="main" aria-label="Loading spending tracker">
          <div className="space-y-6">
            <CardSkeleton />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </div>
            <CardSkeleton />
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
        <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-8" role="main" aria-label="Spending tracker">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Spending Tracker</h1>
              <p className="text-gray-500 dark:text-gray-400">Track monthly income and expenses over time</p>
            </div>
            <Link href="/upload" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Upload CSV instead</Link>
          </div>

          {/* Add Entry */}
          <Card title="Log Monthly Data" className="mb-6">
            <div className="flex flex-wrap gap-3 items-end">
              <Input label="Month" type="month" value={form.month} onChange={(e) => setForm(f => ({ ...f, month: e.target.value }))} />
              <Input label="Income" type="number" value={form.income} onChange={(e) => setForm(f => ({ ...f, income: e.target.value }))} />
              <Input label="Expenses" type="number" value={form.expenses} onChange={(e) => setForm(f => ({ ...f, expenses: e.target.value }))} />
              <Button onClick={handleAdd} disabled={saving}>{saving ? "Saving..." : "Add"}</Button>
            </div>
          </Card>

          {data && data.history.length > 0 && (
            <>
              {/* Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6" aria-label="Spending summary">
                <Card>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Months Tracked</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{data.summary.total_months}</p>
                </Card>
                <Card>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Avg Savings Rate</p>
                  <p className="text-xl font-bold text-green-700 dark:text-green-400">{data.summary.avg_savings_rate}%</p>
                </Card>
                <Card>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Avg Income</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{fmt(data.summary.avg_income)}</p>
                </Card>
                <Card>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Avg Expenses</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{fmt(data.summary.avg_expenses)}</p>
                </Card>
              </div>

              {/* Trend */}
              {data.trend && (
                <Card className="mb-6">
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
                      data.trend.direction === "improving" ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400" : "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400"
                    }`}>
                      {data.trend.direction === "improving" ? "Improving" : "Declining"}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      Savings changed by {fmt(data.trend.savings_change)} vs last month
                    </span>
                  </div>
                </Card>
              )}

              {/* Chart */}
              <Card title="Monthly Trend" className="mb-6">
                <div className="w-full h-72 overflow-hidden" style={{ minHeight: 0 }} aria-label="Monthly spending chart">
                  <ResponsiveContainer width="100%" height="100%" minWidth={400}>
                    <BarChart data={data.history} margin={{ left: 0, right: 10 }}>
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                      <YAxis tickFormatter={(v) => fmt(v)} tick={{ fontSize: 11 }} width={55} />
                      <Tooltip formatter={(v) => fmt(Number(v))} />
                      <Legend />
                      <Bar dataKey="income" name="Income" fill="#22c55e" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="savings" name="Savings" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </>
          )}

          {(!data || data.history.length === 0) && (
            <Card className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">No spending history yet. Add monthly data above or upload a CSV statement.</p>
            </Card>
          )}
        </div>
    </AppShell>
  );
}
