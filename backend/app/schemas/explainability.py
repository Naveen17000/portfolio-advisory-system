from pydantic import BaseModel


class ExplainabilityResponse(BaseModel):
    base_value: float
    feature_contributions: dict
    top_insights: list[dict]
    summary: str
