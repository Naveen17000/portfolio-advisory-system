from pydantic import BaseModel


class SentimentResponse(BaseModel):
    category: str
    overall_sentiment: str
    overall_score: float
    article_count: int
    articles: list[dict]
    sector_sentiment: dict
