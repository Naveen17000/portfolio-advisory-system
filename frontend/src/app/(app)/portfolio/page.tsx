"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import type { Portfolio } from "@/types";
import Card from "@/components/ui/Card";
import { CardSkeleton } from "@/components/ui/Skeleton";
import AllocationPieChart from "@/components/portfolio/AllocationPieChart";
import AllocationTable from "@/components/portfolio/AllocationTable";
import ReturnRangeCard from "@/components/portfolio/ReturnRangeCard";

export default function PortfolioPage() {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<Portfolio>("/api/v1/portfolio/latest")
      .then(setPortfolio)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
        <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8" role="main">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Portfolio Recommendation</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8">Your personalized asset allocation based on your risk profile</p>

          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : !portfolio ? (
            <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400 py-20">
              No portfolio found. Complete the questionnaire first.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <Card title="Asset Allocation">
                  <AllocationPieChart allocations={portfolio.allocations} />
                </Card>

                <div className="space-y-6">
                  <ReturnRangeCard min={portfolio.expected_return_min} max={portfolio.expected_return_max} />
                  <Card>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{portfolio.name}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                      Generated on {new Date(portfolio.created_at).toLocaleDateString()}
                    </p>
                  </Card>
                </div>
              </div>

              <Card title="Detailed Allocation">
                <AllocationTable allocations={portfolio.allocations} />
              </Card>

              <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-8">
                This is for educational purposes only. Past performance does not guarantee future results.
              </p>
            </>
          )}
        </main>
    </>
  );
}
