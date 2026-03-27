"use client";

import { useState, useMemo } from "react";
import AppShell from "@/components/layout/AppShell";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface AmortizationRow {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

interface PayoffResult {
  months: number;
  total_paid: number;
  total_interest: number;
  amortization: AmortizationRow[];
}

function calculatePayoff(
  totalDebt: number,
  annualRate: number,
  monthlyPayment: number
): PayoffResult | null {
  if (totalDebt <= 0 || monthlyPayment <= 0 || annualRate < 0) return null;

  const monthlyRate = annualRate / 100 / 12;
  let balance = totalDebt;
  const amortization: AmortizationRow[] = [];
  let totalPaid = 0;
  let totalInterest = 0;
  let month = 0;

  // Safety: cap at 600 months (50 years)
  while (balance > 0.01 && month < 600) {
    month++;
    const interestCharge = balance * monthlyRate;
    const payment = Math.min(monthlyPayment, balance + interestCharge);
    const principalPaid = payment - interestCharge;

    if (principalPaid <= 0) {
      // Payment doesn't cover interest
      return null;
    }

    balance = Math.max(balance - principalPaid, 0);
    totalPaid += payment;
    totalInterest += interestCharge;

    amortization.push({
      month,
      payment: Math.round(payment * 100) / 100,
      principal: Math.round(principalPaid * 100) / 100,
      interest: Math.round(interestCharge * 100) / 100,
      balance: Math.round(balance * 100) / 100,
    });
  }

  return {
    months: month,
    total_paid: Math.round(totalPaid),
    total_interest: Math.round(totalInterest),
    amortization,
  };
}

function fmt(n: number): string {
  if (Math.abs(n) >= 10000000) return `\u20B9${(n / 10000000).toFixed(2)} Cr`;
  if (Math.abs(n) >= 100000) return `\u20B9${(n / 100000).toFixed(2)} L`;
  if (Math.abs(n) >= 1000) return `\u20B9${(n / 1000).toFixed(1)} K`;
  return `\u20B9${n.toFixed(0)}`;
}

export default function DebtPage() {
  const [form, setForm] = useState({
    total_debt: "500000",
    interest_rate: "12",
    monthly_emi: "15000",
    extra_payment: "5000",
  });

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const [calculated, setCalculated] = useState(false);

  const baseResult = useMemo(() => {
    if (!calculated) return null;
    return calculatePayoff(
      Number(form.total_debt),
      Number(form.interest_rate),
      Number(form.monthly_emi)
    );
  }, [calculated, form.total_debt, form.interest_rate, form.monthly_emi]);

  const extraResult = useMemo(() => {
    if (!calculated) return null;
    const extra = Number(form.extra_payment);
    if (extra <= 0) return null;
    return calculatePayoff(
      Number(form.total_debt),
      Number(form.interest_rate),
      Number(form.monthly_emi) + extra
    );
  }, [calculated, form.total_debt, form.interest_rate, form.monthly_emi, form.extra_payment]);

  const handleCalculate = () => {
    setCalculated(false);
    // Force re-render with new values
    setTimeout(() => setCalculated(true), 0);
  };

  const monthsSaved = baseResult && extraResult ? baseResult.months - extraResult.months : 0;
  const interestSaved =
    baseResult && extraResult ? baseResult.total_interest - extraResult.total_interest : 0;

  // Build chart data: sample every N months to keep chart readable
  const chartData = useMemo(() => {
    if (!baseResult) return [];
    const step = Math.max(1, Math.floor(baseResult.months / 60));
    const data: {
      month: number;
      basePrincipal: number;
      baseInterest: number;
      extraPrincipal?: number;
      extraInterest?: number;
    }[] = [];

    let basePrincipalCum = 0;
    let baseInterestCum = 0;
    let extraPrincipalCum = 0;
    let extraInterestCum = 0;

    const maxMonth = Math.max(
      baseResult.months,
      extraResult?.months || 0
    );

    for (let i = 0; i < maxMonth; i++) {
      if (i < baseResult.amortization.length) {
        basePrincipalCum += baseResult.amortization[i].principal;
        baseInterestCum += baseResult.amortization[i].interest;
      }
      if (extraResult && i < extraResult.amortization.length) {
        extraPrincipalCum += extraResult.amortization[i].principal;
        extraInterestCum += extraResult.amortization[i].interest;
      }

      if ((i + 1) % step === 0 || i === maxMonth - 1) {
        data.push({
          month: i + 1,
          basePrincipal: Math.round(basePrincipalCum),
          baseInterest: Math.round(baseInterestCum),
          ...(extraResult
            ? {
                extraPrincipal: Math.round(extraPrincipalCum),
                extraInterest: Math.round(extraInterestCum),
              }
            : {}),
        });
      }
    }
    return data;
  }, [baseResult, extraResult]);

  const paymentTooLow = calculated && !baseResult;

  return (
    <AppShell>
      <div className="flex-1 max-w-6xl mx-auto w-full px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Debt Payoff Calculator
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Plan your debt repayment and see how extra payments accelerate payoff
          </p>
        </div>

        <Card title="Debt Details">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <Input
              label="Total Debt (INR)"
              type="number"
              value={form.total_debt}
              onChange={(e) => updateField("total_debt", e.target.value)}
              placeholder="500000"
            />
            <Input
              label="Annual Interest Rate (%)"
              type="number"
              value={form.interest_rate}
              onChange={(e) => updateField("interest_rate", e.target.value)}
              placeholder="12"
            />
            <Input
              label="Monthly EMI (INR)"
              type="number"
              value={form.monthly_emi}
              onChange={(e) => updateField("monthly_emi", e.target.value)}
              placeholder="15000"
            />
            <Input
              label="Extra Monthly Payment (INR)"
              type="number"
              value={form.extra_payment}
              onChange={(e) => updateField("extra_payment", e.target.value)}
              placeholder="5000"
            />
          </div>
          <Button onClick={handleCalculate}>Calculate Payoff</Button>
          {paymentTooLow && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-2" role="alert">
              Monthly payment is too low to cover interest. Please increase the EMI.
            </p>
          )}
        </Card>

        {baseResult && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Time to Payoff
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                  {Math.floor(baseResult.months / 12)}y {baseResult.months % 12}m
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {baseResult.months} months total
                </p>
              </Card>
              <Card>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Total Interest
                </p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                  {fmt(baseResult.total_interest)}
                </p>
              </Card>
              {extraResult && (
                <>
                  <Card>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Months Saved
                    </p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                      {monthsSaved} months
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      with {fmt(Number(form.extra_payment))}/mo extra
                    </p>
                  </Card>
                  <Card>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Interest Saved
                    </p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                      {fmt(interestSaved)}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      total savings with extra payments
                    </p>
                  </Card>
                </>
              )}
            </div>

            {/* Comparison Table */}
            {extraResult && (
              <Card title="Comparison: With vs Without Extra Payments">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">
                          Metric
                        </th>
                        <th className="text-right py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">
                          Without Extra
                        </th>
                        <th className="text-right py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">
                          With Extra
                        </th>
                        <th className="text-right py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">
                          Difference
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-100 dark:border-gray-700/50">
                        <td className="py-2 px-3 text-gray-700 dark:text-gray-300">Monthly Payment</td>
                        <td className="py-2 px-3 text-right text-gray-900 dark:text-gray-100">
                          {fmt(Number(form.monthly_emi))}
                        </td>
                        <td className="py-2 px-3 text-right text-gray-900 dark:text-gray-100">
                          {fmt(Number(form.monthly_emi) + Number(form.extra_payment))}
                        </td>
                        <td className="py-2 px-3 text-right text-orange-600 dark:text-orange-400">
                          +{fmt(Number(form.extra_payment))}
                        </td>
                      </tr>
                      <tr className="border-b border-gray-100 dark:border-gray-700/50">
                        <td className="py-2 px-3 text-gray-700 dark:text-gray-300">Months to Payoff</td>
                        <td className="py-2 px-3 text-right text-gray-900 dark:text-gray-100">
                          {baseResult.months}
                        </td>
                        <td className="py-2 px-3 text-right text-gray-900 dark:text-gray-100">
                          {extraResult.months}
                        </td>
                        <td className="py-2 px-3 text-right text-green-600 dark:text-green-400">
                          -{monthsSaved}
                        </td>
                      </tr>
                      <tr className="border-b border-gray-100 dark:border-gray-700/50">
                        <td className="py-2 px-3 text-gray-700 dark:text-gray-300">Total Interest</td>
                        <td className="py-2 px-3 text-right text-gray-900 dark:text-gray-100">
                          {fmt(baseResult.total_interest)}
                        </td>
                        <td className="py-2 px-3 text-right text-gray-900 dark:text-gray-100">
                          {fmt(extraResult.total_interest)}
                        </td>
                        <td className="py-2 px-3 text-right text-green-600 dark:text-green-400">
                          -{fmt(interestSaved)}
                        </td>
                      </tr>
                      <tr className="bg-gray-50 dark:bg-gray-700/30">
                        <td className="py-2 px-3 font-semibold text-gray-900 dark:text-gray-100">
                          Total Paid
                        </td>
                        <td className="py-2 px-3 text-right font-semibold text-gray-900 dark:text-gray-100">
                          {fmt(baseResult.total_paid)}
                        </td>
                        <td className="py-2 px-3 text-right font-semibold text-gray-900 dark:text-gray-100">
                          {fmt(extraResult.total_paid)}
                        </td>
                        <td className="py-2 px-3 text-right font-semibold text-green-600 dark:text-green-400">
                          -{fmt(baseResult.total_paid - extraResult.total_paid)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* Amortization Chart */}
            {chartData.length > 0 && (
              <Card title="Amortization Timeline">
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
                    <defs>
                      <linearGradient id="gradBasePrincipal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id="gradBaseInterest" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12 }}
                      className="text-gray-500 dark:text-gray-400"
                      label={{ value: "Month", position: "insideBottom", offset: -5 }}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickFormatter={(v: number) =>
                        v >= 100000
                          ? `${(v / 100000).toFixed(0)}L`
                          : v >= 1000
                          ? `${(v / 1000).toFixed(0)}K`
                          : `${v}`
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
                          basePrincipal: "Principal Paid (Base)",
                          baseInterest: "Interest Paid (Base)",
                          extraPrincipal: "Principal Paid (Extra)",
                          extraInterest: "Interest Paid (Extra)",
                        };
                        return [fmt(value), labels[name] || name];
                      }}
                      labelFormatter={(label: number) => `Month ${label}`}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="basePrincipal"
                      name="Principal (Base)"
                      stroke="#3b82f6"
                      fill="url(#gradBasePrincipal)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="baseInterest"
                      name="Interest (Base)"
                      stroke="#ef4444"
                      fill="url(#gradBaseInterest)"
                      strokeWidth={2}
                    />
                    {extraResult && (
                      <>
                        <Area
                          type="monotone"
                          dataKey="extraPrincipal"
                          name="Principal (Extra)"
                          stroke="#22c55e"
                          fill="none"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                        />
                        <Area
                          type="monotone"
                          dataKey="extraInterest"
                          name="Interest (Extra)"
                          stroke="#f97316"
                          fill="none"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                        />
                      </>
                    )}
                  </AreaChart>
                </ResponsiveContainer>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-center">
                  Cumulative principal and interest paid over time.
                  {extraResult && " Dashed lines show the accelerated payoff with extra payments."}
                </p>
              </Card>
            )}

            {/* Balance Over Time */}
            <Card title="Remaining Balance Over Time">
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white dark:bg-gray-800">
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">
                        Month
                      </th>
                      <th className="text-right py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">
                        Payment
                      </th>
                      <th className="text-right py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">
                        Principal
                      </th>
                      <th className="text-right py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">
                        Interest
                      </th>
                      <th className="text-right py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">
                        Balance
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {baseResult.amortization
                      .filter((_, i) => {
                        // Show first 12, then every 6th, then last 6
                        if (i < 12) return true;
                        if (i >= baseResult.amortization.length - 6) return true;
                        return i % 6 === 0;
                      })
                      .map((row) => (
                        <tr
                          key={row.month}
                          className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                        >
                          <td className="py-1.5 px-3 text-gray-700 dark:text-gray-300">
                            {row.month}
                          </td>
                          <td className="py-1.5 px-3 text-right text-gray-700 dark:text-gray-300">
                            {fmt(row.payment)}
                          </td>
                          <td className="py-1.5 px-3 text-right text-blue-600 dark:text-blue-400">
                            {fmt(row.principal)}
                          </td>
                          <td className="py-1.5 px-3 text-right text-red-600 dark:text-red-400">
                            {fmt(row.interest)}
                          </td>
                          <td className="py-1.5 px-3 text-right font-medium text-gray-900 dark:text-gray-100">
                            {fmt(row.balance)}
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
    </AppShell>
  );
}
