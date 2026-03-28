"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import Card from "@/components/ui/Card";
import { CardSkeleton } from "@/components/ui/Skeleton";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  points: number;
  earned: boolean;
}

interface AchievementData {
  total_points: number;
  level: number;
  level_name: string;
  next_level: string;
  points_to_next_level: number;
  level_progress: number;
  earned_achievements: Achievement[];
  locked_achievements: Achievement[];
  earned_count: number;
  total_achievements: number;
}

export default function AchievementsPage() {
  const [data, setData] = useState<AchievementData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<AchievementData>("/api/v1/achievements/")
      .then(setData)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <>
        <div className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8" role="main" aria-label="Loading achievements">
          <div className="space-y-6">
            <CardSkeleton />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!data) {
    return (
      <>
        <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400" role="main">
          Complete your profile to unlock achievements.
        </div>
      </>
    );
  }

  return (
    <>
        <div className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8" role="main" aria-label="Achievements">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Achievements</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">Track your financial milestones and level up</p>

          {/* Level Card */}
          <Card className="mb-8">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="flex-shrink-0 w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center" aria-label={`Level ${data.level}`}>
                <span className="text-3xl font-bold text-white">{data.level}</span>
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{data.level_name}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{data.total_points} points earned</p>
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <span>Progress to {data.next_level}</span>
                    <span>{data.points_to_next_level} pts to go</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3" role="progressbar" aria-valuenow={data.level_progress} aria-valuemin={0} aria-valuemax={100}>
                    <div
                      className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all"
                      style={{ width: `${data.level_progress}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{data.earned_count}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">of {data.total_achievements}</p>
              </div>
            </div>
          </Card>

          {/* Earned */}
          {data.earned_achievements.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Earned</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="list" aria-label="Earned achievements">
                {data.earned_achievements.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 bg-white dark:bg-gray-800 border border-green-200 dark:border-green-800 rounded-xl p-4" role="listitem">
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center text-green-600 dark:text-green-400 font-bold text-lg flex-shrink-0">
                      +{a.points}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{a.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{a.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Locked */}
          {data.locked_achievements.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Locked</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="list" aria-label="Locked achievements">
                {data.locked_achievements.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 opacity-60" role="listitem">
                    <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-400 dark:text-gray-500 font-bold text-lg flex-shrink-0">
                      +{a.points}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-500 dark:text-gray-400 text-sm">{a.name}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{a.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
    </>
  );
}
