from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.questionnaire import QuestionnaireResponse, QuestionnaireSubmission
from app.schemas.financial_profile import FinancialProfileResponse
from app.services.questionnaire_service import get_questions, map_responses_to_profile
from app.services.profile_service import get_profile, create_profile, update_profile

router = APIRouter()


@router.get("/questions", response_model=QuestionnaireResponse)
async def questions():
    return QuestionnaireResponse(questions=get_questions())


@router.post("/submit", response_model=FinancialProfileResponse)
async def submit(
    data: QuestionnaireSubmission,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    profile_data = map_responses_to_profile(data.responses)
    existing = await get_profile(db, user.id)
    if existing:
        profile = await update_profile(db, existing, profile_data)
    else:
        profile = await create_profile(db, user.id, profile_data)
    return profile
