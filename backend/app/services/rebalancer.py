"""Portfolio rebalancing engine."""
import logging
from datetime import date, timedelta

logger = logging.getLogger("portfolio_api")

# Asset classes treated as equity for tax purposes
EQUITY_CLASSES = {"equity", "stocks", "large_cap", "mid_cap", "small_cap", "international_equity"}
# Asset classes treated as debt/fixed-income for tax purposes
DEBT_CLASSES = {"debt", "bonds", "fixed_income", "government_bonds", "corporate_bonds", "money_market"}

URGENCY_THRESHOLDS = {
    "none": 3,
    "monitor": 5,
    "recommended": 10,
}


def _determine_urgency(total_drift: float) -> str:
    """Classify rebalancing urgency based on total portfolio drift."""
    if total_drift < URGENCY_THRESHOLDS["none"]:
        return "none"
    elif total_drift < URGENCY_THRESHOLDS["monitor"]:
        return "monitor"
    elif total_drift < URGENCY_THRESHOLDS["recommended"]:
        return "recommended"
    else:
        return "urgent"


def _estimate_tax_impact(asset_class: str, action: str) -> dict:
    """Estimate tax impact for a trade based on asset class and action.

    Returns a dict with tax_impact level and a tax_note explaining implications.
    Buys and holds have no immediate tax impact.
    """
    ac_lower = asset_class.lower().replace(" ", "_")

    if action in ("buy", "hold"):
        return {
            "tax_impact": "low",
            "tax_note": f"No taxable event for {action} on {asset_class}.",
        }

    # Selling triggers tax assessment
    if ac_lower in EQUITY_CLASSES or "equity" in ac_lower or "stock" in ac_lower:
        return {
            "tax_impact": "high",
            "tax_note": (
                f"Selling {asset_class} may trigger short-term capital gains "
                f"(taxed at income slab rates) if held < 1 year, or long-term "
                f"capital gains (taxed at 10% above 1L exemption) if held > 1 year."
            ),
        }
    elif ac_lower in DEBT_CLASSES or "bond" in ac_lower or "debt" in ac_lower:
        return {
            "tax_impact": "medium",
            "tax_note": (
                f"Selling {asset_class} may trigger capital gains taxed at "
                f"income slab rates (post-2023 rules for debt instruments). "
                f"Consider holding period for optimal tax treatment."
            ),
        }
    else:
        # Alternatives, commodities, gold, REITs, etc.
        return {
            "tax_impact": "medium",
            "tax_note": (
                f"Selling {asset_class} has variable tax treatment depending on "
                f"instrument type and holding period. Consult a tax advisor."
            ),
        }


def _compute_priority_score(drift_pct: float, asset_class: str) -> int:
    """Score trade priority 0-100 based on drift magnitude and asset class risk.

    Higher drift and higher-risk asset classes get higher priority scores,
    meaning they should be rebalanced first.
    """
    ac_lower = asset_class.lower().replace(" ", "_")

    # Drift component: 0-70 points based on absolute drift (capped at 20% drift)
    abs_drift = min(abs(drift_pct), 20)
    drift_score = (abs_drift / 20) * 70

    # Risk component: 0-30 points based on asset class volatility
    if ac_lower in EQUITY_CLASSES or "equity" in ac_lower or "stock" in ac_lower:
        risk_score = 30  # Highest risk, rebalance first
    elif "gold" in ac_lower or "commodity" in ac_lower or "reit" in ac_lower:
        risk_score = 20
    elif ac_lower in DEBT_CLASSES or "bond" in ac_lower or "debt" in ac_lower:
        risk_score = 10
    else:
        risk_score = 15  # Unknown asset classes get moderate risk

    return min(100, round(drift_score + risk_score))


def _suggest_rebalance_schedule(urgency: str) -> dict:
    """Suggest next rebalance date and frequency based on urgency level."""
    today = date.today()

    if urgency == "urgent":
        return {
            "rebalance_frequency": "monthly",
            "next_rebalance_date": str(today + timedelta(days=30)),
            "schedule_note": "High drift detected. Monthly monitoring recommended until drift normalizes.",
        }
    elif urgency == "recommended":
        return {
            "rebalance_frequency": "quarterly",
            "next_rebalance_date": str(today + timedelta(days=90)),
            "schedule_note": "Moderate drift detected. Quarterly rebalancing should keep allocations on track.",
        }
    elif urgency == "monitor":
        return {
            "rebalance_frequency": "quarterly",
            "next_rebalance_date": str(today + timedelta(days=90)),
            "schedule_note": "Minor drift detected. Review at next quarterly checkpoint.",
        }
    else:
        return {
            "rebalance_frequency": "annual",
            "next_rebalance_date": str(today + timedelta(days=365)),
            "schedule_note": "Portfolio is well-aligned. Annual review is sufficient.",
        }


def _build_recommendation(urgency: str, total_drift: float) -> str:
    """Build a human-readable recommendation based on urgency and drift."""
    if urgency == "urgent":
        return (
            f"Your portfolio has drifted {total_drift:.1f}% from targets. "
            f"Immediate rebalancing is strongly recommended to manage risk exposure."
        )
    elif urgency == "recommended":
        return (
            f"Your portfolio has drifted {total_drift:.1f}% from targets. "
            f"Consider rebalancing soon to stay aligned with your investment strategy."
        )
    elif urgency == "monitor":
        return (
            f"Your portfolio shows minor drift of {total_drift:.1f}%. "
            f"No action needed now, but monitor at your next review."
        )
    else:
        return "Your portfolio is well-aligned with targets. No rebalancing needed."


def compute_rebalancing(current_allocations: list[dict], target_allocations: list, portfolio_value: float) -> dict:
    """Compare current vs target allocation and suggest trades.

    Returns a comprehensive rebalancing plan including:
    - Trade suggestions with tax impact and priority scoring
    - Threshold-based urgency classification
    - Calendar-based rebalancing schedule
    """
    current_map = {a["asset_class"]: a["current_pct"] for a in current_allocations}
    target_map = {a.asset_class: float(a.allocation_pct) for a in target_allocations}

    all_classes = set(list(current_map.keys()) + list(target_map.keys()))

    trades = []
    total_drift = 0

    for ac in sorted(all_classes):
        current = current_map.get(ac, 0)
        target = target_map.get(ac, 0)
        drift = round(current - target, 2)
        drift_amount = round(drift / 100 * portfolio_value, 0)
        total_drift += abs(drift)

        action = "hold"
        if drift > 1:
            action = "sell"
        elif drift < -1:
            action = "buy"

        tax_info = _estimate_tax_impact(ac, action)
        priority = _compute_priority_score(drift, ac)

        trades.append({
            "asset_class": ac,
            "current_pct": current,
            "target_pct": target,
            "drift_pct": drift,
            "drift_amount": drift_amount,
            "action": action,
            "tax_impact": tax_info["tax_impact"],
            "tax_note": tax_info["tax_note"],
            "priority_score": priority,
        })

    total_drift = round(total_drift, 2)
    urgency = _determine_urgency(total_drift)
    needs_rebalancing = total_drift > 5  # preserve original threshold semantics
    schedule = _suggest_rebalance_schedule(urgency)

    return {
        "trades": sorted(trades, key=lambda t: abs(t["drift_pct"]), reverse=True),
        "total_drift_pct": total_drift,
        "needs_rebalancing": needs_rebalancing,
        "urgency": urgency,
        "portfolio_value": portfolio_value,
        "recommendation": _build_recommendation(urgency, total_drift),
        "rebalance_schedule": schedule,
    }
