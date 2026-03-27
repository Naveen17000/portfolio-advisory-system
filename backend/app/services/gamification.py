"""
Gamification Engine.
Tracks savings behavior, awards achievements/badges,
and encourages consistent financial habits.
"""

from datetime import datetime


# Achievement definitions
ACHIEVEMENTS = [
    {
        "id": "first_profile",
        "name": "Getting Started",
        "description": "Completed your financial profile",
        "icon": "clipboard",
        "points": 10,
        "condition": lambda ctx: ctx.get("has_profile", False),
    },
    {
        "id": "risk_assessed",
        "name": "Know Yourself",
        "description": "Completed your first risk assessment",
        "icon": "shield",
        "points": 15,
        "condition": lambda ctx: ctx.get("has_risk_assessment", False),
    },
    {
        "id": "portfolio_generated",
        "name": "Portfolio Pro",
        "description": "Generated your first portfolio",
        "icon": "pie-chart",
        "points": 15,
        "condition": lambda ctx: ctx.get("has_portfolio", False),
    },
    {
        "id": "saver_10",
        "name": "Budding Saver",
        "description": "Savings rate of at least 10%",
        "icon": "piggy-bank",
        "points": 20,
        "condition": lambda ctx: ctx.get("savings_ratio", 0) >= 0.10,
    },
    {
        "id": "saver_20",
        "name": "Smart Saver",
        "description": "Savings rate of at least 20%",
        "icon": "trending-up",
        "points": 30,
        "condition": lambda ctx: ctx.get("savings_ratio", 0) >= 0.20,
    },
    {
        "id": "saver_30",
        "name": "Super Saver",
        "description": "Savings rate of at least 30%",
        "icon": "star",
        "points": 50,
        "condition": lambda ctx: ctx.get("savings_ratio", 0) >= 0.30,
    },
    {
        "id": "emergency_3m",
        "name": "Safety Net",
        "description": "Built a 3-month emergency fund",
        "icon": "umbrella",
        "points": 25,
        "condition": lambda ctx: ctx.get("emergency_months", 0) >= 3,
    },
    {
        "id": "emergency_6m",
        "name": "Fort Knox",
        "description": "Built a 6-month emergency fund",
        "icon": "lock",
        "points": 40,
        "condition": lambda ctx: ctx.get("emergency_months", 0) >= 6,
    },
    {
        "id": "emergency_12m",
        "name": "Unshakeable",
        "description": "12+ months of emergency fund",
        "icon": "mountain",
        "points": 60,
        "condition": lambda ctx: ctx.get("emergency_months", 0) >= 12,
    },
    {
        "id": "debt_free",
        "name": "Debt Free",
        "description": "Zero liabilities",
        "icon": "check-circle",
        "points": 50,
        "condition": lambda ctx: ctx.get("total_liabilities", 1) == 0,
    },
    {
        "id": "low_debt",
        "name": "Debt Manager",
        "description": "Liabilities under 1x annual income",
        "icon": "minimize",
        "points": 30,
        "condition": lambda ctx: 0 < ctx.get("liability_ratio", 99) < 1,
    },
    {
        "id": "diversified_3",
        "name": "Diversifier",
        "description": "Invested in 3+ asset classes",
        "icon": "layers",
        "points": 25,
        "condition": lambda ctx: ctx.get("investment_diversity", 0) >= 3,
    },
    {
        "id": "diversified_5",
        "name": "Master Allocator",
        "description": "Invested in 5+ asset classes",
        "icon": "award",
        "points": 40,
        "condition": lambda ctx: ctx.get("investment_diversity", 0) >= 5,
    },
    {
        "id": "experienced",
        "name": "Market Veteran",
        "description": "Advanced investment experience",
        "icon": "zap",
        "points": 35,
        "condition": lambda ctx: ctx.get("investment_experience") == "advanced",
    },
    {
        "id": "long_horizon",
        "name": "Marathon Investor",
        "description": "Investment horizon of 15+ years",
        "icon": "clock",
        "points": 30,
        "condition": lambda ctx: ctx.get("investment_horizon", 0) >= 15,
    },
    {
        "id": "low_spending",
        "name": "Frugal Champion",
        "description": "Spending under 50% of income",
        "icon": "scissors",
        "points": 35,
        "condition": lambda ctx: ctx.get("spending_ratio", 1) < 0.50,
    },
]

