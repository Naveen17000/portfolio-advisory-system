from fastapi import APIRouter, Depends

from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.goal import GoalRequest, GoalTemplateResponse, GoalAnalysisResponse
from app.services.goal_engine import get_goal_templates, analyze_goal

router = APIRouter()


@router.get("/templates", response_model=list[GoalTemplateResponse])
async def templates():
    return get_goal_templates()


@router.post("/analyze", response_model=GoalAnalysisResponse)
async def analyze(
    data: GoalRequest,
    user: User = Depends(get_current_user),
):
    result = analyze_goal(
        goal_type=data.goal_type,
        target_amount=data.target_amount,
        current_savings=data.current_savings,
        years=data.years,
        risk_preference=data.risk_preference,
    )
    return result
