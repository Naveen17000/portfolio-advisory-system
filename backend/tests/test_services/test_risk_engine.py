"""Unit tests for the risk scoring engine.

These tests exercise the individual scoring functions and the top-level
``assess_risk`` pipeline using lightweight mock objects instead of real
database models.
"""

from types import SimpleNamespace

import pytest

from app.services.risk_engine import (
    _interpolate,
    calc_spending_ratio_score,
    calc_savings_consistency_score,
    calc_investment_discipline_score,
    calc_liability_burden_score,
    calc_life_stage_modifier,
    classify_risk,
    assess_risk,
)


# ---------------------------------------------------------------------------
# _interpolate
# ---------------------------------------------------------------------------
class TestInterpolate:
    def test_value_above_first_band(self):
        bands = [(0.90, 10, 10), (0.70, 30, 10), (0.50, 55, 30)]
        assert _interpolate(0.95, bands) == 10

    def test_value_at_band_boundary(self):
        bands = [(0.90, 10, 10), (0.70, 30, 10)]
        assert _interpolate(0.70, bands) == 30

    def test_value_between_bands(self):
        bands = [(0.90, 10, 10), (0.70, 30, 10), (0.50, 55, 30)]
        # 0.60 is between 0.70 (score 30) and 0.50 (score 55)
        score = _interpolate(0.60, bands)
        assert 30 < score < 55

    def test_value_below_all_bands(self):
        bands = [(0.90, 10, 10), (0.70, 30, 10), (0.50, 55, 30)]
        assert _interpolate(0.1, bands) == bands[-1][1]


# ---------------------------------------------------------------------------
# calc_spending_ratio_score
# ---------------------------------------------------------------------------
class TestSpendingRatioScore:
    def test_zero_income_returns_max_risk(self):
        assert calc_spending_ratio_score(0, 1000) == 10.0

    def test_high_spending_ratio(self):
        # 95% spending ratio -> low score (risky)
        score = calc_spending_ratio_score(10000, 9500)
        assert score <= 15

    def test_low_spending_ratio(self):
        # 20% spending ratio -> high score (healthy)
        score = calc_spending_ratio_score(10000, 2000)
        assert score >= 75

    def test_moderate_spending_ratio(self):
        # 50% spending ratio -> mid-range score
        score = calc_spending_ratio_score(10000, 5000)
        assert 40 < score < 70


# ---------------------------------------------------------------------------
# calc_savings_consistency_score
# ---------------------------------------------------------------------------
class TestSavingsConsistencyScore:
    def test_zero_income(self):
        assert calc_savings_consistency_score(0, 5000, 6) == 0.0

    def test_high_savings_with_emergency_fund(self):
        # 40% savings rate + 12 months emergency -> capped at 100
        score = calc_savings_consistency_score(10000, 4000, 12)
        assert score == 100.0

    def test_no_savings_no_emergency(self):
        score = calc_savings_consistency_score(10000, 0, 0)
        assert score == 0.0

    def test_moderate_savings(self):
        # 20% savings rate, 3 months emergency
        score = calc_savings_consistency_score(10000, 2000, 3)
        assert 20 < score < 60


# ---------------------------------------------------------------------------
# calc_investment_discipline_score
# ---------------------------------------------------------------------------
class TestInvestmentDisciplineScore:
    def test_no_experience_low_tolerance(self):
        score = calc_investment_discipline_score("none", "low", {})
        # exp=10*0.40=4, loss=15*0.35=5.25, diversity=0*0.25=0 -> 9.25
        assert pytest.approx(score, abs=0.01) == 9.25

    def test_advanced_experience_high_tolerance(self):
        investments = {"stocks": 100, "bonds": 50, "gold": 30, "fd": 20}
        score = calc_investment_discipline_score("advanced", "high", investments)
        # exp=85*0.40=34, loss=85*0.35=29.75, diversity=4/4*100*0.25=25 -> 88.75
        assert pytest.approx(score, abs=0.01) == 88.75

    def test_diversity_capped_at_four(self):
        investments = {"a": 1, "b": 2, "c": 3, "d": 4, "e": 5}
        score = calc_investment_discipline_score("intermediate", "moderate", investments)
        # diversity_count = 5, but min(5/4*100, 100) = 100
        expected = 60 * 0.40 + 50 * 0.35 + 100 * 0.25
        assert pytest.approx(score, abs=0.01) == expected

    def test_empty_investments_count(self):
        investments = {"stocks": 0, "bonds": None}
        score = calc_investment_discipline_score("beginner", "moderate", investments)
        # diversity_count = 0 (both falsy), diversity_score = 0
        expected = 30 * 0.40 + 50 * 0.35 + 0 * 0.25
        assert pytest.approx(score, abs=0.01) == expected


