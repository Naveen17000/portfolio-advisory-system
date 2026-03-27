"""
Black-Litterman Portfolio Optimization Model.

Combines market equilibrium returns with investor views to produce
optimal asset allocation. This implementation uses:
1. Market-implied equilibrium returns (from CAPM)
2. Investor views (derived from risk profile + sentiment)
3. Posterior distribution for final allocations
"""

import numpy as np
from app.utils.constants import AssetClass, EXPECTED_RETURNS

# Risk aversion parameter (lambda) - typical range 2.5 to 3.5
RISK_AVERSION = 2.5

# Market capitalization weights (approximate, India market)
MARKET_CAP_WEIGHTS = {
    AssetClass.EQUITY_LARGE_CAP: 0.35,
    AssetClass.EQUITY_MID_CAP: 0.12,
    AssetClass.EQUITY_SMALL_CAP: 0.05,
    AssetClass.DEBT: 0.30,
    AssetClass.GOLD_COMMODITIES: 0.10,
    AssetClass.LIQUID_FUNDS: 0.08,
}

# Covariance matrix (annualized, estimated from historical data)
# Order: large_cap, mid_cap, small_cap, debt, gold, liquid
COVARIANCE_MATRIX = np.array([
    [0.0256, 0.0200, 0.0180, 0.0020, 0.0040, 0.0005],  # Large Cap
    [0.0200, 0.0484, 0.0350, 0.0015, 0.0035, 0.0003],  # Mid Cap
    [0.0180, 0.0350, 0.0784, 0.0010, 0.0030, 0.0002],  # Small Cap
    [0.0020, 0.0015, 0.0010, 0.0016, 0.0008, 0.0004],  # Debt
    [0.0040, 0.0035, 0.0030, 0.0008, 0.0196, 0.0003],  # Gold
    [0.0005, 0.0003, 0.0002, 0.0004, 0.0003, 0.0004],  # Liquid
])

ASSET_ORDER = [
    AssetClass.EQUITY_LARGE_CAP,
    AssetClass.EQUITY_MID_CAP,
    AssetClass.EQUITY_SMALL_CAP,
    AssetClass.DEBT,
    AssetClass.GOLD_COMMODITIES,
    AssetClass.LIQUID_FUNDS,
]


def _get_market_weights() -> np.ndarray:
    """Get market capitalization weight vector."""
    weights = np.array([MARKET_CAP_WEIGHTS[a] for a in ASSET_ORDER])
    return weights / weights.sum()


def _compute_equilibrium_returns(sigma: np.ndarray, w_mkt: np.ndarray, risk_aversion: float) -> np.ndarray:
    """Compute implied equilibrium returns: Pi = lambda * Sigma * w_mkt"""
    return risk_aversion * sigma @ w_mkt


def _create_views_from_profile(risk_category: str, life_stage: str, sentiment: dict | None = None) -> tuple:
    """
    Create investor views matrix (P) and view returns (Q) based on user profile.

    Views represent the investor's beliefs about relative or absolute returns.
    """
    views = []
    confidences = []

    # View 1: Risk-based equity preference
    if risk_category == "aggressive":
        # Bullish on equity: Large cap will outperform debt by 6%
        views.append([0.5, 0.3, 0.2, -1, 0, 0])
        confidences.append(0.06)
    elif risk_category == "conservative":
        # Prefer stability: Debt will outperform small cap by 2%
        views.append([0, 0, -1, 0.7, 0.3, 0])
        confidences.append(0.02)
    else:
        # Balanced: Large cap will outperform small cap by 3%
        views.append([1, 0, -1, 0, 0, 0])
        confidences.append(0.03)

    # View 2: Life-stage based
    if life_stage in ("student", "early_career"):
        # Young investors: equity growth outperforms by 4%
        views.append([0.4, 0.3, 0.3, -0.5, -0.3, -0.2])
        confidences.append(0.04)
    elif life_stage == "pre_retirement":
        # Capital preservation: debt + gold outperform equity by 2%
        views.append([-0.3, -0.3, -0.4, 0.5, 0.3, 0.2])
        confidences.append(0.02)

    # View 3: Sentiment-based (if available)
    if sentiment and isinstance(sentiment, dict):
        overall_score = sentiment.get("overall_score", 0)
        if overall_score > 0.15:
            # Positive sentiment: equity boost
            views.append([0.4, 0.35, 0.25, 0, 0, 0])
            confidences.append(overall_score * 0.1)
        elif overall_score < -0.15:
            # Negative sentiment: defensive shift
            views.append([0, 0, 0, 0.4, 0.35, 0.25])
            confidences.append(abs(overall_score) * 0.1)

    if not views:
        return None, None

    P = np.array(views)
    Q = np.array(confidences)

    return P, Q


