"""
Stock Classification System using real quantitative metrics from yfinance.
Classifies stocks as Safe, Moderate, or High Risk based on beta, volatility,
market cap, and Sharpe ratio.
"""

from app.services.market_data import compute_stock_metrics, STOCK_UNIVERSE


def classify_stock(metrics: dict) -> dict:
    """
    Classify a single stock based on its metrics.

    Classification rules:
    - Safe: Large cap, beta < 1.0, volatility < 25%, positive Sharpe
    - Moderate: Mid cap OR (beta 1.0-1.5, volatility 25-40%)
    - High Risk: Small cap OR beta > 1.5 OR volatility > 40%
    """
    if "error" in metrics:
        return {**metrics, "risk_category": "unknown", "risk_score": 0, "reasons": ["Data unavailable"]}

    beta = metrics.get("beta", 1.0)
    volatility = metrics.get("volatility", 30)  # percentage
    market_cap = metrics.get("market_cap", 0)
    sharpe = metrics.get("sharpe_ratio", 0)
    max_drawdown = abs(metrics.get("max_drawdown", 0))

    score = 0
    reasons = []

    # Beta scoring (0-30 points toward risk)
    if beta < 0.8:
        score += 5
        reasons.append(f"Low beta ({beta:.2f}) - less volatile than market")
    elif beta < 1.0:
        score += 10
        reasons.append(f"Below-market beta ({beta:.2f})")
    elif beta < 1.3:
        score += 20
        reasons.append(f"Moderate beta ({beta:.2f})")
    else:
        score += 30
        reasons.append(f"High beta ({beta:.2f}) - significantly more volatile than market")

    # Volatility scoring (0-30 points)
    if volatility < 20:
        score += 5
        reasons.append(f"Low volatility ({volatility:.1f}%)")
    elif volatility < 30:
        score += 12
        reasons.append(f"Moderate volatility ({volatility:.1f}%)")
    elif volatility < 45:
        score += 22
        reasons.append(f"High volatility ({volatility:.1f}%)")
    else:
        score += 30
        reasons.append(f"Very high volatility ({volatility:.1f}%)")

    # Market cap scoring (0-20 points)
    if market_cap > 500_000_000_000:  # > 500B INR (Large cap)
        score += 3
        reasons.append("Large cap stock")
    elif market_cap > 50_000_000_000:  # > 50B INR (Mid cap)
        score += 12
        reasons.append("Mid cap stock")
    elif market_cap > 0:
        score += 20
        reasons.append("Small cap stock")

    # Max drawdown scoring (0-20 points)
    if max_drawdown < 15:
        score += 3
    elif max_drawdown < 30:
        score += 10
    elif max_drawdown < 50:
        score += 15
    else:
        score += 20
        reasons.append(f"Severe max drawdown ({max_drawdown:.1f}%)")

    # Sharpe ratio bonus (reduces risk score if good)
    if sharpe > 1.0:
        score -= 5
        reasons.append(f"Strong risk-adjusted returns (Sharpe: {sharpe:.2f})")
    elif sharpe < 0:
        score += 5
        reasons.append(f"Negative risk-adjusted returns (Sharpe: {sharpe:.2f})")

    score = max(0, min(100, score))

    # Classify
    if score <= 30:
        category = "safe"
    elif score <= 60:
        category = "moderate"
    else:
        category = "high_risk"

    return {
        **metrics,
        "risk_category": category,
        "risk_score": score,
        "reasons": reasons,
    }


def classify_all_stocks() -> dict:
    """
    Classify all stocks in the universe.
    Returns categorized results.
    """
    results = {"safe": [], "moderate": [], "high_risk": [], "errors": []}

    for cap_category, tickers in STOCK_UNIVERSE.items():
        benchmark = "^NSEI"
        for ticker in tickers:
            metrics = compute_stock_metrics(ticker, benchmark)
            if metrics is None:
                results["errors"].append({"ticker": ticker, "error": "Failed to fetch data"})
                continue

            classified = classify_stock(metrics)
            category = classified.get("risk_category", "unknown")

            if category in results:
                classified["cap_category"] = cap_category
                results[category].append(classified)
            else:
                results["errors"].append(classified)

    # Sort each category by risk score
    for cat in ["safe", "moderate", "high_risk"]:
        results[cat].sort(key=lambda x: x.get("risk_score", 50))

    results["summary"] = {
        "total_analyzed": sum(len(results[c]) for c in ["safe", "moderate", "high_risk"]),
        "safe_count": len(results["safe"]),
        "moderate_count": len(results["moderate"]),
        "high_risk_count": len(results["high_risk"]),
        "error_count": len(results["errors"]),
    }

    return results
