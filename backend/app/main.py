import logging
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import settings
from app.database import engine, Base
from app.models import (
    User, FinancialProfile, RiskAssessment, Portfolio, PortfolioAllocation,
    MonthlySnapshot, SIPRecord, AuditLog,
)
from app.middleware.logging_middleware import RequestLoggingMiddleware
from app.middleware.error_handler import (
    http_exception_handler,
    validation_exception_handler,
    unhandled_exception_handler,
)
from app.middleware.rate_limiter import limiter, rate_limit_exceeded_handler
from app.utils.cache import close_redis, get_redis
from app.routers import auth, profile, questionnaire, risk, portfolio
from app.routers import simulation, goals, sentiment, explainability, stocks
from app.routers import chat, nudges, benchmark
from app.routers import upload, instruments, bl_optimizer, spending, sip_tracker
from app.routers import report, what_if, model_benchmark_router, rebalance, frontier, stress_test_router, tax, retirement, compounding
from app.routers import gdpr, invest

# ── Logging ──────────────────────────────────────────────────────────
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s %(levelname)-8s [%(name)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    stream=sys.stdout,
)
logger = logging.getLogger("portfolio_api")


# ── Lifespan ─────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    # Warm up Redis connection
    try:
        redis = await get_redis()
        await redis.ping()
        logger.info("Redis connection established")
    except Exception:
        logger.warning("Redis unavailable — caching disabled")
    logger.info("Application started (env=%s)", settings.ENVIRONMENT)
    yield
    await close_redis()
    logger.info("Application shutdown")


# ── App ──────────────────────────────────────────────────────────────
app = FastAPI(
    title="Portfolio Advisory System",
    description="AI-Driven Investment Risk Profiling & Portfolio Advisory",
    version="3.0.0",
    lifespan=lifespan,
)

# ── Rate limiter ─────────────────────────────────────────────────────
limiter._storage_uri = settings.REDIS_URL
app.state.limiter = limiter

# ── Middleware (order matters: first added = outermost) ───────────────
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.CORS_ORIGINS.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Exception handlers ───────────────────────────────────────────────
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)

# ── Phase 1: Core ────────────────────────────────────────────────────
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(profile.router, prefix="/api/v1/profile", tags=["Profile"])
app.include_router(questionnaire.router, prefix="/api/v1/questionnaire", tags=["Questionnaire"])
app.include_router(risk.router, prefix="/api/v1/risk", tags=["Risk"])
app.include_router(portfolio.router, prefix="/api/v1/portfolio", tags=["Portfolio"])

# ── Phase 2: Intelligence ────────────────────────────────────────────
app.include_router(simulation.router, prefix="/api/v1/simulation", tags=["Simulation"])
app.include_router(goals.router, prefix="/api/v1/goals", tags=["Goals"])
app.include_router(sentiment.router, prefix="/api/v1/sentiment", tags=["Sentiment"])
app.include_router(explainability.router, prefix="/api/v1/explain", tags=["Explainability"])
app.include_router(stocks.router, prefix="/api/v1/stocks", tags=["Stocks"])

# ── Phase 3: Advanced ────────────────────────────────────────────────
app.include_router(chat.router, prefix="/api/v1/chat", tags=["Chat"])
app.include_router(nudges.router, prefix="/api/v1/nudges", tags=["Nudges"])
app.include_router(benchmark.router, prefix="/api/v1/benchmark", tags=["Benchmark"])

# ── Additional ───────────────────────────────────────────────────────
app.include_router(upload.router, prefix="/api/v1/upload", tags=["Upload"])
app.include_router(instruments.router, prefix="/api/v1/instruments", tags=["Instruments"])
app.include_router(bl_optimizer.router, prefix="/api/v1/bl-optimize", tags=["Black-Litterman"])
app.include_router(spending.router, prefix="/api/v1/spending", tags=["Spending"])
app.include_router(sip_tracker.router, prefix="/api/v1/sip", tags=["SIP Tracker"])

# ── Phase 4: Enhanced Analytics ──────────────────────────────────────
app.include_router(report.router, prefix="/api/v1/report", tags=["Report"])
app.include_router(what_if.router, prefix="/api/v1/what-if", tags=["What-If"])
app.include_router(model_benchmark_router.router, prefix="/api/v1/model-benchmark", tags=["Model Benchmark"])
app.include_router(rebalance.router, prefix="/api/v1/rebalance", tags=["Rebalancing"])
app.include_router(frontier.router, prefix="/api/v1/frontier", tags=["Frontier"])
app.include_router(stress_test_router.router, prefix="/api/v1/stress-test", tags=["Stress Test"])
app.include_router(tax.router, prefix="/api/v1/tax", tags=["Tax"])
app.include_router(retirement.router, prefix="/api/v1/retirement", tags=["Retirement"])
app.include_router(compounding.router, prefix="/api/v1/compounding", tags=["Compounding"])
app.include_router(gdpr.router, prefix="/api/v1/account", tags=["Account/GDPR"])
app.include_router(invest.router, prefix="/api/v1/invest", tags=["Investment Recommendations"])


# ── Health ───────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    checks = {"api": "ok"}
    try:
        async with engine.connect() as conn:
            await conn.execute(
                __import__("sqlalchemy").text("SELECT 1")
            )
        checks["database"] = "ok"
    except Exception:
        checks["database"] = "error"

    try:
        redis = await get_redis()
        await redis.ping()
        checks["redis"] = "ok"
    except Exception:
        checks["redis"] = "error"

    overall = "ok" if all(v == "ok" for v in checks.values()) else "degraded"
    status_code = 200 if overall == "ok" else 503
    return {"status": overall, "checks": checks}


# ── Metrics ──────────────────────────────────────────────────────────
@app.get("/metrics")
async def metrics():
    """Basic Prometheus-compatible metrics endpoint."""
    from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
    from starlette.responses import Response
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)
