"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { CardSkeleton } from "@/components/ui/Skeleton";
import Tip from "@/components/ui/Tooltip";

interface TaxSlab {
  slab: string;
  rate: string;
  taxable_amount: number;
  tax: number;
}

interface TaxInstrument {
  name: string;
  section: string;
  lock_in: string;
  expected_return: string;
  risk: string;
  liquidity: string;
}

interface TaxResult {
  annual_income: number;
  standard_deduction: number;
  section_80c_used: number;
  section_80c_remaining: number;
  section_80d_used: number;
  nps_80ccd_used: number;
  taxable_income: number;
  tax_before_cess: number;
  cess_4pct: number;
  total_tax: number;
  effective_rate_pct: number;
  slab_breakdown: TaxSlab[];
  tax_saving_instruments: TaxInstrument[];
  potential_savings: number;
}

function fmt(n: number): string {
  if (Math.abs(n) >= 10000000) return `\u20B9${(n / 10000000).toFixed(2)} Cr`;
  if (Math.abs(n) >= 100000) return `\u20B9${(n / 100000).toFixed(2)} L`;
  if (Math.abs(n) >= 1000) return `\u20B9${(n / 1000).toFixed(1)} K`;
  return `\u20B9${n.toFixed(0)}`;
}

export default function TaxPage() {
  const [form, setForm] = useState({
    annual_income: "1200000",
    deductions_80c: "100000",
    deductions_80d: "25000",
    nps: "50000",
  });
  const [result, setResult] = useState<TaxResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCalculate = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api<TaxResult>("/api/v1/tax/calculate", {
        method: "POST",
        body: JSON.stringify({
          annual_income: Number(form.annual_income),
          deductions_80c: Number(form.deductions_80c),
          deductions_80d: Number(form.deductions_80d),
          nps: Number(form.nps),
        }),
      });
      setResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Tax calculation failed");
    } finally {
      setLoading(false);
    }
  };

  const used80C = result ? result.section_80c_used : 0;
  const limit80C = 150000;
  const utilization80C = Math.min((used80C / limit80C) * 100, 100);
  const totalDeductions = result ? result.section_80c_used + result.section_80d_used + result.nps_80ccd_used + result.standard_deduction : 0;

  return (
    <>
      <div className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Tax Planning</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Calculate your tax liability and discover savings opportunities
          </p>
        </div>

        <Card title="Income & Deductions">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <Input
              label="Annual Income (INR)"
              type="number"
              value={form.annual_income}
              onChange={(e) => updateField("annual_income", e.target.value)}
              placeholder="1200000"
            />
            <Input
              label={<><Tip term="80C">Section 80C</Tip> Deductions</>}
              type="number"
              value={form.deductions_80c}
              onChange={(e) => updateField("deductions_80c", e.target.value)}
              placeholder="150000"
            />
            <Input
              label={<><Tip term="80D">Section 80D (Health Insurance)</Tip></>}
              type="number"
              value={form.deductions_80d}
              onChange={(e) => updateField("deductions_80d", e.target.value)}
              placeholder="25000"
            />
            <Input
              label={<><Tip term="NPS">NPS Contribution (80CCD)</Tip></>}
              type="number"
              value={form.nps}
              onChange={(e) => updateField("nps", e.target.value)}
              placeholder="50000"
            />
          </div>
          <Button onClick={handleCalculate} disabled={loading}>
            {loading ? "Calculating..." : "Calculate Tax"}
          </Button>
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-2" role="alert">
              {error}
            </p>
          )}
        </Card>

        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        )}

        {result && !loading && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <Card>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Total Tax
                </p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                  {fmt(result.total_tax)}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  incl. {fmt(result.cess_4pct)} cess
                </p>
              </Card>
              <Card>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Effective Rate
                </p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                  {result.effective_rate_pct.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  on {fmt(result.annual_income)}
                </p>
              </Card>
              <Card>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  <Tip term="80C">80C Utilized</Tip>
                </p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                  {fmt(used80C)}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  of {fmt(limit80C)} limit
                </p>
              </Card>
              <Card>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Total Deductions
                </p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                  {fmt(totalDeductions)}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  80C + 80D + NPS
                </p>
              </Card>
            </div>

            {/* 80C Utilization Progress Bar */}
            <Card title="Section 80C Utilization">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">
                    Used: {fmt(used80C)}
                  </span>
                  <span className="text-gray-600 dark:text-gray-300">
                    Remaining: {fmt(Math.max(limit80C - used80C, 0))}
                  </span>
                </div>
                <div className="w-full h-5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      utilization80C >= 100
                        ? "bg-green-500"
                        : utilization80C >= 60
                        ? "bg-blue-500"
                        : "bg-orange-500"
                    }`}
                    style={{ width: `${utilization80C}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500">
                  <span>0</span>
                  <span>{utilization80C.toFixed(0)}% utilized</span>
                  <span>{fmt(limit80C)}</span>
                </div>
              </div>
            </Card>

            {/* Tax Slab Breakdown */}
            <Card title="Tax Slab Breakdown">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">
                        Income Range
                      </th>
                      <th className="text-right py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">
                        Rate
                      </th>
                      <th className="text-right py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">
                        Tax
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.slab_breakdown.map((slab, i) => (
                      <tr
                        key={i}
                        className="border-b border-gray-100 dark:border-gray-700/50"
                      >
                        <td className="py-2 px-3 text-gray-700 dark:text-gray-300">
                          {slab.slab}
                        </td>
                        <td className="py-2 px-3 text-right text-gray-700 dark:text-gray-300">
                          {slab.rate}
                        </td>
                        <td className="py-2 px-3 text-right font-medium text-gray-900 dark:text-gray-100">
                          {fmt(slab.tax)}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50 dark:bg-gray-700/30 font-semibold">
                      <td className="py-2 px-3 text-gray-900 dark:text-gray-100">Total</td>
                      <td className="py-2 px-3" />
                      <td className="py-2 px-3 text-right text-gray-900 dark:text-gray-100">
                        {fmt(result.total_tax)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Tax Saving Instruments */}
            {result.tax_saving_instruments && result.tax_saving_instruments.length > 0 && (
              <Card title="Tax-Saving Instruments">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">
                          Instrument
                        </th>
                        <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">
                          Section
                        </th>
                        <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">
                          Lock-in
                        </th>
                        <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">
                          Expected Return
                        </th>
                        <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium hidden sm:table-cell">
                          Risk
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.tax_saving_instruments.map((inst, i) => (
                        <tr
                          key={i}
                          className="border-b border-gray-100 dark:border-gray-700/50"
                        >
                          <td className="py-2 px-3 font-medium text-gray-900 dark:text-gray-100">
                            {inst.name}
                          </td>
                          <td className="py-2 px-3">
                            <span className="inline-block px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full">
                              {inst.section}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-gray-700 dark:text-gray-300">
                            {inst.lock_in}
                          </td>
                          <td className="py-2 px-3 text-green-600 dark:text-green-400">
                            {inst.expected_return}
                          </td>
                          <td className="py-2 px-3 text-gray-500 dark:text-gray-400 hidden sm:table-cell">
                            {inst.risk}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </>
  );
}
