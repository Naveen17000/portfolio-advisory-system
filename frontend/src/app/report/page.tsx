"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import AppShell from "@/components/layout/AppShell";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

const REPORT_SECTIONS = [
  {
    title: "Risk Assessment Summary",
    description:
      "Your overall risk score, category, and detailed sub-score breakdown.",
  },
  {
    title: "Portfolio Allocation",
    description:
      "Recommended asset allocation based on your risk profile with expected return ranges.",
  },
  {
    title: "Score Explanation (SHAP)",
    description:
      "AI-powered explanation of which factors most influenced your risk score.",
  },
  {
    title: "Monte Carlo Simulation",
    description:
      "Projected portfolio outcomes across 1,000 simulated market scenarios.",
  },
  {
    title: "Goal Progress",
    description:
      "Status of your financial goals with probability of achievement.",
  },
  {
    title: "Rebalancing Recommendations",
    description:
      "Current vs target allocation drift analysis with action items.",
  },
];

export default function ReportPage() {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  const handleDownload = async () => {
    setDownloading(true);
    setError("");
    try {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("access_token")
          : null;
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      const res = await fetch(`${API_URL}/api/v1/report/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Download failed" }));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }

      const contentType = res.headers.get("content-type") || "";
      const blob = await res.blob();

      if (contentType.includes("text/html")) {
        // Open HTML report in new tab
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      } else {
        // Download as file
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "portfolio-report.html";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to download report");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <AppShell>
      <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Portfolio Report
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          Download a comprehensive HTML report of your portfolio analysis.
        </p>

        {/* Download Card */}
        <Card className="mb-6">
          <div className="text-center py-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-4">
              <svg
                className="w-8 h-8 text-blue-600 dark:text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Generate Full Report
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
              Your personalized portfolio report will be generated as an HTML
              document with charts, tables, and actionable recommendations.
            </p>
            <Button onClick={handleDownload} disabled={downloading} size="lg">
              {downloading ? "Generating Report..." : "Download Report"}
            </Button>
            {error && (
              <p
                className="text-sm text-red-600 dark:text-red-400 mt-3"
                role="alert"
              >
                {error}
              </p>
            )}
          </div>
        </Card>

        {/* Report Contents */}
        <Card title="What's Included">
          <div className="space-y-4">
            {REPORT_SECTIONS.map((section, idx) => (
              <div
                key={section.title}
                className="flex gap-4 items-start py-3 border-b border-gray-100 dark:border-gray-700 last:border-0"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    {idx + 1}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {section.title}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {section.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-6">
          Reports are generated based on your latest risk assessment and
          portfolio data.
        </p>
      </div>
    </AppShell>
  );
}
