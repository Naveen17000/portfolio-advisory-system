"""
Monte Carlo Simulation Engine for portfolio outcome prediction.
Uses real historical data from yfinance when available, falls back to estimates.
Runs thousands of simulations to produce probability distributions.
"""

import numpy as np
from app.utils.constants import AssetClass, EXPECTED_RETURNS

# Fallback volatility estimates (used when real data unavailable)
FALLBACK_VOLATILITY = {
    AssetClass.EQUITY_LARGE_CAP: 0.16,
    AssetClass.EQUITY_MID_CAP: 0.22,
    AssetClass.EQUITY_SMALL_CAP: 0.28,
    AssetClass.DEBT: 0.04,
    AssetClass.GOLD_COMMODITIES: 0.14,
    AssetClass.LIQUID_FUNDS: 0.02,
}


def _get_real_stats() -> dict | None:
    """Try to load real historical stats from market data service."""
    try:
        from app.services.market_data import get_asset_class_historical_stats
        return get_asset_class_historical_stats()
    except Exception:
        return None


def run_simulation(
    allocations: dict[str, float],
    initial_investment: float,
    monthly_sip: float = 0,
    years: int = 10,
    n_simulations: int = 1000,
) -> dict:
    """
    Run Monte Carlo simulations for a portfolio.

    Uses real historical returns/volatility when available from yfinance,
    falls back to hardcoded estimates otherwise.
    """
    rng = np.random.RandomState(42)
    months = years * 12

    # Try to get real market stats
    real_stats = _get_real_stats()
    data_source = "historical" if real_stats else "estimated"

    # Calculate portfolio-level expected return and volatility
    portfolio_return = 0.0
    portfolio_variance = 0.0

    for asset_str, pct in allocations.items():
        weight = pct / 100
        if weight <= 0:
            continue

        # Try real data first
        if real_stats and asset_str in real_stats:
            stats = real_stats[asset_str]
            annual_return = stats["annualized_return"] / 100
            vol = stats["volatility"] / 100
        else:
            # Fallback to hardcoded
            try:
                asset = AssetClass(asset_str)
                ret_min, ret_max = EXPECTED_RETURNS.get(asset, (0, 0))
                annual_return = (ret_min + ret_max) / 2 / 100
                vol = FALLBACK_VOLATILITY.get(asset, 0.10)
            except ValueError:
                continue

        portfolio_return += weight * annual_return
        portfolio_variance += (weight ** 2) * (vol ** 2)

    portfolio_vol = np.sqrt(portfolio_variance)

    # Monthly parameters
    monthly_return = portfolio_return / 12
    monthly_vol = portfolio_vol / np.sqrt(12)

    # Simulate paths
    all_paths = np.zeros((n_simulations, months + 1))
    all_paths[:, 0] = initial_investment

    for t in range(1, months + 1):
        random_returns = rng.normal(monthly_return, monthly_vol, n_simulations)
        all_paths[:, t] = all_paths[:, t - 1] * (1 + random_returns) + monthly_sip

    # Calculate total invested
    total_invested = initial_investment + monthly_sip * months

    # Final values
    final_values = all_paths[:, -1]

    # Percentile outcomes
    percentiles = [5, 10, 25, 50, 75, 90, 95]
    percentile_values = {p: round(float(np.percentile(final_values, p)), 2) for p in percentiles}

    # Yearly snapshots for fan chart
    yearly_data = []
    for y in range(years + 1):
        month_idx = y * 12
        values_at_year = all_paths[:, month_idx]
        yearly_data.append({
            "year": y,
            "p5": round(float(np.percentile(values_at_year, 5)), 2),
            "p10": round(float(np.percentile(values_at_year, 10)), 2),
            "p25": round(float(np.percentile(values_at_year, 25)), 2),
            "p50": round(float(np.percentile(values_at_year, 50)), 2),
            "p75": round(float(np.percentile(values_at_year, 75)), 2),
            "p90": round(float(np.percentile(values_at_year, 90)), 2),
            "p95": round(float(np.percentile(values_at_year, 95)), 2),
        })

    # Probability metrics
    prob_double = float(np.mean(final_values >= total_invested * 2)) * 100
    prob_positive = float(np.mean(final_values >= total_invested)) * 100

    return {
        "parameters": {
            "initial_investment": initial_investment,
            "monthly_sip": monthly_sip,
            "years": years,
            "n_simulations": n_simulations,
            "portfolio_expected_return": round(portfolio_return * 100, 2),
            "portfolio_volatility": round(portfolio_vol * 100, 2),
            "data_source": data_source,
        },
        "total_invested": round(total_invested, 2),
        "final_value_percentiles": percentile_values,
        "yearly_data": yearly_data,
        "statistics": {
            "mean": round(float(np.mean(final_values)), 2),
            "median": round(float(np.median(final_values)), 2),
            "std_dev": round(float(np.std(final_values)), 2),
            "min": round(float(np.min(final_values)), 2),
            "max": round(float(np.max(final_values)), 2),
            "prob_positive_return": round(prob_positive, 1),
            "prob_double": round(prob_double, 1),
        },
        "scenarios": {
            "worst_case": round(float(np.percentile(final_values, 5)), 2),
            "pessimistic": round(float(np.percentile(final_values, 25)), 2),
            "expected": round(float(np.percentile(final_values, 50)), 2),
            "optimistic": round(float(np.percentile(final_values, 75)), 2),
            "best_case": round(float(np.percentile(final_values, 95)), 2),
        },
    }
