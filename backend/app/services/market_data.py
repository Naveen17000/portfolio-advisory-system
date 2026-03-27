"""
Real market data service using yfinance.
Fetches stock prices, computes beta, volatility, and returns for Indian & US markets.
Caches results to avoid excessive API calls.
"""

import json
import time
from pathlib import Path
from datetime import datetime, timedelta

import numpy as np
import pandas as pd
import yfinance as yf

CACHE_DIR = Path(__file__).parent.parent / "market_cache"
CACHE_TTL = 86400  # 24 hours

# Representative ETFs/indices for each asset class (using real tickers)
ASSET_CLASS_PROXIES = {
    "equity_large_cap": {
        "tickers": ["^NSEI", "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ITC.NS"],
        "benchmark": "^NSEI",
        "label": "Large Cap Equity (Nifty 50)",
    },
    "equity_mid_cap": {
        "tickers": ["^NSEMDCP50", "PERSISTENT.NS", "COFORGE.NS", "MPHASIS.NS", "TRENT.NS"],
        "benchmark": "^NSEMDCP50",
        "label": "Mid Cap Equity (Nifty Midcap 50)",
    },
    "equity_small_cap": {
        "tickers": ["^NSMIDCP", "ROUTE.NS", "CAMPUS.NS", "HAPPSTMNDS.NS"],
        "benchmark": "^NSEI",
        "label": "Small Cap Equity",
    },
    "debt": {
        "tickers": ["0P0001BAO7.BO"],  # HDFC Gilt Fund as proxy
        "benchmark": "^NSEI",
        "label": "Debt / Fixed Income",
    },
    "gold_commodities": {
        "tickers": ["GC=F", "GLD"],
        "benchmark": "^GSPC",
        "label": "Gold & Commodities",
    },
    "liquid_funds": {
        "tickers": ["^IRX"],  # 13-week T-bill as proxy
        "benchmark": "^GSPC",
        "label": "Liquid Funds",
    },
}

# Indian stocks for classification (Nifty 50 + Midcap + Smallcap representatives)
STOCK_UNIVERSE = {
    "large_cap": [
        "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS",
        "HINDUNILVR.NS", "ITC.NS", "SBIN.NS", "BHARTIARTL.NS", "KOTAKBANK.NS",
        "LT.NS", "AXISBANK.NS", "ASIANPAINT.NS", "MARUTI.NS", "TITAN.NS",
        "SUNPHARMA.NS", "ULTRACEMCO.NS", "WIPRO.NS", "HCLTECH.NS", "BAJFINANCE.NS",
    ],
    "mid_cap": [
        "PERSISTENT.NS", "COFORGE.NS", "MPHASIS.NS", "TRENT.NS", "POLYCAB.NS",
        "PIIND.NS", "ASTRAL.NS", "ATUL.NS", "AFFLE.NS", "DEEPAKNTR.NS",
        "KPITTECH.NS", "LTTS.NS", "MUTHOOTFIN.NS", "OBEROIRLTY.NS", "PAGEIND.NS",
    ],
    "small_cap": [
        "ROUTE.NS", "CAMPUS.NS", "HAPPSTMNDS.NS", "DATAPATTNS.NS", "KAYNES.NS",
        "CLEAN.NS", "LATENTVIEW.NS", "MASTEK.NS", "ZENTEC.NS", "NEWGEN.NS",
    ],
}


def _get_cache_path(key: str) -> Path:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    return CACHE_DIR / f"{key}.json"


def _is_cache_valid(path: Path) -> bool:
    if not path.exists():
        return False
    age = time.time() - path.stat().st_mtime
    return age < CACHE_TTL


def _save_cache(key: str, data: dict):
    path = _get_cache_path(key)
    with open(path, "w") as f:
        json.dump(data, f, default=str)


def _load_cache(key: str) -> dict | None:
    path = _get_cache_path(key)
    if not _is_cache_valid(path):
        return None
    with open(path) as f:
        return json.load(f)


def fetch_historical_data(ticker: str, period: str = "2y") -> pd.DataFrame | None:
    """Fetch historical price data for a ticker."""
    cache_key = f"hist_{ticker.replace('^', 'IDX_').replace('=', '_')}_{period}"
    cached = _load_cache(cache_key)
    if cached is not None:
        return pd.DataFrame(cached)

    try:
        data = yf.download(ticker, period=period, progress=False, auto_adjust=True)
        if data.empty:
            return None
        # Flatten MultiIndex columns if present
        if isinstance(data.columns, pd.MultiIndex):
            data.columns = data.columns.get_level_values(0)
        result = data[["Close"]].copy()
        result.index = result.index.strftime("%Y-%m-%d")
        _save_cache(cache_key, result.to_dict())
        return result
    except Exception:
        return None


