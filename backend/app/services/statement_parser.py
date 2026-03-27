"""
Bank Statement Parser.
Parses CSV bank statements to auto-extract income, expenses, and spending categories.
Supports common Indian bank CSV formats.
"""

import csv
import io
import re
from datetime import datetime


# Common expense categories based on transaction descriptions
CATEGORY_PATTERNS = {
    "groceries": [r"bigbasket", r"blinkit", r"swiggy\s*instamart", r"dmart", r"more\s*retail", r"grofer", r"zepto"],
    "food_dining": [r"swiggy", r"zomato", r"restaurant", r"cafe", r"pizza", r"mcdonald", r"domino", r"starbuck"],
    "transport": [r"uber", r"ola", r"rapido", r"metro", r"irctc", r"petrol", r"fuel", r"parking"],
    "utilities": [r"electricity", r"water\s*bill", r"gas\s*bill", r"broadband", r"jio", r"airtel", r"vi\s*recharge", r"dth"],
    "rent": [r"rent", r"house\s*rent", r"hra"],
    "emi": [r"emi", r"loan", r"mortgage", r"home\s*loan", r"car\s*loan", r"personal\s*loan"],
    "insurance": [r"insurance", r"lic", r"premium", r"health\s*insurance"],
    "investments": [r"mutual\s*fund", r"sip", r"zerodha", r"groww", r"paytm\s*money", r"kuvera", r"coin", r"nps"],
    "shopping": [r"amazon", r"flipkart", r"myntra", r"ajio", r"nykaa", r"meesho"],
    "entertainment": [r"netflix", r"hotstar", r"prime\s*video", r"spotify", r"movie", r"pvr", r"inox"],
    "healthcare": [r"hospital", r"pharmacy", r"medic", r"apollo", r"pharmeasy", r"1mg", r"doctor"],
    "education": [r"school", r"college", r"tuition", r"course", r"udemy", r"coursera"],
    "transfer": [r"upi", r"neft", r"imps", r"rtgs", r"transfer"],
    "salary": [r"salary", r"payroll", r"stipend", r"wages"],
    "interest": [r"interest\s*credit", r"int\s*cr", r"savings\s*interest"],
}


def _categorize_transaction(description: str) -> str:
    """Categorize a transaction based on its description."""
    desc_lower = description.lower()
    for category, patterns in CATEGORY_PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, desc_lower):
                return category
    return "other"


def _detect_csv_format(headers: list[str]) -> dict:
    """Detect CSV column mapping from headers."""
    headers_lower = [h.strip().lower() for h in headers]

    mapping = {"date": None, "description": None, "debit": None, "credit": None, "balance": None}

    for i, h in enumerate(headers_lower):
        if h in ("date", "txn date", "transaction date", "value date", "posting date"):
            mapping["date"] = i
        elif h in ("description", "narration", "particulars", "remarks", "transaction details", "detail"):
            mapping["description"] = i
        elif h in ("debit", "withdrawal", "debit amount", "dr", "withdrawal amt"):
            mapping["debit"] = i
        elif h in ("credit", "deposit", "credit amount", "cr", "deposit amt"):
            mapping["credit"] = i
        elif h in ("balance", "closing balance", "running balance"):
            mapping["balance"] = i
        elif h in ("amount", "transaction amount"):
            # Single amount column - need to determine debit/credit from sign
            mapping["debit"] = i
            mapping["credit"] = i

    return mapping


def _parse_amount(value: str) -> float:
    """Parse currency amount from string."""
    if not value or not value.strip():
        return 0.0
    cleaned = re.sub(r"[^\d.\-]", "", value.strip())
    try:
        return abs(float(cleaned))
    except ValueError:
        return 0.0


