from fastapi import APIRouter, Depends, HTTPException, Query

from app.dependencies import get_current_user
from app.models.user import User
from app.services.stock_classifier import classify_all_stocks
from app.services.market_data import compute_stock_metrics, get_asset_class_historical_stats

router = APIRouter()


@router.get("/classified")
async def get_classified_stocks(user: User = Depends(get_current_user)):
    """Get all stocks classified by risk category using real market data."""
    return classify_all_stocks()


@router.get("/metrics/{ticker}")
async def get_stock_metrics(
    ticker: str,
    user: User = Depends(get_current_user),
):
    """Get detailed metrics for a specific stock."""
    metrics = compute_stock_metrics(ticker)
    if metrics is None:
        raise HTTPException(status_code=404, detail=f"Could not fetch data for {ticker}")
    from app.services.stock_classifier import classify_stock
    return classify_stock(metrics)


@router.get("/asset-class-stats")
async def get_asset_stats(user: User = Depends(get_current_user)):
    """Get real historical returns and volatility for each asset class."""
    return get_asset_class_historical_stats()
