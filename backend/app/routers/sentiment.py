from fastapi import APIRouter, Depends, Query

from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.sentiment import SentimentResponse
from app.services.sentiment_analyzer import get_market_sentiment

router = APIRouter()


@router.get("/", response_model=SentimentResponse)
async def sentiment(
    category: str = Query("general", description="News category: general, equity, commodities"),
    user: User = Depends(get_current_user),
):
    return get_market_sentiment(category)
