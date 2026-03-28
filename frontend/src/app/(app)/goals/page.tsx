"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import FanChart from "@/components/simulation/FanChart";

interface GoalTemplate {
  id: string;
  label: string;
  description: string;
  default_horizon: number;
  priority: string;
  risk_preference: string;
}

interface GoalResult {
  goal: {
    label: string;
    target_amount: number;
    current_savings: number;
    remaining: number;
    horizon_years: number;
  };
  recommendation: {
    risk_preference: string;
    allocation: Record<string, number>;
    expected_annual_return: number;
    required_monthly_sip: number;
    probability_of_success: number;
  };
  simulation: {
    yearly_data: { year: number; p5: number; p25: number; p50: number; p75: number; p95: number }[];
    scenarios: Record<string, number>;
  };
  sip_scenarios: {
    label: string;
    monthly_sip: number;
    expected_final: number;
    prob_reaching_target: number;
  }[];
}

function fmt(n: number): string {
  if (n >= 10000000) return `${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `${(n / 100000).toFixed(2)} L`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)} K`;
  return n.toFixed(0);
}

export default function GoalsPage() {
  const [templates, setTemplates] = useState<GoalTemplate[]>([]);
  const [form, setForm] = useState({
    goal_type: "",
    target_amount: "",
    current_savings: "0",
    years: "",
    risk_preference: "",
  });
  const [result, setResult] = useState<GoalResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api<GoalTemplate[]>("/api/v1/goals/templates").then(setTemplates).catch(() => {});
  }, []);

  const selectedTemplate = templates.find((t) => t.id === form.goal_type);

  const handleAnalyze = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api<GoalResult>("/api/v1/goals/analyze", {
        method: "POST",
        body: JSON.stringify({
          goal_type: form.goal_type,
          target_amount: Number(form.target_amount),
          current_savings: Number(form.current_savings),
          years: form.years ? Number(form.years) : null,
          risk_preference: form.risk_preference || null,
        }),
      });
      setResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
        <div className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8" role="main" aria-label="Goal-based planning">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Goal-Based Planning</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8">Define your financial goals and get a personalized investment strategy</p>

          <Card title="Define Your Goal">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <Select
                label="Goal Type"
                options={templates.map((t) => ({ value: t.id, label: t.label }))}
                value={form.goal_type}
                onChange={(e) => {
                  const tmpl = templates.find((t) => t.id === e.target.value);
                  setForm((f) => ({
                    ...f,
                    goal_type: e.target.value,
                    years: tmpl ? String(tmpl.default_horizon) : f.years,
                    risk_preference: tmpl ? tmpl.risk_preference : f.risk_preference,
                  }));
                }}
              />
              <Input
                label="Target Amount"
                type="number"
                value={form.target_amount}
                onChange={(e) => setForm((f) => ({ ...f, target_amount: e.target.value }))}
                placeholder="e.g. 1000000"
              />
              <Input
                label="Current Savings Toward This Goal"
                type="number"
                value={form.current_savings}
                onChange={(e) => setForm((f) => ({ ...f, current_savings: e.target.value }))}
              />
              <Input
                label="Time Horizon (years)"
                type="number"
                value={form.years}
                onChange={(e) => setForm((f) => ({ ...f, years: e.target.value }))}
              />
              <Select
                label="Risk Preference"
                options={[
                  { value: "conservative", label: "Conservative" },
                  { value: "moderate", label: "Moderate" },
                  { value: "aggressive", label: "Aggressive" },
                ]}
                value={form.risk_preference}
                onChange={(e) => setForm((f) => ({ ...f, risk_preference: e.target.value }))}
              />
            </div>
            {selectedTemplate && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{selectedTemplate.description}</p>
            )}
            <Button onClick={handleAnalyze} disabled={loading || !form.goal_type || !form.target_amount}>
              {loading ? "Analyzing..." : "Analyze Goal"}
            </Button>
            {error && <p className="text-sm text-red-600 dark:text-red-400 mt-2" role="alert">{error}</p>}
          </Card>

          {result && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6" aria-label="Goal analysis summary">
                <Card>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Required Monthly SIP</p>
                  <p className="text-xl font-bold text-blue-700 dark:text-blue-400">{fmt(result.recommendation.required_monthly_sip)}</p>
                </Card>
                <Card>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Target Amount</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{fmt(result.goal.target_amount)}</p>
                </Card>
                <Card>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Success Probability</p>
                  <p className="text-xl font-bold text-green-700 dark:text-green-400">{result.recommendation.probability_of_success}%</p>
                </Card>
                <Card>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Expected Return</p>
                  <p className="text-xl font-bold text-purple-700 dark:text-purple-400">{result.recommendation.expected_annual_return}%</p>
                </Card>
              </div>

              <Card title="Projected Growth" className="mt-6">
                <FanChart yearlyData={result.simulation.yearly_data} />
              </Card>

              <Card title="SIP Scenarios" className="mt-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" aria-label="SIP scenario comparison">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-3 px-2 font-medium text-gray-500 dark:text-gray-400">Plan</th>
                        <th className="text-right py-3 px-2 font-medium text-gray-500 dark:text-gray-400">Monthly SIP</th>
                        <th className="text-right py-3 px-2 font-medium text-gray-500 dark:text-gray-400">Expected Final Value</th>
                        <th className="text-right py-3 px-2 font-medium text-gray-500 dark:text-gray-400">Success Probability</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.sip_scenarios.map((s) => (
                        <tr key={s.label} className={`border-b border-gray-100 dark:border-gray-700 ${s.label === "Recommended" ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}>
                          <td className="py-3 px-2 font-medium text-gray-900 dark:text-gray-100">{s.label}</td>
                          <td className="text-right py-3 px-2 text-gray-700 dark:text-gray-300">{fmt(s.monthly_sip)}</td>
                          <td className="text-right py-3 px-2 text-gray-700 dark:text-gray-300">{fmt(s.expected_final)}</td>
                          <td className="text-right py-3 px-2">
                            <span className={`font-medium ${s.prob_reaching_target >= 70 ? "text-green-600 dark:text-green-400" : s.prob_reaching_target >= 40 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"}`}>
                              {s.prob_reaching_target}%
                            </span>
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
