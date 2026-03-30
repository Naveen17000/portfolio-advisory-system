"""
Financial DNA — Investor Personality Profiling System.

Analyzes questionnaire responses, financial metrics, spending patterns,
and risk behavior to classify users into investor personality archetypes.

Generates a "Financial DNA card" with:
- 6-axis personality radar (Discipline, Growth, Defense, Knowledge, Patience, Diversification)
- Archetype name and description
- Strengths and weaknesses
- Personalized insights
- Comparison with ideal archetype for their life stage
"""

import math


# ── Investor Archetypes ─────────────────────────────────────────────
ARCHETYPES = {
    "shield_bearer": {
        "name": "The Shield Bearer",
        "emoji": "shield",
        "tagline": "Safety first, always.",
        "description": "You prioritize protecting what you have over chasing growth. Emergency funds, insurance, and low-risk investments are your comfort zone. You sleep well at night knowing your money is safe.",
        "ideal_for": "Pre-retirement, risk-averse investors, those with dependents",
        "famous_match": "Warren Buffett's Rule #1: Never lose money",
        "color": "#22c55e",
    },
    "steady_grower": {
        "name": "The Steady Grower",
        "emoji": "seedling",
        "tagline": "Slow and steady wins the race.",
        "description": "You balance safety with growth beautifully. You understand that wealth is built over decades, not days. SIPs, index funds, and diversified portfolios are your tools of choice.",
        "ideal_for": "Early-to-mid career professionals building long-term wealth",
        "famous_match": "Jack Bogle's philosophy: Don't look for the needle, buy the haystack",
        "color": "#3b82f6",
    },
    "growth_hunter": {
        "name": "The Growth Hunter",
        "emoji": "rocket",
        "tagline": "Go big or go home.",
        "description": "You chase returns aggressively and are comfortable with volatility. Mid-caps, small-caps, and high-growth sectors excite you. You understand that higher risk = higher potential reward.",
        "ideal_for": "Young investors with long horizons and high risk tolerance",
        "famous_match": "Peter Lynch: Know what you own and know why you own it",
        "color": "#f59e0b",
    },
    "cautious_planner": {
        "name": "The Cautious Planner",
        "emoji": "compass",
        "tagline": "Plan the work, work the plan.",
        "description": "You're methodical and analytical. Every investment decision is backed by research and numbers. You may over-analyze sometimes, but you rarely make impulsive mistakes.",
        "ideal_for": "Detail-oriented individuals who prefer data-driven decisions",
        "famous_match": "Benjamin Graham: In the short run, the market is a voting machine; in the long run, it's a weighing machine",
        "color": "#8b5cf6",
    },
    "fresh_starter": {
        "name": "The Fresh Starter",
        "emoji": "star",
        "tagline": "Every expert was once a beginner.",
        "description": "You're at the beginning of your investment journey. Your biggest asset is time and willingness to learn. The habits you build now will compound for decades.",
        "ideal_for": "Students and new graduates just starting to save",
        "famous_match": "Your future self will thank you for starting today",
        "color": "#06b6d4",
    },
    "balanced_warrior": {
        "name": "The Balanced Warrior",
        "emoji": "scales",
        "tagline": "Strength through balance.",
        "description": "You've found the sweet spot between offense and defense. You diversify well, save consistently, and take calculated risks. You're building wealth the right way.",
        "ideal_for": "Mid-career investors with a mature financial outlook",
        "famous_match": "Ray Dalio's All-Weather Portfolio philosophy",
        "color": "#ec4899",
    },
}


# ── DNA Axis Definitions ────────────────────────────────────────────
DNA_AXES = {
    "discipline": {
        "label": "Discipline",
        "description": "How consistently you save and stick to financial plans",
    },
    "growth": {
        "label": "Growth Mindset",
        "description": "Your appetite for higher returns through equity and growth assets",
    },
    "defense": {
        "label": "Defense",
        "description": "How well you protect against emergencies, debt, and downside risk",
    },
    "knowledge": {
        "label": "Knowledge",
        "description": "Your investment experience and understanding of financial products",
    },
    "patience": {
        "label": "Patience",
        "description": "Your ability to hold investments long-term without panic-selling",
    },
    "diversification": {
        "label": "Diversification",
        "description": "How well you spread risk across different asset classes",
    },
}


