from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.financial_profile import (
    FinancialProfileCreate,
    FinancialProfileUpdate,
    FinancialProfileResponse,
)
from app.services.profile_service import get_profile, create_profile, update_profile

router = APIRouter()


@router.post("/", response_model=FinancialProfileResponse, status_code=201)
async def create(
    data: FinancialProfileCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    existing = await get_profile(db, user.id)
    if existing:
        raise HTTPException(status_code=400, detail="Profile already exists. Use PUT to update.")
    profile = await create_profile(db, user.id, data.model_dump())
    return profile


@router.get("/", response_model=FinancialProfileResponse)
async def read(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    profile = await get_profile(db, user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found. Complete the questionnaire first.")
    return profile


@router.put("/", response_model=FinancialProfileResponse)
async def update(
    data: FinancialProfileUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    profile = await get_profile(db, user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    updated = await update_profile(db, profile, data.model_dump(exclude_unset=True))
    return updated
