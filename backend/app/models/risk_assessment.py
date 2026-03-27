import uuid
from datetime import datetime

from sqlalchemy import String, Numeric, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class RiskAssessment(Base):
    __tablename__ = "risk_assessments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    financial_profile_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("financial_profiles.id"), nullable=False)
    overall_score: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    risk_category: Mapped[str] = mapped_column(String(20), nullable=False)
    spending_ratio_score: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    savings_consistency_score: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    investment_discipline_score: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    liability_burden_score: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    life_stage_modifier: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    score_breakdown: Mapped[dict] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="risk_assessments")
    financial_profile: Mapped["FinancialProfile"] = relationship(back_populates="risk_assessments")
    portfolios: Mapped[list["Portfolio"]] = relationship(back_populates="risk_assessment")
