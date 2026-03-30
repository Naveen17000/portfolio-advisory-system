"""
Life Event Simulator — model how major life events cascade through
your financial plan over 20+ years.

Each event modifies income, expenses, liabilities, dependents, and
risk profile. Events compound — having a baby AFTER buying a house
is different from having a baby alone.
"""

import math
from datetime import datetime


# ── Event Templates ─────────────────────────────────────────────────
LIFE_EVENTS = {
    "marriage": {
        "label": "Getting Married",
        "icon": "ring",
        "one_time_cost": 500000,
        "monthly_expense_change": 10000,
        "monthly_income_change": 0,
        "liability_change": 0,
        "dependents_change": 0,
        "description": "Wedding expenses + higher household costs. Potential dual income if spouse works.",
        "tips": [
            "Start a dedicated wedding fund 12-18 months before",
            "Avoid taking a personal loan for the wedding",
            "Update nominees on all investments after marriage",
            "Consider joint financial planning with your spouse",
        ],
    },
    "marriage_dual_income": {
        "label": "Getting Married (Dual Income)",
        "icon": "ring",
        "one_time_cost": 500000,
        "monthly_expense_change": 10000,
        "monthly_income_change": 30000,
        "liability_change": 0,
        "dependents_change": 0,
        "description": "Wedding costs offset by spouse's income joining the household.",
        "tips": [
            "Invest the surplus income immediately via SIPs",
            "Build emergency fund to cover both incomes",
            "Coordinate tax planning — use both 80C limits",
        ],
    },
    "baby": {
        "label": "Having a Baby",
        "icon": "baby",
        "one_time_cost": 100000,
        "monthly_expense_change": 15000,
        "monthly_income_change": 0,
        "liability_change": 0,
        "dependents_change": 1,
        "description": "Hospital, baby gear, and ongoing childcare costs. Expenses grow as the child ages.",
        "tips": [
            "Get health insurance with maternity cover BEFORE pregnancy",
            "Start a child education fund immediately — even Rs. 2000/month grows significantly over 18 years",
            "Increase term insurance cover by 25-50%",
            "Build emergency fund to 6+ months before the baby arrives",
        ],
    },
    "house_purchase": {
        "label": "Buying a House",
        "icon": "home",
        "one_time_cost": 500000,
        "monthly_expense_change": 5000,
        "monthly_income_change": 0,
        "liability_change": 5000000,
        "dependents_change": 0,
        "description": "Down payment + home loan EMI becomes your biggest monthly outflow. Maintenance costs add up.",
        "tips": [
            "Keep EMI under 40% of take-home income",
            "Don't break your emergency fund for the down payment",
            "Home loan interest is tax deductible under Section 24 (up to Rs. 2L)",
            "Principal repayment qualifies under 80C (up to Rs. 1.5L)",
        ],
    },
    "car_purchase": {
        "label": "Buying a Car",
        "icon": "car",
        "one_time_cost": 200000,
        "monthly_expense_change": 8000,
        "monthly_income_change": 0,
        "liability_change": 600000,
        "dependents_change": 0,
        "description": "Down payment + EMI + fuel, insurance, maintenance, parking costs.",
        "tips": [
            "A car is a depreciating asset — keep it under 10% of annual income",
            "Prefer shorter loan tenure (3 years) to save on interest",
            "Factor in Rs. 5-8K/month for fuel, insurance, and maintenance",
        ],
    },
    "job_loss": {
        "label": "Job Loss / Career Break",
        "icon": "alert",
        "one_time_cost": 0,
        "monthly_expense_change": 0,
        "monthly_income_change": -40000,
        "liability_change": 0,
        "dependents_change": 0,
        "description": "Income drops to zero or reduced. Emergency fund becomes critical.",
        "tips": [
            "This is exactly why emergency funds exist — don't panic-sell investments",
            "Cut discretionary spending immediately",
            "Avoid taking on new debt during this period",
            "Consider freelancing or part-time work to bridge the gap",
        ],
    },
    "salary_hike": {
        "label": "Salary Hike / Promotion",
        "icon": "trending_up",
        "one_time_cost": 0,
        "monthly_expense_change": 5000,
        "monthly_income_change": 25000,
        "liability_change": 0,
        "dependents_change": 0,
        "description": "Income increases. The key is to invest the surplus, not inflate your lifestyle.",
        "tips": [
            "Follow the 50-30-20 rule: save at least 50% of the hike",
            "Increase SIP amounts proportionally",
            "Avoid lifestyle inflation — the #1 wealth killer",
        ],
    },
    "higher_education": {
        "label": "Higher Education (MBA/Masters)",
        "icon": "education",
        "one_time_cost": 1500000,
        "monthly_expense_change": 0,
        "monthly_income_change": -30000,
        "liability_change": 1000000,
        "dependents_change": 0,
        "description": "Tuition + living expenses + opportunity cost of lost income for 1-2 years.",
        "tips": [
            "Education loans have tax benefits under Section 80E (no upper limit)",
            "Scholarship applications can significantly reduce costs",
            "The ROI of a good MBA is typically 3-5x in 5 years",
        ],
    },
    "child_education": {
        "label": "Child's Higher Education",
        "icon": "education",
        "one_time_cost": 2000000,
        "monthly_expense_change": 0,
        "monthly_income_change": 0,
        "liability_change": 1000000,
        "dependents_change": 0,
        "description": "College/university fees for your child. Start planning 15+ years ahead.",
        "tips": [
            "Start a dedicated education SIP when the child is born",
            "Rs. 5000/month at 12% for 18 years = Rs. 40L+",
            "Education inflation in India is 10-12% — higher than general inflation",
            "Consider Sukanya Samriddhi Yojana for a girl child",
        ],
    },
    "parents_medical": {
        "label": "Parents' Medical Emergency",
        "icon": "medical",
        "one_time_cost": 500000,
        "monthly_expense_change": 5000,
        "monthly_income_change": 0,
        "liability_change": 0,
        "dependents_change": 0,
        "description": "Hospitalization + ongoing medication/treatment costs. Often unexpected.",
        "tips": [
            "Get parents health insurance (80D deduction up to Rs. 50K for senior citizens)",
            "Super top-up plans are cost-effective for high coverage",
            "Keep a separate medical emergency fund",
        ],
    },
    "start_business": {
        "label": "Starting a Business / Freelancing",
        "icon": "business",
        "one_time_cost": 300000,
        "monthly_expense_change": 10000,
        "monthly_income_change": -20000,
        "liability_change": 200000,
        "dependents_change": 0,
        "description": "Initial investment + irregular income for 1-2 years. High risk, high potential reward.",
        "tips": [
            "Have 12+ months of expenses saved before quitting your job",
            "Don't invest your emergency fund in the business",
            "Keep personal and business finances strictly separate",
            "Start part-time/side-hustle before going full-time",
        ],
    },
}


