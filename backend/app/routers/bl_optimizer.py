import asyncio
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.risk_assessment import RiskAssessment
from app.services.profile_service import get_profile
from app.services.black_litterman import optimize_black_litterman

router = APIRouter()


@router.get("/")
async def get_bl_optimization(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get Black-Litterman optimized portfolio allocation."""
    profile = await get_profile(db, user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Complete your financial profile first")

    result = await db.execute(
        select(RiskAssessment)
        .where(RiskAssessment.user_id == user.id)
        .order_by(RiskAssessment.created_at.desc())
        .limit(1)
    )
    assessment = result.scalar_one_or_none()
    risk_category = assessment.risk_category if assessment else "moderate"

    # Try to get sentiment for views (run in thread to avoid blocking event loop)
    sentiment = None
    try:
        from app.services.sentiment_analyzer import get_market_sentiment
        sentiment = await asyncio.to_thread(get_market_sentiment, "general")
    except Exception:
        pass

    return await asyncio.to_thread(
        optimize_black_litterman,
        risk_category=risk_category,
        life_stage=profile.life_stage,
        sentiment=sentiment,
    )