def _clamp(val: float, lo: float = 0, hi: float = 100) -> float:
    return max(lo, min(hi, val))


def compute_financial_dna(profile_data: dict, risk_data: dict | None = None) -> dict:
    """
    Compute the user's Financial DNA from their profile and risk data.

    Args:
        profile_data: Financial profile fields
        risk_data: Optional risk assessment data (scores, category)

    Returns:
        Complete DNA profile with axes, archetype, strengths, weaknesses, insights
    """
    income = float(profile_data.get("monthly_income", 0))
    expenses = float(profile_data.get("monthly_expenses", 0))
    savings = float(profile_data.get("monthly_savings", 0))
    liabilities = float(profile_data.get("total_liabilities", 0))
    emergency_months = int(profile_data.get("emergency_fund_months", 0))
    dependents = int(profile_data.get("dependents_count", 0))
    horizon = int(profile_data.get("investment_horizon_years", 5))
    life_stage = profile_data.get("life_stage", "early_career")
    experience = profile_data.get("investment_experience", "none")
    loss_tolerance = profile_data.get("loss_tolerance", "moderate")
    existing_investments = profile_data.get("existing_investments", {})

    savings_ratio = savings / income if income > 0 else 0
    spending_ratio = expenses / income if income > 0 else 1
    liability_ratio = liabilities / (income * 12) if income > 0 else 0
    invested_classes = sum(1 for v in existing_investments.values() if v)

    # Risk score from assessment if available
    risk_score = float(risk_data.get("overall_score", 50)) if risk_data else 50
    risk_category = (risk_data.get("risk_category", "moderate") if risk_data else "moderate")

    # ── Compute 6 DNA Axes (each 0-100) ─────────────────────────────

    # 1. DISCIPLINE — savings consistency, low spending, sticking to plans
    discipline = 0
    discipline += min(40, savings_ratio * 200)        # 20% savings = 40 pts
    discipline += max(0, (1 - spending_ratio) * 30)   # Low spending = up to 30 pts
    if emergency_months >= 6:
        discipline += 15
    elif emergency_months >= 3:
        discipline += 8
    if horizon >= 10:
        discipline += 15
    elif horizon >= 5:
        discipline += 8
    discipline = _clamp(discipline)

    # 2. GROWTH — risk appetite, equity preference, aggressive stance
    growth = 0
    loss_scores = {"high": 40, "moderate": 20, "low": 5}
    growth += loss_scores.get(loss_tolerance, 15)
    if risk_category == "aggressive":
        growth += 30
    elif risk_category == "moderate":
        growth += 15
    else:
        growth += 5
    if horizon >= 15:
        growth += 20
    elif horizon >= 7:
        growth += 10
    exp_growth = {"advanced": 10, "intermediate": 7, "beginner": 3, "none": 0}
    growth += exp_growth.get(experience, 0)
    growth = _clamp(growth)

    # 3. DEFENSE — emergency fund, low debt, insurance awareness, safety buffer
    defense = 0
    if emergency_months >= 12:
        defense += 35
    elif emergency_months >= 6:
        defense += 25
    elif emergency_months >= 3:
        defense += 12
    if liability_ratio < 0.5:
        defense += 25
    elif liability_ratio < 1.5:
        defense += 15
    elif liability_ratio < 3:
        defense += 5
    if spending_ratio < 0.6:
        defense += 20
    elif spending_ratio < 0.75:
        defense += 10
    if dependents == 0 or emergency_months >= 6:
        defense += 10
    if loss_tolerance == "low":
        defense += 10
    elif loss_tolerance == "moderate":
        defense += 5
    defense = _clamp(defense)

    # 4. KNOWLEDGE — investment experience, diversification awareness
    knowledge = 0
    exp_scores = {"advanced": 45, "intermediate": 30, "beginner": 15, "none": 3}
    knowledge += exp_scores.get(experience, 5)
    knowledge += min(25, invested_classes * 8)          # More asset classes = more knowledge
    if risk_score > 30:
        knowledge += 10                                 # Not overly conservative = some understanding
    if horizon >= 10:
        knowledge += 10                                 # Understands long-term
    if loss_tolerance == "high":
        knowledge += 10                                 # Understands volatility
    knowledge = _clamp(knowledge)

    # 5. PATIENCE — long horizon, hold-through-dips mentality, not short-term
    patience = 0
    if horizon >= 20:
        patience += 35
    elif horizon >= 10:
        patience += 25
    elif horizon >= 5:
        patience += 15
    else:
        patience += 5
    patience_loss = {"high": 30, "moderate": 20, "low": 5}
    patience += patience_loss.get(loss_tolerance, 10)
    if life_stage in ("student", "early_career"):
        patience += 15                                  # Young = more time
    elif life_stage == "family":
        patience += 10
    if savings_ratio > 0.2:
        patience += 10                                  # Consistent savers are patient
    patience = _clamp(patience)

    # 6. DIVERSIFICATION — spread across asset classes
    diversification = 0
    if invested_classes >= 5:
        diversification += 50
    elif invested_classes >= 4:
        diversification += 40
    elif invested_classes >= 3:
        diversification += 28
    elif invested_classes >= 2:
        diversification += 15
    elif invested_classes >= 1:
        diversification += 5

    # Check for balance (not over-concentrated)
    if invested_classes >= 3 and risk_category == "moderate":
        diversification += 20
    elif invested_classes >= 2:
        diversification += 10

    if experience in ("intermediate", "advanced"):
        diversification += 15
    elif experience == "beginner":
        diversification += 5

    if horizon >= 10:
        diversification += 10
    diversification = _clamp(diversification)

    axes = {
        "discipline": round(discipline),
        "growth": round(growth),
        "defense": round(defense),
        "knowledge": round(knowledge),
        "patience": round(patience),
        "diversification": round(diversification),
    }

    avg_score = sum(axes.values()) / 6

    # ── Determine Archetype ──────────────────────────────────────────
    archetype_id = _classify_archetype(axes, experience, risk_category, life_stage)
    archetype = ARCHETYPES[archetype_id]

    # ── Strengths & Weaknesses ───────────────────────────────────────
    sorted_axes = sorted(axes.items(), key=lambda x: x[1], reverse=True)
    strengths = []
    weaknesses = []

    for axis_key, score in sorted_axes[:3]:
        if score >= 40:
            info = DNA_AXES[axis_key]
            strengths.append({
                "axis": info["label"],
                "score": score,
                "insight": _get_strength_insight(axis_key, score, profile_data),
            })

    for axis_key, score in sorted_axes[-3:]:
        if score < 50:
            info = DNA_AXES[axis_key]
            weaknesses.append({
                "axis": info["label"],
                "score": score,
                "insight": _get_weakness_insight(axis_key, score, profile_data),
                "action": _get_improvement_action(axis_key, profile_data),
            })

    # ── Personalized Insights ────────────────────────────────────────
    insights = _generate_insights(axes, profile_data, risk_category, archetype_id)

    return {
        "archetype_id": archetype_id,
        "archetype": archetype,
        "axes": axes,
        "axes_meta": {k: {"label": v["label"], "description": v["description"]} for k, v in DNA_AXES.items()},
        "average_score": round(avg_score),
        "strengths": strengths,
        "weaknesses": weaknesses,
        "insights": insights,
        "life_stage": life_stage,
        "risk_category": risk_category,
    }


