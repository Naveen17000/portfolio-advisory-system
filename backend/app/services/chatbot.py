"""
Context-aware Conversational AI Assistant.
Uses the user's financial profile, risk assessment, and portfolio data
to provide personalized investment guidance.

This is a rule-based + template NLP approach (no external LLM API needed).
Uses keyword matching and context injection for responses.
"""

import re
from datetime import datetime


# Knowledge base of investment topics
KNOWLEDGE_BASE = {
    "sip": {
        "keywords": ["sip", "systematic", "investment plan", "monthly invest"],
        "response": (
            "A Systematic Investment Plan (SIP) allows you to invest a fixed amount regularly "
            "in mutual funds. Benefits include: rupee cost averaging (buying more units when "
            "prices are low), disciplined investing, and the power of compounding. "
            "Even small SIPs of Rs. 500/month can grow significantly over 10-20 years."
        ),
    },
    "mutual_funds": {
        "keywords": ["mutual fund", "mf", "fund house", "amc"],
        "response": (
            "Mutual funds pool money from many investors to invest in stocks, bonds, or other assets. "
            "Types include: Equity funds (higher risk, higher returns), Debt funds (lower risk, steady returns), "
            "Hybrid funds (mix of both), and Index funds (track market indices with low fees). "
            "Choose based on your risk profile and investment horizon."
        ),
    },
    "stocks": {
        "keywords": ["stock", "share", "equity", "nifty", "sensex", "bse", "nse"],
        "response": (
            "Stocks represent ownership in a company. They offer high return potential but with higher volatility. "
            "Key metrics to evaluate: P/E ratio, EPS growth, debt-to-equity, ROE, and dividend yield. "
            "For beginners, index funds or large-cap stocks are generally safer starting points."
        ),
    },
    "debt": {
        "keywords": ["debt", "bond", "fixed income", "fd", "fixed deposit", "ppf"],
        "response": (
            "Debt instruments provide fixed or predictable returns with lower risk. Options include: "
            "Fixed Deposits (guaranteed returns), PPF (tax-free, 15-year lock-in), Government Bonds "
            "(sovereign guarantee), and Debt Mutual Funds (more liquid, tax-efficient for 3+ years)."
        ),
    },
    "gold": {
        "keywords": ["gold", "commodity", "precious metal", "sgb", "sovereign gold"],
        "response": (
            "Gold serves as a hedge against inflation and market downturns. Investment options: "
            "Sovereign Gold Bonds (SGBs) offer 2.5% annual interest + gold price appreciation, "
            "Gold ETFs track gold prices with high liquidity, and Digital Gold for small amounts. "
            "Typically, 5-15% of portfolio in gold is recommended."
        ),
    },
    "tax": {
        "keywords": ["tax", "80c", "80d", "elss", "tax saving", "ltcg", "stcg"],
        "response": (
            "Tax-efficient investing: ELSS funds offer tax deduction under 80C (up to Rs. 1.5L) with "
            "3-year lock-in. Equity held > 1 year: LTCG taxed at 10% above Rs. 1L. "
            "Debt funds > 3 years: indexed LTCG at 20%. NPS offers additional Rs. 50K deduction under 80CCD(1B). "
            "Always consider post-tax returns when comparing investments."
        ),
    },
    "emergency_fund": {
        "keywords": ["emergency", "rainy day", "contingency", "safety net"],
        "response": (
            "An emergency fund should cover 6-12 months of expenses. Keep it in high-liquidity instruments: "
            "Savings account, Liquid mutual funds, or Short-term FDs. Don't invest your emergency fund "
            "in stocks or long-term instruments — the goal is instant access, not high returns."
        ),
    },
    "retirement": {
        "keywords": ["retire", "pension", "nps", "epf", "old age"],
        "response": (
            "Retirement planning rule of thumb: You need 25-30x your annual expenses as a corpus. "
            "Options: EPF (employer match = free money), NPS (tax benefits + market-linked), "
            "PPF (guaranteed returns), and Equity MFs for long-term growth. Start early — "
            "starting at 25 vs 35 can mean 2-3x more corpus due to compounding."
        ),
    },
    "risk": {
        "keywords": ["risk", "volatile", "loss", "crash", "bear market", "drawdown"],
        "response": (
            "Investment risk is the chance of losing money. Types: Market risk (overall market decline), "
            "Credit risk (borrower default), Liquidity risk (can't sell quickly), Inflation risk "
            "(returns < inflation). Manage risk through: diversification, asset allocation matching "
            "your profile, and maintaining a long-term perspective."
        ),
    },
    "diversification": {
        "keywords": ["diversif", "spread", "don't put all eggs", "asset allocation"],
        "response": (
            "Diversification reduces risk by spreading investments across different asset classes, "
            "sectors, and geographies. A well-diversified portfolio might include: Large-cap equity "
            "for stability, Mid/Small-cap for growth, Debt for income, Gold for hedging, and "
            "International funds for geographic diversification."
        ),
    },
    "inflation": {
        "keywords": ["inflation", "purchasing power", "real return", "cpi"],
        "response": (
            "Inflation erodes purchasing power — Rs. 100 today buys less tomorrow. India's average "
            "inflation is 5-6%. Your investments must beat inflation to grow real wealth. "
            "Equity (10-15% returns) beats inflation well; FDs (6-7%) barely keep up. "
            "Always think in real returns (nominal return minus inflation)."
        ),
    },
    "compound": {
        "keywords": ["compound", "compounding", "8th wonder", "exponential"],
        "response": (
            "Compounding is earning returns on your returns. Example: Rs. 10,000/month SIP at 12% "
            "for 20 years = Rs. 1 Cr (invested only Rs. 24L). The key variables: amount, rate, and "
            "TIME. Starting 5 years earlier can add 40-60% more to your final corpus. "
            "Einstein reportedly called it the 8th wonder of the world."
        ),
    },
}

