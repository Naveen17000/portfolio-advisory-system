from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.risk_assessment import RiskAssessment
from app.models.portfolio import Portfolio, PortfolioAllocation
from app.schemas.portfolio import PortfolioResponse
from app.services.portfolio_engine import generate_portfolio

router = APIRouter()


@router.post("/generate", response_model=PortfolioResponse, status_code=201)
async def generate(
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
        raise HTTPException(status_code=404, detail="Complete risk assessment first")

    # Get life stage from profile
    from app.services.profile_service import get_profile
    profile = await get_profile(db, user.id)
    life_stage = profile.life_stage if profile else "early_career"

    portfolio_data = generate_portfolio(
        float(assessment.overall_score),
        assessment.risk_category,
        life_stage,
    )

    portfolio = Portfolio(
        user_id=user.id,
        risk_assessment_id=assessment.id,
        expected_return_min=portfolio_data["expected_return_min"],
        expected_return_max=portfolio_data["expected_return_max"],
    )
    db.add(portfolio)
    await db.flush()

    for alloc_data in portfolio_data["allocations"]:
        alloc = PortfolioAllocation(portfolio_id=portfolio.id, **alloc_data)
        db.add(alloc)

    await db.flush()
    await db.refresh(portfolio)

    # Reload with allocations
    result = await db.execute(
        select(Portfolio)
        .options(selectinload(Portfolio.allocations))
        .where(Portfolio.id == portfolio.id)
    )
    return result.scalar_one()


@router.get("/latest", response_model=PortfolioResponse)
async def latest(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Portfolio)
        .options(selectinload(Portfolio.allocations))
        .where(Portfolio.user_id == user.id)
        .order_by(Portfolio.created_at.desc())
        .limit(1)
    )
    portfolio = result.scalar_one_or_none()
    if not portfolio:
        raise HTTPException(status_code=404, detail="No portfolio found")
    return portfolio


@router.get("/history", response_model=list[PortfolioResponse])
async def history(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Portfolio)
        .options(selectinload(Portfolio.allocations))
        .where(Portfolio.user_id == user.id)
        .order_by(Portfolio.created_at.desc())
    )
    return result.scalars().all()
