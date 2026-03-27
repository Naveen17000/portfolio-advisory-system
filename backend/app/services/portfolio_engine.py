from app.utils.constants import (
    AssetClass,
    RiskCategory,
    LifeStage,
    BASE_ALLOCATIONS,
    LIFE_STAGE_ALLOCATION_DELTAS,
    EXPECTED_RETURNS,
)


def _lerp_allocations(
    alloc_a: dict[AssetClass, float],
    alloc_b: dict[AssetClass, float],
    t: float,
) -> dict[AssetClass, float]:
    """Linear interpolation between two allocation dicts."""
    result = {}
    for asset in AssetClass:
        a = alloc_a.get(asset, 0)
        b = alloc_b.get(asset, 0)
        result[asset] = a + t * (b - a)
    return result


def _normalize(allocations: dict[AssetClass, float]) -> dict[AssetClass, float]:
    """Clamp negatives to 0 and normalize to sum to 100."""
    clamped = {k: max(0, v) for k, v in allocations.items()}
    total = sum(clamped.values())
    if total == 0:
        count = len(clamped)
        return {k: round(100 / count, 2) for k in clamped}
    return {k: round(v / total * 100, 2) for k, v in clamped.items()}


def get_base_allocation(score: float) -> dict[AssetClass, float]:
    """Get base allocation with boundary interpolation."""
    if score <= 31:
        return dict(BASE_ALLOCATIONS[RiskCategory.CONSERVATIVE])
    elif score <= 40:
        t = (score - 31) / 9
        return _lerp_allocations(
            BASE_ALLOCATIONS[RiskCategory.CONSERVATIVE],
            BASE_ALLOCATIONS[RiskCategory.MODERATE],
            t,
        )
    elif score <= 61:
        return dict(BASE_ALLOCATIONS[RiskCategory.MODERATE])
    elif score <= 70:
        t = (score - 61) / 9
        return _lerp_allocations(
            BASE_ALLOCATIONS[RiskCategory.MODERATE],
            BASE_ALLOCATIONS[RiskCategory.AGGRESSIVE],
            t,
        )
    else:
        return dict(BASE_ALLOCATIONS[RiskCategory.AGGRESSIVE])


def apply_life_stage_adjustments(
    allocations: dict[AssetClass, float], life_stage: str
) -> dict[AssetClass, float]:
    """Apply life-stage deltas and re-normalize."""
    deltas = LIFE_STAGE_ALLOCATION_DELTAS.get(LifeStage(life_stage), {})
    adjusted = dict(allocations)
    for asset, delta in deltas.items():
        adjusted[asset] = adjusted.get(asset, 0) + delta
    return _normalize(adjusted)


def calc_expected_returns(allocations: dict[AssetClass, float]) -> tuple[float, float]:
    """Calculate weighted expected return range for the portfolio."""
    min_return = 0.0
    max_return = 0.0
    for asset, pct in allocations.items():
        weight = pct / 100
        ret_min, ret_max = EXPECTED_RETURNS.get(asset, (0, 0))
        min_return += weight * ret_min
        max_return += weight * ret_max
    return round(min_return, 2), round(max_return, 2)


def generate_rationale(asset: AssetClass, pct: float, risk_category: str, life_stage: str) -> str:
    """Generate human-readable rationale for each allocation."""
    asset_labels = {
        AssetClass.EQUITY_LARGE_CAP: "Large Cap Equity",
        AssetClass.EQUITY_MID_CAP: "Mid Cap Equity",
        AssetClass.EQUITY_SMALL_CAP: "Small Cap Equity",
        AssetClass.DEBT: "Debt/Fixed Income",
        AssetClass.GOLD_COMMODITIES: "Gold & Commodities",
        AssetClass.LIQUID_FUNDS: "Liquid Funds",
    }
    label = asset_labels.get(asset, asset.value)

    if pct == 0:
        return f"{label} excluded based on your {risk_category} risk profile."

    rationale_parts = [f"{pct:.1f}% allocated to {label}"]

    if asset in (AssetClass.EQUITY_LARGE_CAP, AssetClass.EQUITY_MID_CAP, AssetClass.EQUITY_SMALL_CAP):
        if risk_category == "aggressive":
            rationale_parts.append("for higher growth potential matching your risk tolerance")
        elif risk_category == "conservative":
            rationale_parts.append("for modest growth with lower volatility")
        else:
            rationale_parts.append("for balanced growth exposure")
    elif asset == AssetClass.DEBT:
        rationale_parts.append("for stable income and capital preservation")
    elif asset == AssetClass.GOLD_COMMODITIES:
        rationale_parts.append("as an inflation hedge and portfolio diversifier")
    elif asset == AssetClass.LIQUID_FUNDS:
        rationale_parts.append("for liquidity and short-term needs")

    stage_notes = {
        "student": "adjusted for limited income capacity",
        "early_career": "optimized for long-term wealth building",
        "family": "balanced for family financial security",
        "pre_retirement": "focused on capital preservation",
    }
    if life_stage in stage_notes:
        rationale_parts.append(stage_notes[life_stage])

    return ", ".join(rationale_parts) + "."


def generate_portfolio(score: float, risk_category: str, life_stage: str) -> dict:
    """Generate complete portfolio allocation."""
    base = get_base_allocation(score)
    final = apply_life_stage_adjustments(base, life_stage)
    ret_min, ret_max = calc_expected_returns(final)

    allocations = []
    for asset in AssetClass:
        pct = final.get(asset, 0)
        ret_range = EXPECTED_RETURNS.get(asset, (0, 0))
        allocations.append({
            "asset_class": asset.value,
            "allocation_pct": pct,
            "expected_return_min": ret_range[0],
            "expected_return_max": ret_range[1],
            "rationale": generate_rationale(asset, pct, risk_category, life_stage),
        })

    return {
        "expected_return_min": ret_min,
        "expected_return_max": ret_max,
        "allocations": allocations,
    }
