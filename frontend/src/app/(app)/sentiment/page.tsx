"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { CardSkeleton } from "@/components/ui/Skeleton";

interface SentimentData {
  category: string;
  overall_sentiment: string;
  overall_score: number;
  article_count: number;
  articles: {
    title: string;
    link: string;
    source: string;
    sentiment: string;
    confidence: number;
    scores: { positive: number; negative: number; neutral: number };
    sectors: string[];
  }[];
  sector_sentiment: Record<string, { score: number; sentiment: string; article_count: number }>;
}

const SENTIMENT_COLORS: Record<string, string> = {
  positive: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30",
  negative: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30",
  neutral: "text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700",
};

const CATEGORIES = [
  { value: "general", label: "General Market" },
  { value: "equity", label: "Equity" },
  { value: "commodities", label: "Commodities" },
];

export default function SentimentPage() {
  const [data, setData] = useState<SentimentData | null>(null);
  const [category, setCategory] = useState("general");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchSentiment = (cat: string) => {
    setLoading(true);
    setError("");
    api<SentimentData>(`/api/v1/sentiment/?category=${cat}`)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load sentiment"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSentiment(category);
  }, [category]);

  return (
    <>
        <div className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8" role="main" aria-label="Market sentiment analysis">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Market Sentiment</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">AI-powered analysis of financial news using FinBERT</p>

          <div className="flex gap-2 mb-6" role="tablist" aria-label="Sentiment categories">
            {CATEGORIES.map((cat) => (
              <Button
                key={cat.value}
                variant={category === cat.value ? "primary" : "outline"}
                size="sm"
                onClick={() => setCategory(cat.value)}
                aria-selected={category === cat.value}
                role="tab"
              >
                {cat.label}
              </Button>
            ))}
          </div>

          {loading && (
            <div className="space-y-4" aria-label="Loading sentiment data">
              <Card className="text-center py-6">
                <div className="flex flex-col items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Analyzing market sentiment...
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Fetching news articles and running FinBERT AI analysis. This may take 15-30 seconds on first load.
                  </p>
                </div>
              </Card>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
              </div>
              <CardSkeleton />
            </div>
          )}

          {error && <p className="text-red-600 dark:text-red-400 text-sm" role="alert">{error}</p>}

          {!loading && data && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <Card>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Overall Sentiment</p>
                  <span className={`inline-block mt-1 px-3 py-1 rounded-full text-sm font-semibold ${SENTIMENT_COLORS[data.overall_sentiment]}`}>
                    {data.overall_sentiment.charAt(0).toUpperCase() + data.overall_sentiment.slice(1)}
                  </span>
                </Card>
                <Card>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Sentiment Score</p>
                  <p className={`text-2xl font-bold ${data.overall_score > 0 ? "text-green-600 dark:text-green-400" : data.overall_score < 0 ? "text-red-600 dark:text-red-400" : "text-gray-600 dark:text-gray-400"}`}>
                    {data.overall_score > 0 ? "+" : ""}{data.overall_score.toFixed(3)}
                  </p>
                </Card>
                <Card>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Articles Analyzed</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{data.article_count}</p>
                </Card>
              </div>

              {Object.keys(data.sector_sentiment).length > 0 && (
                <Card title="Sector-wise Sentiment" className="mb-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {Object.entries(data.sector_sentiment).map(([sector, info]) => (
                      <div key={sector} className="p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 capitalize">{sector}</p>
                        <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${SENTIMENT_COLORS[info.sentiment]}`}>
                          {info.sentiment}
                        </span>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{info.article_count} articles</p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              <Card title="News Analysis">
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {data.articles.map((article, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <span className={`flex-shrink-0 text-xs px-2 py-1 rounded-full font-medium ${SENTIMENT_COLORS[article.sentiment]}`}>
                        {article.sentiment}
                      </span>
                      <div className="flex-1 min-w-0">
                        <a
                          href={article.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 line-clamp-2"
                        >
                          {article.title}
                        </a>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-400 dark:text-gray-500">{article.source}</span>
                          <span className="text-xs text-gray-300 dark:text-gray-600">|</span>
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            Confidence: {(article.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}
        </div>
    </>
  );
}
