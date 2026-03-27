from fastapi import APIRouter
from app.services.model_benchmark import run_benchmark

router = APIRouter()


@router.get("/")
async def get_benchmark():
    return run_benchmark()
