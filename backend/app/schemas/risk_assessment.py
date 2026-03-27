from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class RiskAssessmentResponse(BaseModel):
    id: UUID
    user_id: UUID
    financial_profile_id: UUID
    overall_score: float
    risk_category: str
    spending_ratio_score: float
    savings_consistency_score: float
    investment_discipline_score: float
    liability_burden_score: float
    life_stage_modifier: float
    score_breakdown: dict
    created_at: datetime

    model_config = {"from_attributes": True}
