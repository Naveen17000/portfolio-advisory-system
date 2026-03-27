from fastapi import APIRouter
from app.services.frontier_engine import compute_efficient_frontier, get_correlation_matrix

router = APIRouter()


@router.get("/")
async def get_frontier():
    return compute_efficient_frontier()


@router.get("/correlation")
async def get_correlation():
    return get_correlation_matrix()
