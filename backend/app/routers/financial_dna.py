"""Financial DNA API — investor personality profiling."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.risk_assessment import RiskAssessment
from app.services.profile_service import get_profile
from app.services.financial_dna import compute_financial_dna

router = APIRouter()


@router.get("/")
async def get_financial_dna(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate the user's Financial DNA profile."""
    profile = await get_profile(db, user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Complete your financial profile first")

    profile_data = {
        "monthly_income": float(profile.monthly_income),
        "monthly_expenses": float(profile.monthly_expenses),
        "monthly_savings": float(profile.monthly_savings),
        "total_liabilities": float(profile.total_liabilities),
        "emergency_fund_months": profile.emergency_fund_months,
        "dependents_count": profile.dependents_count,
        "investment_horizon_years": profile.investment_horizon_years,
        "life_stage": profile.life_stage,
        "investment_experience": profile.investment_experience,
        "loss_tolerance": profile.loss_tolerance,
        "existing_investments": profile.existing_investments or {},
    }

    # Get risk assessment if available
    risk_data = None
    result = await db.execute(
        select(RiskAssessment)
        .where(RiskAssessment.user_id == user.id)
        .order_by(RiskAssessment.created_at.desc())
        .limit(1)
    )
    risk = result.scalar_one_or_none()
    if risk:
        risk_data = {
            "overall_score": float(risk.overall_score),
            "risk_category": risk.risk_category,
        }

    return compute_financial_dna(profile_data, risk_data)
