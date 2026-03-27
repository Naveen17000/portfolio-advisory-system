"""
ML-based risk scoring model.

The model uses a hybrid approach:
1. Generates synthetic user profiles with realistic financial distributions
2. Computes target risk scores using behavioral finance principles
   (NOT mimicking the rule engine - uses different methodology)
3. Trains a Gradient Boosting model that captures non-linear interactions
   the rule engine misses (e.g., interaction between horizon and liabilities)

The key difference from the rule-based engine:
- Rule engine: Linear weighted sum with bands
- ML model: Captures non-linear interactions (e.g., a student with high debt
  and short horizon should be MORE conservative than the sum of parts suggests)
"""

import os
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
import joblib

MODEL_DIR = Path(__file__).parent.parent / "ml_models"
MODEL_PATH = MODEL_DIR / "risk_model.joblib"
ENCODERS_PATH = MODEL_DIR / "encoders.joblib"

FEATURE_COLUMNS = [
    "monthly_income",
    "monthly_expenses",
    "monthly_savings",
    "total_liabilities",
    "emergency_fund_months",
    "investment_diversity_count",
    "dependents_count",
    "investment_horizon_years",
    "life_stage_encoded",
    "investment_experience_encoded",
    "loss_tolerance_encoded",
    "spending_ratio",
    "savings_ratio",
    "liability_ratio",
    "disposable_income",
    "debt_service_ratio",
    "financial_cushion_score",
]

FEATURE_LABELS = {
    "monthly_income": "Monthly Income",
    "monthly_expenses": "Monthly Expenses",
    "monthly_savings": "Monthly Savings",
    "total_liabilities": "Total Liabilities",
    "emergency_fund_months": "Emergency Fund (months)",
    "investment_diversity_count": "Investment Diversity",
    "dependents_count": "Number of Dependents",
    "investment_horizon_years": "Investment Horizon (years)",
    "life_stage_encoded": "Life Stage",
    "investment_experience_encoded": "Investment Experience",
    "loss_tolerance_encoded": "Loss Tolerance",
    "spending_ratio": "Spending Ratio",
    "savings_ratio": "Savings Ratio",
    "liability_ratio": "Liability-to-Income Ratio",
    "disposable_income": "Disposable Income",
    "debt_service_ratio": "Debt Service Ratio",
    "financial_cushion_score": "Financial Cushion Score",
}


def _generate_synthetic_data(n_samples: int = 5000) -> pd.DataFrame:
    """
    Generate synthetic financial profiles with realistic distributions.
    Uses different scoring methodology than rule engine to add value.
    """
    rng = np.random.RandomState(42)

    life_stages = rng.choice(
        ["student", "early_career", "family", "pre_retirement"],
        n_samples, p=[0.15, 0.35, 0.30, 0.20]
    )
    experiences = rng.choice(
        ["none", "beginner", "intermediate", "advanced"],
        n_samples, p=[0.20, 0.30, 0.30, 0.20]
    )
    tolerances = rng.choice(
        ["low", "moderate", "high"],
        n_samples, p=[0.30, 0.45, 0.25]
    )

    # Income distribution varies by life stage
    income = np.zeros(n_samples)
    for i, stage in enumerate(life_stages):
        if stage == "student":
            income[i] = rng.lognormal(9.5, 0.5)  # ~13K median
        elif stage == "early_career":
            income[i] = rng.lognormal(10.5, 0.6)  # ~36K median
        elif stage == "family":
            income[i] = rng.lognormal(11.0, 0.5)  # ~60K median
        else:
            income[i] = rng.lognormal(11.3, 0.6)  # ~80K median

    expense_ratio = rng.beta(3, 2, n_samples) * 0.7 + 0.2  # 0.2-0.9, skewed toward 0.5
    expenses = income * expense_ratio
    savings = np.maximum(income - expenses, 0)

    liabilities = np.zeros(n_samples)
    for i, stage in enumerate(life_stages):
        has_debt = rng.random() < (0.3 if stage == "student" else 0.6 if stage == "family" else 0.4)
        if has_debt:
            liabilities[i] = income[i] * rng.exponential(12)

    emergency_months = np.round(rng.exponential(4, n_samples)).astype(int)
    emergency_months = np.clip(emergency_months, 0, 24)

    dependents = np.zeros(n_samples, dtype=int)
    for i, stage in enumerate(life_stages):
        if stage == "family":
            dependents[i] = rng.choice([1, 2, 3, 4], p=[0.2, 0.4, 0.3, 0.1])
        elif stage == "pre_retirement":
            dependents[i] = rng.choice([0, 1, 2], p=[0.4, 0.35, 0.25])

    horizon = np.zeros(n_samples, dtype=int)
    for i, stage in enumerate(life_stages):
        if stage == "student":
            horizon[i] = rng.randint(5, 30)
        elif stage == "early_career":
            horizon[i] = rng.randint(5, 25)
        elif stage == "family":
            horizon[i] = rng.randint(3, 20)
        else:
            horizon[i] = rng.randint(1, 10)

    diversity = np.zeros(n_samples, dtype=int)
    exp_map = {"none": 0, "beginner": 1, "intermediate": 2, "advanced": 3}
    for i, exp in enumerate(experiences):
        diversity[i] = min(6, rng.poisson(exp_map[exp] * 1.2))

    # --- Score using BEHAVIORAL FINANCE principles ---
    # This is DIFFERENT from the rule engine's linear weighted approach.
    # It models non-linear interactions and diminishing returns.
    risk_scores = _behavioral_risk_scoring(
        income, expenses, savings, liabilities, emergency_months,
        diversity, dependents, horizon, life_stages, experiences,
        tolerances, rng
    )

    return pd.DataFrame({
        "monthly_income": income,
        "monthly_expenses": expenses,
        "monthly_savings": savings,
        "total_liabilities": liabilities,
        "emergency_fund_months": emergency_months,
        "investment_diversity_count": diversity,
        "dependents_count": dependents,
        "investment_horizon_years": horizon,
        "life_stage": life_stages,
        "investment_experience": experiences,
        "loss_tolerance": tolerances,
        "risk_score": risk_scores,
    })


