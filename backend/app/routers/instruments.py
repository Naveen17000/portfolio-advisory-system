import asyncio
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.risk_assessment import RiskAssessment
from app.models.portfolio import Portfolio
from app.services.instrument_recommender import get_instrument_recommendations

router = APIRouter()


@router.get("/")
async def get_recommendations(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get specific fund/stock recommendations for current portfolio."""
    # Get latest portfolio
    result = await db.execute(
        select(Portfolio)
        .options(selectinload(Portfolio.allocations))
        .where(Portfolio.user_id == user.id)
        .order_by(Portfolio.created_at.desc())
        .limit(1)
    )
    portfolio = result.scalar_one_or_none()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Generate a portfolio first")

    # Get risk category
    risk_result = await db.execute(
        select(RiskAssessment)
        .where(RiskAssessment.user_id == user.id)
        .order_by(RiskAssessment.created_at.desc())
        .limit(1)
    )
    assessment = risk_result.scalar_one_or_none()
    risk_category = assessment.risk_category if assessment else "moderate"

    allocations = [
        {"asset_class": a.asset_class, "allocation_pct": float(a.allocation_pct)}
        for a in portfolio.allocations
    ]

    return await asyncio.to_thread(get_instrument_recommendations, allocations, risk_category)
