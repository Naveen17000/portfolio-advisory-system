"""
Anomaly Detection & Nudge Engine.
Analyzes user financial behavior to detect anomalies,
calculate goal impact, and generate proactive nudges.

Detects 10 anomaly types, scores nudges by impact,
provides behavioral micro-wins, and trend indicators.
"""

from datetime import datetime


def _compute_impact_score(financial_impact: int, urgency: int, ease: int) -> int:
    """
    Score a nudge 0-100 based on three dimensions.
    - financial_impact: 0-100 how much money is at stake
    - urgency: 0-100 how time-sensitive
    - ease: 0-100 how easy to act on (easy wins score higher)
    Weighted: 50% impact, 30% urgency, 20% ease.
    """
    raw = financial_impact * 0.50 + urgency * 0.30 + ease * 0.20
    return max(0, min(100, round(raw)))


def _classify_trend(label: str, value: float) -> dict:
    """Return a trend indicator dict for a given metric."""
    thresholds = {
        "savings_ratio": [
            (30, "excellent", "up"),
            (20, "healthy", "up"),
            (10, "fair", "flat"),
            (0, "critical", "down"),
        ],
        "spending_ratio": [
            (85, "critical", "down"),
            (70, "elevated", "down"),
            (50, "healthy", "up"),
            (0, "excellent", "up"),
        ],
        "liability_ratio": [
            (3.0, "critical", "down"),
            (1.5, "elevated", "down"),
            (0.5, "healthy", "up"),
            (0, "excellent", "up"),
        ],
        "emergency_months": [
            (12, "excellent", "up"),
            (6, "healthy", "up"),
            (3, "fair", "flat"),
            (0, "critical", "down"),
        ],
    }

    brackets = thresholds.get(label)
    if not brackets:
        return {"label": label, "status": "unknown", "direction": "flat"}

    for threshold, status, direction in brackets:
        if label in ("spending_ratio", "liability_ratio"):
            # Higher is worse — trigger when value >= threshold
            if value >= threshold:
                return {"label": label, "status": status, "direction": direction}
        else:
            # Higher is better — trigger when value >= threshold
            if value >= threshold:
                return {"label": label, "status": status, "direction": direction}

    # Fallback to the last (lowest) bracket
    last = brackets[-1]
    return {"label": label, "status": last[1], "direction": last[2]}


