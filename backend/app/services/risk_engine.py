from app.models.financial_profile import FinancialProfile
from app.utils.constants import (
    LifeStage,
    RiskCategory,
    InvestmentExperience,
    LossTolerance,
    RISK_WEIGHTS,
    LIFE_STAGE_MODIFIERS,
    EXPERIENCE_SCORES,
    LOSS_TOLERANCE_SCORES,
)


def _interpolate(value: float, bands: list[tuple[float, float, float]]) -> float:
    """Linear interpolation across bands. Each band: (threshold, low_score, high_score)."""
    for i, (threshold, score_at, _) in enumerate(bands):
        if value >= threshold:
            if i == 0:
                return score_at
            prev_threshold, _, prev_score = bands[i - 1]
            denom = prev_threshold - threshold
            if denom == 0:
                return score_at
            t = (value - threshold) / denom
            return score_at + t * (prev_score - score_at)
    return bands[-1][1]


def calc_spending_ratio_score(income: float, expenses: float) -> float:
    if income <= 0:
        return 10.0
    ratio = expenses / income
    bands = [
        (0.90, 10, 10),
        (0.70, 30, 10),
        (0.50, 55, 30),
        (0.30, 75, 55),
        (0.0, 95, 75),
    ]
    return _interpolate(ratio, bands)


def calc_savings_consistency_score(income: float, savings: float, emergency_months: int) -> float:
    if income <= 0:
        return 0.0
    savings_ratio = savings / income
    base = min(savings_ratio / 0.40 * 70, 70)
    emergency_bonus = min(emergency_months / 12 * 30, 30)
    return min(base + emergency_bonus, 100)


def calc_investment_discipline_score(
    experience: str, loss_tolerance: str, existing_investments: dict
) -> float:
    exp_score = EXPERIENCE_SCORES.get(InvestmentExperience(experience), 10)
    loss_score = LOSS_TOLERANCE_SCORES.get(LossTolerance(loss_tolerance), 15)
    diversity_count = sum(1 for v in existing_investments.values() if v)
    diversity_score = min(diversity_count / 4 * 100, 100)

    return exp_score * 0.40 + loss_score * 0.35 + diversity_score * 0.25


def calc_liability_burden_score(income: float, liabilities: float) -> float:
    if income <= 0:
        return 10.0
    annual_income = income * 12
    if annual_income == 0:
        return 10.0
    ratio = liabilities / annual_income
    bands = [
        (5.0, 10, 10),
        (3.0, 30, 10),
        (1.0, 55, 30),
        (0.5, 75, 55),
        (0.0, 90, 75),
    ]
    return _interpolate(ratio, bands)


def calc_life_stage_modifier(life_stage: str, horizon_years: int) -> float:
    base = LIFE_STAGE_MODIFIERS.get(LifeStage(life_stage), 1.0)

    if horizon_years < 3:
        horizon_mod = 0.80
    elif horizon_years <= 7:
        horizon_mod = 0.95
    elif horizon_years <= 15:
        horizon_mod = 1.00
    else:
        horizon_mod = 1.10

    return base * horizon_mod


def classify_risk(score: float) -> RiskCategory:
    if score <= 35:
        return RiskCategory.CONSERVATIVE
    elif score <= 65:
        return RiskCategory.MODERATE
    else:
        return RiskCategory.AGGRESSIVE


def assess_risk(profile: FinancialProfile) -> dict:
    """Calculate full risk assessment from a financial profile."""
    spending_score = calc_spending_ratio_score(
        float(profile.monthly_income), float(profile.monthly_expenses)
    )
    savings_score = calc_savings_consistency_score(
        float(profile.monthly_income), float(profile.monthly_savings), profile.emergency_fund_months
    )
    discipline_score = calc_investment_discipline_score(
        profile.investment_experience, profile.loss_tolerance, profile.existing_investments or {}
    )
    liability_score = calc_liability_burden_score(
        float(profile.monthly_income), float(profile.total_liabilities)
    )
    life_modifier = calc_life_stage_modifier(profile.life_stage, profile.investment_horizon_years)

    raw_score = (
        spending_score * RISK_WEIGHTS["spending_ratio"]
        + savings_score * RISK_WEIGHTS["savings_consistency"]
        + discipline_score * RISK_WEIGHTS["investment_discipline"]
        + liability_score * RISK_WEIGHTS["liability_burden"]
    )

    overall_score = max(0, min(100, raw_score * life_modifier))
    category = classify_risk(overall_score)

    return {
        "overall_score": round(overall_score, 2),
        "risk_category": category.value,
        "spending_ratio_score": round(spending_score, 2),
        "savings_consistency_score": round(savings_score, 2),
        "investment_discipline_score": round(discipline_score, 2),
        "liability_burden_score": round(liability_score, 2),
        "life_stage_modifier": round(life_modifier, 2),
        "score_breakdown": {
            "weights": RISK_WEIGHTS,
            "raw_weighted_score": round(raw_score, 2),
            "life_stage": profile.life_stage,
            "investment_horizon_years": profile.investment_horizon_years,
            "sub_scores": {
                "spending_ratio": round(spending_score, 2),
                "savings_consistency": round(savings_score, 2),
                "investment_discipline": round(discipline_score, 2),
                "liability_burden": round(liability_score, 2),
            },
        },
    }
