from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.risk_assessment import RiskAssessment
from app.services.profile_service import get_profile
from app.services.peer_benchmark import generate_benchmark

router = APIRouter()


@router.get("/")
async def get_benchmark(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    profile = await get_profile(db, user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Complete your financial profile first")

    # Get risk score
    result = await db.execute(
        select(RiskAssessment)
        .where(RiskAssessment.user_id == user.id)
        .order_by(RiskAssessment.created_at.desc())
        .limit(1)
    )
    assessment = result.scalar_one_or_none()

    profile_data = {
        "monthly_income": float(profile.monthly_income),
        "monthly_expenses": float(profile.monthly_expenses),
        "monthly_savings": float(profile.monthly_savings),
        "total_liabilities": float(profile.total_liabilities),
        "emergency_fund_months": profile.emergency_fund_months,
        "existing_investments": profile.existing_investments or {},
        "life_stage": profile.life_stage,
        "risk_score": float(assessment.overall_score) if assessment else 50,
    }

    return generate_benchmark(profile_data)
