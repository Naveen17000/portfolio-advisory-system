"""
Market Sentiment Analysis using FinBERT.
Analyzes financial news headlines for sector-wise sentiment scoring.
"""

import feedparser
from functools import lru_cache

# Lazy load transformers to avoid slow startup
_pipeline = None


def _get_pipeline():
    """Lazy-load the FinBERT sentiment pipeline."""
    global _pipeline
    if _pipeline is None:
        from transformers import pipeline
        _pipeline = pipeline(
            "sentiment-analysis",
            model="ProsusAI/finbert",
            tokenizer="ProsusAI/finbert",
            top_k=None,
        )
    return _pipeline


# Financial news RSS feeds
RSS_FEEDS = {
    "general": [
        "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms",
        "https://www.moneycontrol.com/rss/marketreports.xml",
    ],
    "equity": [
        "https://economictimes.indiatimes.com/markets/stocks/rssfeeds/2146842.cms",
        "https://www.moneycontrol.com/rss/marketreports.xml",
    ],
    "commodities": [
        "https://www.moneycontrol.com/rss/commodities.xml",
        "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms",
    ],
}

# Sector keywords for classification
SECTOR_KEYWORDS = {
    "technology": ["tech", "software", "IT", "digital", "AI", "cloud", "SaaS", "semiconductor"],
    "banking": ["bank", "NBFC", "lending", "credit", "loan", "RBI", "interest rate", "monetary"],
    "healthcare": ["pharma", "health", "medical", "hospital", "drug", "biotech", "vaccine"],
    "energy": ["oil", "gas", "energy", "power", "solar", "renewable", "petroleum", "OPEC"],
    "infrastructure": ["infra", "construction", "real estate", "housing", "cement", "steel"],
    "auto": ["auto", "vehicle", "EV", "electric vehicle", "car", "motor"],
    "fmcg": ["FMCG", "consumer", "retail", "food", "beverage"],
    "market": ["market", "sensex", "nifty", "index", "bull", "bear", "rally", "crash", "IPO"],
}


def _classify_sector(text: str) -> list[str]:
    """Classify a headline into one or more sectors."""
    text_lower = text.lower()
    sectors = []
    for sector, keywords in SECTOR_KEYWORDS.items():
        if any(kw.lower() in text_lower for kw in keywords):
            sectors.append(sector)
    return sectors or ["general"]


def _fetch_news(category: str = "general", max_items: int = 20) -> list[dict]:
    """Fetch news headlines from RSS feeds."""
    feeds = RSS_FEEDS.get(category, RSS_FEEDS["general"])
    articles = []

    for feed_url in feeds:
        try:
            feed = feedparser.parse(feed_url)
            for entry in feed.entries[:max_items]:
                articles.append({
                    "title": entry.get("title", ""),
                    "link": entry.get("link", ""),
                    "published": entry.get("published", ""),
                    "source": feed.feed.get("title", "Unknown"),
                })
        except Exception:
            continue

    return articles[:max_items]


def analyze_sentiment(texts: list[str]) -> list[dict]:
    """Analyze sentiment of a list of texts using FinBERT."""
    if not texts:
        return []

    pipe = _get_pipeline()
    results = []

    # Process in batches to avoid memory issues
    batch_size = 16
    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        # Truncate long texts
        batch = [t[:512] for t in batch]
        try:
            batch_results = pipe(batch)
            for text, scores in zip(batch, batch_results):
                sentiment_map = {s["label"]: s["score"] for s in scores}
                primary = max(scores, key=lambda x: x["score"])
                results.append({
                    "text": text,
                    "sentiment": primary["label"].lower(),
                    "confidence": round(primary["score"], 4),
                    "scores": {
                        "positive": round(sentiment_map.get("positive", 0), 4),
                        "negative": round(sentiment_map.get("negative", 0), 4),
                        "neutral": round(sentiment_map.get("neutral", 0), 4),
                    },
                })
        except Exception:
            for text in batch:
                results.append({
                    "text": text,
                    "sentiment": "neutral",
                    "confidence": 0.5,
                    "scores": {"positive": 0.33, "negative": 0.33, "neutral": 0.34},
                })

    return results


def get_market_sentiment(category: str = "general") -> dict:
    """
    Fetch news and analyze market sentiment.
    Returns overall sentiment score and per-article analysis.
    """
    articles = _fetch_news(category)

    if not articles:
        return {
            "category": category,
            "overall_sentiment": "neutral",
            "overall_score": 0.0,
            "article_count": 0,
            "articles": [],
            "sector_sentiment": {},
        }

    headlines = [a["title"] for a in articles]
    sentiments = analyze_sentiment(headlines)

    # Merge article data with sentiment
    analyzed_articles = []
    for article, sentiment in zip(articles, sentiments):
        sectors = _classify_sector(article["title"])
        analyzed_articles.append({
            **article,
            **sentiment,
            "sectors": sectors,
        })

    # Calculate overall sentiment score (-1 to 1)
    scores = []
    for s in sentiments:
        score = s["scores"]["positive"] - s["scores"]["negative"]
        scores.append(score)

    overall_score = sum(scores) / len(scores) if scores else 0
    if overall_score > 0.1:
        overall_sentiment = "positive"
    elif overall_score < -0.1:
        overall_sentiment = "negative"
    else:
        overall_sentiment = "neutral"

    # Sector-wise sentiment
    sector_scores: dict[str, list[float]] = {}
    for article in analyzed_articles:
        score = article["scores"]["positive"] - article["scores"]["negative"]
        for sector in article["sectors"]:
            sector_scores.setdefault(sector, []).append(score)

    sector_sentiment = {}
    for sector, s_scores in sector_scores.items():
        avg = sum(s_scores) / len(s_scores)
        sector_sentiment[sector] = {
            "score": round(avg, 4),
            "sentiment": "positive" if avg > 0.1 else "negative" if avg < -0.1 else "neutral",
            "article_count": len(s_scores),
        }

    return {
        "category": category,
        "overall_sentiment": overall_sentiment,
        "overall_score": round(overall_score, 4),
        "article_count": len(analyzed_articles),
        "articles": analyzed_articles,
        "sector_sentiment": sector_sentiment,
    }
