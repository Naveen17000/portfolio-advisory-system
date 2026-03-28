# AI-Driven Investment Risk Profiling & Portfolio Advisory System

An intelligent financial advisory platform that delivers highly personalized investment guidance by integrating behavioral intelligence, explainable AI, financial modeling, and real-time market insights. Built as a full-stack application with **34 interactive pages**, **50 API endpoints**, **30 backend services**, **22 components**, **92 tests**, and production-ready infrastructure.

## Features

### Phase 1 - Core Platform
- **Adaptive Questionnaire** - 6-step financial profiling (income, expenses, liabilities, emergency fund, investment experience, risk attitude) with conditional logic
- **Bank Statement Parsing** - CSV upload supporting 8+ bank formats: separate debit/credit columns, single amount with +/- signs, amount with Cr/Dr suffix, Type column (CR/DR), parenthesized negatives, Indian comma notation (₹50,000.00), Rs/INR prefixes. Auto-categorization of 16 expense types (groceries, dining, transport, utilities, rent, EMI, insurance, investments, shopping, entertainment, healthcare, education, transfers, salary, interest, cashback). Clear error messages for malformed files
- **Behavioral Risk Scoring** - Rule-based engine with 4 weighted sub-scores: spending ratio (25%), savings consistency (25%), investment discipline (30%), liability burden (20%)
- **Life-Stage Awareness** - Dynamic adjustments for Student, Early Career, Family, and Pre-Retirement stages with investment horizon modifiers
- **Portfolio Generation (MPT)** - Modern Portfolio Theory-based asset allocation across 6 classes (Large/Mid/Small Cap Equity, Debt, Gold/Commodities, Liquid Funds) with boundary interpolation
- **Black-Litterman Optimization** - Bayesian portfolio optimization combining market equilibrium returns with investor views derived from risk profile and market sentiment
- **Suggested Instruments** - Specific mutual fund and stock recommendations mapped to each asset class allocation, with curated fund database and real-time stock picks
- **Interactive Dashboard** - KPI strip (health grade, savings rate, emergency fund, risk category, return range), risk gauge, score breakdown charts, allocation pie chart, top priority nudges, and action grid navigation
- **JWT Authentication** - Secure registration and login with access + refresh token flow, auto-refresh on expiry
- **Profile Management** - View/edit financial data with one-click re-assessment

### Phase 2 - Intelligence Layer
- **ML Risk Model** - Gradient Boosting regressor trained on 5,000 synthetic behavioral finance profiles using Prospect Theory and interaction effects; blended 60/40 with rule-based engine
- **Explainable AI (SHAP)** - TreeExplainer-based feature contribution analysis with human-readable insights for each risk factor
- **Monte Carlo Simulation (Fat-Tail + Regime Switching)** - 1,000-path simulation engine using Student-t distribution (df=5) for fat tails and Markov chain regime switching (bull/bear market cycles). Fan chart visualization, 5 scenario outcomes, probability metrics, regime analysis (bull/bear duration and frequency). Uses real historical data from yfinance when available
- **Goal-Based Planning** - 7 goal templates (emergency fund, education, home, car, vacation, retirement, wealth building) with SIP calculators and 4 SIP scenarios per goal
- **SIP Adherence Tracking** - Log actual SIP contributions per goal, track adherence percentage, detect missed months, monthly contribution history
- **Market Sentiment Analysis** - FinBERT (ProsusAI) NLP pipeline analyzing financial news RSS feeds with sector-wise sentiment scoring (8 sectors)
- **Stock Classification** - Real-time classification of 45 Indian stocks (Nifty 50 + Midcap + Smallcap) as Safe/Moderate/High Risk using beta, volatility, Sharpe ratio, max drawdown, and market cap from Yahoo Finance
- **Spending History Tracking** - Monthly income/expense logging with trend analysis (improving/declining), savings rate tracking over time, bar chart visualization
- **Real Market Data** - yfinance integration for historical returns, volatility, and asset class statistics with 24-hour disk caching