def _classify_archetype(axes: dict, experience: str, risk_cat: str, life_stage: str) -> str:
    """Classify into an archetype based on dominant traits."""
    d = axes

    if experience == "none" and d["knowledge"] < 20:
        return "fresh_starter"

    if d["defense"] >= 60 and d["growth"] < 30:
        return "shield_bearer"

    if d["growth"] >= 55 and d["patience"] >= 40:
        return "growth_hunter"

    if d["discipline"] >= 55 and d["knowledge"] >= 40:
        return "cautious_planner"

    # Check for balance — no axis below 25, at least 3 axes above 40
    above_40 = sum(1 for v in d.values() if v >= 40)
    below_25 = sum(1 for v in d.values() if v < 25)
    if above_40 >= 4 and below_25 == 0:
        return "balanced_warrior"

    if d["discipline"] >= 40 and d["patience"] >= 35:
        return "steady_grower"

    # Fallback based on risk category
    if risk_cat == "conservative":
        return "shield_bearer"
    elif risk_cat == "aggressive":
        return "growth_hunter"
    return "steady_grower"


def _get_strength_insight(axis: str, score: int, profile: dict) -> str:
    insights = {
        "discipline": f"You save {profile.get('monthly_savings', 0) / max(profile.get('monthly_income', 1), 1) * 100:.0f}% of your income — that's disciplined and powerful for long-term wealth.",
        "growth": "You're not afraid of market volatility. This growth mindset, combined with patience, is how wealth is truly built.",
        "defense": f"With {profile.get('emergency_fund_months', 0)} months of emergency coverage, you're well-protected against financial shocks.",
        "knowledge": "Your investment experience gives you an edge — you understand markets better than most.",
        "patience": f"With a {profile.get('investment_horizon_years', 0)}-year horizon, time is your greatest ally for compounding.",
        "diversification": "Spreading across multiple asset classes reduces your risk without sacrificing returns.",
    }
    return insights.get(axis, "This is one of your strong areas.")


