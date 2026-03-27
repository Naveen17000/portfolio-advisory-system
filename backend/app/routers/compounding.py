from fastapi import APIRouter
from pydantic import BaseModel
from app.services.compounding_calc import compute_compounding

router = APIRouter()


class CompoundingRequest(BaseModel):
    principal: float = 100000
    monthly_sip: float = 10000
    annual_rate: float = 12
    years: int = 20
    inflation_rate: float = 6


@router.post("/calculate")
async def calculate(request: CompoundingRequest):
    return compute_compounding(**request.model_dump())
