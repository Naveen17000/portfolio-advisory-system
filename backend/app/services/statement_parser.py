"""
Bank Statement Parser.
Parses CSV bank statements to auto-extract income, expenses, and spending categories.
Supports common Indian bank CSV formats including:
- Separate debit/credit columns
- Single amount column with +/- signs
- Amount with Cr/Dr suffix
- Separate transaction type column (credit/debit/CR/DR)
"""

import csv
import io
import re
from datetime import datetime


# Common expense categories based on transaction descriptions
CATEGORY_PATTERNS = {
    "groceries": [r"bigbasket", r"blinkit", r"swiggy\s*instamart", r"dmart", r"more\s*retail", r"grofer", r"zepto", r"grocery", r"supermarket", r"reliance\s*fresh"],
    "food_dining": [r"swiggy", r"zomato", r"restaurant", r"cafe", r"pizza", r"mcdonald", r"domino", r"starbuck", r"kfc", r"burger", r"food"],
    "transport": [r"uber", r"ola", r"rapido", r"metro", r"irctc", r"petrol", r"fuel", r"parking", r"toll", r"fastag", r"diesel"],
    "utilities": [r"electricity", r"water\s*bill", r"gas\s*bill", r"broadband", r"jio", r"airtel", r"vi\s*recharge", r"dth", r"wifi", r"bsnl", r"vodafone", r"internet"],
    "rent": [r"rent", r"house\s*rent", r"hra", r"pg\s*rent", r"hostel"],
    "emi": [r"emi", r"loan", r"mortgage", r"home\s*loan", r"car\s*loan", r"personal\s*loan", r"education\s*loan", r"gold\s*loan"],
    "insurance": [r"insurance", r"lic", r"premium", r"health\s*insurance", r"term\s*plan", r"policy"],
    "investments": [r"mutual\s*fund", r"sip", r"zerodha", r"groww", r"paytm\s*money", r"kuvera", r"coin", r"nps", r"ppf", r"smallcase", r"angel\s*one", r"upstox"],
    "shopping": [r"amazon", r"flipkart", r"myntra", r"ajio", r"nykaa", r"meesho", r"snapdeal", r"tatacliq"],
    "entertainment": [r"netflix", r"hotstar", r"prime\s*video", r"spotify", r"movie", r"pvr", r"inox", r"youtube\s*premium", r"game"],
    "healthcare": [r"hospital", r"pharmacy", r"medic", r"apollo", r"pharmeasy", r"1mg", r"doctor", r"clinic", r"dental", r"lab\s*test"],
    "education": [r"school", r"college", r"tuition", r"course", r"udemy", r"coursera", r"unacademy", r"byju"],
    "transfer": [r"upi", r"neft", r"imps", r"rtgs", r"transfer", r"self\s*transfer", r"fund\s*transfer"],
    "salary": [r"salary", r"payroll", r"stipend", r"wages", r"sal\s*cr", r"monthly\s*pay"],
    "interest": [r"interest\s*credit", r"int\s*cr", r"savings\s*interest", r"fd\s*interest", r"int\.?\s*on"],
    "cashback": [r"cashback", r"reward", r"refund", r"reversal"],
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
    """Detect CSV column mapping from headers. Supports many Indian bank formats."""
    headers_lower = [h.strip().lower().replace("(", "").replace(")", "").replace(".", "") for h in headers]

    mapping = {
        "date": None,
        "description": None,
        "debit": None,
        "credit": None,
        "amount": None,
        "type": None,
        "balance": None,
    }

    for i, h in enumerate(headers_lower):
        # Date columns
        if h in ("date", "txn date", "transaction date", "value date", "posting date", "trans date", "txn_date"):
            mapping["date"] = i
        # Description columns
        elif h in ("description", "narration", "particulars", "remarks", "transaction details", "detail", "details", "transaction description", "txn description", "txn_description"):
            mapping["description"] = i
        # Debit columns
        elif h in ("debit", "withdrawal", "debit amount", "dr", "withdrawal amt", "debit amt", "withdrawals", "debit inr", "dr amount"):
            mapping["debit"] = i
        # Credit columns
        elif h in ("credit", "deposit", "credit amount", "cr", "deposit amt", "credit amt", "deposits", "credit inr", "cr amount"):
            mapping["credit"] = i
        # Single amount column
        elif h in ("amount", "transaction amount", "txn amount", "amt", "amount inr", "txn amt", "transaction_amount", "amount rs", "amountinr"):
            mapping["amount"] = i
        # Transaction type column (credit/debit indicator)
        elif h in ("type", "transaction type", "txn type", "dr/cr", "cr/dr", "drcr", "crdr", "debit/credit", "credit/debit", "txn_type"):
            mapping["type"] = i
        # Balance columns
        elif h in ("balance", "closing balance", "running balance", "available balance", "bal"):
            mapping["balance"] = i

    return mapping


def _parse_amount(value: str) -> tuple[float, str | None]:
    """
    Parse currency amount from string. Returns (amount, sign_hint).
    sign_hint is 'credit', 'debit', or None.

    Handles:
    - Plain numbers: "5000", "5,000.00"
    - Signed: "+5000", "-5000"
    - Cr/Dr suffix: "5000 Cr", "5000 DR", "5000CR"
    - Cr/Dr prefix: "CR 5000", "DR 5000"
    - Parenthesized negatives: "(5000)"
    - Currency prefixed: "Rs. 5000", "INR 5000", "₹5000"
    """
    if not value or not value.strip():
        return 0.0, None

    val = value.strip()
    sign_hint = None

    # Detect Cr/Dr suffix or prefix
    cr_dr_match = re.search(r'\b(cr|credit|deposit)\b', val, re.IGNORECASE)
    dr_match = re.search(r'\b(dr|debit|withdrawal)\b', val, re.IGNORECASE)
    if cr_dr_match:
        sign_hint = "credit"
    elif dr_match:
        sign_hint = "debit"

    # Detect parenthesized negatives: (5000) means debit
    if val.startswith("(") and val.endswith(")"):
        sign_hint = "debit"
        val = val[1:-1]

    # Detect leading sign
    if val.startswith("+"):
        sign_hint = sign_hint or "credit"
    elif val.startswith("-"):
        sign_hint = sign_hint or "debit"

    # Remove currency symbols, letters, spaces — keep digits, dots, commas, minus
    cleaned = re.sub(r"[₹$]", "", val)
    cleaned = re.sub(r"(?i)(rs\.?|inr|cr|dr|credit|debit|deposit|withdrawal)", "", cleaned)
    cleaned = cleaned.strip().strip(".")

    # Handle Indian comma notation: 1,50,000.00 or 50,000.00
    # Remove commas used as thousands separators (not decimal)
    if "," in cleaned:
        # If there's a dot, commas are thousands separators
        if "." in cleaned:
            cleaned = cleaned.replace(",", "")
        else:
            # No dot — check if comma is decimal separator (European) or thousands
            parts = cleaned.split(",")
            if len(parts[-1]) == 2 and len(parts) == 2:
                # Likely decimal comma: 5000,50
                cleaned = cleaned.replace(",", ".")
            else:
                # Thousands separator: 50,000 or 1,50,000
                cleaned = cleaned.replace(",", "")

    cleaned = re.sub(r"[^\d.\-]", "", cleaned)
    try:
        amount = abs(float(cleaned))
        return amount, sign_hint
    except ValueError:
        return 0.0, None


def _parse_date(value: str) -> str | None:
    """Try multiple date formats common in Indian bank statements."""
    formats = [
        "%d/%m/%Y", "%d-%m-%Y", "%Y-%m-%d", "%d/%m/%y", "%d-%m-%y",
        "%m/%d/%Y", "%Y/%m/%d", "%d %b %Y", "%d-%b-%Y", "%d %B %Y",
        "%Y-%m-%dT%H:%M:%S",
    ]
    for fmt in formats:
        try:
            return datetime.strptime(value.strip(), fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None


def _is_credit_type(type_value: str) -> bool | None:
    """Determine if a transaction type value indicates credit."""
    val = type_value.strip().lower()
    if val in ("cr", "credit", "c", "deposit", "credited", "+", "in"):
        return True
    if val in ("dr", "debit", "d", "withdrawal", "debited", "-", "out"):
        return False
    return None


def parse_csv_statement(file_content: str) -> dict:
    """
    Parse a CSV bank statement and extract financial insights.

    Supports formats:
    1. Separate debit/credit columns (most common)
    2. Single "amount" column with +/- signs
    3. Single "amount" column + separate "type" column (CR/DR)
    4. Amount with Cr/Dr suffix embedded in the value
    5. Mixed formats with comma-separated amounts (Indian notation)

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
        # Try second row as headers (some banks have a title row first)
        if len(rows) > 2:
            mapping = _detect_csv_format(rows[1])
            if mapping["description"] is not None:
                rows = rows[1:]
                headers = rows[0]
            else:
                return {"error": "Could not detect description/narration column. Ensure CSV has headers."}
        else:
            return {"error": "Could not detect description/narration column. Ensure CSV has headers."}

    has_separate_columns = (
        mapping["debit"] is not None
        and mapping["credit"] is not None
        and mapping["debit"] != mapping["credit"]
    )
    has_single_amount = mapping["amount"] is not None
    has_type_column = mapping["type"] is not None

    transactions = []
    total_income = 0.0
    total_expenses = 0.0
    category_totals: dict[str, float] = {}
    monthly_data: dict[str, dict] = {}

    max_col = max(v for v in mapping.values() if v is not None)

    for row in rows[1:]:
        if len(row) <= max_col:
            continue

        # Skip empty rows
        if all(not cell.strip() for cell in row):
            continue

        date_str = row[mapping["date"]].strip() if mapping["date"] is not None else ""
        description = row[mapping["description"]].strip() if mapping["description"] is not None else ""
        parsed_date = _parse_date(date_str) if date_str else None

        debit = 0.0
        credit = 0.0

        if has_separate_columns:
            # Format 1: Separate debit and credit columns
            debit_val, _ = _parse_amount(row[mapping["debit"]])
            credit_val, _ = _parse_amount(row[mapping["credit"]])
            debit = debit_val
            credit = credit_val

        elif has_single_amount:
            # Format 2/3/4: Single amount column
            raw_amount = row[mapping["amount"]]
            amount, sign_hint = _parse_amount(raw_amount)

            if has_type_column:
                # Format 3: Use type column to determine credit/debit
                type_val = row[mapping["type"]].strip()
                is_credit = _is_credit_type(type_val)
                if is_credit is True:
                    credit = amount
                elif is_credit is False:
                    debit = amount
                else:
                    # Type column unrecognized, fall back to sign hint
                    if sign_hint == "credit":
                        credit = amount
                    elif sign_hint == "debit":
                        debit = amount
                    else:
                        # Last resort: use category
                        cat = _categorize_transaction(description)
                        if cat in ("salary", "interest", "cashback"):
                            credit = amount
                        else:
                            debit = amount
            elif sign_hint is not None:
                # Format 4: Sign embedded in amount (+/- or Cr/Dr)
                # Override: if sign says debit but category says income, trust category
                cat = _categorize_transaction(description)
                income_categories = ("salary", "interest", "cashback")
                if sign_hint == "credit":
                    credit = amount
                elif sign_hint == "debit" and cat in income_categories:
                    # Bank uses negative for credits — trust the category
                    credit = amount
                else:
                    debit = amount
            else:
                # No sign info — check raw value for negative sign
                cleaned = re.sub(r"[₹$]", "", raw_amount.strip())
                cleaned = re.sub(r"(?i)(rs\.?|inr)", "", cleaned).strip().strip(".")
                if "," in cleaned:
                    if "." in cleaned:
                        cleaned = cleaned.replace(",", "")
                    else:
                        cleaned = cleaned.replace(",", "")
                cleaned = re.sub(r"[^\d.\-]", "", cleaned)
                try:
                    raw_val = float(cleaned)
                    cat = _categorize_transaction(description)
                    if raw_val < 0:
                        # Negative: could be debit (expense) or credit depending on bank format
                        # Some banks: negative = expense. Others: negative = credit.
                        # Use category to disambiguate
                        if cat in ("salary", "interest", "cashback"):
                            credit = abs(raw_val)
                        else:
                            debit = abs(raw_val)
                    elif raw_val > 0:
                        if cat in ("salary", "interest", "cashback"):
                            credit = abs(raw_val)
                        else:
                            debit = abs(raw_val)
                except ValueError:
                    pass

        elif mapping["debit"] is not None:
            # Fallback: debit column mapped to same as credit (legacy "amount" header)
            raw = row[mapping["debit"]]
            amount, sign_hint = _parse_amount(raw)
            if sign_hint == "credit":
                credit = amount
            elif sign_hint == "debit":
                debit = amount
            else:
                cat = _categorize_transaction(description)
                if cat in ("salary", "interest", "cashback"):
                    credit = amount
                else:
                    debit = amount

        category = _categorize_transaction(description)

        if credit > 0:
            total_income += credit
            is_income = True
        elif debit > 0:
            total_expenses += debit
            is_income = False
            category_totals[category] = category_totals.get(category, 0) + debit
        else:
            continue  # Skip zero-amount rows

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
            "description": description,
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