### Phase 3 - Advanced Features
- **Conversational AI Assistant (Gemini LLM)** - Google Gemini 2.5 Flash-powered chatbot with SSE streaming (real-time token-by-token responses), persistent conversation history, and full financial context injection (risk score, life stage, income, savings, investment horizon). Provides personalized, conversational investment guidance in English/Hinglish with Indian financial context (80C, ELSS, NPS, PPF, SGB). Falls back to rule-based 12-topic knowledge base if API is unavailable
- **Anomaly Detection & Behavioral Nudge Engine** - Detects 10 types of financial anomalies including behavioral patterns (lifestyle inflation, cash hoarding, over-concentration, insurance gap), generates impact-scored nudges (0-100) with smart prioritization, micro-wins for positive reinforcement, trend indicators per metric, and overall tone classification (encouraging/mixed/concerning). Health grade A-F
- **Gamification** - 16 achievements across 6 categories (savings milestones, emergency fund, debt management, diversification, experience, discipline) with a 6-level progression system (Beginner to Master Investor)
- **Peer Benchmarking** - Anonymized comparison against life-stage cohorts across 6 metrics (savings rate, spending ratio, emergency fund, debt-to-income, risk score, investment diversity) with percentile rankings and cohort allocation benchmarks

### Phase 4 - Enhanced Analytics & Production Readiness
- **What-If Scenario Analysis** - Interactive sliders to modify income, expenses, liabilities, horizon, and life stage with real-time risk score and portfolio allocation impact
- **Model Benchmarking** - Side-by-side comparison of ML vs rule-based scoring across benchmark profiles, with agreement metrics, feature importance charts, and model info
- **Efficient Frontier Visualization** - 500-portfolio Monte Carlo frontier with optimal (max Sharpe) and minimum variance portfolios highlighted, plus individual asset class risk-return plot
- **Asset Correlation Heatmap** - Color-coded 6x6 matrix showing inter-asset-class correlations for diversification analysis
- **Dynamic Portfolio Rebalancing** - Drift detection with threshold-based urgency levels (none/monitor/recommended/urgent), tax-aware trade suggestions (LTCG/STCG impact per asset class), priority scoring (0-100) per trade, and calendar-based rebalancing schedule (monthly/quarterly/annual)
- **Stress Testing** - Portfolio impact analysis across 5 historical crisis scenarios (2008 GFC, COVID-19, Taper Tantrum, Rate Hike Cycle, Stagflation) with asset-level breakdown
- **Tax Planning (India)** - New regime tax calculator with Section 80C/80D utilization tracking, slab-wise breakdown, and tax-saving instrument recommendations (ELSS, PPF, NPS, etc.)
- **Retirement Readiness Calculator** - Corpus projection, readiness gauge (A-F grade), glide path visualization, safe withdrawal rate analysis, additional SIP shortfall calculator
- **Compounding & DCA Calculator** - Lump sum vs SIP growth comparison, inflation-adjusted real returns, year-by-year projection charts
- **Debt Payoff Planner** - Client-side EMI calculator with amortization chart, extra payment impact analysis, interest savings visualization
- **PDF Report Generation** - Downloadable HTML report with risk profile, financial summary, and portfolio allocation details
- **Risk Score Timeline** - Area chart showing risk score changes over time with conservative/moderate/aggressive zone markers
- **Portfolio Comparison** - Side-by-side comparison of current vs alternative portfolio allocations with pie charts and difference table
- **Stock Watchlist** - Add/remove tickers, fetch live metrics (beta, volatility, Sharpe ratio, sector), localStorage persistence
- **CSV Data Export** - Reusable CSV export utility for spending data, watchlist, portfolio allocations, and more
- **Onboarding Welcome Flow** - 6-step animated feature tour for new users with progress dots and keyboard navigation
- **Settings & Preferences** - Theme selection, notification toggles, currency preference, account management (password change, data export, account deletion)
- **Command Palette** - `Ctrl+K` / `Cmd+K` search across all 34 pages with keyboard navigation, grouped by category
- **Landing Page** - Public marketing page with hero, features grid, stats, how-it-works section
- **GDPR Compliance** - Data export endpoint (Article 20 - portability), account deletion endpoint (Article 17 - right to erasure)
- **Audit Logging** - Backend audit trail model tracking user actions (login, data export, account changes)