def _behavioral_risk_scoring(
    income, expenses, savings, liabilities, emergency_months,
    diversity, dependents, horizon, life_stages, experiences,
    tolerances, rng
):
    """
    Score using behavioral finance principles:
    - Prospect Theory: Loss aversion is asymmetric
    - Diminishing sensitivity: Each additional unit matters less
    - Interaction effects: Combined factors can amplify/dampen risk capacity
    """
    n = len(income)
    scores = np.zeros(n)

    exp_risk = {"none": -20, "beginner": -5, "intermediate": 10, "advanced": 25}
    tol_risk = {"low": -20, "moderate": 5, "high": 25}

    for i in range(n):
        s = 45.0  # neutral baseline

        # Financial capacity (diminishing returns via log)
        if income[i] > 0:
            # Log of savings ratio captures diminishing marginal benefit
            save_ratio = savings[i] / income[i]
            s += np.log1p(save_ratio * 10) * 8  # 0-20 points

            # Liability impact is non-linear (exponential harm)
            liab_ratio = liabilities[i] / (income[i] * 12)
            s -= min(25, liab_ratio ** 1.5 * 10)  # exponential penalty

        # Emergency fund: diminishing benefit after 6 months
        s += min(12, np.sqrt(emergency_months[i]) * 4)

        # Experience and tolerance (the behavioral components)
        s += exp_risk.get(experiences[i], 0)
        s += tol_risk.get(tolerances[i], 0)

        # INTERACTION EFFECTS (what rule engine misses):
        # 1. High debt + short horizon = extra conservative
        if liabilities[i] > income[i] * 24 and horizon[i] < 5:
            s -= 10

        # 2. High experience + high tolerance = synergy bonus
        if experiences[i] in ("intermediate", "advanced") and tolerances[i] == "high":
            s += 5

        # 3. Family with dependents + low emergency = extra penalty
        if life_stages[i] == "family" and dependents[i] >= 2 and emergency_months[i] < 3:
            s -= 8

        # 4. Young + long horizon = time advantage amplifier
        if life_stages[i] in ("student", "early_career") and horizon[i] > 15:
            s += 7

        # 5. Pre-retirement penalty scales with how close to 0 horizon is
        if life_stages[i] == "pre_retirement":
            s -= max(0, (10 - horizon[i]) * 2)

        # Diversity bonus (diminishing)
        s += min(8, np.sqrt(diversity[i]) * 4)

        # Dependents penalty
        s -= dependents[i] * 2.5

        # Add realistic noise
        s += rng.normal(0, 2.5)

        scores[i] = np.clip(s, 0, 100)

    return scores


def _prepare_features(df: pd.DataFrame, encoders: dict | None = None, fit: bool = False):
    """Prepare features with encoding and derived features."""
    df = df.copy()

    if encoders is None:
        encoders = {}

    for col in ["life_stage", "investment_experience", "loss_tolerance"]:
        encoded_col = f"{col}_encoded"
        if fit:
            le = LabelEncoder()
            df[encoded_col] = le.fit_transform(df[col])
            encoders[col] = le
        else:
            le = encoders[col]
            df[encoded_col] = le.transform(df[col])

    # Derived features that capture financial health
    income_safe = df["monthly_income"].clip(lower=1)
    df["spending_ratio"] = df["monthly_expenses"] / income_safe
    df["savings_ratio"] = df["monthly_savings"] / income_safe
    df["liability_ratio"] = df["total_liabilities"] / (income_safe * 12)
    df["disposable_income"] = df["monthly_income"] - df["monthly_expenses"]
    df["debt_service_ratio"] = df["total_liabilities"] / (income_safe * 12 * df["investment_horizon_years"].clip(lower=1))
    df["financial_cushion_score"] = (
        df["emergency_fund_months"] * 0.3 +
        df["savings_ratio"] * 50 +
        (1 - df["liability_ratio"].clip(upper=5) / 5) * 20
    )

    return df[FEATURE_COLUMNS], encoders


def train_model():
    """Train the risk scoring model on synthetic data."""
    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    df = _generate_synthetic_data(5000)
    X, encoders = _prepare_features(df, fit=True)
    y = df["risk_score"]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = GradientBoostingRegressor(
        n_estimators=200,
        max_depth=5,
        learning_rate=0.1,
        min_samples_leaf=10,
        subsample=0.8,
        random_state=42,
    )
    model.fit(X_train, y_train)

    train_score = model.score(X_train, y_train)
    test_score = model.score(X_test, y_test)

    joblib.dump(model, MODEL_PATH)
    joblib.dump(encoders, ENCODERS_PATH)

    return {"train_r2": round(train_score, 4), "test_r2": round(test_score, 4)}


def load_model():
    """Load trained model and encoders."""
    if not MODEL_PATH.exists():
        train_model()
    model = joblib.load(MODEL_PATH)
    encoders = joblib.load(ENCODERS_PATH)
    return model, encoders


def predict_risk_score(profile_data: dict) -> float:
    """Predict risk score for a single financial profile."""
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
    score = model.predict(X)[0]
    return float(np.clip(score, 0, 100))
