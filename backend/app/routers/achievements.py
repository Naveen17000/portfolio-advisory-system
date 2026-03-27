from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.risk_assessment import RiskAssessment
from app.models.portfolio import Portfolio
from app.services.profile_service import get_profile
from app.services.gamification import calculate_achievements

router = APIRouter()


@router.get("/")
async def get_achievements(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    profile = await get_profile(db, user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Complete your financial profile first")

    # Check if user has risk assessment and portfolio
    risk_result = await db.execute(
        select(RiskAssessment).where(RiskAssessment.user_id == user.id).limit(1)
    )
    portfolio_result = await db.execute(
        select(Portfolio).where(Portfolio.user_id == user.id).limit(1)
    )

    profile_data = {
        "monthly_income": float(profile.monthly_income),
        "monthly_expenses": float(profile.monthly_expenses),
        "monthly_savings": float(profile.monthly_savings),
        "total_liabilities": float(profile.total_liabilities),
        "emergency_fund_months": profile.emergency_fund_months,
        "existing_investments": profile.existing_investments or {},
        "dependents_count": profile.dependents_count,
        "investment_horizon_years": profile.investment_horizon_years,
        "investment_experience": profile.investment_experience,
        "has_risk_assessment": risk_result.scalar_one_or_none() is not None,
        "has_portfolio": portfolio_result.scalar_one_or_none() is not None,
    }

    return calculate_achievements(profile_data)