### Infrastructure & Quality
- **Sidebar Navigation** - Grouped into 6 sections (Overview, Analysis, Planning, Market, Tracking, Account) with collapsible sidebar and mobile support
- **Dark Mode** - Full dark theme with system preference detection, manual toggle, and localStorage persistence
- **PWA Support** - Web app manifest for installability with theme colors
- **Custom 404 Page** - Branded not-found page with navigation links
- **SEO Metadata** - OpenGraph tags, keywords, viewport config, template titles per page
- **Error Boundaries** - Next.js error.tsx with retry support, component-level ErrorBoundary wrapper
- **Toast Notifications** - Global toast system (success/error/warning/info) with auto-dismiss
- **Skeleton Loading** - Skeleton loaders replacing spinners across all pages
- **Form Validation** - Client-side validation on login, register, and input forms with inline error messages
- **Accessibility** - ARIA labels, roles, semantic HTML, keyboard navigation support
- **Structured Logging** - Request/response logging middleware with request IDs
- **Global Error Handling** - Exception handlers for HTTP, validation, and unhandled errors with sanitized responses
- **Rate Limiting** - SlowAPI with Redis backend (5/min register, 10/min login, 200/min default)
- **Redis Caching** - Async cache utility for expensive operations (market data, sentiment, etc.)
- **Database Migrations** - Alembic initial migration with all 7 tables
- **Prometheus Metrics** - `/metrics` endpoint for monitoring
- **Health Checks** - `/health` endpoint checking API, database, and Redis connectivity
- **Production Docker** - Multi-stage Dockerfiles (non-root users, gunicorn), docker-compose.prod.yml with Nginx reverse proxy
- **CI/CD** - GitHub Actions workflow (backend lint + test, frontend lint + build, Docker build)
- **Backend Tests** - 73 tests (auth API, health, auth service, risk engine, portfolio engine) with SQLite async test fixtures
- **Frontend Tests** - 19 tests (Button, Input, Card, Select, API lib) with Vitest + React Testing Library

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Recharts |
| Backend | FastAPI (Python 3.11), SQLAlchemy 2.0 (async), Pydantic v2 |
| Database | PostgreSQL 16, Redis 7 |
| Auth | JWT access + refresh tokens (python-jose, passlib/bcrypt) |
| ML & Analytics | scikit-learn, SHAP, NumPy, Pandas, SciPy |
| AI Chatbot | Google Gemini 2.5 Flash (free tier via Google AI Studio) |
| NLP | FinBERT via HuggingFace Transformers, PyTorch (CPU), feedparser |
| Market Data | yfinance (Yahoo Finance, no API key required) |
| Monitoring | Prometheus client, structured logging, SlowAPI rate limiting |
| Testing | pytest + pytest-asyncio + aiosqlite (backend), Vitest + React Testing Library (frontend) |
| Infrastructure | Docker, Docker Compose, Nginx, GitHub Actions CI/CD |

## Project Structure

