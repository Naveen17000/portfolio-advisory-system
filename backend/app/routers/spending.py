from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.spending_history import MonthlySnapshot

router = APIRouter()


class MonthlyEntry(BaseModel):
    month: str  # YYYY-MM
    income: float
    expenses: float
    spending_categories: dict = {}


@router.post("/monthly")
async def add_monthly_snapshot(
    data: MonthlyEntry,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Log a monthly financial snapshot for trend tracking."""
    snapshot = MonthlySnapshot(
        user_id=user.id,
        month=data.month,
        income=data.income,
        expenses=data.expenses,
        savings=data.income - data.expenses,
        spending_categories=data.spending_categories,
        source="manual",
    )
    db.add(snapshot)
    await db.flush()
    await db.refresh(snapshot)
    return {"id": str(snapshot.id), "month": snapshot.month, "savings": float(snapshot.savings)}


@router.get("/history")
async def get_spending_history(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get monthly spending history with trends."""
    result = await db.execute(
        select(MonthlySnapshot)
        .where(MonthlySnapshot.user_id == user.id)
        .order_by(MonthlySnapshot.month.asc())
    )
    snapshots = result.scalars().all()

    history = []
    for s in snapshots:
        history.append({
            "month": s.month,
            "income": float(s.income),
            "expenses": float(s.expenses),
            "savings": float(s.savings),
            "savings_rate": round(float(s.savings) / float(s.income) * 100, 1) if float(s.income) > 0 else 0,
            "spending_categories": s.spending_categories or {},
            "source": s.source,
        })

    # Trend analysis
    if len(history) >= 2:
        recent = history[-1]
        previous = history[-2]
        trend = {
            "income_change": round(recent["income"] - previous["income"], 2),
            "expense_change": round(recent["expenses"] - previous["expenses"], 2),
            "savings_change": round(recent["savings"] - previous["savings"], 2),
            "direction": "improving" if recent["savings"] > previous["savings"] else "declining",
        }
    else:
        trend = None

    avg_savings_rate = sum(h["savings_rate"] for h in history) / len(history) if history else 0

    return {
        "history": history,
        "trend": trend,
        "summary": {
            "total_months": len(history),
            "avg_savings_rate": round(avg_savings_rate, 1),
            "avg_income": round(sum(h["income"] for h in history) / max(len(history), 1), 2),
            "avg_expenses": round(sum(h["expenses"] for h in history) / max(len(history), 1), 2),
        },
    }
