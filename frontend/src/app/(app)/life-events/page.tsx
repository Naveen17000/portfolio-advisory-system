"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { CardSkeleton } from "@/components/ui/Skeleton";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface EventTemplate {
  id: string;
  label: string;
  icon: string;
  description: string;
}

interface PlannedEvent {
  event_id: string;
  label: string;
  year: number;
}

interface YearPoint {
  year: number;
  age: number;
  income: number;
  expenses: number;
  savings: number;
  corpus: number;
  liabilities: number;
  net_worth: number;
}

interface EventImpact {
  event_id: string;
  label: string;
  year: number;
  age: number;
  one_time_cost: number;
  monthly_savings_impact: number;
  corpus_impact: number;
  new_monthly_expenses: number;
  new_monthly_savings: number;
  liability_added: number;
  tips: string[];
}

interface SimResult {
  baseline: YearPoint[];
  with_events: YearPoint[];
  events_applied: { event_id: string; label: string; year: number }[];
  event_impacts: EventImpact[];
  summary: {
    baseline_corpus: number;
    events_corpus: number;
    corpus_difference: number;
    corpus_impact_pct: number;
    baseline_net_worth: number;
    events_net_worth: number;
    net_worth_difference: number;
    total_one_time_costs: number;
    total_liability_added: number;
    events_count: number;
  };
}

const EVENT_ICONS: Record<string, string> = {
  ring: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
  baby: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
  home: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  car: "M8 17h8M8 17l-2 0a1 1 0 01-1-1v-3.5M8 17v-1m8 1v-1m0 0h2a1 1 0 001-1v-3.5M5 12.5l1.5-4.5A2 2 0 018.4 6h7.2a2 2 0 011.9 1.368L19 12.5m-14 0h14",
  alert: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z",
  trending_up: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6",
  education: "M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z",
  medical: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
  business: "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
};

function fmt(n: number): string {
  if (Math.abs(n) >= 10000000) return `Rs. ${(n / 10000000).toFixed(2)} Cr`;
  if (Math.abs(n) >= 100000) return `Rs. ${(n / 100000).toFixed(1)} L`;
  if (Math.abs(n) >= 1000) return `Rs. ${(n / 1000).toFixed(0)}K`;
  return `Rs. ${n.toFixed(0)}`;
}

