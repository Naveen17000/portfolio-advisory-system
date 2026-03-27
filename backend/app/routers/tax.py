from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.dependencies import get_current_user
from app.models.user import User
from app.services.tax_planner import compute_tax

router = APIRouter()


class TaxRequest(BaseModel):
    annual_income: float
    deductions_80c: float = 0
    deductions_80d: float = 0
    nps_80ccd: float = 0


@router.post("/calculate")
async def calculate_tax(request: TaxRequest, user: User = Depends(get_current_user)):
    return compute_tax(request.annual_income, request.deductions_80c, request.deductions_80d, request.nps_80ccd)