```
portfolio-advisory-system/
├── docker-compose.yml              # Development compose (postgres, redis, backend, frontend)
├── docker-compose.prod.yml         # Production compose (+ nginx reverse proxy)
├── .env.example                    # Environment variables template
├── .gitignore
├── README.md
├── .github/workflows/ci.yml       # GitHub Actions CI pipeline
├── nginx/nginx.conf                # Nginx reverse proxy config
│
├── backend/                        # FastAPI Python backend
│   ├── Dockerfile                  # Development Dockerfile
│   ├── Dockerfile.prod             # Production multi-stage build (gunicorn)
│   ├── .dockerignore
│   ├── requirements.txt            # Python dependencies
│   ├── pytest.ini                  # Test configuration
│   ├── alembic.ini                 # Migration config
│   ├── alembic/
│   │   ├── env.py                  # Async migration environment
│   │   └── versions/
│   │       └── 001_initial_schema.py  # Initial migration (7 tables)
│   ├── tests/
│   │   ├── conftest.py             # SQLite async fixtures, auth helpers
│   │   ├── test_api/               # API integration tests
│   │   │   ├── test_auth.py        # Register, login, refresh, me
│   │   │   └── test_health.py      # Health endpoint
│   │   └── test_services/          # Unit tests
│   │       ├── test_auth_service.py
│   │       ├── test_risk_engine.py
│   │       └── test_portfolio_engine.py
│   └── app/
│       ├── main.py                 # App entry, lifespan, middleware, 30 routers
│       ├── config.py               # Environment settings (13 variables)
│       ├── database.py             # Async SQLAlchemy engine & session
│       ├── dependencies.py         # get_db, get_current_user (JWT)
│       │
│       ├── middleware/             # Request processing middleware
│       │   ├── logging_middleware.py    # Structured request/response logging
│       │   ├── error_handler.py        # Global exception handlers
│       │   └── rate_limiter.py         # SlowAPI rate limiting
│       │
│       ├── models/                 # SQLAlchemy ORM models (7 files)
│       │   ├── user.py             # Users table
│       │   ├── financial_profile.py # Financial profiles (JSONB fields)
│       │   ├── risk_assessment.py  # Risk scores & sub-scores
│       │   ├── portfolio.py        # Portfolios & allocations
│       │   ├── spending_history.py # Monthly snapshots & SIP records
│       │   ├── audit_log.py        # Audit trail for user actions
│       │   └── chat_message.py    # Chat conversation history
│       │
│       ├── schemas/                # Pydantic request/response schemas (10 files)
│       │
│       ├── routers/                # API route handlers (30 routers)
│       │   ├── auth.py             # Register, login, refresh, me
│       │   ├── profile.py          # Financial profile CRUD
│       │   ├── questionnaire.py    # Adaptive questionnaire
│       │   ├── risk.py             # Risk assessment (rule + ML hybrid)
│       │   ├── portfolio.py        # Portfolio generation (MPT)
│       │   ├── upload.py           # CSV bank statement upload
│       │   ├── instruments.py      # Fund & stock recommendations
│       │   ├── bl_optimizer.py     # Black-Litterman optimization
│       │   ├── simulation.py       # Monte Carlo simulations
│       │   ├── goals.py            # Goal-based planning
│       │   ├── sip_tracker.py      # SIP contribution logging
│       │   ├── spending.py         # Spending history & trends
│       │   ├── sentiment.py        # FinBERT market sentiment
│       │   ├── explainability.py   # SHAP explanations
│       │   ├── stocks.py           # Stock classification
│       │   ├── chat.py             # Conversational AI
│       │   ├── nudges.py           # Anomaly detection & nudges
│       │   ├── achievements.py     # Gamification
│       │   ├── benchmark.py        # Peer benchmarking
│       │   ├── report.py           # PDF report generation
│       │   ├── what_if.py          # What-if scenario analysis
│       │   ├── model_benchmark_router.py  # ML vs rule-based comparison
│       │   ├── rebalance.py        # Portfolio rebalancing
│       │   ├── frontier.py         # Efficient frontier & correlation
│       │   ├── stress_test_router.py # Stress testing
│       │   ├── tax.py              # Tax planning (India)
│       │   ├── retirement.py       # Retirement readiness
│       │   ├── compounding.py      # Compounding calculator
│       │   └── gdpr.py             # GDPR data export & account deletion
│       │
│       ├── services/               # Business logic (30 services)
│       │   ├── auth_service.py     # Password hashing, JWT access + refresh tokens
│       │   ├── profile_service.py  # Profile CRUD operations
│       │   ├── questionnaire_service.py  # Question definitions
│       │   ├── risk_engine.py      # Rule-based risk scoring
│       │   ├── ml_risk_model.py    # ML risk model (Gradient Boosting)
│       │   ├── portfolio_engine.py # Portfolio allocation & interpolation
│       │   ├── black_litterman.py  # Black-Litterman optimizer
│       │   ├── instrument_recommender.py  # Fund & stock suggestions
│       │   ├── statement_parser.py # CSV bank statement parser
│       │   ├── monte_carlo.py      # Monte Carlo simulation engine
│       │   ├── goal_engine.py      # Goal analysis & SIP calculator
│       │   ├── sentiment_analyzer.py  # FinBERT NLP pipeline
│       │   ├── market_data.py      # yfinance data fetcher & cache
│       │   ├── stock_classifier.py # Stock risk classification
│       │   ├── shap_explainer.py   # SHAP feature explanations
│       │   ├── chatbot.py          # Gemini LLM chatbot + SSE streaming + fallback
│       │   ├── anomaly_detector.py # Financial anomaly detection
│       │   ├── gamification.py     # Achievement & leveling system
│       │   ├── peer_benchmark.py   # Cohort comparison engine
│       │   ├── what_if_engine.py   # What-if scenario analysis
│       │   ├── model_benchmark.py  # ML vs rule-based benchmarking
│       │   ├── rebalancer.py       # Portfolio drift & rebalancing
│       │   ├── frontier_engine.py  # Efficient frontier & correlation
│       │   ├── stress_test.py      # Crisis scenario stress testing
│       │   ├── tax_planner.py      # Indian tax planning & 80C
│       │   ├── retirement_planner.py  # Retirement readiness calculator
│       │   ├── compounding_calc.py # Compounding & DCA calculator
│       │   ├── report_generator.py # HTML report generation
│       │   └── audit_service.py   # Audit trail logging service
│       │
│       ├── utils/
│       │   ├── constants.py        # Enums, weights, allocation matrices
│       │   └── cache.py            # Redis async cache utility
│       ├── ml_models/              # Trained model artifacts (.joblib)
│       └── market_cache/           # Cached yfinance data (24h TTL)
│
└── frontend/                       # Next.js TypeScript frontend (34 pages)
    ├── Dockerfile                  # Development Dockerfile
    ├── Dockerfile.prod             # Production multi-stage build (standalone)
    ├── .dockerignore
    ├── package.json
    ├── vitest.config.ts            # Vitest test configuration
    └── src/
        ├── app/                    # Next.js App Router pages
        │   ├── layout.tsx          # Root layout (ThemeProvider, ToastProvider, CommandPalette)
        │   ├── error.tsx           # Global error boundary
        │   ├── not-found.tsx       # Custom 404 page
        │   ├── loading.tsx         # Global loading skeleton
        │   ├── page.tsx            # Public landing page
        │   ├── (auth)/login/       # Login with form validation
        │   ├── (auth)/register/    # Registration with form validation
        │   ├── dashboard/          # Main overview with charts
        │   ├── questionnaire/      # Multi-step financial questionnaire
        │   ├── upload/             # CSV bank statement upload
        │   ├── risk/               # Risk analysis + timeline chart
        │   ├── explain/            # SHAP explainability visualization
        │   ├── portfolio/          # Portfolio allocation details
        │   ├── instruments/        # Suggested funds & stock picks
        │   ├── simulation/         # Monte Carlo fan chart & scenarios
        │   ├── goals/              # Goal-based planning wizard
        │   ├── spending/           # Spending history & trends
        │   ├── sentiment/          # Market sentiment dashboard
        │   ├── stocks/             # Stock classification tables
        │   ├── chat/               # AI assistant chatbot
        │   ├── nudges/             # Financial health & action items
        │   ├── achievements/       # Gamification badges & levels
        │   ├── benchmarks/         # Peer comparison dashboard
        │   ├── profile/            # Edit financial profile
        │   ├── what-if/            # What-if scenario analysis
        │   ├── model-benchmark/    # ML vs rule-based comparison
        │   ├── frontier/           # Efficient frontier & correlation heatmap
        │   ├── rebalance/          # Portfolio rebalancing recommendations
        │   ├── stress-test/        # Crisis scenario stress testing
        │   ├── tax/                # Indian tax planner (80C/80D)
        │   ├── retirement/         # Retirement readiness calculator
        │   ├── calculator/         # Compounding & DCA calculator
        │   ├── debt/               # Debt payoff planner
        │   ├── report/             # Report preview & download
        │   ├── welcome/            # Onboarding feature tour (6 steps)
        │   ├── settings/           # User preferences & account management
        │   ├── watchlist/           # Stock watchlist with live metrics
        │   └── compare/            # Portfolio comparison (current vs alternative)
        │
        ├── components/
        │   ├── ui/                 # Button, Input, Card, Select, ProgressBar, Skeleton
        │   ├── layout/             # AppShell, Sidebar, AuthGuard, ErrorBoundary, ThemeProvider, Toast, CommandPalette
        │   ├── risk/               # RiskGauge, ScoreBreakdown, RiskCategoryBadge, RiskTimeline
        │   ├── portfolio/          # AllocationPieChart, AllocationTable, ReturnRangeCard
        │   └── simulation/         # FanChart
        │
        ├── __tests__/              # Frontend tests (Vitest + React Testing Library)
        │   ├── setup.ts
        │   ├── components/         # Button, Input, Card, Select tests
        │   └── lib/                # API utility tests
        │
        ├── hooks/useAuth.ts        # Authentication state + token refresh
        ├── lib/api.ts              # Fetch wrapper with JWT auto-refresh
        ├── lib/constants.ts        # Asset class labels, colors, categories
        ├── lib/export.ts           # CSV data export utility
        └── types/index.ts          # TypeScript interfaces
```

## Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- Git

### Run with Docker (Development)

```bash
# Clone the repository
git clone <repo-url>
cd portfolio-advisory-system

# Copy environment file
cp .env.example .env

# Start all services (first build takes ~5 min for PyTorch/FinBERT dependencies)
docker compose up --build -d
```

This starts:
- **Frontend** at http://localhost:3001
- **Backend API** at http://localhost:8000
- **Swagger API Docs** at http://localhost:8000/docs
- **Health Check** at http://localhost:8000/health
- **PostgreSQL** on port 5433
- **Redis** on port 6379

### Run with Docker (Production)

```bash
# Production deployment with Nginx reverse proxy
docker compose -f docker-compose.prod.yml up --build -d
```

Access everything via **http://localhost** (port 80) - Nginx routes `/api/*` to backend and everything else to frontend.

### Run Locally (without Docker)

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Ensure PostgreSQL and Redis are running, then:
export DATABASE_URL=postgresql+asyncpg://portfolio_user:portfolio_pass@localhost:5432/portfolio_db
export REDIS_URL=redis://localhost:6379/0
export JWT_SECRET=your-secret-key

uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev
```

### Running Tests

```bash
# Backend tests
cd backend && pytest -v --cov=app

# Frontend tests
cd frontend && npm test
```

### First Time Usage

1. Open http://localhost:3001
2. Register a new account (name, email, date of birth, password)
3. Complete the 6-step financial questionnaire (or upload a CSV bank statement)
4. View your risk score, portfolio allocation, and personalized insights on the dashboard
5. Explore the sidebar navigation for all features: analysis, planning, tracking, and more

## API Endpoints

### Core (Phase 1)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Create new account |
| POST | `/api/v1/auth/login` | Get JWT access + refresh tokens |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| GET | `/api/v1/auth/me` | Get current user |
| POST/GET/PUT | `/api/v1/profile/` | Financial profile CRUD |
| GET | `/api/v1/questionnaire/questions` | Get adaptive questionnaire |
| POST | `/api/v1/questionnaire/submit` | Submit & create/update profile |
| POST | `/api/v1/upload/csv` | Upload CSV bank statement |
| POST | `/api/v1/risk/assess` | Calculate risk score (rule + ML hybrid) |
| GET | `/api/v1/risk/latest` | Get latest risk assessment |
| GET | `/api/v1/risk/history` | All past assessments |
| POST | `/api/v1/portfolio/generate` | Generate portfolio (MPT) |
| GET | `/api/v1/portfolio/latest` | Get latest portfolio with allocations |
| GET | `/api/v1/portfolio/history` | All past portfolios |
| GET | `/api/v1/bl-optimize/` | Black-Litterman optimized allocation |
| GET | `/api/v1/instruments/` | Suggested funds & stocks per asset class |

### Intelligence (Phase 2)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/simulation/run` | Run Monte Carlo simulation (1,000 paths) |
| GET | `/api/v1/goals/templates` | Get 7 goal templates |
| POST | `/api/v1/goals/analyze` | Analyze goal with SIP scenarios |
| POST | `/api/v1/sip/log` | Log a SIP contribution |
| GET | `/api/v1/sip/history` | SIP adherence history per goal |
| POST | `/api/v1/spending/monthly` | Log monthly income/expenses |
| GET | `/api/v1/spending/history` | Spending history with trends |
| GET | `/api/v1/sentiment/?category=` | FinBERT market sentiment analysis |
| GET | `/api/v1/explain/risk` | SHAP risk score explanation |
| GET | `/api/v1/stocks/classified` | Classify 45 stocks by risk |
| GET | `/api/v1/stocks/metrics/{ticker}` | Get metrics for any stock |
| GET | `/api/v1/stocks/asset-class-stats` | Real historical asset class returns |

