import uuid
from datetime import datetime

from sqlalchemy import String, Integer, Numeric, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class FinancialProfile(Base):
    __tablename__ = "financial_profiles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False)
    monthly_income: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False)
    monthly_expenses: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False)
    monthly_savings: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False)
    total_liabilities: Mapped[float] = mapped_column(Numeric(15, 2), default=0)
    emergency_fund_months: Mapped[int] = mapped_column(Integer, default=0)
    existing_investments: Mapped[dict] = mapped_column(JSONB, default=dict)
    life_stage: Mapped[str] = mapped_column(String(20), nullable=False)
    dependents_count: Mapped[int] = mapped_column(Integer, default=0)
    investment_horizon_years: Mapped[int] = mapped_column(Integer, nullable=False)
    investment_experience: Mapped[str] = mapped_column(String(20), nullable=False)
    loss_tolerance: Mapped[str] = mapped_column(String(20), nullable=False)
    questionnaire_responses: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user: Mapped["User"] = relationship(back_populates="financial_profile")
    risk_assessments: Mapped[list["RiskAssessment"]] = relationship(back_populates="financial_profile")