def get_event_templates() -> list[dict]:
    """Return all available life event templates."""
    return [
        {"id": key, "label": val["label"], "icon": val["icon"], "description": val["description"]}
        for key, val in LIFE_EVENTS.items()
    ]


def simulate_life_events(
    profile: dict,
    events: list[dict],
    projection_years: int = 20,
    annual_return_pct: float = 10,
    inflation_pct: float = 6,
) -> dict:
    """
    Simulate how a sequence of life events affects finances over time.

    Args:
        profile: Current financial profile {monthly_income, monthly_expenses,
                 monthly_savings, total_liabilities, emergency_fund_months,
                 dependents_count, investment_horizon_years}
        events: List of {event_id, year} — when each event occurs
        projection_years: How many years to project forward
        annual_return_pct: Expected portfolio return
        inflation_pct: Expected inflation rate

    Returns:
        Year-by-year projection with and without events, plus per-event impact analysis.
    """
    income = float(profile.get("monthly_income", 50000))
    expenses = float(profile.get("monthly_expenses", 30000))
    savings = float(profile.get("monthly_savings", 20000))
    liabilities = float(profile.get("total_liabilities", 0))
    emergency_months = int(profile.get("emergency_fund_months", 3))
    dependents = int(profile.get("dependents_count", 0))
    current_age = int(profile.get("current_age", 25))

    monthly_return = annual_return_pct / 100 / 12
    annual_inflation = inflation_pct / 100

    # Sort events by year
    sorted_events = sorted(events, key=lambda e: e.get("year", 1))

    # ── Baseline projection (no events) ──────────────────────────────
    baseline = []
    b_income = income
    b_expenses = expenses
    b_corpus = savings * emergency_months  # approximate starting corpus
    b_liabilities = liabilities

    for year in range(projection_years + 1):
        b_monthly_savings = max(0, b_income - b_expenses)
        b_annual_savings = b_monthly_savings * 12

        if year > 0:
            b_corpus = b_corpus * (1 + annual_return_pct / 100) + b_annual_savings
            b_income *= (1 + 0.08)  # 8% annual income growth
            b_expenses *= (1 + annual_inflation)
            b_liabilities = max(0, b_liabilities - b_monthly_savings * 0.1 * 12)

        baseline.append({
            "year": year,
            "age": current_age + year,
            "income": round(b_income),
            "expenses": round(b_expenses),
            "savings": round(max(0, b_income - b_expenses)),
            "corpus": round(b_corpus),
            "liabilities": round(b_liabilities),
            "net_worth": round(b_corpus - b_liabilities),
        })

    # ── With-events projection ───────────────────────────────────────
    projection = []
    e_income = income
    e_expenses = expenses
    e_corpus = savings * emergency_months
    e_liabilities = liabilities
    e_dependents = dependents
    event_impacts = []
    events_applied = []

    for year in range(projection_years + 1):
        # Apply events scheduled for this year
        year_events = [e for e in sorted_events if e.get("year") == year]

        for ev in year_events:
            event_id = ev.get("event_id", "")
            template = LIFE_EVENTS.get(event_id)
            if not template:
                continue

            # Snapshot before
            corpus_before = e_corpus
            savings_before = max(0, e_income - e_expenses)

            # Apply one-time cost
            e_corpus -= template["one_time_cost"]

            # Apply monthly changes
            e_income += template["monthly_income_change"]
            e_income = max(0, e_income)
            e_expenses += template["monthly_expense_change"]
            e_liabilities += template["liability_change"]
            e_dependents += template["dependents_change"]

            # EMI impact from new liabilities (~8.5% interest, 20yr tenure for home, 5yr for others)
            new_liability = template["liability_change"]
            if new_liability > 0:
                if event_id in ("house_purchase",):
                    # Home loan: 8.5% for 20 years → EMI factor ~0.0087
                    emi = new_liability * 0.0087
                elif new_liability > 500000:
                    # Education loan: 9% for 10 years → EMI factor ~0.0127
                    emi = new_liability * 0.0127
                else:
                    # Car/personal loan: 10% for 5 years → EMI factor ~0.0212
                    emi = new_liability * 0.0212
                e_expenses += emi

            savings_after = max(0, e_income - e_expenses)
            monthly_impact = savings_after - savings_before

            event_impacts.append({
                "event_id": event_id,
                "label": template["label"],
                "year": year,
                "age": current_age + year,
                "one_time_cost": template["one_time_cost"],
                "monthly_savings_impact": round(monthly_impact),
                "corpus_impact": round(e_corpus - corpus_before),
                "new_monthly_expenses": round(e_expenses),
                "new_monthly_savings": round(savings_after),
                "liability_added": template["liability_change"],
                "tips": template["tips"],
            })
            events_applied.append({
                "event_id": event_id,
                "label": template["label"],
                "year": year,
            })

        e_monthly_savings = e_income - e_expenses
        e_annual_savings = e_monthly_savings * 12

        if year > 0:
            if e_monthly_savings >= 0:
                # Positive savings: grow corpus
                e_corpus = e_corpus * (1 + annual_return_pct / 100) + e_annual_savings
            else:
                # Negative savings: dip into corpus (but can't go below 0)
                e_corpus = max(0, e_corpus * (1 + annual_return_pct / 100) + e_annual_savings)
            e_income *= (1 + 0.08)
            e_expenses *= (1 + annual_inflation)
            # Liabilities reduce over time as EMIs are paid (amortization ~5% of outstanding/year)
            e_liabilities = max(0, e_liabilities * 0.95)

        projection.append({
            "year": year,
            "age": current_age + year,
            "income": round(e_income),
            "expenses": round(e_expenses),
            "savings": round(e_income - e_expenses),
            "corpus": round(max(0, e_corpus)),
            "liabilities": round(max(0, e_liabilities)),
            "net_worth": round(max(0, e_corpus) - max(0, e_liabilities)),
            "dependents": e_dependents,
        })

    # ── Summary ──────────────────────────────────────────────────────
    baseline_final = baseline[-1]
    events_final = projection[-1]
    corpus_diff = events_final["corpus"] - baseline_final["corpus"]
    net_worth_diff = events_final["net_worth"] - baseline_final["net_worth"]

    return {
        "projection_years": projection_years,
        "baseline": baseline,
        "with_events": projection,
        "events_applied": events_applied,
        "event_impacts": event_impacts,
        "summary": {
            "baseline_corpus": baseline_final["corpus"],
            "events_corpus": events_final["corpus"],
            "corpus_difference": corpus_diff,
            "corpus_impact_pct": round(corpus_diff / baseline_final["corpus"] * 100, 1) if baseline_final["corpus"] > 0 else 0,
            "baseline_net_worth": baseline_final["net_worth"],
            "events_net_worth": events_final["net_worth"],
            "net_worth_difference": net_worth_diff,
            "total_one_time_costs": sum(e["one_time_cost"] for e in event_impacts),
            "total_liability_added": sum(e["liability_added"] for e in event_impacts),
            "events_count": len(event_impacts),
        },
    }
