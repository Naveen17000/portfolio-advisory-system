export const LIFE_STAGES = [
  { value: "student", label: "Student" },
  { value: "early_career", label: "Early Career" },
  { value: "family", label: "Family / Married" },
  { value: "pre_retirement", label: "Pre-Retirement" },
];

export const RISK_CATEGORIES: Record<string, { label: string; color: string }> = {
  conservative: { label: "Conservative", color: "#22c55e" },
  moderate: { label: "Moderate", color: "#f59e0b" },
  aggressive: { label: "Aggressive", color: "#ef4444" },
};

export const ASSET_CLASS_LABELS: Record<string, string> = {
  equity_large_cap: "Large Cap Equity",
  equity_mid_cap: "Mid Cap Equity",
  equity_small_cap: "Small Cap Equity",
  debt: "Debt / Fixed Income",
  gold_commodities: "Gold & Commodities",
  liquid_funds: "Liquid Funds",
};

export const ASSET_CLASS_COLORS: Record<string, string> = {
  equity_large_cap: "#3b82f6",
  equity_mid_cap: "#6366f1",
  equity_small_cap: "#8b5cf6",
  debt: "#22c55e",
  gold_commodities: "#f59e0b",
  liquid_funds: "#06b6d4",
};
