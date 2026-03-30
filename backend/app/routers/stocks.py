import asyncio

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.services.stock_classifier import classify_all_stocks, classify_stock
from app.services.market_data import compute_stock_metrics, get_asset_class_historical_stats
from app.services.profile_service import get_profile
from app.services.risk_engine import assess_risk

router = APIRouter()


@router.get("/classified")
async def get_classified_stocks(user: User = Depends(get_current_user)):
    """Get all stocks classified by risk category using real market data."""
    return await asyncio.to_thread(classify_all_stocks)


@router.get("/recommended")
async def get_recommended_stocks(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get personalized stock recommendations based on user's risk profile."""
    profile = await get_profile(db, user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Complete your financial profile first")

    risk = assess_risk(profile)
    risk_category = risk["risk_category"]
    risk_score = risk["overall_score"]
    life_stage = profile.life_stage

    all_stocks = await asyncio.to_thread(classify_all_stocks)

    # Build personalized recommendations based on risk profile
    recommended = []
    explore = []
    avoid = []

    # Determine which stock risk categories suit this user
    if risk_category == "conservative":
        primary_cats = ["safe"]
        secondary_cats = ["moderate"]
        avoid_cats = ["high_risk"]
        advice = "As a conservative investor, focus on stable large-cap stocks with low beta and strong dividends. Avoid highly volatile small-caps."
    elif risk_category == "aggressive":
        primary_cats = ["moderate", "high_risk"]
        secondary_cats = ["safe"]
        avoid_cats = []
        advice = "As an aggressive investor, you can explore high-growth mid/small-cap stocks for higher returns. Keep some safe stocks for stability."
    else:
        primary_cats = ["safe", "moderate"]
        secondary_cats = ["high_risk"]
        avoid_cats = []
        advice = "As a moderate investor, blend stable large-caps with select mid-caps for balanced growth. Limit exposure to high-risk stocks."

    for cat in primary_cats:
        for stock in all_stocks.get(cat, []):
            stock["recommendation"] = "recommended"
            stock["reason"] = f"Matches your {risk_category} risk profile"
            recommended.append(stock)

    for cat in secondary_cats:
        for stock in all_stocks.get(cat, [])[:5]:
            stock["recommendation"] = "explore"
            stock["reason"] = "Consider for diversification with limited allocation"
            explore.append(stock)

    for cat in avoid_cats:
        for stock in all_stocks.get(cat, [])[:3]:
            stock["recommendation"] = "caution"
            stock["reason"] = "Higher risk than your profile suggests — invest only if you understand the risks"
            avoid.append(stock)

    # Sort recommended by Sharpe ratio (best risk-adjusted returns first)
    recommended.sort(key=lambda s: s.get("sharpe_ratio", 0), reverse=True)

    return {
        "risk_category": risk_category,
        "risk_score": risk_score,
        "life_stage": life_stage,
        "advice": advice,
        "recommended": recommended,
        "explore": explore,
        "caution": avoid,
        "total_analyzed": all_stocks.get("summary", {}).get("total_analyzed", 0),
    }


@router.get("/search")
async def search_stocks(
    q: str = Query(..., min_length=1, description="Search query"),
    user: User = Depends(get_current_user),
):
    """Search for stocks by name or ticker symbol."""
    from app.services.stock_search import search_stocks as do_search
    return await asyncio.to_thread(do_search, q)


@router.get("/metrics/{ticker}")
async def get_stock_metrics(
    ticker: str,
    user: User = Depends(get_current_user),
):
    """Get detailed metrics for a specific stock."""
    metrics = await asyncio.to_thread(compute_stock_metrics, ticker)
    if metrics is None:
        raise HTTPException(status_code=404, detail=f"Could not fetch data for {ticker}")
    return classify_stock(metrics)


@router.get("/asset-class-stats")
async def get_asset_stats(user: User = Depends(get_current_user)):
    """Get real historical returns and volatility for each asset class."""
    return await asyncio.to_thread(get_asset_class_historical_stats)
