"""Life Event Simulator API."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.services.profile_service import get_profile
from app.services.life_event_simulator import get_event_templates, simulate_life_events

router = APIRouter()


class EventInput(BaseModel):
    event_id: str
    year: int


class SimulationRequest(BaseModel):
    events: list[EventInput]
    projection_years: int = 20


@router.get("/templates")
async def list_templates(user: User = Depends(get_current_user)):
    """Get all available life event templates."""
    return get_event_templates()


@router.post("/simulate")
async def simulate(
    request: SimulationRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Run life event simulation with user's actual financial profile."""
    profile = await get_profile(db, user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Complete your financial profile first")

    # Calculate approximate current age from DOB
    current_age = 25
    if user.date_of_birth:
        from datetime import date
        today = date.today()
        dob = user.date_of_birth if isinstance(user.date_of_birth, date) else today
        current_age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))

    profile_data = {
        "monthly_income": float(profile.monthly_income),
        "monthly_expenses": float(profile.monthly_expenses),
        "monthly_savings": float(profile.monthly_savings),
        "total_liabilities": float(profile.total_liabilities),
        "emergency_fund_months": profile.emergency_fund_months,
        "dependents_count": profile.dependents_count,
        "investment_horizon_years": profile.investment_horizon_years,
        "current_age": current_age,
    }

    events = [{"event_id": e.event_id, "year": e.year} for e in request.events]

    result = simulate_life_events(
        profile=profile_data,
        events=events,
        projection_years=request.projection_years,
    )

    return result
