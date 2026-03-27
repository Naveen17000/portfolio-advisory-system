"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/components/layout/ThemeProvider";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/risk", label: "Risk" },
  { href: "/explain", label: "XAI" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/instruments", label: "Instruments" },
  { href: "/simulation", label: "Simulation" },
  { href: "/goals", label: "Goals" },
  { href: "/spending", label: "Spending" },
  { href: "/sentiment", label: "Sentiment" },
  { href: "/stocks", label: "Stocks" },
  { href: "/chat", label: "Chat" },
  { href: "/nudges", label: "Nudges" },
  { href: "/achievements", label: "Achievements" },
  { href: "/benchmarks", label: "Benchmarks" },
  { href: "/profile", label: "Profile" },
];

function ThemeToggle() {
  const { resolved, setTheme } = useTheme();
  const next = resolved === "dark" ? "light" : "dark";

  return (
    <button
      onClick={() => setTheme(next)}
      className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
    >
      {resolved === "dark" ? (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700" role="navigation" aria-label="Main navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link href="/dashboard" className="text-xl font-bold text-blue-600" aria-label="Portfolio Advisor home">
            PortfolioAdvisor
          </Link>

          {user && (
            <>
              {/* Desktop nav */}
              <div className="hidden lg:flex items-center gap-5">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="flex items-center gap-3 ml-4 pl-4 border-l border-gray-200 dark:border-gray-600">
                  <ThemeToggle />
                  <span className="text-sm text-gray-500 dark:text-gray-400">{user.full_name}</span>
                  <button
                    onClick={logout}
                    className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                    aria-label="Sign out"
                  >
                    Logout
                  </button>
                </div>
              </div>

              {/* Mobile hamburger */}
              <div className="flex items-center gap-2 lg:hidden">
                <ThemeToggle />
                <button
                  className="text-gray-600 dark:text-gray-300"
                  onClick={() => setMobileOpen(!mobileOpen)}
                  aria-expanded={mobileOpen}
                  aria-controls="mobile-menu"
                  aria-label={mobileOpen ? "Close menu" : "Open menu"}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    {mobileOpen ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    )}
                  </svg>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Mobile menu */}
        {user && mobileOpen && (
          <div id="mobile-menu" className="lg:hidden pb-4 space-y-2" role="menu">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg"
                role="menuitem"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <button
              onClick={logout}
              className="block w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
              role="menuitem"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
