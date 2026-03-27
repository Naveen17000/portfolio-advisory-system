"""
Anomaly Detection & Nudge Engine.
Analyzes user financial behavior to detect anomalies,
calculate goal impact, and generate proactive nudges.
"""

from datetime import datetime


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

    anomalies = []
    nudges = []
    health_score = 100  # Start at 100, deduct for issues

    if income <= 0:
        return {
            "anomalies": [{"type": "critical", "message": "Income data is missing or zero"}],
            "nudges": [{"type": "action", "priority": "high", "message": "Please update your income information"}],
            "health_score": 0,
            "health_grade": "N/A",
        }

    spending_ratio = expenses / income
    savings_ratio = savings / income
    annual_income = income * 12
    liability_ratio = liabilities / annual_income if annual_income > 0 else 0

    # --- Anomaly Detection ---

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

    # --- Nudge Generation ---

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
        })

    # Diversification nudge
    investments = profile_data.get("existing_investments", {})
    invested_classes = sum(1 for v in investments.values() if v)
    if invested_classes < 3:
        nudges.append({
            "type": "suggestion",
            "priority": "low",
            "category": "diversification",
            "message": f"You're invested in only {invested_classes} asset class(es). Consider diversifying into at least 3-4 for better risk management.",
            "current_count": invested_classes,
            "target_count": 4,
        })

    # Life stage specific nudges
    if life_stage == "student" and savings_ratio > 0.05:
        nudges.append({
            "type": "encouragement",
            "priority": "low",
            "category": "motivation",
            "message": "Great job saving as a student! Even small investments now will grow significantly by the time you start your career.",
        })
    elif life_stage == "pre_retirement" and emergency_months >= 12:
        nudges.append({
            "type": "encouragement",
            "priority": "low",
            "category": "motivation",
            "message": "Your emergency fund is strong. Focus on shifting toward capital preservation and income-generating investments.",
        })

    # Calculate health grade
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

    return {
        "anomalies": anomalies,
        "nudges": sorted(nudges, key=lambda n: {"high": 0, "medium": 1, "low": 2}.get(n["priority"], 3)),
        "health_score": health_score,
        "health_grade": grade,
        "summary": {
            "spending_ratio": round(spending_ratio * 100, 1),
            "savings_ratio": round(savings_ratio * 100, 1),
            "liability_ratio": round(liability_ratio, 2),
            "emergency_months": emergency_months,
            "anomaly_count": len(anomalies),
            "nudge_count": len(nudges),
        },
        "analyzed_at": datetime.utcnow().isoformat(),
    }
