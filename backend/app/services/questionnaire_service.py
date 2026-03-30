from app.schemas.questionnaire import Question, QuestionOption

QUESTIONS = [
    # Step 1: Personal Info
    Question(
        id="life_stage",
        step=1,
        text="What best describes your current life stage?",
        hint="This helps us tailor advice to your situation — a student's needs are very different from someone about to retire.",
        type="select",
        options=[
            QuestionOption(value="student", label="Student (still studying or just graduated)"),
            QuestionOption(value="early_career", label="Early Career (22-35, building your career)"),
            QuestionOption(value="family", label="Family / Married (managing household & kids)"),
            QuestionOption(value="pre_retirement", label="Pre-Retirement (50+, planning to retire soon)"),
        ],
    ),
    Question(
        id="dependents_count",
        step=1,
        text="How many people depend on you financially?",
        hint="Count family members who rely on your income — spouse, children, parents, etc. Enter 0 if none.",
        type="number",
    ),
    # Step 2: Income & Expenses
    Question(
        id="monthly_income",
        step=2,
        text="What is your monthly income (after tax)?",
        hint="Your take-home salary or total monthly earnings after tax deductions. Include all sources — salary, freelance, rent, etc.",
        type="number",
    ),
    Question(
        id="monthly_expenses",
        step=2,
        text="What are your total monthly expenses?",
        hint="Add up everything you spend in a month — rent, groceries, bills, transport, dining out, subscriptions, EMIs, etc.",
        type="number",
    ),
    Question(
        id="monthly_savings",
        step=2,
        text="How much do you save per month?",
        hint="The amount left over after all expenses. If you're not sure, subtract your expenses from your income above.",
        type="number",
    ),
    # Step 3: Liabilities
    Question(
        id="total_liabilities",
        step=3,
        text="What is your total outstanding debt?",
        hint="Add up all money you owe — home loan, car loan, education loan, personal loan, credit card balances, etc. Enter 0 if you have no debt.",
        type="number",
    ),
    # Step 4: Emergency Fund
    Question(
        id="emergency_fund_months",
        step=4,
        text="How many months could you survive without income?",
        hint="If you lost your job today, how many months could your savings cover your expenses? This is your emergency fund. For example, if you spend Rs. 30,000/month and have Rs. 90,000 saved, that's 3 months.",
        type="number",
    ),
    # Step 5: Investment Experience
    Question(
        id="investment_experience",
        step=5,
        text="How would you describe your investment experience?",
        hint="Be honest — there's no wrong answer! This helps us explain things at the right level for you.",
        type="select",
        options=[
            QuestionOption(value="none", label="Complete beginner (never invested before)"),
            QuestionOption(value="beginner", label="Beginner (started FDs, SIPs, or savings schemes in the last 2 years)"),
            QuestionOption(value="intermediate", label="Intermediate (2-5 years of investing in mutual funds, stocks, etc.)"),
            QuestionOption(value="advanced", label="Advanced (5+ years, comfortable with stocks, derivatives, and portfolio management)"),
        ],
    ),
    Question(
        id="existing_investments",
        step=5,
        text="What types of investments do you currently have?",
        hint="Select all that apply. Don't worry if you're not sure about the categories — just pick what sounds familiar.",
        type="multi_select",
        required=False,
        options=[
            QuestionOption(value="equity_large_cap", label="Large company stocks or mutual funds (e.g., Nifty 50, bluechip funds)"),
            QuestionOption(value="equity_mid_cap", label="Medium company stocks or mid-cap funds"),
            QuestionOption(value="equity_small_cap", label="Small company stocks or small-cap funds"),
            QuestionOption(value="debt", label="Fixed income (FDs, PPF, bonds, debt mutual funds)"),
            QuestionOption(value="gold_commodities", label="Gold (physical, digital, SGBs, or Gold ETFs)"),
            QuestionOption(value="liquid_funds", label="Savings account or liquid/money market funds"),
        ],
        show_if={"investment_experience": "beginner,intermediate,advanced"},
    ),
    # Step 6: Risk Attitude
    Question(
        id="loss_tolerance",
        step=6,
        text="Imagine you invested Rs. 1,00,000 and it dropped to Rs. 80,000 in one month. What would you do?",
        hint="There's no right or wrong answer. This helps us understand your comfort level with risk. Markets go up and down — what matters is how you'd react.",
        type="select",
        options=[
            QuestionOption(value="low", label="Sell and move to safer options — I can't afford to lose more"),
            QuestionOption(value="moderate", label="Do nothing and wait — markets usually recover over time"),
            QuestionOption(value="high", label="Invest more — this is a chance to buy at a discount!"),
        ],
    ),
    Question(
        id="investment_horizon_years",
        step=6,
        text="How many years can you keep this money invested?",
        hint="Think about when you'll need this money. For retirement, it could be 20-30 years. For a house down payment, maybe 3-5 years. Longer time = more growth potential.",
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
