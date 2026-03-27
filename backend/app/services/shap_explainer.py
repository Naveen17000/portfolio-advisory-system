"""
SHAP-based explainability for risk scores.
Provides feature-level contribution analysis and human-readable insights.
"""

import numpy as np
import pandas as pd
import shap

from app.services.ml_risk_model import (
    load_model,
    _prepare_features,
    FEATURE_COLUMNS,
    FEATURE_LABELS,
)


def explain_risk_score(profile_data: dict) -> dict:
    """Generate SHAP explanation for a risk score prediction."""
    model, encoders = load_model()

    diversity_count = sum(1 for v in profile_data.get("existing_investments", {}).values() if v)

    df = pd.DataFrame([{
        "monthly_income": float(profile_data["monthly_income"]),
        "monthly_expenses": float(profile_data["monthly_expenses"]),
        "monthly_savings": float(profile_data["monthly_savings"]),
        "total_liabilities": float(profile_data["total_liabilities"]),
        "emergency_fund_months": int(profile_data["emergency_fund_months"]),
        "investment_diversity_count": diversity_count,
        "dependents_count": int(profile_data["dependents_count"]),
        "investment_horizon_years": int(profile_data["investment_horizon_years"]),
        "life_stage": profile_data["life_stage"],
        "investment_experience": profile_data["investment_experience"],
        "loss_tolerance": profile_data["loss_tolerance"],
    }])

    X, _ = _prepare_features(df, encoders=encoders, fit=False)

    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(X)

    base_value = float(explainer.expected_value)
    feature_contributions = {}
    insights = []

    for i, col in enumerate(FEATURE_COLUMNS):
        val = float(shap_values[0][i])
        feature_contributions[col] = {
            "shap_value": round(val, 4),
            "feature_value": float(X.iloc[0, i]),
            "label": FEATURE_LABELS.get(col, col),
            "direction": "increases" if val > 0 else "decreases",
            "impact": "high" if abs(val) > 3 else "medium" if abs(val) > 1 else "low",
        }

    # Sort by absolute impact
    sorted_features = sorted(
        feature_contributions.items(),
        key=lambda x: abs(x[1]["shap_value"]),
        reverse=True,
    )

    # Generate human-readable insights for top contributors
    for feat_name, feat_data in sorted_features[:5]:
        label = feat_data["label"]
        direction = feat_data["direction"]
        impact = feat_data["impact"]
        shap_val = feat_data["shap_value"]

        insight = _generate_insight(feat_name, feat_data, profile_data)
        if insight:
            insights.append({
                "feature": label,
                "impact": impact,
                "direction": direction,
                "shap_value": round(shap_val, 2),
                "explanation": insight,
            })

    return {
        "base_value": round(base_value, 2),
        "feature_contributions": {k: v for k, v in sorted_features},
        "top_insights": insights,
        "summary": _generate_summary(insights),
    }


def _generate_insight(feature_name: str, feat_data: dict, profile: dict) -> str:
    """Generate a human-readable insight for a feature contribution."""
    direction = feat_data["direction"]
    impact = feat_data["impact"]

    if impact == "low":
        return ""

    insights_map = {
        "spending_ratio": {
            "increases": "Your spending relative to income is low, suggesting higher risk capacity.",
            "decreases": "High spending ratio reduces your risk tolerance — more of your income goes to expenses.",
        },
        "savings_ratio": {
            "increases": "Strong savings rate indicates financial discipline, supporting higher risk tolerance.",
            "decreases": "Lower savings rate limits your ability to absorb investment losses.",
        },
        "liability_ratio": {
            "increases": "Low debt-to-income ratio gives you more flexibility for risk-taking.",
            "decreases": "Significant liabilities reduce your risk capacity — debt obligations take priority.",
        },
        "loss_tolerance_encoded": {
            "increases": "Your stated willingness to accept losses supports a more aggressive allocation.",
            "decreases": "Your preference to minimize losses indicates a more conservative approach.",
        },
        "investment_experience_encoded": {
            "increases": "Your investment experience gives you an edge in managing volatile portfolios.",
            "decreases": "Limited investment experience suggests starting with more stable investments.",
        },
        "emergency_fund_months": {
            "increases": "A strong emergency fund provides a safety net, allowing more investment risk.",
            "decreases": "Building a larger emergency fund would provide more investment flexibility.",
        },
        "investment_horizon_years": {
            "increases": "A longer time horizon allows you to ride out market volatility.",
            "decreases": "A shorter time horizon means less time to recover from potential losses.",
        },
        "investment_diversity_count": {
            "increases": "Existing diversification across asset classes shows investment maturity.",
            "decreases": "Limited diversification in current investments suggests room for growth.",
        },
        "life_stage_encoded": {
            "increases": "Your current life stage supports taking calculated investment risks.",
            "decreases": "Your life stage calls for a more cautious approach to investing.",
        },
        "dependents_count": {
            "increases": "Fewer dependents allow for more aggressive investment strategies.",
            "decreases": "Financial dependents mean prioritizing stability and security.",
        },
        "monthly_income": {
            "increases": "Higher income provides greater capacity to absorb investment risk.",
            "decreases": "Income level suggests being more selective with risk exposure.",
        },
        "monthly_expenses": {
            "increases": "Lower expense levels free up capital for investment.",
            "decreases": "Higher expenses limit disposable income for risk-taking.",
        },
        "monthly_savings": {
            "increases": "Strong monthly savings demonstrate financial discipline.",
            "decreases": "Building up monthly savings would strengthen your investment position.",
        },
        "total_liabilities": {
            "increases": "Low total debt supports a more flexible investment approach.",
            "decreases": "Reducing total liabilities would improve your risk capacity.",
        },
    }

    feat_insights = insights_map.get(feature_name, {})
    return feat_insights.get(direction, "")


def _generate_summary(insights: list[dict]) -> str:
    """Generate an overall summary from top insights."""
    if not insights:
        return "Your risk profile is balanced across all factors."

    increasing = [i for i in insights if i["direction"] == "increases" and i["impact"] != "low"]
    decreasing = [i for i in insights if i["direction"] == "decreases" and i["impact"] != "low"]

    parts = []
    if increasing:
        factors = ", ".join(i["feature"].lower() for i in increasing[:3])
        parts.append(f"Your {factors} contribute positively to your risk tolerance")
    if decreasing:
        factors = ", ".join(i["feature"].lower() for i in decreasing[:3])
        parts.append(f"while {factors} suggest some caution")

    return ". ".join(parts) + "." if parts else "Your risk profile is well-balanced."
