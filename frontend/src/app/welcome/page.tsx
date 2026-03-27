"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Step {
  icon: React.ReactNode;
  title: string;
  description: string;
  gradient: string;
}

const steps: Step[] = [
  {
    title: "Complete Your Profile",
    description:
      "Answer a few questions about your financial background, investment experience, and risk comfort level. This helps us tailor every recommendation to you.",
    gradient: "from-blue-500 to-cyan-400",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-16 w-16"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12h6m-3-3v6m-7.5 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15A2.25 2.25 0 002.25 6.75v10.5A2.25 2.25 0 004.5 19.5z"
        />
      </svg>
    ),
  },
  {
    title: "Get Risk Assessment",
    description:
      "Our AI analyses your profile using machine learning and SHAP explainability to produce a personalised risk score with transparent reasoning.",
    gradient: "from-purple-500 to-pink-400",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-16 w-16"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
        />
      </svg>
    ),
  },
  {
    title: "View Portfolio",
    description:
      "See your optimised asset allocation across equity, debt, gold, and alternatives with interactive charts and real-time valuations.",
    gradient: "from-emerald-500 to-teal-400",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-16 w-16"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z"
        />
      </svg>
    ),
  },
  {
    title: "Run Simulations",
    description:
      "Use Monte Carlo simulations to stress-test your portfolio across thousands of market scenarios and understand potential outcomes.",
    gradient: "from-orange-500 to-amber-400",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-16 w-16"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"
        />
      </svg>
    ),
  },
  {
    title: "Set Financial Goals",
    description:
      "Define goals like retirement, home purchase, or education fund. We'll map each goal to a strategy with projected timelines and milestones.",
    gradient: "from-rose-500 to-red-400",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-16 w-16"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z"
        />
        <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Track & Improve",
    description:
      "Monitor performance, receive rebalancing nudges, and continuously improve your strategy with AI-driven insights and market sentiment analysis.",
    gradient: "from-indigo-500 to-violet-400",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-16 w-16"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.841m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"
        />
      </svg>
    ),
  },
];

export default function WelcomePage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const [isAnimating, setIsAnimating] = useState(false);

  const isLastStep = currentStep === steps.length - 1;

  const goToStep = useCallback(
    (next: number, dir: "next" | "prev") => {
      if (isAnimating || next < 0 || next >= steps.length) return;
      setDirection(dir);
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(next);
        setIsAnimating(false);
      }, 300);
    },
    [isAnimating],
  );

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
      return;
    }
    goToStep(currentStep + 1, "next");
  };

  const handlePrev = () => {
    goToStep(currentStep - 1, "prev");
  };

  const handleComplete = () => {
    localStorage.setItem("onboarding_complete", "true");
    router.push("/dashboard");
  };

  const handleSkip = () => {
    handleComplete();
  };

  /* keyboard navigation */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, isAnimating]);

  const step = steps[currentStep];

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden bg-gray-50 dark:bg-slate-900 px-4 py-10"
      role="region"
      aria-label="Onboarding walkthrough"
    >
      {/* animated gradient background */}
      <div
        className={`absolute inset-0 opacity-20 dark:opacity-30 bg-gradient-to-br ${step.gradient} transition-all duration-700 ease-in-out`}
        aria-hidden="true"
      />

      {/* decorative circles */}
      <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-blue-500/10 dark:bg-blue-400/10 blur-3xl" aria-hidden="true" />
      <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-purple-500/10 dark:bg-purple-400/10 blur-3xl" aria-hidden="true" />

      {/* skip button */}
      {!isLastStep && (
        <button
          onClick={handleSkip}
          className="absolute top-6 right-6 z-20 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-md px-3 py-1"
          aria-label="Skip onboarding"
        >
          Skip
        </button>
      )}

      {/* step counter */}
      <p className="relative z-10 text-sm font-medium text-gray-500 dark:text-gray-400 mb-6">
        Step {currentStep + 1} of {steps.length}
      </p>

      {/* card */}
      <div
        className={`relative z-10 w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8 sm:p-10 flex flex-col items-center text-center transition-all duration-300 ease-in-out ${
          isAnimating
            ? direction === "next"
              ? "opacity-0 translate-x-8"
              : "opacity-0 -translate-x-8"
            : "opacity-100 translate-x-0"
        }`}
        role="group"
        aria-label={`Step ${currentStep + 1}: ${step.title}`}
      >
        {/* icon */}
        <div
          className={`mb-6 flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br ${step.gradient} text-white shadow-lg`}
          aria-hidden="true"
        >
          {step.icon}
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3">
          {step.title}
        </h1>

        <p className="text-gray-600 dark:text-gray-300 leading-relaxed max-w-md">
          {step.description}
        </p>
      </div>

      {/* progress dots */}
      <nav className="relative z-10 flex gap-2 mt-8" aria-label="Onboarding progress">
        {steps.map((_, idx) => (
          <button
            key={idx}
            onClick={() => goToStep(idx, idx > currentStep ? "next" : "prev")}
            className={`h-2.5 rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              idx === currentStep
                ? "w-8 bg-blue-600 dark:bg-blue-400"
                : "w-2.5 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500"
            }`}
            aria-label={`Go to step ${idx + 1}: ${steps[idx].title}`}
            aria-current={idx === currentStep ? "step" : undefined}
          />
        ))}
      </nav>

      {/* navigation buttons */}
      <div className="relative z-10 flex gap-4 mt-8">
        {currentStep > 0 && (
          <button
            onClick={handlePrev}
            className="px-6 py-2.5 rounded-lg font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="Previous step"
          >
            Back
          </button>
        )}

        <button
          onClick={handleNext}
          className={`px-8 py-2.5 rounded-lg font-semibold text-white transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 shadow-lg ${
            isLastStep
              ? "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
              : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          }`}
          aria-label={isLastStep ? "Go to Dashboard" : "Next step"}
        >
          {isLastStep ? "Go to Dashboard" : "Next"}
        </button>
      </div>
    </div>
  );
}
