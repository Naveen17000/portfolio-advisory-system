"""What-if scenario engine: recalculate risk/portfolio with modified parameters."""
import logging
from app.services.risk_engine import assess_risk, classify_risk
from app.services.portfolio_engine import generate_portfolio

logger = logging.getLogger("portfolio_api")


class MockProfile:
    """Lightweight mock profile for what-if calculations."""
    def __init__(self, data: dict):
        for k, v in data.items():
            setattr(self, k, v)


def run_what_if(base_profile, overrides: dict) -> dict:
    """Run what-if analysis with overridden profile parameters."""
    profile_data = {
        "monthly_income": float(base_profile.monthly_income),
        "monthly_expenses": float(base_profile.monthly_expenses),
        "monthly_savings": float(base_profile.monthly_savings),
        "total_liabilities": float(base_profile.total_liabilities),
        "emergency_fund_months": base_profile.emergency_fund_months,
        "existing_investments": base_profile.existing_investments or {},
        "dependents_count": base_profile.dependents_count,
        "investment_horizon_years": base_profile.investment_horizon_years,
        "life_stage": base_profile.life_stage,
        "investment_experience": base_profile.investment_experience,
        "loss_tolerance": base_profile.loss_tolerance,
    }

    # Apply overrides
    for key, value in overrides.items():
        if key in profile_data:
            profile_data[key] = value

    # Recalculate savings if income or expenses changed
    if "monthly_income" in overrides or "monthly_expenses" in overrides:
        profile_data["monthly_savings"] = max(0, profile_data["monthly_income"] - profile_data["monthly_expenses"])

    mock = MockProfile(profile_data)

    # Run risk assessment
    base_risk = assess_risk(base_profile)
    new_risk = assess_risk(mock)

    # Run portfolio generation
    base_portfolio = generate_portfolio(base_risk["overall_score"], base_risk["risk_category"], base_profile.life_stage)
    new_portfolio = generate_portfolio(new_risk["overall_score"], new_risk["risk_category"], profile_data["life_stage"])

    return {
        "base_scenario": {
            "risk_score": base_risk["overall_score"],
            "risk_category": base_risk["risk_category"],
            "portfolio": base_portfolio,
        },
        "modified_scenario": {
            "risk_score": new_risk["overall_score"],
            "risk_category": new_risk["risk_category"],
            "portfolio": new_portfolio,
            "overrides_applied": overrides,
        },
        "impact": {
            "risk_score_change": round(new_risk["overall_score"] - base_risk["overall_score"], 2),
            "category_changed": base_risk["risk_category"] != new_risk["risk_category"],
            "new_category": new_risk["risk_category"],
        },
    }
