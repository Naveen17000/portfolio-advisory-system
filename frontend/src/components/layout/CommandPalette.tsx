"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Command {
  id: string;
  label: string;
  category: string;
  href?: string;
  action?: () => void;
  shortcut?: string;
}

const COMMANDS: Command[] = [
  // Navigation
  { id: "dashboard", label: "Go to Dashboard", category: "Navigation", href: "/dashboard", shortcut: "G D" },
  { id: "risk", label: "Risk Profile", category: "Navigation", href: "/risk" },
  { id: "portfolio", label: "Portfolio", category: "Navigation", href: "/portfolio" },
  { id: "invest", label: "Investment Recommendations", category: "Navigation", href: "/invest" },
  { id: "simulation", label: "Monte Carlo Simulation", category: "Navigation", href: "/simulation" },
  { id: "goals", label: "Goal Planner", category: "Navigation", href: "/goals" },
  { id: "chat", label: "AI Advisor Chat", category: "Navigation", href: "/chat" },
  { id: "explain", label: "XAI Explainer", category: "Navigation", href: "/explain" },
  { id: "instruments", label: "Instruments", category: "Navigation", href: "/instruments" },
  { id: "spending", label: "Spending Tracker", category: "Navigation", href: "/spending" },
  { id: "sentiment", label: "Market Sentiment", category: "Navigation", href: "/sentiment" },
  { id: "stocks", label: "Stocks", category: "Navigation", href: "/stocks" },
  { id: "nudges", label: "Health Check", category: "Navigation", href: "/nudges" },
  { id: "benchmarks", label: "Peer Benchmarks", category: "Navigation", href: "/benchmarks" },
  { id: "profile", label: "Edit Profile", category: "Navigation", href: "/profile" },
  { id: "settings", label: "Settings", category: "Navigation", href: "/settings" },
  // Analytics
  { id: "what-if", label: "What-If Analysis", category: "Analytics", href: "/what-if" },
  { id: "model-benchmark", label: "Model Benchmark", category: "Analytics", href: "/model-benchmark" },
  { id: "frontier", label: "Efficient Frontier", category: "Analytics", href: "/frontier" },
  { id: "rebalance", label: "Rebalancing", category: "Analytics", href: "/rebalance" },
  { id: "stress-test", label: "Stress Test", category: "Analytics", href: "/stress-test" },
  // Planning
  { id: "tax", label: "Tax Planner", category: "Planning", href: "/tax" },
  { id: "retirement", label: "Retirement Calculator", category: "Planning", href: "/retirement" },
  { id: "calculator", label: "Compounding Calculator", category: "Planning", href: "/calculator" },
  { id: "debt", label: "Debt Payoff Planner", category: "Planning", href: "/debt" },
  // Actions
  { id: "report", label: "Download Report", category: "Actions", href: "/report" },
  { id: "upload", label: "Upload Bank Statement", category: "Actions", href: "/upload" },
  { id: "questionnaire", label: "Retake Questionnaire", category: "Actions", href: "/questionnaire" },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const filtered = query
    ? COMMANDS.filter(
        (c) =>
          c.label.toLowerCase().includes(query.toLowerCase()) ||
          c.category.toLowerCase().includes(query.toLowerCase())
      )
    : COMMANDS;

  const grouped = filtered.reduce<Record<string, Command[]>>((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = [];
    acc[cmd.category].push(cmd);
    return acc;
  }, {});

  const flatList = Object.values(grouped).flat();

  const execute = useCallback(
    (cmd: Command) => {
      setOpen(false);
      setQuery("");
      if (cmd.href) router.push(cmd.href);
      if (cmd.action) cmd.action();
    },
    [router]
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) {
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, flatList.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && flatList[selectedIndex]) {
      execute(flatList[selectedIndex]);
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={() => { setOpen(false); setQuery(""); }}
      />
      {/* Palette */}
      <div className="fixed inset-x-0 top-[20%] z-50 mx-auto w-full max-w-lg px-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 border-b border-gray-200 dark:border-gray-700">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search pages, tools, actions..."
              className="flex-1 py-3 bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none"
              aria-label="Command palette search"
            />
            <kbd className="hidden sm:inline-block px-2 py-0.5 text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 rounded">
              ESC
            </kbd>
          </div>
          {/* Results */}
          <div className="max-h-72 overflow-y-auto py-2">
            {flatList.length === 0 && (
              <p className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400 text-center">
                No results found
              </p>
            )}
            {Object.entries(grouped).map(([category, commands]) => (
              <div key={category}>
                <div className="px-4 py-1.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  {category}
                </div>
                {commands.map((cmd) => {
                  const idx = flatList.indexOf(cmd);
                  return (
                    <button
                      key={cmd.id}
                      onClick={() => execute(cmd)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full flex items-center justify-between px-4 py-2 text-sm text-left transition-colors ${
                        idx === selectedIndex
                          ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      }`}
                    >
                      <span>{cmd.label}</span>
                      {cmd.shortcut && (
                        <kbd className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                          {cmd.shortcut}
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          {/* Footer */}
          <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 flex items-center gap-4 text-xs text-gray-400">
            <span><kbd className="px-1 bg-gray-100 dark:bg-gray-700 rounded">↑↓</kbd> navigate</span>
            <span><kbd className="px-1 bg-gray-100 dark:bg-gray-700 rounded">↵</kbd> select</span>
            <span><kbd className="px-1 bg-gray-100 dark:bg-gray-700 rounded">esc</kbd> close</span>
          </div>
        </div>
      </div>
    </>
  );
}
