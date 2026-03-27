from app.schemas.questionnaire import Question, QuestionOption

QUESTIONS = [
    # Step 1: Personal Info
    Question(
        id="life_stage",
        step=1,
        text="What best describes your current life stage?",
        type="select",
        options=[
            QuestionOption(value="student", label="Student"),
            QuestionOption(value="early_career", label="Early Career (22-35)"),
            QuestionOption(value="family", label="Family / Married"),
            QuestionOption(value="pre_retirement", label="Pre-Retirement (50+)"),
        ],
    ),
    Question(
        id="dependents_count",
        step=1,
        text="How many financial dependents do you have?",
        type="number",
    ),
    # Step 2: Income & Expenses
    Question(
        id="monthly_income",
        step=2,
        text="What is your monthly income (after tax)?",
        type="number",
    ),
    Question(
        id="monthly_expenses",
        step=2,
        text="What are your total monthly expenses?",
        type="number",
    ),
    Question(
        id="monthly_savings",
        step=2,
        text="How much do you save per month?",
        type="number",
    ),
    # Step 3: Liabilities
    Question(
        id="total_liabilities",
        step=3,
        text="What is your total outstanding debt (loans, credit cards, etc.)?",
        type="number",
    ),
    # Step 4: Emergency Fund
    Question(
        id="emergency_fund_months",
        step=4,
        text="How many months of expenses can your emergency fund cover?",
        type="number",
    ),
    # Step 5: Investment Experience
    Question(
        id="investment_experience",
        step=5,
        text="How would you describe your investment experience?",
        type="select",
        options=[
            QuestionOption(value="none", label="No experience"),
            QuestionOption(value="beginner", label="Beginner (< 2 years)"),
            QuestionOption(value="intermediate", label="Intermediate (2-5 years)"),
            QuestionOption(value="advanced", label="Advanced (5+ years)"),
        ],
    ),
    Question(
        id="existing_investments",
        step=5,
        text="Which asset classes are you currently invested in?",
        type="multi_select",
        required=False,
        options=[
            QuestionOption(value="equity_large_cap", label="Large Cap Equity"),
            QuestionOption(value="equity_mid_cap", label="Mid Cap Equity"),
            QuestionOption(value="equity_small_cap", label="Small Cap Equity"),
            QuestionOption(value="debt", label="Debt / Fixed Income"),
            QuestionOption(value="gold_commodities", label="Gold / Commodities"),
            QuestionOption(value="liquid_funds", label="Liquid Funds / Savings"),
        ],
        show_if={"investment_experience": "beginner,intermediate,advanced"},
    ),
    # Step 6: Risk Attitude
    Question(
        id="loss_tolerance",
        step=6,
        text="If your portfolio dropped 20% in a month, what would you do?",
        type="select",
        options=[
            QuestionOption(value="low", label="Sell everything to prevent further loss"),
            QuestionOption(value="moderate", label="Hold and wait for recovery"),
            QuestionOption(value="high", label="Buy more at lower prices"),
        ],
    ),
    Question(
        id="investment_horizon_years",
        step=6,
        text="What is your investment time horizon (in years)?",
        type="number",
    ),
]


def get_questions() -> list[Question]:
    return QUESTIONS


def map_responses_to_profile(responses: dict) -> dict:
    """Convert questionnaire responses to financial profile fields."""
    investments = {}
    raw_investments = responses.get("existing_investments", [])
    if isinstance(raw_investments, list):
        for asset in raw_investments:
            investments[asset] = True

    return {
        "monthly_income": float(responses.get("monthly_income", 0)),
        "monthly_expenses": float(responses.get("monthly_expenses", 0)),
        "monthly_savings": float(responses.get("monthly_savings", 0)),
        "total_liabilities": float(responses.get("total_liabilities", 0)),
        "emergency_fund_months": int(responses.get("emergency_fund_months", 0)),
        "existing_investments": investments,
        "life_stage": responses.get("life_stage", "early_career"),
        "dependents_count": int(responses.get("dependents_count", 0)),
        "investment_horizon_years": int(responses.get("investment_horizon_years", 5)),
        "investment_experience": responses.get("investment_experience", "none"),
        "loss_tolerance": responses.get("loss_tolerance", "moderate"),
        "questionnaire_responses": responses,
    }
