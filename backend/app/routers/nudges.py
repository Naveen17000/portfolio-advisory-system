from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.services.profile_service import get_profile
from app.services.anomaly_detector import analyze_financial_health

router = APIRouter()


@router.get("/")
async def get_nudges(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    profile = await get_profile(db, user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Complete your financial profile first")

    profile_data = {
        "monthly_income": float(profile.monthly_income),
        "monthly_expenses": float(profile.monthly_expenses),
        "monthly_savings": float(profile.monthly_savings),
        "total_liabilities": float(profile.total_liabilities),
        "emergency_fund_months": profile.emergency_fund_months,
        "existing_investments": profile.existing_investments or {},
        "dependents_count": profile.dependents_count,
        "investment_horizon_years": profile.investment_horizon_years,
        "life_stage": profile.life_stage,
        "investment_experience": profile.investment_experience,
    }

    return analyze_financial_health(profile_data)
