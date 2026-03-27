from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.spending_history import SIPRecord

router = APIRouter()


class SIPEntry(BaseModel):
    goal_type: str
    amount: float
    month: str  # YYYY-MM
    notes: str = ""


@router.post("/log")
async def log_sip(
    data: SIPEntry,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Log a SIP contribution toward a goal."""
    record = SIPRecord(
        user_id=user.id,
        goal_type=data.goal_type,
        amount=data.amount,
        month=data.month,
        notes=data.notes,
    )
    db.add(record)
    await db.flush()
    await db.refresh(record)
    return {"id": str(record.id), "goal_type": record.goal_type, "amount": float(record.amount)}


@router.get("/history")
async def get_sip_history(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get SIP contribution history with adherence metrics."""
    result = await db.execute(
        select(SIPRecord)
        .where(SIPRecord.user_id == user.id)
        .order_by(SIPRecord.month.asc())
    )
    records = result.scalars().all()

    # Group by goal
    goals: dict[str, list] = {}
    for r in records:
        goals.setdefault(r.goal_type, []).append({
            "month": r.month,
            "amount": float(r.amount),
            "notes": r.notes,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        })

    # Calculate adherence per goal
    goal_summaries = []
    for goal_type, contributions in goals.items():
        months_contributed = len(set(c["month"] for c in contributions))
        total_amount = sum(c["amount"] for c in contributions)

        if months_contributed >= 2:
            # Check for consecutive months
            sorted_months = sorted(set(c["month"] for c in contributions))
            gaps = 0
            for i in range(1, len(sorted_months)):
                y1, m1 = map(int, sorted_months[i - 1].split("-"))
                y2, m2 = map(int, sorted_months[i].split("-"))
                expected_next = (y1 * 12 + m1) + 1
                actual = y2 * 12 + m2
                if actual > expected_next:
                    gaps += actual - expected_next
            adherence = round(months_contributed / (months_contributed + gaps) * 100, 1)
        else:
            adherence = 100.0

        goal_summaries.append({
            "goal_type": goal_type,
            "total_contributed": round(total_amount, 2),
            "months_contributed": months_contributed,
            "avg_monthly": round(total_amount / max(months_contributed, 1), 2),
            "adherence_pct": adherence,
            "contributions": contributions,
        })

    overall_adherence = (
        sum(g["adherence_pct"] for g in goal_summaries) / len(goal_summaries)
        if goal_summaries else 0
    )

    return {
        "goals": goal_summaries,
        "overall": {
            "total_goals": len(goal_summaries),
            "total_contributed": round(sum(g["total_contributed"] for g in goal_summaries), 2),
            "overall_adherence": round(overall_adherence, 1),
        },
    }
