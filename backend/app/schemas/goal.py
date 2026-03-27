from pydantic import BaseModel


class GoalRequest(BaseModel):
    goal_type: str
    target_amount: float
    current_savings: float = 0
    years: int | None = None
    risk_preference: str | None = None


class GoalTemplateResponse(BaseModel):
    id: str
    label: str
    description: str
    default_horizon: int
    priority: str
    risk_preference: str


class GoalAnalysisResponse(BaseModel):
    goal: dict
    recommendation: dict
    simulation: dict
    sip_scenarios: list[dict]