# ---------------------------------------------------------------------------
# calc_liability_burden_score
# ---------------------------------------------------------------------------
class TestLiabilityBurdenScore:
    def test_zero_income(self):
        assert calc_liability_burden_score(0, 100000) == 10.0

    def test_no_liabilities(self):
        score = calc_liability_burden_score(10000, 0)
        assert score == 90.0

    def test_high_liability_ratio(self):
        # liabilities = 6x annual income
        score = calc_liability_burden_score(10000, 720000)
        assert score <= 15

    def test_moderate_liability_ratio(self):
        # liabilities = 1x annual income
        score = calc_liability_burden_score(10000, 120000)
        assert 50 < score < 60


# ---------------------------------------------------------------------------
# calc_life_stage_modifier
# ---------------------------------------------------------------------------
class TestLifeStageModifier:
    def test_student_short_horizon(self):
        modifier = calc_life_stage_modifier("student", 2)
        # 0.75 * 0.80 = 0.60
        assert pytest.approx(modifier, abs=0.01) == 0.60

    def test_early_career_long_horizon(self):
        modifier = calc_life_stage_modifier("early_career", 20)
        # 1.10 * 1.10 = 1.21
        assert pytest.approx(modifier, abs=0.01) == 1.21

    def test_family_medium_horizon(self):
        modifier = calc_life_stage_modifier("family", 10)
        # 0.90 * 1.00 = 0.90
        assert pytest.approx(modifier, abs=0.01) == 0.90

    def test_pre_retirement_medium_horizon(self):
        modifier = calc_life_stage_modifier("pre_retirement", 5)
        # 0.70 * 0.95 = 0.665
        assert pytest.approx(modifier, abs=0.01) == 0.665


# ---------------------------------------------------------------------------
# classify_risk
# ---------------------------------------------------------------------------
class TestClassifyRisk:
    def test_conservative(self):
        assert classify_risk(20).value == "conservative"

    def test_conservative_boundary(self):
        assert classify_risk(35).value == "conservative"

    def test_moderate(self):
        assert classify_risk(50).value == "moderate"

    def test_moderate_boundary(self):
        assert classify_risk(65).value == "moderate"

    def test_aggressive(self):
        assert classify_risk(80).value == "aggressive"


# ---------------------------------------------------------------------------
# assess_risk (integration of all sub-scores)
# ---------------------------------------------------------------------------
class TestAssessRisk:
    @staticmethod
    def _make_profile(**overrides):
        """Build a lightweight mock FinancialProfile."""
        defaults = {
            "monthly_income": 10000,
            "monthly_expenses": 5000,
            "monthly_savings": 3000,
            "total_liabilities": 50000,
            "emergency_fund_months": 6,
            "existing_investments": {"stocks": 100, "bonds": 50},
            "life_stage": "early_career",
            "investment_horizon_years": 10,
            "investment_experience": "intermediate",
            "loss_tolerance": "moderate",
        }
        defaults.update(overrides)
        return SimpleNamespace(**defaults)

    def test_returns_required_keys(self):
        result = assess_risk(self._make_profile())
        expected_keys = {
            "overall_score",
            "risk_category",
            "spending_ratio_score",
            "savings_consistency_score",
            "investment_discipline_score",
            "liability_burden_score",
            "life_stage_modifier",
            "score_breakdown",
        }
        assert expected_keys.issubset(result.keys())

    def test_overall_score_bounded(self):
        result = assess_risk(self._make_profile())
        assert 0 <= result["overall_score"] <= 100

    def test_risk_category_is_valid(self):
        result = assess_risk(self._make_profile())
        assert result["risk_category"] in ("conservative", "moderate", "aggressive")

    def test_conservative_profile(self):
        profile = self._make_profile(
            monthly_income=5000,
            monthly_expenses=4500,
            monthly_savings=200,
            total_liabilities=300000,
            emergency_fund_months=0,
            existing_investments={},
            life_stage="pre_retirement",
            investment_horizon_years=2,
            investment_experience="none",
            loss_tolerance="low",
        )
        result = assess_risk(profile)
        assert result["risk_category"] == "conservative"

    def test_aggressive_profile(self):
        profile = self._make_profile(
            monthly_income=200000,
            monthly_expenses=40000,
            monthly_savings=100000,
            total_liabilities=0,
            emergency_fund_months=24,
            existing_investments={"a": 1, "b": 2, "c": 3, "d": 4},
            life_stage="early_career",
            investment_horizon_years=25,
            investment_experience="advanced",
            loss_tolerance="high",
        )
        result = assess_risk(profile)
        assert result["risk_category"] == "aggressive"

    def test_score_breakdown_contains_sub_scores(self):
        result = assess_risk(self._make_profile())
        breakdown = result["score_breakdown"]
        assert "weights" in breakdown
        assert "raw_weighted_score" in breakdown
        assert "sub_scores" in breakdown
        sub = breakdown["sub_scores"]
        for key in ("spending_ratio", "savings_consistency",
                    "investment_discipline", "liability_burden"):
            assert key in sub
