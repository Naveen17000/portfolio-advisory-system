"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { Question } from "@/types";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import ProgressBar from "@/components/ui/ProgressBar";
import { CardSkeleton } from "@/components/ui/Skeleton";

const STEP_INFO: Record<number, { title: string; description: string }> = {
  1: { title: "About You", description: "Tell us about your life stage and family situation." },
  2: { title: "Income & Expenses", description: "Help us understand your monthly cash flow." },
  3: { title: "Debt & Liabilities", description: "Do you have any outstanding loans or debt?" },
  4: { title: "Emergency Savings", description: "How prepared are you for unexpected expenses?" },
  5: { title: "Investment Background", description: "What's your experience with investing so far?" },
  6: { title: "Risk & Time Horizon", description: "How comfortable are you with market ups and downs?" },
};

export default function QuestionnairePage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [responses, setResponses] = useState<Record<string, string | string[]>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const totalSteps = 6;

  useEffect(() => {
    api<{ questions: Question[] }>("/api/v1/questionnaire/questions")
      .then((data) => setQuestions(data.questions))
      .catch(() => setError("Failed to load questionnaire"))
      .finally(() => setLoading(false));
  }, []);

  const stepQuestions = questions.filter((q) => q.step === currentStep);

  const isVisible = (q: Question) => {
    if (!q.show_if) return true;
    return Object.entries(q.show_if).every(([field, allowed]) => {
      const val = responses[field];
      return typeof val === "string" && allowed.split(",").includes(val);
    });
  };

  const setResponse = (id: string, value: string | string[]) => {
    setResponses((prev) => ({ ...prev, [id]: value }));
  };

  const toggleMulti = (id: string, value: string) => {
    setResponses((prev) => {
      const current = (prev[id] as string[]) || [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [id]: next };
    });
  };

  const canProceed = () => {
    return stepQuestions
      .filter((q) => q.required && isVisible(q))
      .every((q) => {
        const val = responses[q.id];
        if (Array.isArray(val)) return val.length > 0;
        return val !== undefined && val !== "";
      });
  };

  const handleNext = () => {
    if (currentStep < totalSteps) setCurrentStep((s) => s + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    try {
      await api("/api/v1/questionnaire/submit", {
        method: "POST",
        body: JSON.stringify({ responses }),
      });
      await api("/api/v1/risk/assess", { method: "POST" });
      await api("/api/v1/portfolio/generate", { method: "POST" });
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <>
        <div className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8" role="main" aria-label="Loading questionnaire">
          <div className="space-y-6">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
        <div className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8" role="main" aria-label="Financial profile questionnaire">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Financial Profile Questionnaire</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">Help us understand your financial situation to provide personalized advice.</p>

          <ProgressBar current={currentStep} total={totalSteps} />

          <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg px-4 py-3 text-sm mb-6" role="alert">{error}</div>
            )}

            {/* Step header */}
            {STEP_INFO[currentStep] && (
              <div className="mb-6 pb-4 border-b border-gray-100 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Step {currentStep}: {STEP_INFO[currentStep].title}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {STEP_INFO[currentStep].description}
                </p>
              </div>
            )}

            <div className="space-y-6">
              {stepQuestions.filter(isVisible).map((q) => (
                <div key={q.id}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{q.text}</label>
                  {q.hint && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-2 leading-relaxed">{q.hint}</p>
                  )}

                  {q.type === "number" && (
                    <Input
                      type="number"
                      value={(responses[q.id] as string) || ""}
                      onChange={(e) => setResponse(q.id, e.target.value)}
                      min={0}
                    />
                  )}

                  {q.type === "select" && (
                    <div className="space-y-2" role="radiogroup" aria-label={q.text}>
                      {q.options.map((opt) => {
                        const selected = (responses[q.id] as string) === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setResponse(q.id, opt.value)}
                            className={`w-full px-4 py-3 rounded-lg border text-sm text-left transition-colors ${
                              selected
                                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 ring-1 ring-blue-500"
                                : "border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                            }`}
                            role="radio"
                            aria-checked={selected}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {q.type === "multi_select" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="group" aria-label={q.text}>
                      {q.options.map((opt) => {
                        const selected = ((responses[q.id] as string[]) || []).includes(opt.value);
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => toggleMulti(q.id, opt.value)}
                            className={`px-4 py-3 rounded-lg border text-sm text-left transition-colors ${
                              selected
                                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 ring-1 ring-blue-500"
                                : "border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                            }`}
                            aria-pressed={selected}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-between mt-8">
              <Button variant="outline" onClick={handleBack} disabled={currentStep === 1}>
                Back
              </Button>

              {currentStep < totalSteps ? (
                <Button onClick={handleNext} disabled={!canProceed()}>
                  Next
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={submitting || !canProceed()}>
                  {submitting ? "Analyzing..." : "Submit & Get Results"}
                </Button>
              )}
            </div>
          </div>
        </div>
    </>
  );
}
