"""
Instrument Recommendation Engine.
Maps portfolio asset class allocations to specific stock/fund suggestions
using the stock classification system and curated fund database.
"""

from app.services.stock_classifier import classify_stock
from app.services.market_data import compute_stock_metrics, STOCK_UNIVERSE

# Curated mutual fund / ETF suggestions per asset class
FUND_DATABASE = {
    "equity_large_cap": [
        {"name": "Nifty 50 Index Fund", "type": "Index Fund", "ticker": "NIFTYBEES.NS", "expense_ratio": 0.05},
        {"name": "HDFC Top 100 Fund", "type": "Large Cap MF", "ticker": None, "expense_ratio": 1.62},
        {"name": "ICICI Pru Bluechip Fund", "type": "Large Cap MF", "ticker": None, "expense_ratio": 1.58},
        {"name": "SBI BlueChip Fund", "type": "Large Cap MF", "ticker": None, "expense_ratio": 1.56},
    ],
    "equity_mid_cap": [
        {"name": "Nifty Midcap 150 Index Fund", "type": "Index Fund", "ticker": None, "expense_ratio": 0.15},
        {"name": "HDFC Mid-Cap Opportunities", "type": "Mid Cap MF", "ticker": None, "expense_ratio": 1.64},
        {"name": "Kotak Emerging Equity Fund", "type": "Mid Cap MF", "ticker": None, "expense_ratio": 1.52},
    ],
    "equity_small_cap": [
        {"name": "Nifty Smallcap 250 Index Fund", "type": "Index Fund", "ticker": None, "expense_ratio": 0.18},
        {"name": "SBI Small Cap Fund", "type": "Small Cap MF", "ticker": None, "expense_ratio": 1.61},
        {"name": "Nippon Small Cap Fund", "type": "Small Cap MF", "ticker": None, "expense_ratio": 1.55},
    ],
    "debt": [
        {"name": "HDFC Short Term Debt Fund", "type": "Debt MF", "ticker": None, "expense_ratio": 0.68},
        {"name": "ICICI Pru Corporate Bond Fund", "type": "Debt MF", "ticker": None, "expense_ratio": 0.52},
        {"name": "SBI Magnum Gilt Fund", "type": "Gilt MF", "ticker": None, "expense_ratio": 0.72},
        {"name": "PPF (Public Provident Fund)", "type": "Govt Scheme", "ticker": None, "expense_ratio": 0},
    ],
    "gold_commodities": [
        {"name": "Sovereign Gold Bond (SGB)", "type": "Govt Bond", "ticker": None, "expense_ratio": 0},
        {"name": "Nippon Gold ETF", "type": "Gold ETF", "ticker": "GOLDBEES.NS", "expense_ratio": 0.79},
        {"name": "HDFC Gold Fund", "type": "Gold MF", "ticker": None, "expense_ratio": 0.65},
    ],
    "liquid_funds": [
        {"name": "HDFC Liquid Fund", "type": "Liquid MF", "ticker": None, "expense_ratio": 0.30},
        {"name": "ICICI Pru Liquid Fund", "type": "Liquid MF", "ticker": None, "expense_ratio": 0.28},
        {"name": "Parag Parikh Liquid Fund", "type": "Liquid MF", "ticker": None, "expense_ratio": 0.25},
        {"name": "Savings Account (High Interest)", "type": "Bank", "ticker": None, "expense_ratio": 0},
    ],
}


def _get_top_stocks_for_class(cap_category: str, risk_preference: str, max_stocks: int = 3) -> list[dict]:
    """Get top stock picks for an asset class based on risk preference."""
    tickers = STOCK_UNIVERSE.get(cap_category, [])
    scored_stocks = []

    for ticker in tickers[:10]:  # Check top 10 to limit API calls
        metrics = compute_stock_metrics(ticker)
        if metrics and "error" not in metrics:
            classified = classify_stock(metrics)
            scored_stocks.append(classified)

    if not scored_stocks:
        return []

    # Filter and sort based on risk preference
    if risk_preference == "conservative":
        # Prefer low beta, low volatility, high Sharpe
        scored_stocks.sort(key=lambda s: (s.get("beta", 2), -s.get("sharpe_ratio", 0)))
    elif risk_preference == "aggressive":
        # Prefer high returns
        scored_stocks.sort(key=lambda s: -s.get("annualized_return", 0))
    else:
        # Balanced: sort by Sharpe ratio
        scored_stocks.sort(key=lambda s: -s.get("sharpe_ratio", 0))

    return [
        {
            "ticker": s["ticker"],
            "name": s.get("name", s["ticker"]),
            "sector": s.get("sector", "Unknown"),
            "beta": s.get("beta", 0),
            "annualized_return": s.get("annualized_return", 0),
            "sharpe_ratio": s.get("sharpe_ratio", 0),
            "risk_category": s.get("risk_category", "moderate"),
        }
        for s in scored_stocks[:max_stocks]
    ]


def get_instrument_recommendations(allocations: list[dict], risk_category: str) -> list[dict]:
    """
    Generate specific instrument recommendations for each asset class allocation.

    Args:
        allocations: List of {asset_class, allocation_pct, ...}
        risk_category: "conservative", "moderate", "aggressive"

    Returns:
        List of recommendations with funds and optional stock picks
    """
    recommendations = []

    cap_map = {
        "equity_large_cap": "large_cap",
        "equity_mid_cap": "mid_cap",
        "equity_small_cap": "small_cap",
    }

    for alloc in allocations:
        asset_class = alloc.get("asset_class", "")
        pct = alloc.get("allocation_pct", 0)

        if pct <= 0:
            continue

        rec = {
            "asset_class": asset_class,
            "allocation_pct": pct,
            "funds": FUND_DATABASE.get(asset_class, []),
            "stocks": [],
        }

        # Add stock picks for equity classes
        cap_key = cap_map.get(asset_class)
        if cap_key:
            try:
                stocks = _get_top_stocks_for_class(cap_key, risk_category)
                rec["stocks"] = stocks
            except Exception:
                rec["stocks"] = []

        recommendations.append(rec)

    return recommendations
