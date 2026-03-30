"""Investment recommendations endpoint — personalized suggestions based on risk profile and income."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.services.profile_service import get_profile
from app.services.risk_engine import assess_risk
from app.services.portfolio_engine import generate_portfolio
from app.services.instrument_recommender import FUND_DATABASE

router = APIRouter()

# Monthly SIP suggestions per life stage (as % of monthly savings)
SIP_ALLOCATION_GUIDE = {
    "student": {"min_pct": 20, "max_pct": 40, "note": "Start small and build the habit — even Rs. 500/month matters."},
    "early_career": {"min_pct": 40, "max_pct": 60, "note": "Your biggest advantage is time. Invest aggressively in SIPs."},
    "family": {"min_pct": 30, "max_pct": 50, "note": "Balance between family needs and long-term wealth building."},
    "pre_retirement": {"min_pct": 20, "max_pct": 35, "note": "Focus on capital preservation; shift towards debt and liquid instruments."},
}

# Priority actions per risk category
PRIORITY_ACTIONS = {
    "conservative": [
        {"action": "Build emergency fund to 6 months of expenses", "priority": "high"},
        {"action": "Start a debt fund SIP for stable returns", "priority": "high"},
        {"action": "Open a PPF account for tax-free long-term savings", "priority": "medium"},
        {"action": "Consider Sovereign Gold Bonds for inflation hedge", "priority": "medium"},
        {"action": "Gradually introduce a Nifty 50 index fund SIP", "priority": "low"},
    ],
    "moderate": [
        {"action": "Start a diversified SIP across large-cap and mid-cap funds", "priority": "high"},
        {"action": "Allocate 10-15% to gold via SGBs or Gold ETFs", "priority": "medium"},
        {"action": "Maintain 3-6 months expenses in liquid funds", "priority": "high"},
        {"action": "Use ELSS funds for tax saving under 80C", "priority": "medium"},
        {"action": "Review and rebalance portfolio every 6 months", "priority": "low"},
    ],
    "aggressive": [
        {"action": "Maximize equity SIPs — large, mid, and small cap", "priority": "high"},
        {"action": "Consider sectoral or thematic funds for higher alpha", "priority": "medium"},
        {"action": "Keep minimal allocation (10%) in liquid funds for emergencies", "priority": "high"},
        {"action": "Use direct stock investing alongside mutual funds", "priority": "medium"},
        {"action": "Explore international index funds for diversification", "priority": "low"},
    ],
}


def _compute_sip_breakdown(monthly_savings: float, life_stage: str, allocations: list[dict]) -> list[dict]:
    """Compute monthly SIP amount per asset class based on savings and allocation."""
    guide = SIP_ALLOCATION_GUIDE.get(life_stage, SIP_ALLOCATION_GUIDE["early_career"])
    investable = monthly_savings * guide["max_pct"] / 100

    breakdown = []
    for alloc in allocations:
        pct = alloc.get("allocation_pct", 0)
        if pct <= 0:
            continue
        sip_amount = round(investable * pct / 100, 0)
        # Round to nearest 100 for cleaner SIP amounts
        sip_amount = max(500, round(sip_amount / 100) * 100)
        breakdown.append({
            "asset_class": alloc["asset_class"],
            "allocation_pct": pct,
            "monthly_sip": sip_amount,
            "funds": FUND_DATABASE.get(alloc["asset_class"], []),
        })

    return breakdown


@router.get("/")
async def get_recommendations(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get personalized investment recommendations based on user's profile and risk."""
    profile = await get_profile(db, user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Complete your financial profile first")

    # Assess risk
    risk = assess_risk(profile)
    risk_score = risk["overall_score"]
    risk_category = risk["risk_category"]
    life_stage = profile.life_stage

    # Generate portfolio allocation
    portfolio = generate_portfolio(risk_score, risk_category, life_stage)

    # Compute SIP breakdown
    monthly_savings = float(profile.monthly_savings)
    monthly_income = float(profile.monthly_income)
    sip_guide = SIP_ALLOCATION_GUIDE.get(life_stage, SIP_ALLOCATION_GUIDE["early_career"])
    sip_breakdown = _compute_sip_breakdown(monthly_savings, life_stage, portfolio["allocations"])
    total_sip = sum(item["monthly_sip"] for item in sip_breakdown)

    # Priority actions
    actions = PRIORITY_ACTIONS.get(risk_category, PRIORITY_ACTIONS["moderate"])

    return {
        "risk_score": risk_score,
        "risk_category": risk_category,
        "life_stage": life_stage,
        "monthly_income": monthly_income,
        "monthly_savings": monthly_savings,
        "investable_range": {
            "min": round(monthly_savings * sip_guide["min_pct"] / 100, 0),
            "max": round(monthly_savings * sip_guide["max_pct"] / 100, 0),
            "note": sip_guide["note"],
        },
        "total_recommended_sip": total_sip,
        "expected_return_range": {
            "min": portfolio["expected_return_min"],
            "max": portfolio["expected_return_max"],
        },
        "sip_breakdown": sip_breakdown,
        "priority_actions": actions,
    }
