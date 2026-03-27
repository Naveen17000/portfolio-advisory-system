import { ASSET_CLASS_LABELS, ASSET_CLASS_COLORS } from "@/lib/constants";
import type { PortfolioAllocation } from "@/types";

interface AllocationTableProps {
  allocations: PortfolioAllocation[];
}

export default function AllocationTable({ allocations }: AllocationTableProps) {
  return (
    <div className="overflow-x-auto -mx-6 px-6">
      <table className="w-full text-sm min-w-[500px]" aria-label="Portfolio allocation breakdown">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            <th className="text-left py-3 px-2 font-medium text-gray-500 dark:text-gray-400">Asset Class</th>
            <th className="text-right py-3 px-2 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Allocation</th>
            <th className="text-right py-3 px-2 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Expected Return</th>
            <th className="text-left py-3 px-2 font-medium text-gray-500 dark:text-gray-400">Rationale</th>
          </tr>
        </thead>
        <tbody>
          {allocations.map((a) => (
            <tr key={a.id} className="border-b border-gray-100 dark:border-gray-700">
              <td className="py-3 px-2 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: ASSET_CLASS_COLORS[a.asset_class] || "#94a3b8" }}
                  />
                  <span className="text-gray-900 dark:text-gray-100">{ASSET_CLASS_LABELS[a.asset_class] || a.asset_class}</span>
                </div>
              </td>
              <td className="text-right py-3 px-2 font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">{a.allocation_pct.toFixed(1)}%</td>
              <td className="text-right py-3 px-2 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                {a.expected_return_min && a.expected_return_max
                  ? `${a.expected_return_min}% - ${a.expected_return_max}%`
                  : "-"}
              </td>
              <td className="py-3 px-2 text-gray-500 dark:text-gray-400 text-xs">
                <p className="line-clamp-2">{a.rationale || "-"}</p>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