def _get_weakness_insight(axis: str, score: int, profile: dict) -> str:
    insights = {
        "discipline": "Inconsistent saving habits can derail even the best investment strategy.",
        "growth": "Playing it too safe means inflation quietly eats away your purchasing power over time.",
        "defense": "Without a solid safety net, one unexpected expense could force you to break your investments.",
        "knowledge": "Limited investment knowledge often leads to either over-caution or blind risk-taking.",
        "patience": "Short-term thinking and panic-selling during dips is the #1 wealth destroyer for retail investors.",
        "diversification": "Concentrating in too few assets means one bad sector can wipe out your gains.",
    }
    return insights.get(axis, "This area has room for improvement.")


def _get_improvement_action(axis: str, profile: dict) -> str:
    actions = {
        "discipline": "Set up an automatic SIP that deducts right after salary credit — remove willpower from the equation.",
        "growth": "Start with just 10% of your savings in a Nifty 50 index fund. Watch it for 6 months — you'll get comfortable.",
        "defense": "Build your emergency fund to 6 months of expenses in a liquid fund before investing aggressively.",
        "knowledge": "Spend 15 minutes/week reading Varsity by Zerodha (free) — it's the best beginner resource in India.",
        "patience": "Write down your investment horizon on paper and stick it where you check your portfolio. Remind yourself why you started.",
        "diversification": "Add at least one asset class you don't currently have — gold (SGBs) and debt funds are easy additions.",
    }
    return actions.get(axis, "Focus on improving this area gradually.")


def _generate_insights(axes: dict, profile: dict, risk_cat: str, archetype_id: str) -> list[str]:
    """Generate 3-4 personalized insights based on the DNA profile."""
    insights = []

    avg = sum(axes.values()) / 6

    if avg >= 60:
        insights.append("Your overall Financial DNA is strong — you're ahead of most investors in India. Focus on fine-tuning rather than major changes.")
    elif avg >= 40:
        insights.append("Your Financial DNA shows a solid foundation with room to grow. Small improvements in your weaker areas will have outsized impact.")
    else:
        insights.append("Your Financial DNA shows you're early in your journey — and that's perfectly fine. Building good habits now will compound for decades.")

    # Specific pattern insights
    if axes["growth"] > 60 and axes["defense"] < 30:
        insights.append("You're chasing growth but your safety net is thin. One market crash could force you to sell at the worst time. Build your defense first.")

    if axes["discipline"] > 60 and axes["knowledge"] < 25:
        insights.append("You're great at saving but may not be putting that money to work effectively. Learning about investment options could multiply your wealth.")

    if axes["patience"] > 60 and axes["diversification"] < 25:
        insights.append("You have the patience to hold long-term — now spread that patience across more asset classes for even better results.")

    if axes["defense"] > 60 and axes["growth"] < 20:
        insights.append("Your fortress is strong, but being too defensive means inflation slowly erodes your wealth. Consider allocating even 20% to equity.")

    if axes["knowledge"] > 50 and axes["discipline"] < 30:
        insights.append("You know what to do but aren't doing it consistently. Automate your investments to remove the behavior gap.")

    return insights[:4]  # Max 4 insights