def optimize_black_litterman(
    risk_category: str,
    life_stage: str,
    sentiment: dict | None = None,
    tau: float = 0.05,
) -> dict:
    """
    Run Black-Litterman optimization.

    Args:
        risk_category: User's risk category
        life_stage: User's life stage
        sentiment: Optional market sentiment data
        tau: Scalar indicating uncertainty in equilibrium (typically 0.01-0.1)

    Returns:
        Optimized allocation with equilibrium returns, posterior returns, and weights
    """
    sigma = COVARIANCE_MATRIX
    w_mkt = _get_market_weights()

    # Step 1: Compute equilibrium returns
    pi = _compute_equilibrium_returns(sigma, w_mkt, RISK_AVERSION)

    # Step 2: Create investor views
    P, Q = _create_views_from_profile(risk_category, life_stage, sentiment)

    if P is not None and Q is not None:
        # Step 3: Compute uncertainty in views
        omega = np.diag(np.diag(tau * P @ sigma @ P.T))

        # Step 4: Posterior returns (Black-Litterman formula)
        # mu_BL = [(tau*Sigma)^-1 + P'*Omega^-1*P]^-1 * [(tau*Sigma)^-1*Pi + P'*Omega^-1*Q]
        tau_sigma_inv = np.linalg.inv(tau * sigma)
        omega_inv = np.linalg.inv(omega)

        M = np.linalg.inv(tau_sigma_inv + P.T @ omega_inv @ P)
        posterior_returns = M @ (tau_sigma_inv @ pi + P.T @ omega_inv @ Q)
    else:
        posterior_returns = pi

    # Step 5: Compute optimal weights
    # w* = (lambda * Sigma)^-1 * mu_BL
    optimal_weights = np.linalg.inv(RISK_AVERSION * sigma) @ posterior_returns

    # Normalize and ensure non-negative
    optimal_weights = np.maximum(optimal_weights, 0)
    total = optimal_weights.sum()
    if total > 0:
        optimal_weights = optimal_weights / total * 100
    else:
        # Fallback to market weights
        optimal_weights = w_mkt * 100

    # Build result
    allocations = {}
    equilibrium = {}
    posterior = {}

    for i, asset in enumerate(ASSET_ORDER):
        allocations[asset.value] = round(float(optimal_weights[i]), 2)
        equilibrium[asset.value] = round(float(pi[i]) * 100, 2)  # as percentage
        posterior[asset.value] = round(float(posterior_returns[i]) * 100, 2)

    return {
        "method": "Black-Litterman",
        "allocations": allocations,
        "equilibrium_returns": equilibrium,
        "posterior_returns": posterior,
        "market_weights": {a.value: round(float(w_mkt[i]) * 100, 2) for i, a in enumerate(ASSET_ORDER)},
        "parameters": {
            "risk_aversion": RISK_AVERSION,
            "tau": tau,
            "risk_category": risk_category,
            "life_stage": life_stage,
            "num_views": len(P) if P is not None else 0,
        },
    }
