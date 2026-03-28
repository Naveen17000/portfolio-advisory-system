"""
Monte Carlo Simulation Engine for portfolio outcome prediction.
Uses real historical data from yfinance when available, falls back to estimates.
Runs thousands of simulations to produce probability distributions.

Enhanced with:
- Fat-tailed returns via Student-t distribution (df=5)
- Markov regime switching (bull/bear markets)
"""

import numpy as np
from scipy.stats import t as student_t
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

# Regime parameters
DEGREES_OF_FREEDOM = 5

# Regime multipliers
BULL_RETURN_MULT = 1.2
BULL_VOL_MULT = 0.8
BEAR_RETURN_MULT = 0.5
BEAR_VOL_MULT = 1.5

# Markov transition matrix: rows = from, cols = to; [bull, bear]
# P(bull->bull)=0.92, P(bull->bear)=0.08
# P(bear->bull)=0.20, P(bear->bear)=0.80
TRANSITION_MATRIX = np.array([
    [0.92, 0.08],  # from bull
    [0.20, 0.80],  # from bear
])

REGIME_BULL = 0
REGIME_BEAR = 1


def _get_real_stats() -> dict | None:
    """Try to load real historical stats from market data service."""
    try:
        from app.services.market_data import get_asset_class_historical_stats
        return get_asset_class_historical_stats()
    except Exception:
        return None


def _generate_regime_paths(rng: np.random.RandomState, n_simulations: int, months: int) -> np.ndarray:
    """
    Generate regime indicator paths using Markov chain transitions.
    Returns array of shape (n_simulations, months) with 0=bull, 1=bear.
    Initial state: bull (regime 0) for all simulations.
    """
    regimes = np.zeros((n_simulations, months), dtype=np.int8)
    # Start all simulations in bull regime
    regimes[:, 0] = REGIME_BULL

    for t in range(1, months):
        uniform_draws = rng.uniform(0, 1, n_simulations)
        current = regimes[:, t - 1]
        # Probability of staying in current regime (transition to state 0 = bull)
        # If current is bull (0): P(stay bull) = 0.92, so switch if draw > 0.92
        # If current is bear (1): P(switch to bull) = 0.20, so switch if draw < 0.20
        prob_bull = np.where(current == REGIME_BULL, TRANSITION_MATRIX[0, 0], TRANSITION_MATRIX[1, 0])
        regimes[:, t] = np.where(uniform_draws < prob_bull, REGIME_BULL, REGIME_BEAR)

    return regimes


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

    Features:
    - Student-t distribution (df=5) for fat-tailed returns
    - Markov regime switching between bull and bear markets
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

    # Monthly parameters (base, before regime adjustment)
    monthly_return = portfolio_return / 12
    monthly_vol = portfolio_vol / np.sqrt(12)

    # Generate regime paths via Markov chain
    regime_paths = _generate_regime_paths(rng, n_simulations, months)

    # Scale factor for Student-t so that variance matches: std(t) = sqrt(df/(df-2))
    # We divide by this to normalize variance to 1, then scale by monthly_vol
    t_scale = np.sqrt(DEGREES_OF_FREEDOM / (DEGREES_OF_FREEDOM - 2))

    # Simulate paths
    all_paths = np.zeros((n_simulations, months + 1))
    all_paths[:, 0] = initial_investment

    for t in range(1, months + 1):
        regime = regime_paths[:, t - 1]  # regime for this month (0=bull, 1=bear)

        # Regime-adjusted return and volatility
        return_mult = np.where(regime == REGIME_BULL, BULL_RETURN_MULT, BEAR_RETURN_MULT)
        vol_mult = np.where(regime == REGIME_BULL, BULL_VOL_MULT, BEAR_VOL_MULT)

        adj_return = monthly_return * return_mult
        adj_vol = monthly_vol * vol_mult

        # Fat-tailed random draws: Student-t normalized to unit variance, then scaled
        t_draws = student_t.rvs(DEGREES_OF_FREEDOM, random_state=rng, size=n_simulations)
        normalized_draws = t_draws / t_scale  # normalize to unit variance

        random_returns = adj_return + adj_vol * normalized_draws
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

    # Regime analysis
    total_regime_months = regime_paths.size  # n_simulations * months
    bull_count = int(np.sum(regime_paths == REGIME_BULL))
    bear_count = int(np.sum(regime_paths == REGIME_BEAR))
    bull_months_pct = round(bull_count / total_regime_months * 100, 1)
    bear_months_pct = round(bear_count / total_regime_months * 100, 1)

    # Calculate average duration of each regime across all simulations
    avg_bull_duration = _calc_avg_regime_duration(regime_paths, REGIME_BULL)
    avg_bear_duration = _calc_avg_regime_duration(regime_paths, REGIME_BEAR)

    return {
        "parameters": {
            "initial_investment": initial_investment,
            "monthly_sip": monthly_sip,
            "years": years,
            "n_simulations": n_simulations,
            "portfolio_expected_return": round(portfolio_return * 100, 2),
            "portfolio_volatility": round(portfolio_vol * 100, 2),
            "data_source": data_source,
            "model": "fat_tailed_regime_switching",
            "distribution": "student_t",
            "degrees_of_freedom": DEGREES_OF_FREEDOM,
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
        "regime_analysis": {
            "bull_months_pct": bull_months_pct,
            "bear_months_pct": bear_months_pct,
            "avg_bull_duration_months": avg_bull_duration,
            "avg_bear_duration_months": avg_bear_duration,
        },
    }


def _calc_avg_regime_duration(regime_paths: np.ndarray, target_regime: int) -> float:
    """
    Calculate average consecutive duration (in months) of the target regime
    across all simulation paths.
    """
    durations = []
    for sim_idx in range(regime_paths.shape[0]):
        path = regime_paths[sim_idx]
        count = 0
        for month_val in path:
            if month_val == target_regime:
                count += 1
            else:
                if count > 0:
                    durations.append(count)
                count = 0
        if count > 0:
            durations.append(count)

    if not durations:
        return 0.0
    return round(float(np.mean(durations)), 1)
