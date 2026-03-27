from pydantic import BaseModel


class SimulationRequest(BaseModel):
    initial_investment: float = 100000
    monthly_sip: float = 10000
    years: int = 10


class SimulationResponse(BaseModel):
    parameters: dict
    total_invested: float
    final_value_percentiles: dict
    yearly_data: list[dict]
    statistics: dict
    scenarios: dict
