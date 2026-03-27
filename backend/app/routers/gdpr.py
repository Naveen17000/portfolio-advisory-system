import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.financial_profile import FinancialProfile
from app.models.risk_assessment import RiskAssessment
from app.models.portfolio import Portfolio
from app.models.spending_history import MonthlySnapshot, SIPRecord
from app.models.audit_log import AuditLog
from app.services.audit_service import log_audit

router = APIRouter()


@router.get("/export")
async def export_my_data(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Export all user data (GDPR Article 20 - Right to data portability)."""
    # Gather all user data
    profile_result = await db.execute(select(FinancialProfile).where(FinancialProfile.user_id == user.id))
    profile = profile_result.scalar_one_or_none()

    risk_result = await db.execute(select(RiskAssessment).where(RiskAssessment.user_id == user.id))
    risks = risk_result.scalars().all()

    portfolio_result = await db.execute(
        select(Portfolio).where(Portfolio.user_id == user.id).options(selectinload(Portfolio.allocations))
    )
    portfolios = portfolio_result.scalars().all()

    snapshot_result = await db.execute(select(MonthlySnapshot).where(MonthlySnapshot.user_id == user.id))
    snapshots = snapshot_result.scalars().all()

    sip_result = await db.execute(select(SIPRecord).where(SIPRecord.user_id == user.id))
    sips = sip_result.scalars().all()

    audit_result = await db.execute(select(AuditLog).where(AuditLog.user_id == user.id).order_by(AuditLog.created_at.desc()).limit(100))
    audits = audit_result.scalars().all()

    data = {
        "user": {
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "date_of_birth": str(user.date_of_birth),
            "created_at": str(user.created_at),
        },
        "financial_profile": {
            "monthly_income": float(profile.monthly_income) if profile else None,
            "monthly_expenses": float(profile.monthly_expenses) if profile else None,
            "monthly_savings": float(profile.monthly_savings) if profile else None,
            "total_liabilities": float(profile.total_liabilities) if profile else None,
            "life_stage": profile.life_stage if profile else None,
            "investment_horizon_years": profile.investment_horizon_years if profile else None,
        } if profile else None,
        "risk_assessments": [
            {"score": r.overall_score, "category": r.risk_category, "date": str(r.created_at)}
            for r in risks
        ],
        "portfolios": [
            {
                "name": p.name,
                "return_min": p.expected_return_min,
                "return_max": p.expected_return_max,
                "date": str(p.created_at),
                "allocations": [
                    {"asset_class": a.asset_class, "pct": float(a.allocation_pct)}
                    for a in p.allocations
                ],
            }
            for p in portfolios
        ],
        "spending_history": [
            {"month": s.month, "income": float(s.income), "expenses": float(s.expenses)}
            for s in snapshots
        ],
        "sip_records": [
            {"goal": s.goal_type, "amount": float(s.amount), "month": s.month}
            for s in sips
        ],
        "audit_log": [
            {"action": a.action, "resource": a.resource, "date": str(a.created_at)}
            for a in audits
        ],
    }

    await log_audit(db, user.id, "data_export", "gdpr", "User exported all data")

    return JSONResponse(
        content=data,
        headers={"Content-Disposition": f"attachment; filename=my_data_{user.email}.json"},
    )


@router.delete("/delete-account")
async def delete_account(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Delete user account and all associated data (GDPR Article 17 - Right to erasure)."""
    user_id = user.id

    # Delete in order (foreign key constraints)
    await db.execute(delete(AuditLog).where(AuditLog.user_id == user_id))
    await db.execute(delete(SIPRecord).where(SIPRecord.user_id == user_id))
    await db.execute(delete(MonthlySnapshot).where(MonthlySnapshot.user_id == user_id))

    # Delete portfolio allocations via portfolio
    portfolio_result = await db.execute(select(Portfolio).where(Portfolio.user_id == user_id))
    for p in portfolio_result.scalars().all():
        from app.models.portfolio import PortfolioAllocation
        await db.execute(delete(PortfolioAllocation).where(PortfolioAllocation.portfolio_id == p.id))

    await db.execute(delete(Portfolio).where(Portfolio.user_id == user_id))
    await db.execute(delete(RiskAssessment).where(RiskAssessment.user_id == user_id))
    await db.execute(delete(FinancialProfile).where(FinancialProfile.user_id == user_id))
    await db.execute(delete(User).where(User.id == user_id))

    return {"message": "Account and all associated data have been permanently deleted"}
