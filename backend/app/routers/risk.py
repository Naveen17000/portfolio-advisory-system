from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.risk_assessment import RiskAssessment
from app.schemas.risk_assessment import RiskAssessmentResponse
from app.services.profile_service import get_profile
from app.services.risk_engine import assess_risk

router = APIRouter()


def _get_ml_score(profile) -> float | None:
    """Try to get ML model score, return None if unavailable."""
    try:
        from app.services.ml_risk_model import predict_risk_score
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
            "loss_tolerance": profile.loss_tolerance,
        }
        return predict_risk_score(profile_data)
    except Exception:
        return None


@router.post("/assess", response_model=RiskAssessmentResponse, status_code=201)
async def assess(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    profile = await get_profile(db, user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Complete your financial profile first")

    result = assess_risk(profile)

    # Augment with ML model score (hybrid approach)
    ml_score = _get_ml_score(profile)
    if ml_score is not None:
        # Blend: 60% rule-based + 40% ML for stability
        blended = result["overall_score"] * 0.6 + ml_score * 0.4
        blended = max(0, min(100, blended))
        result["score_breakdown"]["ml_score"] = round(ml_score, 2)
        result["score_breakdown"]["rule_based_score"] = result["overall_score"]
        result["score_breakdown"]["blend_weights"] = {"rule_based": 0.6, "ml": 0.4}
        result["overall_score"] = round(blended, 2)
        # Reclassify based on blended score
        from app.services.risk_engine import classify_risk
        result["risk_category"] = classify_risk(blended).value

    assessment = RiskAssessment(
        user_id=user.id,
        financial_profile_id=profile.id,
        **result,
    )
    db.add(assessment)
    await db.flush()
    await db.refresh(assessment)
    return assessment


@router.get("/latest", response_model=RiskAssessmentResponse)
async def latest(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(RiskAssessment)
        .where(RiskAssessment.user_id == user.id)
        .order_by(RiskAssessment.created_at.desc())
        .limit(1)
    )
    assessment = result.scalar_one_or_none()
    if not assessment:
        raise HTTPException(status_code=404, detail="No risk assessment found")
    return assessment


@router.get("/history", response_model=list[RiskAssessmentResponse])
async def history(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(RiskAssessment)
        .where(RiskAssessment.user_id == user.id)
        .order_by(RiskAssessment.created_at.desc())
    )
    return result.scalars().all()
