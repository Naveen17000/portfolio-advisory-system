"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { CardSkeleton } from "@/components/ui/Skeleton";

interface ParseResult {
  summary: { total_transactions: number; period_months: number; total_income: number; total_expenses: number; total_savings: number };
  monthly_averages: { income: number; expenses: number; savings: number };
  spending_categories: Record<string, number>;
  spending_analysis: { essential_ratio: number; discretionary_ratio: number; spending_ratio: number };
  monthly_trend: { month: string; income: number; expenses: number }[];
  suggested_profile: { monthly_income: number; monthly_expenses: number; monthly_savings: number };
}

function fmt(n: number): string {
  if (n >= 100000) return `${(n / 100000).toFixed(2)}L`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toFixed(0);
}

const CATEGORY_LABELS: Record<string, string> = {
  groceries: "Groceries", food_dining: "Food & Dining", transport: "Transport",
  utilities: "Utilities", rent: "Rent", emi: "EMI/Loans", insurance: "Insurance",
  investments: "Investments", shopping: "Shopping", entertainment: "Entertainment",
  healthcare: "Healthcare", education: "Education", transfer: "Transfers", other: "Other",
};

export default function UploadPage() {
  const [result, setResult] = useState<ParseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/upload/csv`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Upload failed" }));
        throw new Error(err.detail);
      }
      setResult(await res.json());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
        <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-8" role="main" aria-label="Bank statement upload">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Bank Statement Upload</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">Upload a CSV bank statement to auto-detect income, expenses, and spending patterns</p>

          <Card title="Upload CSV">
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
              <input
                type="file"
                accept=".csv"
                onChange={handleUpload}
                className="hidden"
                id="csv-upload"
                disabled={loading}
                aria-label="Upload CSV bank statement"
              />
              <label htmlFor="csv-upload" className="cursor-pointer">
                <div className="text-gray-500 dark:text-gray-400 mb-2">
                  {loading ? "Processing..." : "Click to select a CSV bank statement"}
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500">Supports common Indian bank formats with Date, Description, Debit, Credit columns</p>
              </label>
            </div>
            {error && <p className="text-sm text-red-600 dark:text-red-400 mt-3" role="alert">{error}</p>}
          </Card>

          {loading && (
            <div className="space-y-6 mt-6" aria-label="Processing upload">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
              </div>
              <CardSkeleton />
            </div>
          )}

          {result && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6" aria-label="Upload summary">
                <Card>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Transactions</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{result.summary.total_transactions}</p>
                </Card>
                <Card>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Months</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{result.summary.period_months}</p>
                </Card>
                <Card>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Avg Monthly Income</p>
                  <p className="text-xl font-bold text-green-700 dark:text-green-400">{fmt(result.monthly_averages.income)}</p>
                </Card>
                <Card>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Avg Monthly Savings</p>
                  <p className="text-xl font-bold text-blue-700 dark:text-blue-400">{fmt(result.monthly_averages.savings)}</p>
                </Card>
              </div>

              <Card title="Spending Breakdown" className="mt-6">
                <div className="space-y-2">
                  {Object.entries(result.spending_categories).map(([cat, amount]) => (
                    <div key={cat} className="flex items-center justify-between py-1.5">
                      <span className="text-sm text-gray-700 dark:text-gray-300">{CATEGORY_LABELS[cat] || cat}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${Math.min(100, (amount / result.summary.total_expenses) * 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-16 text-right text-gray-900 dark:text-gray-100">{fmt(amount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300">
                  <span>Essential: <strong>{result.spending_analysis.essential_ratio}%</strong></span>
                  <span>Discretionary: <strong>{result.spending_analysis.discretionary_ratio}%</strong></span>
                </div>
              </Card>

              <Card className="mt-6">
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                  Your profile has been auto-updated with the extracted averages.
                </p>
                <Button onClick={() => router.push("/profile")}>Review Profile</Button>
              </Card>
            </>
          )}
        </div>
    </AppShell>
  );
}
