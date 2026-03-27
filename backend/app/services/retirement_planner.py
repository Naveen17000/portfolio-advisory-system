"""Retirement readiness calculator."""
import logging
import numpy as np

logger = logging.getLogger("portfolio_api")


def compute_retirement_plan(
    current_age: int,
    retirement_age: int,
    monthly_expenses: float,
    monthly_savings: float,
    current_corpus: float = 0,
    expected_return: float = 10,
    inflation_rate: float = 6,
    life_expectancy: int = 85,
) -> dict:
    """Compute retirement readiness and projections."""
    years_to_retire = max(0, retirement_age - current_age)
    years_in_retirement = max(0, life_expectancy - retirement_age)

    # Future monthly expenses at retirement (inflation-adjusted)
    future_monthly_expense = monthly_expenses * ((1 + inflation_rate/100) ** years_to_retire)
    future_annual_expense = future_monthly_expense * 12

    # Required corpus using real rate of return
    real_return = ((1 + expected_return/100) / (1 + inflation_rate/100)) - 1
    if real_return > 0 and years_in_retirement > 0:
        required_corpus = future_annual_expense * (1 - (1 + real_return) ** (-years_in_retirement)) / real_return
    else:
        required_corpus = future_annual_expense * years_in_retirement

    # Projected corpus at retirement
    annual_return = expected_return / 100
    projected_corpus = current_corpus * ((1 + annual_return) ** years_to_retire)

    # Add SIP growth
    if annual_return > 0 and years_to_retire > 0:
        monthly_rate = annual_return / 12
        months = years_to_retire * 12
        sip_fv = monthly_savings * (((1 + monthly_rate) ** months - 1) / monthly_rate) * (1 + monthly_rate)
        projected_corpus += sip_fv

    readiness_pct = min(100, round(projected_corpus / required_corpus * 100, 1)) if required_corpus > 0 else 100
    shortfall = max(0, required_corpus - projected_corpus)

    # Safe withdrawal rate analysis
    swr_4pct = projected_corpus * 0.04 / 12
    swr_3pct = projected_corpus * 0.03 / 12

    # Additional SIP needed to close gap
    additional_sip = 0
    if shortfall > 0 and years_to_retire > 0:
        monthly_rate = annual_return / 12
        months = years_to_retire * 12
        if monthly_rate > 0:
            additional_sip = shortfall / (((1 + monthly_rate) ** months - 1) / monthly_rate * (1 + monthly_rate))

    # Year-by-year projection (glide path)
    projections = []
    corpus = current_corpus
    for year in range(years_to_retire + 1):
        age = current_age + year
        equity_pct = max(20, min(80, 100 - age))  # Age-based glide path
        projections.append({
            "year": year,
            "age": age,
            "corpus": round(corpus),
            "equity_allocation_pct": equity_pct,
            "debt_allocation_pct": 100 - equity_pct,
        })
        corpus = corpus * (1 + annual_return) + monthly_savings * 12

    grade = "A" if readiness_pct >= 90 else "B" if readiness_pct >= 70 else "C" if readiness_pct >= 50 else "D" if readiness_pct >= 30 else "F"

    return {
        "readiness_pct": readiness_pct,
        "grade": grade,
        "required_corpus": round(required_corpus),
        "projected_corpus": round(projected_corpus),
        "shortfall": round(shortfall),
        "years_to_retire": years_to_retire,
        "years_in_retirement": years_in_retirement,
        "future_monthly_expense": round(future_monthly_expense),
        "safe_withdrawal_4pct_monthly": round(swr_4pct),
        "safe_withdrawal_3pct_monthly": round(swr_3pct),
        "additional_sip_needed": round(additional_sip),
        "projections": projections,
        "assumptions": {
            "expected_return_pct": expected_return,
            "inflation_rate_pct": inflation_rate,
            "life_expectancy": life_expectancy,
        },
    }
