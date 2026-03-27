"""
Peer Benchmarking Engine.
Provides anonymized comparisons with similar user cohorts.
Uses synthetic cohort data since we can't expose real user data.
"""

import numpy as np

# Synthetic cohort benchmarks by life stage
COHORT_DATA = {
    "student": {
        "label": "Students (18-24)",
        "sample_size": 1250,
        "avg_savings_ratio": 0.08,
        "avg_spending_ratio": 0.82,
        "avg_emergency_months": 1.5,
        "avg_liability_ratio": 0.3,
        "avg_risk_score": 38,
        "avg_investment_diversity": 0.8,
        "common_allocation": {
            "equity_large_cap": 15,
            "equity_mid_cap": 5,
            "equity_small_cap": 0,
            "debt": 40,
            "gold_commodities": 10,
            "liquid_funds": 30,
        },
        "top_goals": ["Emergency Fund", "Education", "Wealth Building"],
    },
    "early_career": {
        "label": "Early Career (25-35)",
        "sample_size": 3400,
        "avg_savings_ratio": 0.18,
        "avg_spending_ratio": 0.68,
        "avg_emergency_months": 3.5,
        "avg_liability_ratio": 1.2,
        "avg_risk_score": 55,
        "avg_investment_diversity": 2.3,
        "common_allocation": {
            "equity_large_cap": 30,
            "equity_mid_cap": 15,
            "equity_small_cap": 10,
            "debt": 20,
            "gold_commodities": 10,
            "liquid_funds": 15,
        },
        "top_goals": ["Home Purchase", "Emergency Fund", "Wealth Building"],
    },
    "family": {
        "label": "Family (35-50)",
        "sample_size": 2800,
        "avg_savings_ratio": 0.15,
        "avg_spending_ratio": 0.72,
        "avg_emergency_months": 5.0,
        "avg_liability_ratio": 2.0,
        "avg_risk_score": 45,
        "avg_investment_diversity": 3.1,
        "common_allocation": {
            "equity_large_cap": 25,
            "equity_mid_cap": 10,
            "equity_small_cap": 5,
            "debt": 30,
            "gold_commodities": 15,
            "liquid_funds": 15,
        },
        "top_goals": ["Education", "Retirement", "Home Purchase"],
    },
    "pre_retirement": {
        "label": "Pre-Retirement (50+)",
        "sample_size": 1800,
        "avg_savings_ratio": 0.22,
        "avg_spending_ratio": 0.62,
        "avg_emergency_months": 8.5,
        "avg_liability_ratio": 0.5,
        "avg_risk_score": 30,
        "avg_investment_diversity": 3.8,
        "common_allocation": {
            "equity_large_cap": 15,
            "equity_mid_cap": 5,
            "equity_small_cap": 0,
            "debt": 45,
            "gold_commodities": 15,
            "liquid_funds": 20,
        },
        "top_goals": ["Retirement", "Emergency Fund", "Wealth Building"],
    },
}


def _percentile_rank(user_value: float, cohort_avg: float, std_factor: float = 0.3) -> int:
    """
    Estimate user's percentile rank within their cohort.
    Uses a normal distribution approximation.
    """
    if cohort_avg == 0:
        return 50
    std = cohort_avg * std_factor
    if std == 0:
        return 50 if user_value >= cohort_avg else 49

    from scipy.stats import norm
    z = (user_value - cohort_avg) / std
    percentile = int(norm.cdf(z) * 100)
    return max(1, min(99, percentile))


