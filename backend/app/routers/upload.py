from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.spending_history import MonthlySnapshot
from app.services.statement_parser import parse_csv_statement
from app.services.profile_service import get_profile, update_profile

router = APIRouter()


@router.post("/csv")
async def upload_csv_statement(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload a CSV bank statement for automated financial profiling."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded. Please select a CSV file.")

    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{file.filename.split('.')[-1]}'. Only .csv files are supported."
        )

    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")

    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 10MB.")

    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError:
        try:
            text = content.decode("latin-1")
        except UnicodeDecodeError:
            raise HTTPException(status_code=400, detail="Could not read file. Ensure it is a valid CSV with UTF-8 or Latin-1 encoding.")

    result = parse_csv_statement(text)

    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    if result["summary"]["total_transactions"] == 0:
        raise HTTPException(
            status_code=400,
            detail="No transactions found in the CSV. Ensure it has columns like Date, Description, and Amount (or Debit/Credit)."
        )

    # Save monthly snapshots
    for month_data in result.get("monthly_trend", []):
        snapshot = MonthlySnapshot(
            user_id=user.id,
            month=month_data["month"],
            income=month_data["income"],
            expenses=month_data["expenses"],
            savings=month_data["income"] - month_data["expenses"],
            spending_categories=result.get("spending_categories", {}),
            source="csv_upload",
        )
        db.add(snapshot)

    # Optionally auto-update profile with averages
    profile = await get_profile(db, user.id)
    if profile:
        suggested = result["suggested_profile"]
        await update_profile(db, profile, {
            "monthly_income": suggested["monthly_income"],
            "monthly_expenses": suggested["monthly_expenses"],
            "monthly_savings": suggested["monthly_savings"],
        })

    return result