### Advanced (Phase 3)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/chat/message` | Chat with AI assistant |
| POST | `/api/v1/chat/stream` | SSE streaming chat (real-time tokens) |
| GET | `/api/v1/chat/history` | Get conversation history (last 50) |
| GET | `/api/v1/nudges/` | Financial health check & action items |
| GET | `/api/v1/achievements/` | Gamification achievements & level |
| GET | `/api/v1/benchmark/` | Peer benchmarking comparison |

### Enhanced Analytics (Phase 4)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/what-if/analyze` | What-if scenario analysis |
| GET | `/api/v1/model-benchmark/` | ML vs rule-based model comparison |
| POST | `/api/v1/rebalance/analyze` | Portfolio rebalancing recommendations |
| GET | `/api/v1/frontier/` | Efficient frontier (500 portfolios) |
| GET | `/api/v1/frontier/correlation` | Asset class correlation matrix |
| POST | `/api/v1/stress-test/run` | Crisis scenario stress testing |
| POST | `/api/v1/tax/calculate` | Indian tax calculation with 80C/80D |
| POST | `/api/v1/retirement/plan` | Retirement readiness analysis |
| POST | `/api/v1/compounding/calculate` | Compounding & SIP growth calculator |
| GET | `/api/v1/report/download` | Download portfolio advisory report |

