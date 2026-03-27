"""Initial schema

Revision ID: 001
Revises:
Create Date: 2026-03-27

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- users ---
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), unique=True, nullable=False, index=True),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(100), nullable=False),
        sa.Column("date_of_birth", sa.Date, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # --- financial_profiles ---
    op.create_table(
        "financial_profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), unique=True, nullable=False),
        sa.Column("monthly_income", sa.Numeric(15, 2), nullable=False),
        sa.Column("monthly_expenses", sa.Numeric(15, 2), nullable=False),
        sa.Column("monthly_savings", sa.Numeric(15, 2), nullable=False),
        sa.Column("total_liabilities", sa.Numeric(15, 2), server_default="0"),
        sa.Column("emergency_fund_months", sa.Integer, server_default="0"),
        sa.Column("existing_investments", postgresql.JSONB, server_default="{}"),
        sa.Column("life_stage", sa.String(20), nullable=False),
        sa.Column("dependents_count", sa.Integer, server_default="0"),
        sa.Column("investment_horizon_years", sa.Integer, nullable=False),
        sa.Column("investment_experience", sa.String(20), nullable=False),
        sa.Column("loss_tolerance", sa.String(20), nullable=False),
        sa.Column("questionnaire_responses", postgresql.JSONB, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # --- risk_assessments ---
    op.create_table(
        "risk_assessments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("financial_profile_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("financial_profiles.id"), nullable=False),
        sa.Column("overall_score", sa.Numeric(5, 2), nullable=False),
        sa.Column("risk_category", sa.String(20), nullable=False),
        sa.Column("spending_ratio_score", sa.Numeric(5, 2), nullable=False),
        sa.Column("savings_consistency_score", sa.Numeric(5, 2), nullable=False),
        sa.Column("investment_discipline_score", sa.Numeric(5, 2), nullable=False),
        sa.Column("liability_burden_score", sa.Numeric(5, 2), nullable=False),
        sa.Column("life_stage_modifier", sa.Numeric(5, 2), nullable=False),
        sa.Column("score_breakdown", postgresql.JSONB, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # --- portfolios ---
    op.create_table(
        "portfolios",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("risk_assessment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("risk_assessments.id"), nullable=False),
        sa.Column("name", sa.String(100), server_default="Recommended Portfolio"),
        sa.Column("expected_return_min", sa.Numeric(5, 2), nullable=False),
        sa.Column("expected_return_max", sa.Numeric(5, 2), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # --- portfolio_allocations ---
    op.create_table(
        "portfolio_allocations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("portfolio_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("portfolios.id", ondelete="CASCADE"), nullable=False),
        sa.Column("asset_class", sa.String(30), nullable=False),
        sa.Column("allocation_pct", sa.Numeric(5, 2), nullable=False),
        sa.Column("expected_return_min", sa.Numeric(5, 2), nullable=True),
        sa.Column("expected_return_max", sa.Numeric(5, 2), nullable=True),
        sa.Column("rationale", sa.Text, nullable=True),
    )

    # --- monthly_snapshots ---
    op.create_table(
        "monthly_snapshots",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("month", sa.String(7), nullable=False),
        sa.Column("income", sa.Numeric(15, 2), nullable=False),
        sa.Column("expenses", sa.Numeric(15, 2), nullable=False),
        sa.Column("savings", sa.Numeric(15, 2), nullable=False),
        sa.Column("spending_categories", postgresql.JSONB, server_default="{}"),
        sa.Column("source", sa.String(20), server_default="manual"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # --- sip_records ---
    op.create_table(
        "sip_records",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("goal_type", sa.String(30), nullable=False),
        sa.Column("amount", sa.Numeric(15, 2), nullable=False),
        sa.Column("month", sa.String(7), nullable=False),
        sa.Column("notes", sa.String(200), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("sip_records")
    op.drop_table("monthly_snapshots")
    op.drop_table("portfolio_allocations")
    op.drop_table("portfolios")
    op.drop_table("risk_assessments")
    op.drop_table("financial_profiles")
    op.drop_table("users")
