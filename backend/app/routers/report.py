from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.risk_assessment import RiskAssessment
from app.models.portfolio import Portfolio, PortfolioAllocation
from app.services.profile_service import get_profile
from app.services.report_generator import generate_report

router = APIRouter()


@router.get("/download")
async def download_report(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    profile = await get_profile(db, user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Complete your financial profile first")

    risk_result = await db.execute(
        select(RiskAssessment).where(RiskAssessment.user_id == user.id).order_by(RiskAssessment.created_at.desc()).limit(1)
    )
    risk = risk_result.scalar_one_or_none()
    if not risk:
        raise HTTPException(status_code=404, detail="No risk assessment found")

    portfolio_result = await db.execute(
        select(Portfolio).where(Portfolio.user_id == user.id).order_by(Portfolio.created_at.desc()).limit(1).options(selectinload(Portfolio.allocations))
    )
    portfolio = portfolio_result.scalar_one_or_none()
    if not portfolio:
        raise HTTPException(status_code=404, detail="No portfolio found")

    html_bytes = generate_report(user, profile, risk, portfolio)
    return Response(content=html_bytes, media_type="text/html", headers={"Content-Disposition": "attachment; filename=portfolio_report.html"})
