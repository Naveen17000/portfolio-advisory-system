from enum import Enum


class LifeStage(str, Enum):
    STUDENT = "student"
    EARLY_CAREER = "early_career"
    FAMILY = "family"
    PRE_RETIREMENT = "pre_retirement"


class RiskCategory(str, Enum):
    CONSERVATIVE = "conservative"
    MODERATE = "moderate"
    AGGRESSIVE = "aggressive"


class InvestmentExperience(str, Enum):
    NONE = "none"
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class LossTolerance(str, Enum):
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"


class AssetClass(str, Enum):
    EQUITY_LARGE_CAP = "equity_large_cap"
    EQUITY_MID_CAP = "equity_mid_cap"
    EQUITY_SMALL_CAP = "equity_small_cap"
    DEBT = "debt"
    GOLD_COMMODITIES = "gold_commodities"
    LIQUID_FUNDS = "liquid_funds"


# Risk scoring weights
RISK_WEIGHTS = {
    "spending_ratio": 0.25,
    "savings_consistency": 0.25,
    "investment_discipline": 0.30,
    "liability_burden": 0.20,
}

# Life-stage base modifiers
LIFE_STAGE_MODIFIERS = {
    LifeStage.STUDENT: 0.75,
    LifeStage.EARLY_CAREER: 1.10,
    LifeStage.FAMILY: 0.90,
    LifeStage.PRE_RETIREMENT: 0.70,
}

# Investment experience scores
EXPERIENCE_SCORES = {
    InvestmentExperience.NONE: 10,
    InvestmentExperience.BEGINNER: 30,
    InvestmentExperience.INTERMEDIATE: 60,
    InvestmentExperience.ADVANCED: 85,
}

# Loss tolerance scores
LOSS_TOLERANCE_SCORES = {
    LossTolerance.LOW: 15,
    LossTolerance.MODERATE: 50,
    LossTolerance.HIGH: 85,
}

# Base portfolio allocations by risk category
BASE_ALLOCATIONS = {
    RiskCategory.CONSERVATIVE: {
        AssetClass.EQUITY_LARGE_CAP: 10,
        AssetClass.EQUITY_MID_CAP: 0,
        AssetClass.EQUITY_SMALL_CAP: 0,
        AssetClass.DEBT: 50,
        AssetClass.GOLD_COMMODITIES: 15,
        AssetClass.LIQUID_FUNDS: 25,
    },
    RiskCategory.MODERATE: {
        AssetClass.EQUITY_LARGE_CAP: 25,
        AssetClass.EQUITY_MID_CAP: 10,
        AssetClass.EQUITY_SMALL_CAP: 5,
        AssetClass.DEBT: 30,
        AssetClass.GOLD_COMMODITIES: 10,
        AssetClass.LIQUID_FUNDS: 20,
    },
    RiskCategory.AGGRESSIVE: {
        AssetClass.EQUITY_LARGE_CAP: 35,
        AssetClass.EQUITY_MID_CAP: 20,
        AssetClass.EQUITY_SMALL_CAP: 15,
        AssetClass.DEBT: 10,
        AssetClass.GOLD_COMMODITIES: 10,
        AssetClass.LIQUID_FUNDS: 10,
    },
}

# Life-stage allocation adjustments (deltas)
LIFE_STAGE_ALLOCATION_DELTAS = {
    LifeStage.STUDENT: {
        AssetClass.EQUITY_LARGE_CAP: -10,
        AssetClass.EQUITY_MID_CAP: -5,
        AssetClass.DEBT: 10,
        AssetClass.LIQUID_FUNDS: 5,
    },
    LifeStage.EARLY_CAREER: {
        AssetClass.EQUITY_LARGE_CAP: 5,
        AssetClass.EQUITY_MID_CAP: 5,
        AssetClass.DEBT: -5,
        AssetClass.LIQUID_FUNDS: -5,
    },
    LifeStage.FAMILY: {
        AssetClass.EQUITY_SMALL_CAP: -5,
        AssetClass.DEBT: 5,
        AssetClass.GOLD_COMMODITIES: 5,
        AssetClass.LIQUID_FUNDS: -5,
    },
    LifeStage.PRE_RETIREMENT: {
        AssetClass.EQUITY_MID_CAP: -5,
        AssetClass.EQUITY_SMALL_CAP: -5,
        AssetClass.DEBT: 10,
        AssetClass.GOLD_COMMODITIES: -5,
        AssetClass.LIQUID_FUNDS: 5,
    },
}

# Expected return ranges per asset class (annualized %)
EXPECTED_RETURNS = {
    AssetClass.EQUITY_LARGE_CAP: (10, 14),
    AssetClass.EQUITY_MID_CAP: (12, 18),
    AssetClass.EQUITY_SMALL_CAP: (14, 22),
    AssetClass.DEBT: (6, 8),
    AssetClass.GOLD_COMMODITIES: (7, 11),
    AssetClass.LIQUID_FUNDS: (4, 6),
}
