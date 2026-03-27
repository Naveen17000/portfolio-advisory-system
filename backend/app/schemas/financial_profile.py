from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel

from app.utils.constants import LifeStage, InvestmentExperience, LossTolerance


class FinancialProfileCreate(BaseModel):
    monthly_income: float
    monthly_expenses: float
    monthly_savings: float
    total_liabilities: float = 0
    emergency_fund_months: int = 0
    existing_investments: dict = {}
    life_stage: LifeStage
    dependents_count: int = 0
    investment_horizon_years: int
    investment_experience: InvestmentExperience
    loss_tolerance: LossTolerance


class FinancialProfileUpdate(BaseModel):
    monthly_income: Optional[float] = None
    monthly_expenses: Optional[float] = None
    monthly_savings: Optional[float] = None
    total_liabilities: Optional[float] = None
    emergency_fund_months: Optional[int] = None
    existing_investments: Optional[dict] = None
    life_stage: Optional[LifeStage] = None
    dependents_count: Optional[int] = None
    investment_horizon_years: Optional[int] = None
    investment_experience: Optional[InvestmentExperience] = None
    loss_tolerance: Optional[LossTolerance] = None


class FinancialProfileResponse(BaseModel):
    id: UUID
    user_id: UUID
    monthly_income: float
    monthly_expenses: float
    monthly_savings: float
    total_liabilities: float
    emergency_fund_months: int
    existing_investments: dict
    life_stage: str
    dependents_count: int
    investment_horizon_years: int
    investment_experience: str
    loss_tolerance: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