def _parse_date(value: str) -> str | None:
    """Try multiple date formats."""
    formats = ["%d/%m/%Y", "%d-%m-%Y", "%Y-%m-%d", "%d/%m/%y", "%d-%m-%y", "%m/%d/%Y"]
    for fmt in formats:
        try:
            return datetime.strptime(value.strip(), fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None


def parse_csv_statement(file_content: str) -> dict:
    """
    Parse a CSV bank statement and extract financial insights.

    Returns:
        Dict with monthly summary, categorized expenses, income detection,
        and suggested profile values.
    """
    reader = csv.reader(io.StringIO(file_content))
    rows = list(reader)

    if len(rows) < 2:
        return {"error": "CSV file is empty or has no data rows"}

    # Detect format from headers
    headers = rows[0]
    mapping = _detect_csv_format(headers)

    if mapping["description"] is None:
        return {"error": "Could not detect description/narration column. Ensure CSV has headers."}

    transactions = []
    total_income = 0.0
    total_expenses = 0.0
    category_totals: dict[str, float] = {}
    monthly_data: dict[str, dict] = {}

    for row in rows[1:]:
        if len(row) <= max(v for v in mapping.values() if v is not None):
            continue

        date_str = row[mapping["date"]] if mapping["date"] is not None else ""
        description = row[mapping["description"]] if mapping["description"] is not None else ""
        parsed_date = _parse_date(date_str) if date_str else None

        debit = 0.0
        credit = 0.0
        if mapping["debit"] is not None and mapping["credit"] is not None and mapping["debit"] != mapping["credit"]:
            debit = _parse_amount(row[mapping["debit"]])
            credit = _parse_amount(row[mapping["credit"]])
        elif mapping["debit"] is not None:
            amount = _parse_amount(row[mapping["debit"]])
            category = _categorize_transaction(description)
            if category in ("salary", "interest"):
                credit = amount
            else:
                debit = amount

        category = _categorize_transaction(description)

        if credit > 0:
            total_income += credit
            is_income = True
        else:
            total_expenses += debit
            is_income = False
            category_totals[category] = category_totals.get(category, 0) + debit

        # Monthly aggregation
        if parsed_date:
            month_key = parsed_date[:7]  # YYYY-MM
            if month_key not in monthly_data:
                monthly_data[month_key] = {"income": 0, "expenses": 0}
            if is_income:
                monthly_data[month_key]["income"] += credit
            else:
                monthly_data[month_key]["expenses"] += debit

        transactions.append({
            "date": parsed_date,
            "description": description.strip(),
            "debit": round(debit, 2),
            "credit": round(credit, 2),
            "category": category,
            "is_income": is_income,
        })

    num_months = max(len(monthly_data), 1)
    avg_monthly_income = total_income / num_months
    avg_monthly_expenses = total_expenses / num_months
    avg_monthly_savings = avg_monthly_income - avg_monthly_expenses

    # Categorize spending
    essential_categories = {"groceries", "utilities", "rent", "emi", "insurance", "healthcare", "education", "transport"}
    discretionary_categories = {"food_dining", "shopping", "entertainment"}

    essential_spending = sum(v for k, v in category_totals.items() if k in essential_categories)
    discretionary_spending = sum(v for k, v in category_totals.items() if k in discretionary_categories)

    # SIP detection
    investment_total = category_totals.get("investments", 0)
    has_sip = investment_total > 0

    # Spending ratio
    spending_ratio = total_expenses / total_income if total_income > 0 else 1.0
    discretionary_ratio = discretionary_spending / total_expenses if total_expenses > 0 else 0.0

    return {
        "summary": {
            "total_transactions": len(transactions),
            "period_months": num_months,
            "total_income": round(total_income, 2),
            "total_expenses": round(total_expenses, 2),
            "total_savings": round(total_income - total_expenses, 2),
        },
        "monthly_averages": {
            "income": round(avg_monthly_income, 2),
            "expenses": round(avg_monthly_expenses, 2),
            "savings": round(avg_monthly_savings, 2),
        },
        "spending_categories": {k: round(v, 2) for k, v in sorted(category_totals.items(), key=lambda x: -x[1])},
        "spending_analysis": {
            "essential_total": round(essential_spending, 2),
            "discretionary_total": round(discretionary_spending, 2),
            "essential_ratio": round(essential_spending / total_expenses * 100, 1) if total_expenses > 0 else 0,
            "discretionary_ratio": round(discretionary_ratio * 100, 1),
            "spending_ratio": round(spending_ratio * 100, 1),
        },
        "investment_detection": {
            "has_sip": has_sip,
            "monthly_investment": round(investment_total / num_months, 2),
        },
        "monthly_trend": [
            {"month": k, "income": round(v["income"], 2), "expenses": round(v["expenses"], 2)}
            for k, v in sorted(monthly_data.items())
        ],
        "suggested_profile": {
            "monthly_income": round(avg_monthly_income, 2),
            "monthly_expenses": round(avg_monthly_expenses, 2),
            "monthly_savings": round(max(avg_monthly_savings, 0), 2),
        },
        "transactions_sample": transactions[:20],
    }