export default function LifeEventsPage() {
  const [templates, setTemplates] = useState<EventTemplate[]>([]);
  const [planned, setPlanned] = useState<PlannedEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState("");
  const [selectedYear, setSelectedYear] = useState(2);
  const [result, setResult] = useState<SimResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api<EventTemplate[]>("/api/v1/life-events/templates")
      .then(setTemplates)
      .catch(() => {})
      .finally(() => setLoadingTemplates(false));
  }, []);

  const addEvent = () => {
    if (!selectedEvent) return;
    const template = templates.find((t) => t.id === selectedEvent);
    if (!template) return;
    setPlanned((prev) => [
      ...prev,
      { event_id: selectedEvent, label: template.label, year: selectedYear },
    ]);
    setSelectedEvent("");
    setResult(null);
  };

  const removeEvent = (idx: number) => {
    setPlanned((prev) => prev.filter((_, i) => i !== idx));
    setResult(null);
  };

  const simulate = async () => {
    if (planned.length === 0) return;
    setLoading(true);
    setError("");
    try {
      const res = await api<SimResult>("/api/v1/life-events/simulate", {
        method: "POST",
        body: JSON.stringify({
          events: planned.map((e) => ({ event_id: e.event_id, year: e.year })),
          projection_years: 20,
        }),
      });
      setResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Simulation failed");
    } finally {
      setLoading(false);
    }
  };

  const chartData = result
    ? result.baseline.map((b, i) => ({
        year: `Age ${b.age}`,
        baseline: b.net_worth,
        withEvents: result.with_events[i]?.net_worth ?? 0,
      }))
    : [];

  const eventYears = result?.events_applied ?? [];

  return (
    <div className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Life Event Simulator</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Plan ahead — see how marriage, babies, home purchase, or career changes affect your finances over 20 years
        </p>
      </div>

      {/* Event Planner */}
      <Card title="Plan Your Life Events">
        <div className="flex flex-col sm:flex-row gap-3 items-end mb-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Life Event
            </label>
            <select
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select an event...</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="w-32">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              In Year
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              {Array.from({ length: 20 }, (_, i) => i + 1).map((y) => (
                <option key={y} value={y}>Year {y}</option>
              ))}
            </select>
          </div>
          <Button onClick={addEvent} disabled={!selectedEvent}>Add Event</Button>
        </div>

        {/* Timeline of planned events */}
        {planned.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Your Timeline</p>
            {planned
              .sort((a, b) => a.year - b.year)
              .map((ev, i) => {
                const tpl = templates.find((t) => t.id === ev.event_id);
                const iconPath = EVENT_ICONS[tpl?.icon || "alert"];
                return (
                  <div key={i} className="flex items-center gap-3 py-2 px-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={iconPath} />
                    </svg>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 flex-1">{ev.label}</span>
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">Year {ev.year}</span>
                    <button
                      onClick={() => removeEvent(i)}
                      className="text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                      aria-label="Remove event"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            <div className="pt-3">
              <Button onClick={simulate} disabled={loading}>
                {loading ? "Simulating..." : "Simulate Impact"}
              </Button>
            </div>
          </div>
        ) : (
          !loadingTemplates && (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
              Add life events above to see how they affect your financial future
            </p>
          )
        )}

        {loadingTemplates && <CardSkeleton />}
        {error && <p className="text-sm text-red-600 dark:text-red-400 mt-2">{error}</p>}
      </Card>

      {loading && (
        <div className="space-y-4">
          <CardSkeleton />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4"><CardSkeleton /><CardSkeleton /><CardSkeleton /></div>
        </div>
      )}

      {result && !loading && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Without Events</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{fmt(result.summary.baseline_net_worth)}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Net worth in 20 years</p>
            </Card>
            <Card>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">With Life Events</p>
              <p className={`text-2xl font-bold mt-1 ${result.summary.events_net_worth >= result.summary.baseline_net_worth ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                {fmt(result.summary.events_net_worth)}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Net worth in 20 years</p>
            </Card>
            <Card>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Impact</p>
              <p className={`text-2xl font-bold mt-1 ${result.summary.corpus_impact_pct >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                {result.summary.corpus_impact_pct >= 0 ? "+" : ""}{result.summary.corpus_impact_pct}%
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {fmt(Math.abs(result.summary.corpus_difference))} {result.summary.corpus_difference >= 0 ? "more" : "less"} corpus
              </p>
            </Card>
          </div>

          {/* Net Worth Projection Chart */}
          <Card title="Net Worth Projection — With vs Without Life Events">
            <div className="overflow-hidden" style={{ minHeight: 0 }}>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
                  <defs>
                    <linearGradient id="gradBaseline" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gradEvents" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} interval={1} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: number) =>
                      v >= 10000000 ? `${(v / 10000000).toFixed(0)}Cr` :
                      v >= 100000 ? `${(v / 100000).toFixed(0)}L` :
                      `${(v / 1000).toFixed(0)}K`
                    }
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: "rgba(31,41,55,0.95)", border: "none", borderRadius: 8, color: "#f3f4f6" }}
                    formatter={(value: number, name: string) => [
                      fmt(value),
                      name === "baseline" ? "Without Events" : "With Events",
                    ]}
                  />
                  <Legend />
                  {/* Event markers */}
                  {eventYears.map((ev, i) => (
                    <ReferenceLine
                      key={i}
                      x={`Age ${result.with_events[ev.year]?.age ?? 0}`}
                      stroke="#ef4444"
                      strokeDasharray="4 4"
                      label={{ value: ev.label, position: "top", fontSize: 10, fill: "#ef4444" }}
                    />
                  ))}
                  <Area type="monotone" dataKey="baseline" name="Without Events" stroke="#3b82f6" fill="url(#gradBaseline)" strokeWidth={2} />
                  <Area type="monotone" dataKey="withEvents" name="With Events" stroke="#f59e0b" fill="url(#gradEvents)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-2">
              Blue = your projected path without changes. Orange = projected path with life events. Red dashed lines = when events occur.
            </p>
          </Card>

          {/* Per-Event Impact Breakdown */}
          <Card title="Event-by-Event Impact">
            <div className="space-y-4">
              {result.event_impacts.map((impact, i) => (
                <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{impact.label}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Year {impact.year} (Age {impact.age})</p>
                    </div>
                    <span className={`text-sm font-bold ${impact.monthly_savings_impact >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                      {impact.monthly_savings_impact >= 0 ? "+" : ""}{fmt(impact.monthly_savings_impact)}/mo
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded px-3 py-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400">One-time Cost</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{fmt(impact.one_time_cost)}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded px-3 py-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400">New Expenses</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{fmt(impact.new_monthly_expenses)}/mo</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded px-3 py-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400">New Savings</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{fmt(impact.new_monthly_savings)}/mo</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded px-3 py-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400">New Loans</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{fmt(impact.liability_added)}</p>
                    </div>
                  </div>

                  {/* Tips */}
                  {impact.tips.length > 0 && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2">
                      <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">Tips for this event</p>
                      <ul className="space-y-1">
                        {impact.tips.map((tip, j) => (
                          <li key={j} className="text-xs text-blue-600 dark:text-blue-400 flex gap-1.5">
                            <span className="flex-shrink-0 mt-0.5">&#8226;</span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Cost Summary */}
          <Card>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center">
              <div className="py-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total One-time Costs</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{fmt(result.summary.total_one_time_costs)}</p>
              </div>
              <div className="py-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total New Liabilities</p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">{fmt(result.summary.total_liability_added)}</p>
              </div>
            </div>
          </Card>

          <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
            Projections assume 10% annual returns, 6% inflation, and 8% annual income growth. Actual results will vary.
          </p>
        </>
      )}
    </div>
  );
}
