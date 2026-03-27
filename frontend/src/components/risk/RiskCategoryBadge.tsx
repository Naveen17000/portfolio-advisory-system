import { RISK_CATEGORIES } from "@/lib/constants";

export default function RiskCategoryBadge({ category }: { category: string }) {
  const info = RISK_CATEGORIES[category] || RISK_CATEGORIES.moderate;
  return (
    <span
      className="inline-flex items-center text-sm font-semibold px-3 py-1 rounded-full"
      style={{ backgroundColor: info.color + "20", color: info.color }}
    >
      {info.label}
    </span>
  );
}
