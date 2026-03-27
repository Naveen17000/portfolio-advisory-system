from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.portfolio import Portfolio
from app.services.stress_test import run_stress_test

router = APIRouter()


class StressTestRequest(BaseModel):
    portfolio_value: float = 1000000


@router.post("/run")
async def stress_test(
    request: StressTestRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Portfolio).where(Portfolio.user_id == user.id).order_by(Portfolio.created_at.desc()).limit(1).options(selectinload(Portfolio.allocations))
    )
    portfolio = result.scalar_one_or_none()
    if not portfolio:
        raise HTTPException(status_code=404, detail="No portfolio found")

    return run_stress_test(portfolio.allocations, request.portfolio_value)
