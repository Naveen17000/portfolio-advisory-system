"""
Goal-Based Investment Mapping Engine.
Maps user financial goals to investment strategies with SIP calculations
and probability of success via Monte Carlo simulations.
"""

import numpy as np
from app.services.monte_carlo import run_simulation
from app.utils.constants import AssetClass, EXPECTED_RETURNS


GOAL_TEMPLATES = {
    "emergency_fund": {
        "label": "Emergency Fund",
        "description": "Build a safety net covering 6-12 months of expenses",
        "default_horizon": 2,
        "priority": "high",
        "risk_preference": "conservative",
    },
    "education": {
        "label": "Education Fund",
        "description": "Save for higher education expenses",
        "default_horizon": 5,
        "priority": "high",
        "risk_preference": "moderate",
    },
    "home_purchase": {
        "label": "Home Purchase",
        "description": "Save for a home down payment",
        "default_horizon": 7,
        "priority": "medium",
        "risk_preference": "moderate",
    },
    "car_purchase": {
        "label": "Car Purchase",
        "description": "Save for a vehicle purchase",
        "default_horizon": 3,
        "priority": "medium",
        "risk_preference": "conservative",
    },
    "vacation": {
        "label": "Vacation Fund",
        "description": "Save for a major vacation or travel",
        "default_horizon": 2,
        "priority": "low",
        "risk_preference": "conservative",
    },
    "retirement": {
        "label": "Retirement Corpus",
        "description": "Build long-term retirement wealth",
        "default_horizon": 20,
        "priority": "high",
        "risk_preference": "aggressive",
    },
    "wealth_building": {
        "label": "Wealth Building",
        "description": "General long-term wealth accumulation",
        "default_horizon": 10,
        "priority": "medium",
        "risk_preference": "moderate",
    },
}

# Simplified allocation per risk preference for goal-specific portfolios
GOAL_ALLOCATIONS = {
    "conservative": {
        "equity_large_cap": 10,
        "equity_mid_cap": 0,
        "equity_small_cap": 0,
        "debt": 55,
        "gold_commodities": 10,
        "liquid_funds": 25,
    },
    "moderate": {
        "equity_large_cap": 30,
        "equity_mid_cap": 10,
        "equity_small_cap": 5,
        "debt": 30,
        "gold_commodities": 10,
        "liquid_funds": 15,
    },
    "aggressive": {
        "equity_large_cap": 35,
        "equity_mid_cap": 20,
        "equity_small_cap": 15,
        "debt": 15,
        "gold_commodities": 10,
        "liquid_funds": 5,
    },
}


def get_goal_templates() -> list[dict]:
    """Return available goal templates."""
    return [
        {"id": k, **v} for k, v in GOAL_TEMPLATES.items()
    ]


def calculate_required_sip(
    target_amount: float,
    years: int,
    expected_annual_return: float,
) -> float:
    """Calculate monthly SIP needed to reach target amount."""
    monthly_rate = expected_annual_return / 100 / 12
    months = years * 12

    if monthly_rate == 0:
        return target_amount / months

    # Future value of annuity formula: FV = SIP * [((1+r)^n - 1) / r]
    fv_factor = ((1 + monthly_rate) ** months - 1) / monthly_rate
    return target_amount / fv_factor


def calculate_portfolio_return(allocations: dict[str, float]) -> float:
    """Calculate weighted average expected return for an allocation."""
    total_return = 0.0
    for asset_str, pct in allocations.items():
        try:
            asset = AssetClass(asset_str)
        except ValueError:
            continue
        ret_min, ret_max = EXPECTED_RETURNS.get(asset, (0, 0))
        total_return += (pct / 100) * (ret_min + ret_max) / 2
    return total_return


def analyze_goal(
    goal_type: str,
    target_amount: float,
    current_savings: float = 0,
    years: int | None = None,
    risk_preference: str | None = None,
) -> dict:
    """
    Analyze a financial goal and provide investment strategy.

    Returns SIP requirements, recommended allocation, and success probability.
    """
    template = GOAL_TEMPLATES.get(goal_type, GOAL_TEMPLATES["wealth_building"])
    horizon = years or template["default_horizon"]
    risk_pref = risk_preference or template["risk_preference"]

    allocations = GOAL_ALLOCATIONS[risk_pref]
    expected_return = calculate_portfolio_return(allocations)

    # Amount still needed
    remaining = max(target_amount - current_savings, 0)

    # Required monthly SIP
    required_sip = calculate_required_sip(remaining, horizon, expected_return)

    # Run Monte Carlo to get success probability
    sim = run_simulation(
        allocations=allocations,
        initial_investment=current_savings,
        monthly_sip=required_sip,
        years=horizon,
        n_simulations=1000,
    )

    # Probability of reaching target
    # Use the simulation data to estimate
    final_median = sim["final_value_percentiles"][50]
    prob_success = sim["statistics"]["prob_positive_return"]

    # Adjust probability based on target vs median outcome
    if final_median >= target_amount:
        # If median exceeds target, high probability
        prob_success = min(95, prob_success)
    else:
        # Scale down based on how far median is from target
        ratio = final_median / max(target_amount, 1)
        prob_success = max(10, min(90, ratio * 100))

    # Calculate alternative SIP scenarios
    sip_scenarios = []
    for multiplier, label in [(0.75, "Relaxed"), (1.0, "Recommended"), (1.25, "Aggressive"), (1.5, "Accelerated")]:
        sip = required_sip * multiplier
        alt_sim = run_simulation(
            allocations=allocations,
            initial_investment=current_savings,
            monthly_sip=sip,
            years=horizon,
            n_simulations=500,
        )
        sip_scenarios.append({
            "label": label,
            "monthly_sip": round(sip, 2),
            "expected_final": alt_sim["scenarios"]["expected"],
            "prob_reaching_target": round(
                min(95, (alt_sim["scenarios"]["expected"] / max(target_amount, 1)) * 100), 1
            ),
        })

    return {
        "goal": {
            "type": goal_type,
            "label": template["label"],
            "description": template["description"],
            "target_amount": target_amount,
            "current_savings": current_savings,
            "remaining": round(remaining, 2),
            "horizon_years": horizon,
        },
        "recommendation": {
            "risk_preference": risk_pref,
            "allocation": allocations,
            "expected_annual_return": round(expected_return, 2),
            "required_monthly_sip": round(required_sip, 2),
            "probability_of_success": round(prob_success, 1),
        },
        "simulation": sim,
        "sip_scenarios": sip_scenarios,
    }
