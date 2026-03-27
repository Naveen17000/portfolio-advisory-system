"""Unit tests for the portfolio allocation engine."""

import pytest

from app.services.portfolio_engine import (
    _lerp_allocations,
    _normalize,
    get_base_allocation,
    apply_life_stage_adjustments,
    calc_expected_returns,
    generate_rationale,
    generate_portfolio,
)
from app.utils.constants import AssetClass, RiskCategory, BASE_ALLOCATIONS


# ---------------------------------------------------------------------------
# _lerp_allocations
# ---------------------------------------------------------------------------
class TestLerpAllocations:
    def test_t_zero_returns_first(self):
        a = {AssetClass.EQUITY_LARGE_CAP: 10, AssetClass.DEBT: 50}
        b = {AssetClass.EQUITY_LARGE_CAP: 35, AssetClass.DEBT: 10}
        result = _lerp_allocations(a, b, 0.0)
        assert result[AssetClass.EQUITY_LARGE_CAP] == 10
        assert result[AssetClass.DEBT] == 50

    def test_t_one_returns_second(self):
        a = {AssetClass.EQUITY_LARGE_CAP: 10, AssetClass.DEBT: 50}
        b = {AssetClass.EQUITY_LARGE_CAP: 35, AssetClass.DEBT: 10}
        result = _lerp_allocations(a, b, 1.0)
        assert result[AssetClass.EQUITY_LARGE_CAP] == 35
        assert result[AssetClass.DEBT] == 10

    def test_t_half_returns_midpoint(self):
        a = {AssetClass.EQUITY_LARGE_CAP: 10, AssetClass.DEBT: 50}
        b = {AssetClass.EQUITY_LARGE_CAP: 30, AssetClass.DEBT: 10}
        result = _lerp_allocations(a, b, 0.5)
        assert result[AssetClass.EQUITY_LARGE_CAP] == 20
        assert result[AssetClass.DEBT] == 30


# ---------------------------------------------------------------------------
# _normalize
# ---------------------------------------------------------------------------
class TestNormalize:
    def test_sums_to_100(self):
        alloc = {
            AssetClass.EQUITY_LARGE_CAP: 30,
            AssetClass.DEBT: 30,
            AssetClass.LIQUID_FUNDS: 40,
        }
        result = _normalize(alloc)
        assert pytest.approx(sum(result.values()), abs=0.1) == 100

    def test_negatives_clamped(self):
        alloc = {
            AssetClass.EQUITY_LARGE_CAP: -10,
            AssetClass.DEBT: 50,
            AssetClass.LIQUID_FUNDS: 60,
        }
        result = _normalize(alloc)
        assert result[AssetClass.EQUITY_LARGE_CAP] == 0.0
        assert pytest.approx(sum(result.values()), abs=0.1) == 100

    def test_all_zeros_equal_distribution(self):
        alloc = {asset: 0 for asset in AssetClass}
        result = _normalize(alloc)
        expected = round(100 / len(AssetClass), 2)
        for v in result.values():
            assert v == expected


# ---------------------------------------------------------------------------
# get_base_allocation
# ---------------------------------------------------------------------------
class TestGetBaseAllocation:
    def test_conservative_range(self):
        alloc = get_base_allocation(20)
        assert alloc == dict(BASE_ALLOCATIONS[RiskCategory.CONSERVATIVE])

    def test_moderate_range(self):
        alloc = get_base_allocation(50)
        assert alloc == dict(BASE_ALLOCATIONS[RiskCategory.MODERATE])

    def test_aggressive_range(self):
        alloc = get_base_allocation(80)
        assert alloc == dict(BASE_ALLOCATIONS[RiskCategory.AGGRESSIVE])

    def test_boundary_interpolation_conservative_to_moderate(self):
        alloc = get_base_allocation(35)
        # Should be between conservative and moderate
        cons = BASE_ALLOCATIONS[RiskCategory.CONSERVATIVE]
        mod = BASE_ALLOCATIONS[RiskCategory.MODERATE]
        for asset in AssetClass:
            lo = min(cons.get(asset, 0), mod.get(asset, 0))
            hi = max(cons.get(asset, 0), mod.get(asset, 0))
            assert lo <= alloc.get(asset, 0) <= hi + 0.01

    def test_boundary_interpolation_moderate_to_aggressive(self):
        alloc = get_base_allocation(65)
        mod = BASE_ALLOCATIONS[RiskCategory.MODERATE]
        agg = BASE_ALLOCATIONS[RiskCategory.AGGRESSIVE]
        for asset in AssetClass:
            lo = min(mod.get(asset, 0), agg.get(asset, 0))
            hi = max(mod.get(asset, 0), agg.get(asset, 0))
            assert lo <= alloc.get(asset, 0) <= hi + 0.01


