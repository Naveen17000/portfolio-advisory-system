"use client";

import { useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";

/**
 * Inline tooltip for financial jargon.
 * Uses a portal to render the tooltip at the document root,
 * avoiding overflow:hidden clipping from parent containers.
 *
 * Usage: <Tip term="Beta">Beta</Tip>
 * Or:    <Tip term="Beta" /> (uses the term as children automatically)
 */

const GLOSSARY: Record<string, string> = {
  // Stock metrics
  "Beta": "Measures how much a stock moves relative to the market. Beta 1.0 = moves with market, >1 = more volatile, <1 = less volatile.",
  "Volatility": "How much a stock's price swings up and down. Higher volatility = higher risk but also higher potential return.",
  "Sharpe Ratio": "Risk-adjusted return — how much extra return you get per unit of risk. Higher is better. Above 1.0 is good, above 2.0 is excellent.",
  "Max Drawdown": "The largest peak-to-trough drop in value. Shows the worst loss you would have experienced if you invested at the peak.",
  "Market Cap": "Total market value of a company's shares. Large Cap >Rs. 20,000 Cr, Mid Cap Rs. 5,000-20,000 Cr, Small Cap <Rs. 5,000 Cr.",
  "Annualized Return": "The average yearly return of an investment, accounting for compounding. Lets you compare investments of different time periods.",
  "Risk Score": "A 0-100 score measuring your investment risk tolerance. Higher = more aggressive, lower = more conservative.",

  // Asset classes
  "Large Cap": "Stocks of the biggest, most established companies (Nifty 50). Lower risk, steadier returns.",
  "Mid Cap": "Stocks of medium-sized growing companies. Moderate risk with higher growth potential than large caps.",
  "Small Cap": "Stocks of smaller, newer companies. Highest risk but also highest potential returns.",
  "Debt": "Fixed-income investments like bonds, FDs, and government securities. Low risk, predictable returns.",
  "Gold & Commodities": "Physical gold, Sovereign Gold Bonds (SGBs), or Gold ETFs. Acts as an inflation hedge and safe haven during market crashes.",
  "Liquid Funds": "Very short-term mutual funds or savings accounts. Lowest risk, instant access to your money. Used for emergency funds.",

  // Portfolio concepts
  "Asset Allocation": "How your money is divided across different investment types (equity, debt, gold, etc.). The most important factor in portfolio performance.",
  "Efficient Frontier": "A graph showing the best possible return for each level of risk. Portfolios on the frontier are optimally diversified.",
  "Correlation": "How two assets move together. Low/negative correlation means they balance each other — when one falls, the other may rise.",
  "Rebalancing": "Adjusting your portfolio back to target allocations when market movements cause drift. Keeps your risk level consistent.",
  "Drift": "The difference between your current allocation and your target. Happens naturally as some investments grow faster than others.",
  "Monte Carlo": "A simulation technique that runs thousands of random scenarios to show the range of possible outcomes for your portfolio.",
  "Black-Litterman": "An advanced portfolio optimization model that combines market data with your personal views and risk profile.",

  // Financial planning
  "SIP": "Systematic Investment Plan — investing a fixed amount every month into mutual funds. Averages out market ups and downs (rupee cost averaging).",
  "Expense Ratio": "Annual fee charged by a mutual fund, expressed as a percentage. Lower is better — 0.1% (index fund) vs 1.5% (active fund).",
  "NAV": "Net Asset Value — the per-unit price of a mutual fund. Calculated daily based on the fund's total holdings.",
  "CAGR": "Compound Annual Growth Rate — the smoothed annual return over a period. Rs. 1L growing to Rs. 2L in 5 years = 14.9% CAGR.",
  "Emergency Fund": "Money set aside for unexpected expenses (job loss, medical emergency). Experts recommend 3-6 months of expenses.",
  "Savings Rate": "Percentage of income you save each month. 20%+ is considered healthy. Higher savings rate = faster wealth building.",

  // Tax
  "80C": "Income tax deduction up to Rs. 1.5L/year for investments in ELSS, PPF, EPF, life insurance, tax-saver FDs, etc.",
  "80D": "Tax deduction for health insurance premiums. Up to Rs. 25,000 for self/family, additional Rs. 50,000 for senior citizen parents.",
  "80CCD": "Additional Rs. 50,000 tax deduction for NPS (National Pension System) contributions, over and above the 80C limit.",
  "ELSS": "Equity Linked Savings Scheme — tax-saving mutual funds with a 3-year lock-in. Qualifies for 80C deduction with potential for high returns.",
  "PPF": "Public Provident Fund — government savings scheme with 15-year lock-in, ~7.1% tax-free returns, and 80C deduction.",
  "NPS": "National Pension System — retirement savings scheme with tax benefits under 80C and 80CCD(1B). Invested in equity + debt mix.",
  "LTCG": "Long Term Capital Gains — tax on profits from selling investments held over 1 year (equity) or 3 years (debt). Currently 12.5% above Rs. 1.25L for equity.",
  "STCG": "Short Term Capital Gains — tax on profits from selling investments held less than 1 year (equity). Currently 20%.",

  // Risk metrics
  "Spending Ratio": "Monthly expenses as a percentage of income. Below 70% is healthy — leaves room for savings and investments.",
  "Savings Consistency": "How reliably you save each month, factoring in your emergency fund buffer. Consistent savers build wealth faster.",
  "Investment Discipline": "Score based on your investment experience, risk tolerance, and portfolio diversification.",
  "Liability Burden": "Your total debt relative to annual income. Below 1x is healthy. Above 3x is a warning sign.",
  "Life Stage Modifier": "Adjusts your risk score based on age/stage. Young investors get a boost (more time to recover), pre-retirees get reduced (less time).",
};

interface TipProps {
  term: string;
  children?: React.ReactNode;
}

export default function Tip({ term, children }: TipProps) {
  const definition = GLOSSARY[term];
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; below: boolean } | null>(null);
  const ref = useRef<HTMLSpanElement>(null);

  const handleEnter = useCallback(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const tooltipWidth = 280;
    const tooltipHeight = 80; // approximate

    // Clamp left to viewport
    let left = rect.left + rect.width / 2 - tooltipWidth / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - tooltipWidth - 8));

    // Show below if not enough space above
    const below = rect.top < tooltipHeight + 16;
    const top = below ? rect.bottom + 8 : rect.top - 8;

    setPos({ top, left, below });
    setShow(true);
  }, []);

  const handleLeave = useCallback(() => {
    setShow(false);
  }, []);

  if (!definition) {
    return <>{children || term}</>;
  }

  return (
    <>
      <span
        ref={ref}
        className="inline-flex items-center gap-0.5 cursor-help"
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        onFocus={handleEnter}
        onBlur={handleLeave}
        tabIndex={0}
        role="button"
        aria-label={`${term}: ${definition}`}
      >
        <span className="border-b border-dotted border-gray-400 dark:border-gray-500">
          {children || term}
        </span>
        <svg className="w-3 h-3 text-gray-400 dark:text-gray-500 opacity-60 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </span>
      {show && pos && typeof document !== "undefined" && createPortal(
        <div
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            transform: pos.below ? "none" : "translateY(-100%)",
            width: 280,
            maxWidth: "calc(100vw - 16px)",
            zIndex: 9999,
          }}
          className="px-3 py-2.5 text-xs leading-relaxed text-white bg-gray-900 dark:bg-gray-700 rounded-lg shadow-xl pointer-events-none"
        >
          <span className="font-semibold text-blue-300">{term}:</span>{" "}
          {definition}
        </div>,
        document.body
      )}
    </>
  );
}
