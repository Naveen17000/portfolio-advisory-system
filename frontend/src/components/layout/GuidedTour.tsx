"use client";

import { useState, useEffect, useCallback } from "react";

interface TourStep {
  selector: string;
  title: string;
  description: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    selector: '[href="/dashboard"]',
    title: "Dashboard",
    description:
      "Your financial overview at a glance — risk score, portfolio allocation, health grade, and actionable nudges.",
  },
  {
    selector: '[href="/nudges"]',
    title: "Health Check",
    description:
      "Get personalized financial health nudges based on your spending, savings, and emergency fund status.",
  },
  {
    selector: '[href="/chat"]',
    title: "AI Advisor",
    description:
      "Chat with our AI-powered financial advisor. Ask about investments, tax planning, or your risk profile.",
  },
  {
    selector: '[href="/risk"]',
    title: "Risk Profile",
    description:
      "View your detailed risk assessment score based on income, expenses, liabilities, and investment horizon.",
  },
  {
    selector: '[href="/portfolio"]',
    title: "Portfolio",
    description:
      "See your recommended asset allocation — equity, debt, gold, and liquid funds tailored to your risk level.",
  },
  {
    selector: '[href="/invest"]',
    title: "Invest",
    description:
      "Get personalized investment recommendations with monthly SIP amounts, fund suggestions, and an action plan based on your risk profile.",
  },
  {
    selector: '[href="/stress-test"]',
    title: "Stress Test",
    description:
      "Simulate how your portfolio would perform under historical crises like the 2008 crash or COVID-19.",
  },
  {
    selector: '[href="/simulation"]',
    title: "Monte Carlo Simulation",
    description:
      "Run thousands of market simulations to see the range of possible outcomes for your investments.",
  },
  {
    selector: '[href="/goals"]',
    title: "Goal Planner",
    description:
      "Set financial goals (retirement, education, home) and track your progress with monthly SIP calculations.",
  },
  {
    selector: '[href="/tax"]',
    title: "Tax Planner",
    description:
      "Optimize your tax savings under sections 80C, 80D, and 80CCD with personalized recommendations.",
  },
  {
    selector: '[href="/sentiment"]',
    title: "Market Sentiment",
    description:
      "Track real-time market sentiment indicators — fear/greed index, volatility, and market trends.",
  },
  {
    selector: '[href="/spending"]',
    title: "Spending Tracker",
    description:
      "Analyze your spending patterns by category. Upload bank statements to auto-categorize expenses.",
  },
  {
    selector: '[href="/profile"]',
    title: "Profile",
    description:
      "Update your financial profile — income, expenses, dependents, and investment preferences.",
  },
];

const STORAGE_KEY = "portfolio_tour_completed";
const TOOLTIP_HEIGHT = 220; // approximate tooltip height in px
const TOOLTIP_WIDTH = 320;
const GAP = 14;

export default function GuidedTour() {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [pos, setPos] = useState<{ top: number; left: number; arrowTop: number } | null>(null);

  // Show tour for new users
  useEffect(() => {
    const completed = localStorage.getItem(STORAGE_KEY);
    if (!completed) {
      const timer = setTimeout(() => setActive(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const positionTooltip = useCallback(() => {
    if (!active) return;
    const currentStep = TOUR_STEPS[step];
    const el = document.querySelector(currentStep.selector) as HTMLElement | null;
    if (!el) return;

    // Scroll the sidebar nav item into view
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });

    // Wait a tick for scroll to settle, then position
    requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;

      // Highlight
      document.querySelectorAll(".tour-highlight").forEach((e) =>
        e.classList.remove("tour-highlight")
      );
      el.classList.add("tour-highlight");

      // Calculate ideal top: vertically center tooltip on the element
      const elCenter = rect.top + rect.height / 2;
      let tooltipTop = elCenter - TOOLTIP_HEIGHT / 2;

      // Clamp to viewport with 12px padding
      const minTop = 12;
      const maxTop = vh - TOOLTIP_HEIGHT - 12;
      tooltipTop = Math.max(minTop, Math.min(maxTop, tooltipTop));

      // Arrow should point at the element center
      const arrowTop = Math.max(16, Math.min(TOOLTIP_HEIGHT - 30, elCenter - tooltipTop));

      // Left position: to the right of the sidebar element
      let left = rect.right + GAP;
      // If tooltip would overflow the right edge, position to the left of the element
      if (left + TOOLTIP_WIDTH > window.innerWidth - 12) {
        left = rect.left - TOOLTIP_WIDTH - GAP;
      }

      setPos({ top: tooltipTop, left, arrowTop });
    });
  }, [active, step]);

  useEffect(() => {
    positionTooltip();
    window.addEventListener("resize", positionTooltip);
    return () => {
      window.removeEventListener("resize", positionTooltip);
      document.querySelectorAll(".tour-highlight").forEach((el) => {
        el.classList.remove("tour-highlight");
      });
    };
  }, [positionTooltip]);

  const next = () => {
    if (step < TOUR_STEPS.length - 1) {
      setStep(step + 1);
    } else {
      finish();
    }
  };

  const prev = () => {
    if (step > 0) setStep(step - 1);
  };

  const finish = () => {
    document.querySelectorAll(".tour-highlight").forEach((el) => {
      el.classList.remove("tour-highlight");
    });
    setActive(false);
    localStorage.setItem(STORAGE_KEY, "true");
  };

  if (!active || !pos) return null;

  const currentStep = TOUR_STEPS[step];

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-50 bg-black/40" onClick={finish} />

      {/* Tooltip */}
      <div
        className="fixed z-[60]"
        style={{ top: pos.top, left: pos.left, width: TOOLTIP_WIDTH }}
      >
        {/* Arrow pointing at sidebar item */}
        <div
          className="absolute w-3 h-3 bg-white dark:bg-gray-800 border-l border-b border-gray-200 dark:border-gray-700 rotate-45"
          style={{ top: pos.arrowTop, left: -6 }}
        />

        {/* Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
              {step + 1} / {TOUR_STEPS.length}
            </span>
            <button
              onClick={finish}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xs"
              aria-label="Close tour"
            >
              Skip tour
            </button>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1 bg-gray-100 dark:bg-gray-700 rounded-full mb-3">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${((step + 1) / TOUR_STEPS.length) * 100}%` }}
            />
          </div>

          {/* Content */}
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
            {currentStep.title}
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
            {currentStep.description}
          </p>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-3">
            <button
              onClick={prev}
              disabled={step === 0}
              className="px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Back
            </button>
            <button
              onClick={next}
              className="px-4 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              {step === TOUR_STEPS.length - 1 ? "Finish" : "Next"}
            </button>
          </div>
        </div>
      </div>

      {/* Highlight styles */}
      <style jsx global>{`
        .tour-highlight {
          position: relative;
          z-index: 55 !important;
          background-color: rgba(59, 130, 246, 0.1) !important;
          border-radius: 8px;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3);
        }
      `}</style>
    </>
  );
}