### Account & GDPR
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/account/export` | Export all user data (GDPR Article 20) |
| DELETE | `/api/v1/account/delete-account` | Delete account & all data (GDPR Article 17) |

### System
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check (API + DB + Redis) |
| GET | `/metrics` | Prometheus metrics |
| GET | `/docs` | Swagger API documentation |

## Risk Scoring Algorithm

### Rule-Based Engine
The risk score (0-100) is a weighted sum of four sub-scores, modified by life stage and horizon:

| Sub-Score | Weight | Based On |
|-----------|--------|----------|
| Spending Ratio | 25% | Monthly expenses / income (band interpolation) |
| Savings Consistency | 25% | Savings rate + emergency fund months |
| Investment Discipline | 30% | Experience (40%) + loss tolerance (35%) + diversification (25%) |
| Liability Burden | 20% | Total liabilities / annual income |

**Life-Stage Modifiers:** Student (0.75x), Early Career (1.10x), Family (0.90x), Pre-Retirement (0.70x)

**Horizon Modifiers:** <3yr (0.80x), 3-7yr (0.95x), 8-15yr (1.00x), >15yr (1.10x)

| Score Range | Category |
|-------------|----------|
| 0 - 35 | Conservative |
| 36 - 65 | Moderate |
| 66 - 100 | Aggressive |

### ML Model (Hybrid)
A Gradient Boosting model trained on 5,000 synthetic profiles using behavioral finance principles (Prospect Theory, diminishing sensitivity, interaction effects). The final score blends:
- **60%** Rule-based engine score
- **40%** ML model prediction

The ML model captures non-linear interactions the rule engine misses (e.g., high debt + short horizon = amplified penalty).

## Portfolio Optimization

### Modern Portfolio Theory (MPT)
Base allocations per risk category, with life-stage adjustments and boundary interpolation:

| Asset Class | Conservative | Moderate | Aggressive |
|-------------|-------------|----------|------------|
| Large Cap Equity | 10% | 25% | 35% |
| Mid Cap Equity | 0% | 10% | 20% |
| Small Cap Equity | 0% | 5% | 15% |
| Debt | 50% | 30% | 10% |
| Gold & Commodities | 15% | 10% | 10% |
| Liquid Funds | 25% | 20% | 10% |

### Black-Litterman Model
Enhances MPT by combining market equilibrium returns (CAPM) with investor views:
1. Computes implied equilibrium returns from market-cap weights and covariance matrix
2. Generates investor views from risk profile, life stage, and market sentiment
3. Produces posterior returns using Bayesian updating
4. Optimizes weights using the posterior distribution

### Stress Testing Scenarios
Portfolio resilience is tested against 5 historical crisis scenarios:
- **2008 Global Financial Crisis** - Equity -52% to -70%, Debt +4%
- **COVID-19 Crash (2020)** - Equity -38% to -55%, Gold +12%
- **2013 Taper Tantrum** - Equity -15% to -25%, Gold -15%
- **Interest Rate Hike Cycle** - Equity -12% to -22%, Liquid Funds +4%
- **Stagflation Scenario** - Equity -25% to -35%, Gold +20%

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql+asyncpg://...@postgres:5432/portfolio_db` | PostgreSQL connection |
| `REDIS_URL` | `redis://redis:6379/0` | Redis connection |
| `JWT_SECRET` | `dev-secret-change-in-production` | JWT signing secret |
| `JWT_ALGORITHM` | `HS256` | JWT algorithm |
| `JWT_EXPIRE_MINUTES` | `30` | Access token expiry |
| `JWT_REFRESH_EXPIRE_DAYS` | `7` | Refresh token expiry |
| `CORS_ORIGINS` | `http://localhost:3000,http://localhost:3001` | Allowed CORS origins |
| `LOG_LEVEL` | `INFO` | Logging level |
| `RATE_LIMIT_DEFAULT` | `200/minute` | Default API rate limit |
| `RATE_LIMIT_AUTH` | `10/minute` | Auth endpoint rate limit |
| `ENVIRONMENT` | `development` | Environment name |
| `GEMINI_API_KEY` | *(empty)* | Google AI Studio API key for AI chatbot |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend URL for frontend |

## Development Roadmap

- [x] **Phase 1: Core** - Questionnaire, CSV parsing, rule-based risk scoring, MPT + Black-Litterman portfolio, instrument recommendations, JWT auth, dashboard
- [x] **Phase 2: Intelligence** - ML risk model, SHAP explainability, Monte Carlo simulation, goal-based planning, SIP tracking, spending history, FinBERT sentiment analysis, stock classification with real market data
- [x] **Phase 3: Advanced** - Conversational AI chatbot, anomaly detection & nudge engine, gamification with achievements, peer benchmarking
- [x] **Phase 4: Enhanced Analytics** - What-if analysis, model benchmarking, efficient frontier, rebalancing, stress testing, tax planning, retirement calculator, compounding calculator, debt payoff planner, report generation, sidebar navigation, dark mode, production infrastructure, CI/CD, comprehensive testing
- [x] **Phase 5: Enterprise Features** - Command palette (Ctrl+K), stock watchlist, portfolio comparison, CSV export, onboarding flow, settings page, landing page, GDPR compliance (data export + account deletion), audit logging, PWA manifest, SEO metadata, custom 404 page