# Greeting patterns
GREETINGS = ["hello", "hi", "hey", "good morning", "good afternoon", "good evening", "namaste"]
THANKS = ["thank", "thanks", "thx", "appreciate"]


def _match_topic(message: str) -> str | None:
    """Match user message to a knowledge base topic."""
    msg_lower = message.lower()
    best_match = None
    best_score = 0

    for topic, data in KNOWLEDGE_BASE.items():
        score = sum(1 for kw in data["keywords"] if kw.lower() in msg_lower)
        if score > best_score:
            best_score = score
            best_match = topic

    return best_match if best_score > 0 else None


def _personalize_response(base_response: str, context: dict) -> str:
    """Add personalization based on user context."""
    additions = []

    risk_cat = context.get("risk_category")
    life_stage = context.get("life_stage")

    if risk_cat == "conservative":
        additions.append(
            "Given your conservative risk profile, focus on the lower-risk options mentioned above."
        )
    elif risk_cat == "aggressive":
        additions.append(
            "With your aggressive risk profile, you can consider the higher-growth options, "
            "but always maintain some allocation to stable assets."
        )

    if life_stage == "student":
        additions.append("As a student, even small regular investments will benefit hugely from compounding over time.")
    elif life_stage == "pre_retirement":
        additions.append("At your life stage, capital preservation should be a priority alongside moderate growth.")

    if additions:
        return base_response + "\n\n**For you specifically:** " + " ".join(additions)
    return base_response


def _build_profile_summary(context: dict) -> str:
    """Build a summary of the user's financial profile for context-aware responses."""
    parts = []

    if context.get("risk_score"):
        parts.append(f"Your risk score is **{context['risk_score']:.0f}/100** ({context.get('risk_category', 'moderate')})")

    if context.get("life_stage"):
        stages = {"student": "Student", "early_career": "Early Career", "family": "Family", "pre_retirement": "Pre-Retirement"}
        parts.append(f"Life stage: **{stages.get(context['life_stage'], context['life_stage'])}**")

    if context.get("monthly_savings"):
        parts.append(f"Monthly savings: **Rs. {context['monthly_savings']:,.0f}**")

    if context.get("investment_horizon"):
        parts.append(f"Investment horizon: **{context['investment_horizon']} years**")

    if context.get("portfolio_return_min") and context.get("portfolio_return_max"):
        parts.append(f"Expected portfolio return: **{context['portfolio_return_min']}% - {context['portfolio_return_max']}%**")

    if parts:
        return "Here's what I know about you:\n" + "\n".join(f"- {p}" for p in parts)
    return "I don't have your financial profile yet. Complete the questionnaire for personalized advice."


