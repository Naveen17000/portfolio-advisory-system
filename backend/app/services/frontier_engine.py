"""Efficient frontier and asset correlation computations."""
import logging
import numpy as np

logger = logging.getLogger("portfolio_api")

# Historical return/volatility estimates for asset classes (annualized %)
ASSET_STATS = {
    "equity_large_cap": {"return": 12.5, "volatility": 18.0},
    "equity_mid_cap": {"return": 14.0, "volatility": 22.0},
    "equity_small_cap": {"return": 16.0, "volatility": 28.0},
    "debt": {"return": 7.0, "volatility": 4.0},
    "gold_commodities": {"return": 9.0, "volatility": 14.0},
    "liquid_funds": {"return": 5.5, "volatility": 1.5},
}

# Correlation matrix (symmetric)
CORRELATION = np.array([
    [1.00, 0.85, 0.75, -0.10, 0.05, 0.02],
    [0.85, 1.00, 0.88, -0.05, 0.08, 0.03],
    [0.75, 0.88, 1.00, -0.02, 0.10, 0.05],
    [-0.10, -0.05, -0.02, 1.00, 0.20, 0.80],
    [0.05, 0.08, 0.10, 0.20, 1.00, 0.10],
    [0.02, 0.03, 0.05, 0.80, 0.10, 1.00],
])

ASSET_NAMES = list(ASSET_STATS.keys())


def get_correlation_matrix() -> dict:
    """Return correlation matrix for asset classes."""
    labels = [k.replace("_", " ").title() for k in ASSET_NAMES]
    matrix = []
    for i, row_name in enumerate(labels):
        row = {}
        for j, col_name in enumerate(labels):
            row[col_name] = round(float(CORRELATION[i][j]), 2)
        matrix.append({"asset": row_name, "correlations": row})
    return {"labels": labels, "matrix": matrix}


def compute_efficient_frontier(n_portfolios: int = 500) -> dict:
    """Generate efficient frontier points using random portfolio simulation."""
    returns = np.array([ASSET_STATS[a]["return"] for a in ASSET_NAMES]) / 100
    vols = np.array([ASSET_STATS[a]["volatility"] for a in ASSET_NAMES]) / 100
    cov_matrix = np.outer(vols, vols) * CORRELATION

    results = []
    np.random.seed(42)

    for _ in range(n_portfolios):
        weights = np.random.dirichlet(np.ones(len(ASSET_NAMES)))
        port_return = np.dot(weights, returns) * 100
        port_vol = np.sqrt(weights @ cov_matrix @ weights) * 100
        sharpe = (port_return - 5.5) / port_vol  # 5.5% risk-free
        results.append({
            "return": round(float(port_return), 2),
            "volatility": round(float(port_vol), 2),
            "sharpe": round(float(sharpe), 3),
        })

    # Find optimal (max Sharpe) and minimum variance portfolios
    best_sharpe = max(results, key=lambda r: r["sharpe"])
    min_vol = min(results, key=lambda r: r["volatility"])

    # Individual asset points
    asset_points = []
    for i, name in enumerate(ASSET_NAMES):
        asset_points.append({
            "name": name.replace("_", " ").title(),
            "return": ASSET_STATS[name]["return"],
            "volatility": ASSET_STATS[name]["volatility"],
        })

    return {
        "frontier_points": sorted(results, key=lambda r: r["volatility"]),
        "optimal_portfolio": best_sharpe,
        "min_variance_portfolio": min_vol,
        "asset_points": asset_points,
        "risk_free_rate": 5.5,
    }