## System Architecture

```
Frontend (Next.js 16)               →  34 pages, Recharts visualizations, dark mode
        ↓                               Sidebar nav, command palette, error boundaries, toast
API Gateway (FastAPI)               →  55+ endpoints, JWT auth + refresh, CORS, rate limiting
        ↓                               Structured logging, Prometheus metrics
Middleware Layer:
├── Request Logging                 →  Request ID tracking, timing
├── Error Handler                   →  Sanitized responses, validation errors
└── Rate Limiter                    →  SlowAPI + Redis backend
        ↓
Service Layer (30 services):
├── Authentication                  →  Register, login, JWT access + refresh tokens
├── Data Collection                 →  Questionnaire, CSV parser
├── Risk Profiling Engine           →  Rule-based + ML hybrid scoring
├── Portfolio Optimization          →  MPT + Black-Litterman + instruments
├── Simulation Engine               →  Monte Carlo (fat-tail + regime switching)
├── Goal Planning Service           →  SIP calculator, adherence tracking
├── Sentiment Analyzer              →  FinBERT NLP on RSS feeds
├── Stock Classification            →  Real-time yfinance metrics
├── Spending Tracker                →  Monthly snapshots, trends
├── Conversational AI               →  Gemini 2.5 Flash LLM + rule-based fallback
├── Anomaly Detection               →  10 anomaly types, behavioral nudges, micro-wins
├── Gamification Service            →  16 achievements, 6 levels
├── Benchmarking Service            →  Cohort comparison, percentiles
├── What-If Engine                  →  Scenario analysis with modified params
├── Model Benchmarking              →  ML vs rule-based comparison
├── Rebalancing Engine              →  Tax-aware drift analysis, urgency triggers, scheduling
├── Efficient Frontier              →  500-portfolio simulation, correlation matrix
├── Stress Test Engine              →  5 crisis scenarios
├── Tax Planner                     →  Indian 80C/80D optimization
├── Retirement Planner              →  Corpus projection, glide path
├── Compounding Calculator          →  Lump sum + SIP + inflation
├── Report Generator                →  HTML portfolio advisory report
├── Audit Service                   →  User action audit trail
└── GDPR Handler                    →  Data export & account deletion
        ↓
Data Layer:
├── PostgreSQL 16                   →  9 tables (users, profiles, assessments,
│                                       portfolios, allocations, snapshots, SIP records, audit_logs, chat_messages)
├── Redis 7                         →  Rate limiting, caching, session store
└── File Cache                      →  yfinance market data (24h TTL)
        ↓
Infrastructure:
├── Docker Compose (dev + prod)     →  Multi-stage builds, non-root users
├── Nginx                           →  Reverse proxy, security headers
├── GitHub Actions                  →  CI pipeline (lint, test, build)
├── Alembic                         →  Database migrations
└── Prometheus                      →  Metrics collection
```

## Known Limitations

- **User profile data is synthetic** - Real user financial data is private; the ML model trains on realistic synthetic distributions
- **FinBERT requires ~400MB download** on first use (cached after that). Docker uses CPU-only PyTorch
- **Stock data depends on Yahoo Finance** - yfinance is free but rate-limited. Data is cached for 24 hours
- **Peer benchmarking uses synthetic cohorts** - Real anonymized peer data would require a production user base
- **PDF bank statement parsing** - Currently only CSV is supported. PDF parsing would require OCR libraries
- **Tax planning is India-specific** - New tax regime slabs; old regime not currently supported
- **Stress test scenarios use historical estimates** - Not forward-looking predictive models

## Research Foundations

- Modern Portfolio Theory (Markowitz, 1952)
- Black-Litterman Model (Black & Litterman, 1992)
- Prospect Theory (Kahneman & Tversky, 1979)
- Behavioral Portfolio Theory (Shefrin & Statman, 2000)
- SHAP Explainability (Lundberg & Lee, 2017)
- FinBERT for Financial NLP (Araci, 2019)
- Monte Carlo Methods in Finance (Glasserman, 2003)
- Efficient Frontier Theory (Merton, 1972)
- Safe Withdrawal Rates (Bengen, 1994)

## Disclaimer

This platform provides **educational insights only**. It is not a substitute for certified financial advice. No guaranteed returns. Users are responsible for their own investment decisions. Data is securely stored and not shared with third parties.
