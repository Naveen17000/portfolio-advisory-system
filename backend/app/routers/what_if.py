from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.services.profile_service import get_profile
from app.services.what_if_engine import run_what_if

router = APIRouter()


class WhatIfRequest(BaseModel):
    monthly_income: float | None = None
    monthly_expenses: float | None = None
    total_liabilities: float | None = None
    emergency_fund_months: int | None = None
    investment_horizon_years: int | None = None
    life_stage: str | None = None


@router.post("/analyze")
async def analyze(request: WhatIfRequest, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    profile = await get_profile(db, user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Complete your financial profile first")

    overrides = {k: v for k, v in request.model_dump().items() if v is not None}
    if not overrides:
        raise HTTPException(status_code=400, detail="Provide at least one parameter to modify")

    result = run_what_if(profile, overrides)
    return result