# Level definitions
LEVELS = [
    {"level": 1, "name": "Beginner Investor", "min_points": 0, "max_points": 49},
    {"level": 2, "name": "Apprentice Investor", "min_points": 50, "max_points": 99},
    {"level": 3, "name": "Intermediate Investor", "min_points": 100, "max_points": 199},
    {"level": 4, "name": "Advanced Investor", "min_points": 200, "max_points": 349},
    {"level": 5, "name": "Expert Investor", "min_points": 350, "max_points": 499},
    {"level": 6, "name": "Master Investor", "min_points": 500, "max_points": 999},
]


def calculate_achievements(profile_data: dict) -> dict:
    """
    Calculate user achievements based on their financial profile.
    """
    income = float(profile_data.get("monthly_income", 0))
    expenses = float(profile_data.get("monthly_expenses", 0))
    savings = float(profile_data.get("monthly_savings", 0))
    liabilities = float(profile_data.get("total_liabilities", 0))
    annual_income = income * 12 if income > 0 else 1

    investments = profile_data.get("existing_investments", {})
    diversity = sum(1 for v in investments.values() if v)

    context = {
        "has_profile": True,
        "has_risk_assessment": profile_data.get("has_risk_assessment", False),
        "has_portfolio": profile_data.get("has_portfolio", False),
        "savings_ratio": savings / income if income > 0 else 0,
        "spending_ratio": expenses / income if income > 0 else 1,
        "emergency_months": int(profile_data.get("emergency_fund_months", 0)),
        "total_liabilities": liabilities,
        "liability_ratio": liabilities / annual_income,
        "investment_diversity": diversity,
        "investment_experience": profile_data.get("investment_experience", "none"),
        "investment_horizon": int(profile_data.get("investment_horizon_years", 0)),
    }

    earned = []
    locked = []
    total_points = 0

    for achievement in ACHIEVEMENTS:
        if achievement["condition"](context):
            earned.append({
                "id": achievement["id"],
                "name": achievement["name"],
                "description": achievement["description"],
                "icon": achievement["icon"],
                "points": achievement["points"],
                "earned": True,
            })
            total_points += achievement["points"]
        else:
            locked.append({
                "id": achievement["id"],
                "name": achievement["name"],
                "description": achievement["description"],
                "icon": achievement["icon"],
                "points": achievement["points"],
                "earned": False,
            })

    # Calculate level
    current_level = LEVELS[0]
    next_level = LEVELS[1] if len(LEVELS) > 1 else None
    for i, lvl in enumerate(LEVELS):
        if total_points >= lvl["min_points"]:
            current_level = lvl
            next_level = LEVELS[i + 1] if i + 1 < len(LEVELS) else None

    points_to_next = next_level["min_points"] - total_points if next_level else 0
    progress = 0
    if next_level:
        level_range = next_level["min_points"] - current_level["min_points"]
        points_in_level = total_points - current_level["min_points"]
        progress = round(points_in_level / level_range * 100) if level_range > 0 else 100

    return {
        "total_points": total_points,
        "level": current_level["level"],
        "level_name": current_level["name"],
        "next_level": next_level["name"] if next_level else "Max Level",
        "points_to_next_level": max(0, points_to_next),
        "level_progress": min(100, progress),
        "earned_achievements": earned,
        "locked_achievements": locked,
        "earned_count": len(earned),
        "total_achievements": len(ACHIEVEMENTS),
        "calculated_at": datetime.utcnow().isoformat(),
    }