def analyze_financial_health(profile_data: dict) -> dict:
    """
    Analyze a user's financial profile for anomalies and generate nudges.
    """
    income = float(profile_data.get("monthly_income", 0))
    expenses = float(profile_data.get("monthly_expenses", 0))
    savings = float(profile_data.get("monthly_savings", 0))
    liabilities = float(profile_data.get("total_liabilities", 0))
    emergency_months = int(profile_data.get("emergency_fund_months", 0))
    dependents = int(profile_data.get("dependents_count", 0))
    horizon = int(profile_data.get("investment_horizon_years", 5))
    life_stage = profile_data.get("life_stage", "early_career")
    investment_experience = profile_data.get("investment_experience", "beginner")
    existing_investments = profile_data.get("existing_investments", {})
    insurance_products = profile_data.get("insurance_products", [])

    anomalies = []
    nudges = []
    positive_findings = []
    health_score = 100  # Start at 100, deduct for issues

    if income <= 0:
        return {
            "anomalies": [{"type": "critical", "message": "Income data is missing or zero"}],
            "nudges": [{"type": "action", "priority": "high", "message": "Please update your income information", "impact_score": 100}],
            "health_score": 0,
            "health_grade": "N/A",
            "micro_wins": [],
            "tone": "concerning",
            "trends": {},
            "summary": {
                "spending_ratio": 0,
                "savings_ratio": 0,
                "liability_ratio": 0,
                "emergency_months": 0,
                "anomaly_count": 1,
                "nudge_count": 1,
                "positive_finding_count": 0,
            },
            "analyzed_at": datetime.utcnow().isoformat(),
        }

    spending_ratio = expenses / income
    savings_ratio = savings / income
    annual_income = income * 12
    liability_ratio = liabilities / annual_income if annual_income > 0 else 0

    # ===================================================================
    # ANOMALY DETECTION (original 6 + 4 new behavioral patterns)
    # ===================================================================

    # 1. Overspending
    if spending_ratio > 0.85:
        anomalies.append({
            "type": "warning",
            "category": "spending",
            "message": f"Your spending is {spending_ratio*100:.0f}% of income — this leaves very little room for savings and investment",
            "value": round(spending_ratio * 100, 1),
            "threshold": 85,
        })
        health_score -= 20

    elif spending_ratio > 0.70:
        anomalies.append({
            "type": "caution",
            "category": "spending",
            "message": f"Spending is {spending_ratio*100:.0f}% of income — aim for under 70% to build wealth faster",
            "value": round(spending_ratio * 100, 1),
            "threshold": 70,
        })
        health_score -= 10

    # 2. Savings inconsistency
    expected_savings = income - expenses
    if savings > 0 and abs(savings - expected_savings) > income * 0.1:
        anomalies.append({
            "type": "info",
            "category": "savings",
            "message": f"Your reported savings (Rs. {savings:,.0f}) doesn't match income minus expenses (Rs. {expected_savings:,.0f})",
            "value": round(savings),
            "expected": round(expected_savings),
        })

    if savings_ratio < 0.10:
        anomalies.append({
            "type": "warning",
            "category": "savings",
            "message": "Savings rate below 10% — this makes it hard to build wealth or handle emergencies",
            "value": round(savings_ratio * 100, 1),
            "threshold": 10,
        })
        health_score -= 15

    # 3. Emergency fund inadequacy
    if emergency_months < 3:
        anomalies.append({
            "type": "warning",
            "category": "emergency_fund",
            "message": f"Only {emergency_months} months of emergency fund — financial experts recommend at least 6 months",
            "value": emergency_months,
            "threshold": 6,
        })
        health_score -= 15

    elif emergency_months < 6:
        anomalies.append({
            "type": "caution",
            "category": "emergency_fund",
            "message": f"Emergency fund covers {emergency_months} months — consider building to 6-12 months",
            "value": emergency_months,
            "threshold": 6,
        })
        health_score -= 5

    # 4. High liability burden
    if liability_ratio > 3:
        anomalies.append({
            "type": "warning",
            "category": "liability",
            "message": f"Total liabilities are {liability_ratio:.1f}x your annual income — this is a significant burden",
            "value": round(liability_ratio, 1),
            "threshold": 3,
        })
        health_score -= 20

    elif liability_ratio > 1.5:
        anomalies.append({
            "type": "caution",
            "category": "liability",
            "message": f"Liabilities are {liability_ratio:.1f}x annual income — work on reducing debt",
            "value": round(liability_ratio, 1),
            "threshold": 1.5,
        })
        health_score -= 10

    # 5. Dependents without adequate coverage
    if dependents >= 2 and emergency_months < 6:
        anomalies.append({
            "type": "warning",
            "category": "dependents",
            "message": f"With {dependents} dependents and only {emergency_months} months emergency fund, your family's financial safety net is thin",
            "value": dependents,
        })
        health_score -= 10

    # 6. Short horizon mismatch
    if life_stage in ("student", "early_career") and horizon < 5:
        anomalies.append({
            "type": "info",
            "category": "horizon",
            "message": "Your investment horizon is short for your age group — consider thinking longer-term for better compounding",
            "value": horizon,
        })

    # --- NEW: Behavioral pattern anomalies (7-10) ---

    # 7. Lifestyle inflation — high earner spending too much
    if spending_ratio > 0.70 and annual_income > 100000:
        anomalies.append({
            "type": "caution",
            "category": "lifestyle_inflation",
            "message": (
                f"High income (Rs. {annual_income:,.0f}/yr) but spending ratio is "
                f"{spending_ratio*100:.0f}% — lifestyle inflation may be eroding your wealth-building potential"
            ),
            "value": round(spending_ratio * 100, 1),
            "threshold": 70,
        })
        health_score -= 10

    # 8. Cash hoarding — sitting on cash without investing
    if (
        savings_ratio > 0.40
        and emergency_months >= 12
        and investment_experience in ("none", "beginner")
    ):
        anomalies.append({
            "type": "caution",
            "category": "cash_hoarding",
            "message": (
                f"You save {savings_ratio*100:.0f}% of income and have {emergency_months} months of "
                "emergency reserves, but limited investment experience — your cash may be losing value to inflation"
            ),
            "value": round(savings_ratio * 100, 1),
            "threshold": 40,
        })
        health_score -= 5

    # 9. Over-concentration — any single investment class > 60%
    total_invested = sum(float(v) for v in existing_investments.values() if v)
    if total_invested > 0:
        for asset_class, amount in existing_investments.items():
            amount_f = float(amount) if amount else 0
            concentration = amount_f / total_invested
            if concentration > 0.60:
                anomalies.append({
                    "type": "warning",
                    "category": "over_concentration",
                    "message": (
                        f"{asset_class} makes up {concentration*100:.0f}% of your investments "
                        "— heavy concentration in a single asset class increases risk"
                    ),
                    "value": round(concentration * 100, 1),
                    "threshold": 60,
                    "asset_class": asset_class,
                })
                health_score -= 10
                break  # Report the worst one

    # 10. Insurance gap — dependents but no insurance
    has_insurance = bool(insurance_products)
    if dependents >= 1 and life_stage != "student" and not has_insurance:
        anomalies.append({
            "type": "warning",
            "category": "insurance_gap",
            "message": (
                f"You have {dependents} dependent(s) but no insurance products reported "
                "— adequate life and health insurance is essential for family protection"
            ),
            "value": dependents,
        })
        health_score -= 15

    # ===================================================================
    # NUDGE GENERATION (with impact_score)
    # ===================================================================

    # Emergency fund nudge
    if emergency_months < 6:
        target = 6 * expenses
        current = emergency_months * expenses
        gap = target - current
        monthly_target = gap / 12 if gap > 0 else 0
        nudges.append({
            "type": "action",
            "priority": "high",
            "category": "emergency_fund",
            "message": f"Build your emergency fund to 6 months (Rs. {target:,.0f}). Save Rs. {monthly_target:,.0f}/month to reach this in 1 year.",
            "target_amount": round(target),
            "monthly_required": round(monthly_target),
            "impact_score": _compute_impact_score(
                financial_impact=80,
                urgency=90 if emergency_months < 3 else 60,
                ease=50,
            ),
        })

    # Savings rate nudge
    if savings_ratio < 0.20:
        target_savings = income * 0.20
        increase_needed = target_savings - savings
        nudges.append({
            "type": "action",
            "priority": "medium",
            "category": "savings",
            "message": f"Increase monthly savings by Rs. {max(0, increase_needed):,.0f} to reach the recommended 20% savings rate.",
            "current_rate": round(savings_ratio * 100, 1),
            "target_rate": 20,
            "impact_score": _compute_impact_score(
                financial_impact=70,
                urgency=40,
                ease=40,
            ),
        })

    # Debt reduction nudge
    if liability_ratio > 1:
        monthly_debt_payment = liabilities / (horizon * 12) if horizon > 0 else liabilities / 60
        nudges.append({
            "type": "action",
            "priority": "high" if liability_ratio > 3 else "medium",
            "category": "debt",
            "message": f"Pay Rs. {monthly_debt_payment:,.0f}/month toward debt to clear it within your investment horizon.",
            "current_liability": round(liabilities),
            "monthly_payment": round(monthly_debt_payment),
            "impact_score": _compute_impact_score(
                financial_impact=90 if liability_ratio > 3 else 70,
                urgency=80 if liability_ratio > 3 else 50,
                ease=30,
            ),
        })

    # Investment nudge
    if savings > 0 and savings_ratio >= 0.10:
        investable = savings * 0.7  # 70% of savings to invest
        nudges.append({
            "type": "suggestion",
            "priority": "medium",
            "category": "investment",
            "message": f"You could invest Rs. {investable:,.0f}/month (70% of savings) via SIP for long-term wealth building.",
            "investable_amount": round(investable),
            "impact_score": _compute_impact_score(
                financial_impact=75,
                urgency=30,
                ease=60,
            ),
        })

    # Diversification nudge
    invested_classes = sum(1 for v in existing_investments.values() if v)
    if invested_classes < 3:
        nudges.append({
            "type": "suggestion",
            "priority": "low",
            "category": "diversification",
            "message": f"You're invested in only {invested_classes} asset class(es). Consider diversifying into at least 3-4 for better risk management.",
            "current_count": invested_classes,
            "target_count": 4,
            "impact_score": _compute_impact_score(
                financial_impact=50,
                urgency=20,
                ease=50,
            ),
        })

    # Life stage specific nudges
    if life_stage == "student" and savings_ratio > 0.05:
        nudges.append({
            "type": "encouragement",
            "priority": "low",
            "category": "motivation",
            "message": "Great job saving as a student! Even small investments now will grow significantly by the time you start your career.",
            "impact_score": _compute_impact_score(
                financial_impact=20,
                urgency=10,
                ease=90,
            ),
        })
    elif life_stage == "pre_retirement" and emergency_months >= 12:
        nudges.append({
            "type": "encouragement",
            "priority": "low",
            "category": "motivation",
            "message": "Your emergency fund is strong. Focus on shifting toward capital preservation and income-generating investments.",
            "impact_score": _compute_impact_score(
                financial_impact=60,
                urgency=50,
                ease=40,
            ),
        })

    # --- NEW: Behavioral pattern nudges ---

    # Cash hoarding nudge
    if savings_ratio > 0.40 and emergency_months >= 12 and investment_experience in ("none", "beginner"):
        nudges.append({
            "type": "action",
            "priority": "medium",
            "category": "cash_hoarding",
            "message": (
                "Your savings are strong but idle cash loses value to inflation. "
                "Consider starting with a low-risk index fund or balanced mutual fund to put your money to work."
            ),
            "impact_score": _compute_impact_score(
                financial_impact=65,
                urgency=40,
                ease=70,
            ),
        })

    # Insurance gap nudge
    if dependents >= 1 and life_stage != "student" and not has_insurance:
        recommended_cover = annual_income * 10
        nudges.append({
            "type": "action",
            "priority": "high",
            "category": "insurance",
            "message": (
                f"With {dependents} dependent(s), consider term life insurance of at least "
                f"Rs. {recommended_cover:,.0f} (10x annual income) and a family health insurance plan."
            ),
            "recommended_life_cover": round(recommended_cover),
            "impact_score": _compute_impact_score(
                financial_impact=95,
                urgency=70,
                ease=60,
            ),
        })

    # Over-concentration nudge
    if total_invested > 0:
        for asset_class, amount in existing_investments.items():
            amount_f = float(amount) if amount else 0
            concentration = amount_f / total_invested
            if concentration > 0.60:
                nudges.append({
                    "type": "action",
                    "priority": "medium",
                    "category": "rebalance",
                    "message": (
                        f"Rebalance your portfolio — {asset_class} is {concentration*100:.0f}% of your investments. "
                        "Aim for no single asset class above 40-50% for better risk-adjusted returns."
                    ),
                    "asset_class": asset_class,
                    "current_concentration": round(concentration * 100, 1),
                    "impact_score": _compute_impact_score(
                        financial_impact=60,
                        urgency=30,
                        ease=45,
                    ),
                })
                break

    # ===================================================================
    # MICRO-WINS — Behavioral positive reinforcement
    # ===================================================================

    micro_wins = []

    if savings_ratio > 0.30:
        micro_wins.append({
            "type": "praise",
            "category": "savings",
            "message": f"Outstanding! You save {savings_ratio*100:.0f}% of your income — well above the recommended 20%. Keep it up!",
        })
        positive_findings.append("high_savings_rate")
    elif savings_ratio > 0.20:
        positive_findings.append("good_savings_rate")

    if emergency_months >= 6:
        micro_wins.append({
            "type": "praise",
            "category": "emergency_fund",
            "message": f"Your emergency fund covers {emergency_months} months — that is a solid financial cushion. Well done!",
        })
        positive_findings.append("adequate_emergency_fund")

    if liability_ratio < 0.5:
        micro_wins.append({
            "type": "praise",
            "category": "debt",
            "message": "Your debt-to-income ratio is low — you are in a strong position to invest and grow your wealth.",
        })
        positive_findings.append("low_debt")

    if invested_classes >= 4:
        micro_wins.append({
            "type": "praise",
            "category": "diversification",
            "message": f"Your investments span {invested_classes} asset classes — great diversification!",
        })
        positive_findings.append("well_diversified")

    if spending_ratio < 0.50:
        micro_wins.append({
            "type": "praise",
            "category": "spending",
            "message": f"Spending is only {spending_ratio*100:.0f}% of income — you have excellent expense discipline.",
        })
        positive_findings.append("low_spending")

    # ===================================================================
    # OVERALL TONE
    # ===================================================================

    negative_count = len(anomalies)
    positive_count = len(positive_findings)

    if positive_count >= 3 and negative_count <= 1:
        tone = "encouraging"
    elif negative_count >= 3 and positive_count <= 1:
        tone = "concerning"
    else:
        tone = "mixed"

    # ===================================================================
    # TREND INDICATORS
    # ===================================================================

    trends = {
        "savings_ratio": _classify_trend("savings_ratio", savings_ratio * 100),
        "spending_ratio": _classify_trend("spending_ratio", spending_ratio * 100),
        "liability_ratio": _classify_trend("liability_ratio", liability_ratio),
        "emergency_months": _classify_trend("emergency_months", emergency_months),
    }

    # ===================================================================
    # HEALTH GRADE
    # ===================================================================

    health_score = max(0, min(100, health_score))
    if health_score >= 80:
        grade = "A"
    elif health_score >= 60:
        grade = "B"
    elif health_score >= 40:
        grade = "C"
    elif health_score >= 20:
        grade = "D"
    else:
        grade = "F"

    # Sort nudges by impact_score descending (highest impact first), then by priority
    priority_order = {"high": 0, "medium": 1, "low": 2}
    sorted_nudges = sorted(
        nudges,
        key=lambda n: (-n.get("impact_score", 0), priority_order.get(n["priority"], 3)),
    )

    return {
        "anomalies": anomalies,
        "nudges": sorted_nudges,
        "health_score": health_score,
        "health_grade": grade,
        "micro_wins": micro_wins,
        "tone": tone,
        "trends": trends,
        "summary": {
            "spending_ratio": round(spending_ratio * 100, 1),
            "savings_ratio": round(savings_ratio * 100, 1),
            "liability_ratio": round(liability_ratio, 2),
            "emergency_months": emergency_months,
            "anomaly_count": len(anomalies),
            "nudge_count": len(sorted_nudges),
            "positive_finding_count": positive_count,
        },
        "analyzed_at": datetime.utcnow().isoformat(),
    }
