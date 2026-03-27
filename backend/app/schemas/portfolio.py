from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class PortfolioAllocationResponse(BaseModel):
    id: UUID
    asset_class: str
    allocation_pct: float
    expected_return_min: float | None
    expected_return_max: float | None
    rationale: str | None

    model_config = {"from_attributes": True}


class PortfolioResponse(BaseModel):
    id: UUID
    user_id: UUID
    risk_assessment_id: UUID
    name: str
    expected_return_min: float
    expected_return_max: float
    allocations: list[PortfolioAllocationResponse]
    created_at: datetime

    model_config = {"from_attributes": True}