def generate_response(message: str, context: dict) -> dict:
    """
    Generate a chatbot response based on user message and financial context.

    Args:
        message: User's chat message
        context: Dict with user's financial data (risk_score, life_stage, etc.)

    Returns:
        Dict with response text and metadata
    """
    msg_lower = message.lower().strip()

    # Handle greetings
    if any(g in msg_lower for g in GREETINGS):
        name = context.get("user_name", "there")
        return {
            "response": (
                f"Hello {name}! I'm your financial advisor assistant. "
                "I can help you understand investments, explain your risk profile, "
                "and answer questions about financial planning. What would you like to know?"
            ),
            "type": "greeting",
            "suggestions": [
                "What is my risk profile?",
                "Explain SIP investing",
                "How should I plan for retirement?",
                "What is diversification?",
            ],
        }

    # Handle thanks
    if any(t in msg_lower for t in THANKS):
        return {
            "response": "You're welcome! Feel free to ask anything else about investing or your portfolio.",
            "type": "thanks",
            "suggestions": [],
        }

    # Handle profile query
    if any(w in msg_lower for w in ["my profile", "my risk", "my score", "my portfolio", "about me"]):
        summary = _build_profile_summary(context)
        response = summary

        if context.get("risk_category"):
            cat = context["risk_category"]
            advice = {
                "conservative": "Your conservative profile suggests focusing on debt instruments, large-cap funds, and gold for stability.",
                "moderate": "Your moderate profile allows a balanced mix of equity and debt for growth with reasonable safety.",
                "aggressive": "Your aggressive profile supports higher equity allocation for long-term wealth creation.",
            }
            response += "\n\n**Recommendation:** " + advice.get(cat, "")

        return {
            "response": response,
            "type": "profile",
            "suggestions": [
                "How can I improve my risk score?",
                "What investments suit my profile?",
                "Run a Monte Carlo simulation",
            ],
        }

    # Handle improvement questions
    if any(w in msg_lower for w in ["improve", "increase score", "better score", "raise my"]):
        tips = []
        if context.get("emergency_fund_months", 0) < 6:
            tips.append("Build your emergency fund to 6+ months of expenses")
        if context.get("savings_ratio", 0) < 0.2:
            tips.append("Increase your savings rate — aim for at least 20% of income")
        if context.get("liability_ratio", 0) > 1:
            tips.append("Focus on reducing liabilities to improve your risk capacity")
        if context.get("investment_experience") in ("none", "beginner"):
            tips.append("Gain more investment experience by starting with index funds or SIPs")
        if not tips:
            tips = [
                "Maintain consistent savings habits",
                "Diversify across more asset classes",
                "Increase your investment horizon if possible",
                "Build a stronger emergency fund",
            ]

        return {
            "response": "Here are personalized tips to strengthen your financial profile:\n\n"
                + "\n".join(f"{i+1}. {t}" for i, t in enumerate(tips))
                + "\n\nSmall consistent improvements compound over time, just like investments!",
            "type": "advice",
            "suggestions": ["What is my current profile?", "Explain compounding"],
        }

    # Match to knowledge base
    topic = _match_topic(message)
    if topic:
        base = KNOWLEDGE_BASE[topic]["response"]
        personalized = _personalize_response(base, context)
        return {
            "response": personalized,
            "type": "education",
            "topic": topic,
            "suggestions": _get_related_suggestions(topic),
        }

    # Default fallback
    return {
        "response": (
            "I can help you with topics like:\n\n"
            "- **SIP & Mutual Funds** — how they work, which types to choose\n"
            "- **Stocks & Equity** — basics of stock investing\n"
            "- **Risk & Diversification** — managing investment risk\n"
            "- **Tax Planning** — tax-efficient investing (80C, ELSS, LTCG)\n"
            "- **Retirement Planning** — building your retirement corpus\n"
            "- **Your Profile** — understanding your risk score and portfolio\n\n"
            "Try asking something like *'What is SIP?'* or *'Tell me about my risk profile'*."
        ),
        "type": "help",
        "suggestions": [
            "What is my risk profile?",
            "Explain mutual funds",
            "How to save tax on investments?",
            "Tell me about gold investing",
        ],
    }


def _get_related_suggestions(topic: str) -> list[str]:
    """Get related topic suggestions."""
    related = {
        "sip": ["What are mutual funds?", "Explain compounding", "What is my risk profile?"],
        "mutual_funds": ["Tell me about SIP", "How to diversify?", "What about index funds?"],
        "stocks": ["How to manage risk?", "What is diversification?", "Tell me about mutual funds"],
        "debt": ["What about PPF?", "How to save tax?", "What is my risk profile?"],
        "gold": ["How to diversify?", "Tell me about inflation", "What is SGB?"],
        "tax": ["What is ELSS?", "Tell me about NPS", "How to plan for retirement?"],
        "emergency_fund": ["How much should I save?", "Where to park emergency fund?", "What is my profile?"],
        "retirement": ["What is NPS?", "Explain compounding", "How much corpus do I need?"],
        "risk": ["How to diversify?", "What is my risk score?", "Tell me about safe investments"],
        "diversification": ["What is asset allocation?", "Tell me about mutual funds", "What is my portfolio?"],
        "inflation": ["How to beat inflation?", "Tell me about equity", "What are real returns?"],
        "compound": ["Start a SIP", "Explain mutual funds", "How to plan for retirement?"],
    }
    return related.get(topic, ["What is my risk profile?", "Explain SIP", "How to diversify?"])
