from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.financial_profile import FinancialProfile


async def get_profile(db: AsyncSession, user_id: UUID) -> FinancialProfile | None:
    result = await db.execute(
        select(FinancialProfile).where(FinancialProfile.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def create_profile(db: AsyncSession, user_id: UUID, data: dict) -> FinancialProfile:
    profile = FinancialProfile(user_id=user_id, **data)
    db.add(profile)
    await db.flush()
    await db.refresh(profile)
    return profile


async def update_profile(db: AsyncSession, profile: FinancialProfile, data: dict) -> FinancialProfile:
    for key, value in data.items():
        if value is not None:
            setattr(profile, key, value)
    await db.flush()
    await db.refresh(profile)
    return profile