# ---------------------------------------------------------------------------
# apply_life_stage_adjustments
# ---------------------------------------------------------------------------
class TestLifeStageAdjustments:
    def test_student_reduces_equity(self):
        base = dict(BASE_ALLOCATIONS[RiskCategory.MODERATE])
        adjusted = apply_life_stage_adjustments(base, "student")
        # Student deltas decrease equity_large_cap by 10
        assert adjusted[AssetClass.EQUITY_LARGE_CAP] < base[AssetClass.EQUITY_LARGE_CAP]

    def test_early_career_increases_equity(self):
        base = dict(BASE_ALLOCATIONS[RiskCategory.MODERATE])
        adjusted = apply_life_stage_adjustments(base, "early_career")
        assert adjusted[AssetClass.EQUITY_LARGE_CAP] > base[AssetClass.EQUITY_LARGE_CAP]

    def test_result_sums_to_100(self):
        base = dict(BASE_ALLOCATIONS[RiskCategory.MODERATE])
        adjusted = apply_life_stage_adjustments(base, "family")
        assert pytest.approx(sum(adjusted.values()), abs=0.1) == 100


# ---------------------------------------------------------------------------
# calc_expected_returns
# ---------------------------------------------------------------------------
class TestCalcExpectedReturns:
    def test_conservative_returns_lower(self):
        cons = dict(BASE_ALLOCATIONS[RiskCategory.CONSERVATIVE])
        agg = dict(BASE_ALLOCATIONS[RiskCategory.AGGRESSIVE])
        cons_min, cons_max = calc_expected_returns(cons)
        agg_min, agg_max = calc_expected_returns(agg)
        assert cons_min < agg_min
        assert cons_max < agg_max

    def test_returns_are_positive(self):
        alloc = dict(BASE_ALLOCATIONS[RiskCategory.MODERATE])
        ret_min, ret_max = calc_expected_returns(alloc)
        assert ret_min > 0
        assert ret_max > ret_min


# ---------------------------------------------------------------------------
# generate_rationale
# ---------------------------------------------------------------------------
class TestGenerateRationale:
    def test_zero_allocation_excluded(self):
        rationale = generate_rationale(AssetClass.EQUITY_SMALL_CAP, 0, "conservative", "student")
        assert "excluded" in rationale.lower()

    def test_equity_aggressive_mentions_growth(self):
        rationale = generate_rationale(AssetClass.EQUITY_LARGE_CAP, 35, "aggressive", "early_career")
        assert "growth" in rationale.lower()

    def test_debt_mentions_preservation(self):
        rationale = generate_rationale(AssetClass.DEBT, 50, "conservative", "pre_retirement")
        assert "preservation" in rationale.lower()

    def test_gold_mentions_inflation(self):
        rationale = generate_rationale(AssetClass.GOLD_COMMODITIES, 10, "moderate", "family")
        assert "inflation" in rationale.lower()

    def test_student_stage_note(self):
        rationale = generate_rationale(AssetClass.LIQUID_FUNDS, 25, "conservative", "student")
        assert "limited income" in rationale.lower()


# ---------------------------------------------------------------------------
# generate_portfolio (integration)
# ---------------------------------------------------------------------------
class TestGeneratePortfolio:
    def test_returns_required_keys(self):
        result = generate_portfolio(50, "moderate", "early_career")
        assert "expected_return_min" in result
        assert "expected_return_max" in result
        assert "allocations" in result

    def test_allocations_cover_all_asset_classes(self):
        result = generate_portfolio(50, "moderate", "family")
        asset_classes = {a["asset_class"] for a in result["allocations"]}
        for ac in AssetClass:
            assert ac.value in asset_classes

    def test_allocations_sum_to_100(self):
        result = generate_portfolio(80, "aggressive", "early_career")
        total = sum(a["allocation_pct"] for a in result["allocations"])
        assert pytest.approx(total, abs=0.5) == 100

    def test_each_allocation_has_rationale(self):
        result = generate_portfolio(30, "conservative", "pre_retirement")
        for alloc in result["allocations"]:
            assert "rationale" in alloc
            assert len(alloc["rationale"]) > 0
