"""Stress test engine: simulate portfolio under crisis scenarios."""
import logging

logger = logging.getLogger("portfolio_api")

CRISIS_SCENARIOS = [
    {
        "name": "2008 Global Financial Crisis",
        "description": "Lehman Brothers collapse triggered global recession. Equity markets crashed 50%+.",
        "impacts": {
            "equity_large_cap": -52,
            "equity_mid_cap": -62,
            "equity_small_cap": -70,
            "debt": +4,
            "gold_commodities": +6,
            "liquid_funds": +3,
        },
        "duration_months": 18,
        "recovery_months": 36,
    },
    {
        "name": "COVID-19 Crash (2020)",
        "description": "Pandemic-induced lockdowns caused rapid market selloff followed by V-shaped recovery.",
        "impacts": {
            "equity_large_cap": -38,
            "equity_mid_cap": -45,
            "equity_small_cap": -55,
            "debt": +2,
            "gold_commodities": +12,
            "liquid_funds": +2,
        },
        "duration_months": 2,
        "recovery_months": 6,
    },
    {
        "name": "2013 Taper Tantrum",
        "description": "Fed's tapering announcement caused emerging market selloff and rupee depreciation.",
        "impacts": {
            "equity_large_cap": -15,
            "equity_mid_cap": -20,
            "equity_small_cap": -25,
            "debt": -3,
            "gold_commodities": -15,
            "liquid_funds": +1,
        },
        "duration_months": 4,
        "recovery_months": 12,
    },
    {
        "name": "Interest Rate Hike Cycle",
        "description": "Sustained rate increases compress equity valuations and hurt growth stocks.",
        "impacts": {
            "equity_large_cap": -12,
            "equity_mid_cap": -18,
            "equity_small_cap": -22,
            "debt": -5,
            "gold_commodities": -3,
            "liquid_funds": +4,
        },
        "duration_months": 12,
        "recovery_months": 18,
    },
    {
        "name": "Stagflation Scenario",
        "description": "High inflation with stagnant growth, worst for equity and debt alike.",
        "impacts": {
            "equity_large_cap": -25,
            "equity_mid_cap": -30,
            "equity_small_cap": -35,
            "debt": -8,
            "gold_commodities": +20,
            "liquid_funds": +1,
        },
        "duration_months": 24,
        "recovery_months": 36,
    },
]


def run_stress_test(allocations: list, portfolio_value: float = 1000000) -> dict:
    """Run stress test for given portfolio allocations against crisis scenarios."""
    alloc_map = {a.asset_class: float(a.allocation_pct) / 100 for a in allocations}

    results = []
    for scenario in CRISIS_SCENARIOS:
        portfolio_impact = 0
        asset_impacts = []

        for asset_class, weight in alloc_map.items():
            impact_pct = scenario["impacts"].get(asset_class, 0)
            weighted_impact = weight * impact_pct
            portfolio_impact += weighted_impact
            asset_impacts.append({
                "asset_class": asset_class.replace("_", " ").title(),
                "weight_pct": round(weight * 100, 1),
                "asset_impact_pct": impact_pct,
                "contribution_pct": round(weighted_impact, 2),
            })

        loss_amount = round(portfolio_value * portfolio_impact / 100, 0)

        results.append({
            "name": scenario["name"],
            "description": scenario["description"],
            "impact_pct": round(portfolio_impact, 2),
            "loss_amount": loss_amount,
            "post_crisis_value": round(portfolio_value + loss_amount, 0),
            "duration_months": scenario["duration_months"],
            "recovery_months": scenario["recovery_months"],
            "asset_impacts": sorted(
                [{"asset": a["asset_class"], "impact_pct": a["asset_impact_pct"]} for a in asset_impacts],
                key=lambda a: a["impact_pct"],
            ),
        })

    worst = min(results, key=lambda r: r["impact_pct"])
    best = max(results, key=lambda r: r["impact_pct"])
    avg_impact = sum(r["impact_pct"] for r in results) / len(results)
    avg_loss = round(portfolio_value * avg_impact / 100, 0)

    return {
        "portfolio_value": portfolio_value,
        "worst_case": {
            "impact_pct": worst["impact_pct"],
            "loss_amount": worst["loss_amount"],
        },
        "best_case": {
            "impact_pct": best["impact_pct"],
            "loss_amount": best["loss_amount"],
        },
        "average_impact": {
            "impact_pct": round(avg_impact, 2),
            "loss_amount": avg_loss,
        },
        "scenarios": results,
    }
