"""Portfolio rebalancing engine."""
import logging

logger = logging.getLogger("portfolio_api")


def compute_rebalancing(current_allocations: list[dict], target_allocations: list, portfolio_value: float) -> dict:
    """Compare current vs target allocation and suggest trades."""
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

        trades.append({
            "asset_class": ac,
            "current_pct": current,
            "target_pct": target,
            "drift_pct": drift,
            "drift_amount": drift_amount,
            "action": action,
        })

    needs_rebalancing = total_drift > 5  # 5% total drift threshold

    return {
        "trades": sorted(trades, key=lambda t: abs(t["drift_pct"]), reverse=True),
        "total_drift_pct": round(total_drift, 2),
        "needs_rebalancing": needs_rebalancing,
        "portfolio_value": portfolio_value,
        "recommendation": (
            "Your portfolio has drifted significantly from targets. Consider rebalancing soon."
            if needs_rebalancing
            else "Your portfolio is well-aligned with targets. No rebalancing needed."
        ),
    }
