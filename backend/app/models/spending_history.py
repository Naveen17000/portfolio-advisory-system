import uuid
from datetime import datetime

from sqlalchemy import String, Integer, Numeric, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class MonthlySnapshot(Base):
    """Tracks monthly financial snapshots for trend analysis."""
    __tablename__ = "monthly_snapshots"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    month: Mapped[str] = mapped_column(String(7), nullable=False)  # YYYY-MM
    income: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False)
    expenses: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False)
    savings: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False)
    spending_categories: Mapped[dict] = mapped_column(JSONB, default=dict)
    source: Mapped[str] = mapped_column(String(20), default="manual")  # manual, csv_upload
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class SIPRecord(Base):
    """Tracks individual SIP contributions toward goals."""
    __tablename__ = "sip_records"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    goal_type: Mapped[str] = mapped_column(String(30), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False)
    month: Mapped[str] = mapped_column(String(7), nullable=False)  # YYYY-MM
    notes: Mapped[str] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