def compute_stock_metrics(ticker: str, benchmark_ticker: str = "^NSEI", period: str = "2y") -> dict | None:
    """Compute key financial metrics for a stock."""
    cache_key = f"metrics_{ticker.replace('^', 'IDX_').replace('=', '_')}"
    cached = _load_cache(cache_key)
    if cached is not None:
        return cached

    try:
        stock_data = fetch_historical_data(ticker, period)
        bench_data = fetch_historical_data(benchmark_ticker, period)

        if stock_data is None or bench_data is None or len(stock_data) < 60:
            return None

        stock_returns = stock_data["Close"].pct_change().dropna()
        bench_returns = bench_data["Close"].pct_change().dropna()

        # Align dates
        common_dates = stock_returns.index.intersection(bench_returns.index)
        if len(common_dates) < 60:
            return None

        sr = stock_returns.loc[common_dates].astype(float)
        br = bench_returns.loc[common_dates].astype(float)

        # Beta
        covariance = np.cov(sr, br)[0][1]
        bench_variance = np.var(br)
        beta = float(covariance / bench_variance) if bench_variance > 0 else 1.0

        # Annualized volatility
        volatility = float(sr.std() * np.sqrt(252))

        # Annualized return
        total_return = float((1 + sr).prod() - 1)
        n_years = len(sr) / 252
        annualized_return = float((1 + total_return) ** (1 / max(n_years, 0.1)) - 1) * 100

        # Sharpe ratio (assuming 6% risk-free rate for India)
        risk_free_rate = 0.06
        excess_return = annualized_return / 100 - risk_free_rate
        sharpe = float(excess_return / volatility) if volatility > 0 else 0

        # Max drawdown
        cumulative = (1 + sr).cumprod()
        running_max = cumulative.cummax()
        drawdown = (cumulative - running_max) / running_max
        max_drawdown = float(drawdown.min()) * 100

        # Get stock info
        info = yf.Ticker(ticker).info
        market_cap = info.get("marketCap", 0)
        name = info.get("shortName", ticker.replace(".NS", ""))
        sector = info.get("sector", "Unknown")

        metrics = {
            "ticker": ticker,
            "name": name,
            "sector": sector,
            "market_cap": market_cap,
            "beta": round(beta, 3),
            "volatility": round(volatility * 100, 2),  # as percentage
            "annualized_return": round(annualized_return, 2),
            "sharpe_ratio": round(sharpe, 3),
            "max_drawdown": round(max_drawdown, 2),
        }

        _save_cache(cache_key, metrics)
        return metrics
    except Exception as e:
        return {"ticker": ticker, "error": str(e)}


def get_asset_class_historical_stats(period: str = "5y") -> dict:
    """
    Compute real historical returns and volatility for each asset class
    using proxy tickers.
    """
    cache_key = f"asset_class_stats_{period}"
    cached = _load_cache(cache_key)
    if cached is not None:
        return cached

    stats = {}
    for asset_class, config in ASSET_CLASS_PROXIES.items():
        returns_list = []
        vol_list = []

        for ticker in config["tickers"][:3]:  # Use top 3 proxies
            data = fetch_historical_data(ticker, period)
            if data is not None and len(data) > 60:
                daily_returns = data["Close"].pct_change().dropna().astype(float)
                ann_return = float((1 + daily_returns.mean()) ** 252 - 1) * 100
                ann_vol = float(daily_returns.std() * np.sqrt(252)) * 100
                returns_list.append(ann_return)
                vol_list.append(ann_vol)

        if returns_list:
            stats[asset_class] = {
                "label": config["label"],
                "annualized_return": round(np.mean(returns_list), 2),
                "volatility": round(np.mean(vol_list), 2),
                "return_min": round(np.mean(returns_list) - np.mean(vol_list), 2),
                "return_max": round(np.mean(returns_list) + np.mean(vol_list) * 0.5, 2),
                "data_points": len(returns_list),
            }
        else:
            # Fallback to hardcoded if data fetch fails
            from app.utils.constants import EXPECTED_RETURNS, AssetClass
            try:
                ac = AssetClass(asset_class)
                ret_min, ret_max = EXPECTED_RETURNS[ac]
                stats[asset_class] = {
                    "label": config["label"],
                    "annualized_return": (ret_min + ret_max) / 2,
                    "volatility": (ret_max - ret_min) * 2,
                    "return_min": ret_min,
                    "return_max": ret_max,
                    "data_points": 0,
                    "fallback": True,
                }
            except (ValueError, KeyError):
                pass

    _save_cache(cache_key, stats)
    return stats
