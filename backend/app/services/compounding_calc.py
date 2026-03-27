"""Compounding and Dollar Cost Averaging calculator."""
import logging

logger = logging.getLogger("portfolio_api")


def compute_compounding(
    principal: float,
    monthly_sip: float = 0,
    annual_rate: float = 12,
    years: int = 20,
    inflation_rate: float = 6,
) -> dict:
    """Compute compounding growth with optional SIP."""
    monthly_rate = annual_rate / 100 / 12
    inflation_monthly = inflation_rate / 100 / 12

    # Lump sum only
    lump_sum_data = []
    sip_data = []
    combined_data = []

    lump_value = principal
    sip_value = 0.0
    combined_value = principal
    total_invested_sip = 0.0

    for month in range(years * 12 + 1):
        year = month / 12

        if month % 12 == 0:
            real_combined = combined_value / ((1 + inflation_rate/100) ** year) if year > 0 else combined_value
            lump_sum_data.append({"year": round(year), "value": round(lump_value)})
            sip_data.append({"year": round(year), "value": round(sip_value), "invested": round(total_invested_sip)})
            combined_data.append({
                "year": round(year),
                "value": round(combined_value),
                "real_value": round(real_combined),
                "invested": round(principal + total_invested_sip),
            })

        if month < years * 12:
            lump_value *= (1 + monthly_rate)
            sip_value = (sip_value + monthly_sip) * (1 + monthly_rate)
            combined_value = (combined_value + monthly_sip) * (1 + monthly_rate)
            total_invested_sip += monthly_sip

    total_invested = principal + total_invested_sip
    final_value = combined_data[-1]["value"] if combined_data else principal
    wealth_gain = final_value - total_invested
    real_final = combined_data[-1]["real_value"] if combined_data else principal

    return {
        "final_value": round(final_value),
        "total_invested": round(total_invested),
        "wealth_gain": round(wealth_gain),
        "real_value_after_inflation": round(real_final),
        "cagr_pct": annual_rate,
        "inflation_adjusted_return_pct": round(((1 + annual_rate/100) / (1 + inflation_rate/100) - 1) * 100, 2),
        "growth_multiplier": round(final_value / total_invested, 2) if total_invested > 0 else 0,
        "lump_sum_growth": lump_sum_data,
        "sip_growth": sip_data,
        "combined_growth": combined_data,
    }
