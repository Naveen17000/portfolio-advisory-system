"""Model benchmarking: compare ML vs rule-based risk scoring."""
import logging
import numpy as np
from app.services.risk_engine import assess_risk
from app.services.ml_risk_model import predict_risk_score, FEATURE_LABELS

logger = logging.getLogger("portfolio_api")


# Representative test profiles for benchmarking
BENCHMARK_PROFILES = [
    {"label": "Conservative Student", "monthly_income": 15000, "monthly_expenses": 12000, "monthly_savings": 3000, "total_liabilities": 0, "emergency_fund_months": 1, "existing_investments": {}, "dependents_count": 0, "investment_horizon_years": 3, "life_stage": "student", "investment_experience": "none", "loss_tolerance": "low"},
    {"label": "Moderate Early Career", "monthly_income": 60000, "monthly_expenses": 35000, "monthly_savings": 25000, "total_liabilities": 200000, "emergency_fund_months": 4, "existing_investments": {"mutual_funds": True, "fd": True}, "dependents_count": 0, "investment_horizon_years": 15, "life_stage": "early_career", "investment_experience": "beginner", "loss_tolerance": "medium"},
    {"label": "Aggressive Investor", "monthly_income": 150000, "monthly_expenses": 60000, "monthly_savings": 90000, "total_liabilities": 0, "emergency_fund_months": 12, "existing_investments": {"stocks": True, "mutual_funds": True, "crypto": True}, "dependents_count": 0, "investment_horizon_years": 25, "life_stage": "early_career", "investment_experience": "advanced", "loss_tolerance": "high"},
    {"label": "Family Provider", "monthly_income": 100000, "monthly_expenses": 70000, "monthly_savings": 30000, "total_liabilities": 3000000, "emergency_fund_months": 6, "existing_investments": {"mutual_funds": True, "ppf": True}, "dependents_count": 2, "investment_horizon_years": 10, "life_stage": "family", "investment_experience": "intermediate", "loss_tolerance": "medium"},
    {"label": "Pre-Retirement", "monthly_income": 200000, "monthly_expenses": 80000, "monthly_savings": 120000, "total_liabilities": 500000, "emergency_fund_months": 18, "existing_investments": {"fd": True, "ppf": True, "mutual_funds": True, "real_estate": True}, "dependents_count": 1, "investment_horizon_years": 5, "life_stage": "pre_retirement", "investment_experience": "advanced", "loss_tolerance": "low"},
]


class MockProfile:
    def __init__(self, data):
        for k, v in data.items():
            setattr(self, k, v)


def run_benchmark() -> dict:
    """Compare ML and rule-based models across benchmark profiles."""
    results = []

    for profile_data in BENCHMARK_PROFILES:
        label = profile_data.pop("label")
        mock = MockProfile(profile_data)

        # Rule-based score
        rule_result = assess_risk(mock)
        rule_score = rule_result["overall_score"]

        # ML score
        try:
            ml_score = predict_risk_score(profile_data)
        except Exception:
            ml_score = None

        # Blended score (60% rule + 40% ML)
        blended = None
        if ml_score is not None:
            blended = round(rule_score * 0.6 + ml_score * 0.4, 2)

        results.append({
            "profile": label,
            "rule_based_score": round(rule_score, 2),
            "ml_score": round(ml_score, 2) if ml_score else None,
            "blended_score": blended,
            "rule_category": rule_result["risk_category"],
            "agreement": abs(rule_score - (ml_score or rule_score)) < 10 if ml_score else None,
        })

        profile_data["label"] = label  # restore

    # Compute agreement metrics
    valid = [r for r in results if r["ml_score"] is not None]
    if valid:
        diffs = [abs(r["rule_based_score"] - r["ml_score"]) for r in valid]
        agreement_rate = sum(1 for d in diffs if d < 10) / len(diffs) * 100
        avg_diff = np.mean(diffs)
        max_diff = max(diffs)
        correlation = np.corrcoef(
            [r["rule_based_score"] for r in valid],
            [r["ml_score"] for r in valid]
        )[0, 1] if len(valid) > 1 else None
    else:
        agreement_rate = avg_diff = max_diff = correlation = None

    # Feature importance from ML model
    try:
        from app.services.ml_risk_model import model
        if model is not None:
            importance = model.feature_importances_
            feature_names = list(FEATURE_LABELS.values())[:len(importance)]
            feature_importance = sorted(
                [{"feature": name, "importance": round(float(imp), 4)} for name, imp in zip(feature_names, importance)],
                key=lambda x: x["importance"],
                reverse=True,
            )
        else:
            feature_importance = []
    except Exception:
        feature_importance = []

    return {
        "benchmark_results": results,
        "metrics": {
            "agreement_rate_pct": round(agreement_rate, 1) if agreement_rate else None,
            "avg_score_difference": round(avg_diff, 2) if avg_diff else None,
            "max_score_difference": round(max_diff, 2) if max_diff else None,
            "correlation": round(float(correlation), 3) if correlation is not None else None,
            "blend_weights": {"rule_based": 0.6, "ml": 0.4},
        },
        "feature_importance": feature_importance,
        "model_info": {
            "rule_based": "Weighted sub-score model with life-stage modifiers",
            "ml": "Gradient Boosting Regressor trained on 5000 synthetic profiles with behavioral finance adjustments",
            "blending": "60% rule-based + 40% ML for stability and interpretability",
        },
    }
