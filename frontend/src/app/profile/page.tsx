"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { FinancialProfile } from "@/types";
import AppShell from "@/components/layout/AppShell";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { LIFE_STAGES } from "@/lib/constants";

const EXPERIENCE_OPTIONS = [
  { value: "none", label: "No experience" },
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

const TOLERANCE_OPTIONS = [
  { value: "low", label: "Low - Sell on dips" },
  { value: "moderate", label: "Moderate - Hold and wait" },
  { value: "high", label: "High - Buy more" },
];

export default function ProfilePage() {
  const [profile, setProfile] = useState<FinancialProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reassessing, setReassessing] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  useEffect(() => {
    api<FinancialProfile>("/api/v1/profile/")
      .then(setProfile)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  const updateField = (field: string, value: string | number) => {
    if (!profile) return;
    setProfile({ ...profile, [field]: value });
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    setMessage("");
    try {
      const updated = await api<FinancialProfile>("/api/v1/profile/", {
        method: "PUT",
        body: JSON.stringify({
          monthly_income: profile.monthly_income,
          monthly_expenses: profile.monthly_expenses,
          monthly_savings: profile.monthly_savings,
          total_liabilities: profile.total_liabilities,
          emergency_fund_months: profile.emergency_fund_months,
          life_stage: profile.life_stage,
          dependents_count: profile.dependents_count,
          investment_horizon_years: profile.investment_horizon_years,
          investment_experience: profile.investment_experience,
          loss_tolerance: profile.loss_tolerance,
        }),
      });
      setProfile(updated);
      setMessage("Profile saved successfully");
    } catch {
      setMessage("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleReassess = async () => {
    setReassessing(true);
    setMessage("");
    try {
      await handleSave();
      await api("/api/v1/risk/assess", { method: "POST" });
      await api("/api/v1/portfolio/generate", { method: "POST" });
      router.push("/dashboard");
    } catch {
      setMessage("Re-assessment failed");
    } finally {
      setReassessing(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-8" role="main" aria-label="Loading profile">
          <div className="space-y-6">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </div>
      </AppShell>
    );
  }

  if (!profile) {
    return (
      <AppShell>
        <div className="flex-1 flex flex-col items-center justify-center gap-4" role="main">
          <p className="text-gray-500 dark:text-gray-400">No financial profile found.</p>
          <Button onClick={() => router.push("/questionnaire")}>Complete Questionnaire</Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
        <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-8" role="main" aria-label="Financial profile">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Financial Profile</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8">Review and update your financial information</p>

          {message && (
            <div className={`rounded-lg px-4 py-3 text-sm mb-6 ${
              message.includes("success") ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400" : "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400"
            }`} role="alert">
              {message}
            </div>
          )}

          <div className="space-y-6">
            <Card title="Income & Expenses">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Monthly Income"
                  type="number"
                  value={profile.monthly_income}
                  onChange={(e) => updateField("monthly_income", Number(e.target.value))}
                />
                <Input
                  label="Monthly Expenses"
                  type="number"
                  value={profile.monthly_expenses}
                  onChange={(e) => updateField("monthly_expenses", Number(e.target.value))}
                />
                <Input
                  label="Monthly Savings"
                  type="number"
                  value={profile.monthly_savings}
                  onChange={(e) => updateField("monthly_savings", Number(e.target.value))}
                />
              </div>
            </Card>

            <Card title="Liabilities & Emergency Fund">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Total Liabilities"
                  type="number"
                  value={profile.total_liabilities}
                  onChange={(e) => updateField("total_liabilities", Number(e.target.value))}
                />
                <Input
                  label="Emergency Fund (months)"
                  type="number"
                  value={profile.emergency_fund_months}
                  onChange={(e) => updateField("emergency_fund_months", Number(e.target.value))}
                />
              </div>
            </Card>

            <Card title="Personal & Investment Details">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Life Stage"
                  options={LIFE_STAGES}
                  value={profile.life_stage}
                  onChange={(e) => updateField("life_stage", e.target.value)}
                />
                <Input
                  label="Dependents"
                  type="number"
                  value={profile.dependents_count}
                  onChange={(e) => updateField("dependents_count", Number(e.target.value))}
                />
                <Input
                  label="Investment Horizon (years)"
                  type="number"
                  value={profile.investment_horizon_years}
                  onChange={(e) => updateField("investment_horizon_years", Number(e.target.value))}
                />
                <Select
                  label="Investment Experience"
                  options={EXPERIENCE_OPTIONS}
                  value={profile.investment_experience}
                  onChange={(e) => updateField("investment_experience", e.target.value)}
                />
                <Select
                  label="Loss Tolerance"
                  options={TOLERANCE_OPTIONS}
                  value={profile.loss_tolerance}
                  onChange={(e) => updateField("loss_tolerance", e.target.value)}
                />
              </div>
            </Card>

            <div className="flex gap-4">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
              <Button variant="secondary" onClick={handleReassess} disabled={reassessing}>
                {reassessing ? "Re-assessing..." : "Save & Re-assess Risk"}
              </Button>
            </div>
          </div>
        </div>
    </AppShell>
  );
}
