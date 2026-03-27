import uuid
from datetime import datetime

from sqlalchemy import String, Numeric, Text, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Portfolio(Base):
    __tablename__ = "portfolios"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    risk_assessment_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("risk_assessments.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), default="Recommended Portfolio")
    expected_return_min: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    expected_return_max: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="portfolios")
    risk_assessment: Mapped["RiskAssessment"] = relationship(back_populates="portfolios")
    allocations: Mapped[list["PortfolioAllocation"]] = relationship(back_populates="portfolio", cascade="all, delete-orphan")


class PortfolioAllocation(Base):
    __tablename__ = "portfolio_allocations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    portfolio_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("portfolios.id", ondelete="CASCADE"), nullable=False)
    asset_class: Mapped[str] = mapped_column(String(30), nullable=False)
    allocation_pct: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    expected_return_min: Mapped[float] = mapped_column(Numeric(5, 2), nullable=True)
    expected_return_max: Mapped[float] = mapped_column(Numeric(5, 2), nullable=True)
    rationale: Mapped[str] = mapped_column(Text, nullable=True)

    portfolio: Mapped["Portfolio"] = relationship(back_populates="allocations")
