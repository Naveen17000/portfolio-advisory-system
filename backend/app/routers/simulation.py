import asyncio
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.portfolio import Portfolio
from app.schemas.simulation import SimulationRequest, SimulationResponse
from app.services.monte_carlo import run_simulation

router = APIRouter()


@router.post("/run", response_model=SimulationResponse)
async def simulate(
    data: SimulationRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Get latest portfolio allocations
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

    allocations = {a.asset_class: float(a.allocation_pct) for a in portfolio.allocations}

    sim_result = await asyncio.to_thread(
        run_simulation,
        allocations=allocations,
        initial_investment=data.initial_investment,
        monthly_sip=data.monthly_sip,
        years=data.years,
    )

    return sim_result