def generate_benchmark(profile_data: dict) -> dict:
    """
    Generate peer benchmark comparison for a user.
    """
    life_stage = profile_data.get("life_stage", "early_career")
    cohort = COHORT_DATA.get(life_stage, COHORT_DATA["early_career"])

    income = float(profile_data.get("monthly_income", 0))
    expenses = float(profile_data.get("monthly_expenses", 0))
    savings = float(profile_data.get("monthly_savings", 0))
    liabilities = float(profile_data.get("total_liabilities", 0))
    emergency_months = int(profile_data.get("emergency_fund_months", 0))
    risk_score = float(profile_data.get("risk_score", 50))
    annual_income = income * 12 if income > 0 else 1

    investments = profile_data.get("existing_investments", {})
    diversity = sum(1 for v in investments.values() if v)

    user_savings_ratio = savings / income if income > 0 else 0
    user_spending_ratio = expenses / income if income > 0 else 1
    user_liability_ratio = liabilities / annual_income

    # Generate comparisons
    comparisons = [
        {
            "metric": "Savings Rate",
            "user_value": round(user_savings_ratio * 100, 1),
            "cohort_avg": round(cohort["avg_savings_ratio"] * 100, 1),
            "unit": "%",
            "percentile": _percentile_rank(user_savings_ratio, cohort["avg_savings_ratio"]),
            "better": user_savings_ratio > cohort["avg_savings_ratio"],
            "insight": (
                f"You save {user_savings_ratio*100:.1f}% of income vs peer average of {cohort['avg_savings_ratio']*100:.1f}%"
            ),
        },
        {
            "metric": "Spending Ratio",
            "user_value": round(user_spending_ratio * 100, 1),
            "cohort_avg": round(cohort["avg_spending_ratio"] * 100, 1),
            "unit": "%",
            "percentile": _percentile_rank(cohort["avg_spending_ratio"], user_spending_ratio),  # Inverted: lower is better
            "better": user_spending_ratio < cohort["avg_spending_ratio"],
            "insight": (
                f"You spend {user_spending_ratio*100:.1f}% of income vs peer average of {cohort['avg_spending_ratio']*100:.1f}%"
            ),
        },
        {
            "metric": "Emergency Fund",
            "user_value": emergency_months,
            "cohort_avg": cohort["avg_emergency_months"],
            "unit": "months",
            "percentile": _percentile_rank(emergency_months, cohort["avg_emergency_months"]),
            "better": emergency_months > cohort["avg_emergency_months"],
            "insight": (
                f"Your emergency fund covers {emergency_months} months vs peer average of {cohort['avg_emergency_months']:.1f} months"
            ),
        },
        {
            "metric": "Debt-to-Income",
            "user_value": round(user_liability_ratio, 2),
            "cohort_avg": cohort["avg_liability_ratio"],
            "unit": "x",
            "percentile": _percentile_rank(cohort["avg_liability_ratio"], user_liability_ratio, 0.5),  # Inverted
            "better": user_liability_ratio < cohort["avg_liability_ratio"],
            "insight": (
                f"Your debt is {user_liability_ratio:.1f}x annual income vs peer average of {cohort['avg_liability_ratio']:.1f}x"
            ),
        },
        {
            "metric": "Risk Score",
            "user_value": round(risk_score, 1),
            "cohort_avg": cohort["avg_risk_score"],
            "unit": "/100",
            "percentile": _percentile_rank(risk_score, cohort["avg_risk_score"], 0.4),
            "better": None,  # Risk score isn't inherently better/worse
            "insight": (
                f"Your risk score is {risk_score:.0f} vs peer average of {cohort['avg_risk_score']}"
            ),
        },
        {
            "metric": "Investment Diversity",
            "user_value": diversity,
            "cohort_avg": cohort["avg_investment_diversity"],
            "unit": "classes",
            "percentile": _percentile_rank(diversity, cohort["avg_investment_diversity"]),
            "better": diversity > cohort["avg_investment_diversity"],
            "insight": (
                f"You're in {diversity} asset class(es) vs peer average of {cohort['avg_investment_diversity']:.1f}"
            ),
        },
    ]

    # Overall ranking
    better_count = sum(1 for c in comparisons if c["better"] is True)
    total_compared = sum(1 for c in comparisons if c["better"] is not None)

    # Generate overall summary
    strengths = [c["metric"] for c in comparisons if c["better"] is True]
    weaknesses = [c["metric"] for c in comparisons if c["better"] is False]

    if len(strengths) > len(weaknesses):
        overall = "above_average"
        summary = f"You're doing better than your peers in {len(strengths)} out of {total_compared} key metrics."
    elif len(strengths) < len(weaknesses):
        overall = "below_average"
        summary = f"There's room to improve — you trail peers in {len(weaknesses)} out of {total_compared} metrics."
    else:
        overall = "average"
        summary = "You're right on par with your peer group across most metrics."

    return {
        "cohort": {
            "label": cohort["label"],
            "sample_size": cohort["sample_size"],
            "life_stage": life_stage,
        },
        "comparisons": comparisons,
        "allocation_benchmark": cohort["common_allocation"],
        "top_goals": cohort["top_goals"],
        "overall": {
            "rating": overall,
            "better_count": better_count,
            "total_compared": total_compared,
            "summary": summary,
            "strengths": strengths,
            "weaknesses": weaknesses,
        },
    }
