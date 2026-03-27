from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.risk_assessment import RiskAssessment
from app.services.profile_service import get_profile
from app.services.chatbot import generate_response

router = APIRouter()


class ChatMessage(BaseModel):
    message: str


@router.post("/message")
async def chat(
    data: ChatMessage,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Build context from user's financial data
    parts = user.full_name.split() if user.full_name else []
    context = {"user_name": parts[0] if parts else "there"}

    profile = await get_profile(db, user.id)
    if profile:
        income = float(profile.monthly_income)
        context.update({
            "life_stage": profile.life_stage,
            "monthly_income": income,
            "monthly_expenses": float(profile.monthly_expenses),
            "monthly_savings": float(profile.monthly_savings),
            "savings_ratio": float(profile.monthly_savings) / income if income > 0 else 0,
            "liability_ratio": float(profile.total_liabilities) / (income * 12) if income > 0 else 0,
            "emergency_fund_months": profile.emergency_fund_months,
            "investment_experience": profile.investment_experience,
            "investment_horizon": profile.investment_horizon_years,
        })

    result = await db.execute(
        select(RiskAssessment)
        .where(RiskAssessment.user_id == user.id)
        .order_by(RiskAssessment.created_at.desc())
        .limit(1)
    )
    assessment = result.scalar_one_or_none()
    if assessment:
        context.update({
            "risk_score": float(assessment.overall_score),
            "risk_category": assessment.risk_category,
        })

    response = generate_response(data.message, context)
    response["disclaimer"] = "This is for educational purposes only. Not financial advice."
    return response
