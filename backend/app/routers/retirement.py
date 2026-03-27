from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.dependencies import get_current_user
from app.models.user import User
from app.services.retirement_planner import compute_retirement_plan

router = APIRouter()


class RetirementRequest(BaseModel):
    current_age: int
    retirement_age: int = 60
    monthly_expenses: float
    monthly_savings: float
    current_corpus: float = 0
    expected_return: float = 10
    inflation_rate: float = 6
    life_expectancy: int = 85


@router.post("/plan")
async def plan_retirement(request: RetirementRequest, user: User = Depends(get_current_user)):
    return compute_retirement_plan(**request.model_dump())
