"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import Card from "@/components/ui/Card";
import { CardSkeleton } from "@/components/ui/Skeleton";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";

interface AxisMeta {
  label: string;
  description: string;
}

interface StrengthItem {
  axis: string;
  score: number;
  insight: string;
}

interface WeaknessItem {
  axis: string;
  score: number;
  insight: string;
  action: string;
}

interface Archetype {
  name: string;
  emoji: string;
  tagline: string;
  description: string;
  ideal_for: string;
  famous_match: string;
  color: string;
}

interface DnaData {
  archetype_id: string;
  archetype: Archetype;
  axes: Record<string, number>;
  axes_meta: Record<string, AxisMeta>;
  average_score: number;
  strengths: StrengthItem[];
  weaknesses: WeaknessItem[];
  insights: string[];
  life_stage: string;
  risk_category: string;
}

const ARCHETYPE_EMOJIS: Record<string, string> = {
  shield: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  seedling: "M12 19V6m0 0c-1.5-2-4-3-7-3 0 4 1.5 7 4 9m3-6c1.5-2 4-3 7-3 0 4-1.5 7-4 9",
  rocket: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6",
  compass: "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7",
  star: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z",
  scales: "M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3",
};

function ScoreRing({ score, color, size = 120 }: { score: number; color: string; size?: number }) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth="8" className="text-gray-200 dark:text-gray-700" stroke="currentColor" />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth="8" stroke={color} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} className="transition-all duration-1000" />
    </svg>
  );
}

export default function FinancialDnaPage() {
  const [data, setData] = useState<DnaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api<DnaData>("/api/v1/financial-dna/")
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Financial DNA</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><CardSkeleton /><CardSkeleton /></div>
        <CardSkeleton />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Financial DNA</h1>
        <Card>
          <p className="text-red-600 dark:text-red-400">{error || "Unable to generate your Financial DNA."}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Complete your financial profile and risk assessment first.</p>
        </Card>
      </div>
    );
  }

  const radarData = Object.entries(data.axes).map(([key, value]) => ({
    axis: data.axes_meta[key]?.label || key,
    value,
    fullMark: 100,
  }));

  const emojiPath = ARCHETYPE_EMOJIS[data.archetype.emoji] || ARCHETYPE_EMOJIS.star;

  return (
    <div className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Your Financial DNA</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          A unique personality profile based on your financial behavior, risk tolerance, and investment style
        </p>
      </div>

      {/* Archetype Card — the hero section */}
      <div
        className="rounded-2xl p-8 text-white relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${data.archetype.color}dd, ${data.archetype.color}88)` }}
      >
        <div className="absolute top-0 right-0 w-48 h-48 opacity-10">
          <svg className="w-full h-full" fill="currentColor" viewBox="0 0 24 24">
            <path d={emojiPath} />
          </svg>
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={emojiPath} />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-extrabold">{data.archetype.name}</h2>
              <p className="text-white/80 text-sm italic">&ldquo;{data.archetype.tagline}&rdquo;</p>
            </div>
          </div>
          <p className="text-white/90 text-sm leading-relaxed max-w-2xl">
            {data.archetype.description}
          </p>
          <div className="flex flex-wrap gap-4 mt-5 text-xs">
            <div className="bg-white/15 rounded-full px-4 py-1.5">
              {data.risk_category.charAt(0).toUpperCase() + data.risk_category.slice(1)} Investor
            </div>
            <div className="bg-white/15 rounded-full px-4 py-1.5">
              {data.life_stage.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
            </div>
            <div className="bg-white/15 rounded-full px-4 py-1.5">
              Overall Score: {data.average_score}/100
            </div>
          </div>
        </div>
      </div>

      {/* Radar Chart + Score Ring */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar */}
        <Card title="Your 6-Axis DNA Profile">
          <div className="overflow-hidden" style={{ minHeight: 0 }}>
            <ResponsiveContainer width="100%" height={320}>
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid stroke="#374151" />
                <PolarAngleAxis dataKey="axis" tick={{ fontSize: 12, fill: "#9ca3af" }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Radar
                  name="Your DNA"
                  dataKey="value"
                  stroke={data.archetype.color}
                  fill={data.archetype.color}
                  fillOpacity={0.25}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Axis Scores */}
        <Card title="Axis Breakdown">
          <div className="space-y-4">
            {Object.entries(data.axes).map(([key, score]) => {
              const meta = data.axes_meta[key];
              return (
                <div key={key}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{meta?.label || key}</span>
                    <span className="text-sm font-bold" style={{ color: data.archetype.color }}>{score}</span>
                  </div>
                  <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${score}%`, backgroundColor: data.archetype.color }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{meta?.description}</p>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Strengths */}
      {data.strengths.length > 0 && (
        <Card title="Your Financial Superpowers">
          <div className="space-y-3">
            {data.strengths.map((s, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                  <span className="text-green-600 dark:text-green-400 text-sm font-bold">{s.score}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-green-800 dark:text-green-300">{s.axis}</p>
                  <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">{s.insight}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Weaknesses */}
      {data.weaknesses.length > 0 && (
        <Card title="Areas to Improve">
          <div className="space-y-3">
            {data.weaknesses.map((w, i) => (
              <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{w.axis}</span>
                  <span className="text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 px-2 py-0.5 rounded-full">
                    {w.score}/100
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{w.insight}</p>
                <div className="mt-2 flex items-start gap-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2">
                  <svg className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  <p className="text-xs text-blue-700 dark:text-blue-300">{w.action}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Personalized Insights */}
      {data.insights.length > 0 && (
        <Card title="Personalized Insights">
          <div className="space-y-3">
            {data.insights.map((insight, i) => (
              <div key={i} className="flex items-start gap-3 py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
                  <span className="text-violet-600 dark:text-violet-400 text-xs font-bold">{i + 1}</span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{insight}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Famous Match */}
      <Card>
        <div className="text-center py-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Your Investing Philosophy Matches</p>
          <p className="text-base font-semibold text-gray-900 dark:text-gray-100 italic">
            &ldquo;{data.archetype.famous_match}&rdquo;
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            Ideal for: {data.archetype.ideal_for}
          </p>
        </div>
      </Card>

      <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
        Your Financial DNA is generated from your questionnaire responses, financial profile, and risk assessment.
        It evolves as your financial situation changes.
      </p>
    </div>
  );
}
