interface ReturnRangeCardProps {
  min: number;
  max: number;
}

export default function ReturnRangeCard({ min, max }: ReturnRangeCardProps) {
  return (
    <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-xl p-6 border border-green-200 dark:border-green-800 overflow-hidden">
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Expected Annual Return Range</p>
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-2xl sm:text-3xl font-bold text-green-700 dark:text-green-400">{min}%</span>
        <span className="text-gray-400 dark:text-gray-500">to</span>
        <span className="text-2xl sm:text-3xl font-bold text-blue-700 dark:text-blue-400">{max}%</span>
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Based on historical data. Past performance does not guarantee future results.</p>
    </div>
  );
}
