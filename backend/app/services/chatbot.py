"""
AI-powered Conversational Financial Advisor using Google Gemini.

Uses the user's financial profile, risk assessment, and portfolio data
to provide personalized investment guidance via Gemini LLM.
Falls back to rule-based responses if the API key is missing or API fails.
"""

import logging
import google.generativeai as genai

from app.config import settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are an expert Indian financial advisor chatbot for a portfolio advisory platform. Your role is to provide personalized, actionable investment guidance.

RULES:
- Keep responses concise (3-6 sentences) unless the user asks for detailed explanations.
- Use Indian financial context: INR (Rs.), Indian tax laws (80C, 80D, ELSS, LTCG/STCG), Indian instruments (PPF, NPS, EPF, SGBs, FDs).
- When the user asks about their profile or risk, use the EXACT data from the user context below — do not invent numbers.
- Tailor advice to the user's risk category, life stage, and financial situation.
- Be encouraging but honest. If their savings ratio is low or they lack an emergency fund, mention it constructively.
- End responses with a brief actionable next step when appropriate.
- Never recommend specific stocks or funds by name. Recommend categories/types instead.
- Always clarify that this is educational guidance, not certified financial advice.
- Format responses in plain text with markdown bold (**text**) for emphasis where helpful.
- Respond in the same language the user writes in (English or Hinglish).
- If the user's message is a greeting, respond warmly and suggest what you can help with.
- If asked about something outside finance/investing, politely redirect to financial topics.

{user_context}"""


def _build_user_context(context: dict) -> str:
    """Build the user context section for the system prompt."""
    parts = []

    name = context.get("user_name", "there")
    parts.append(f"User's name: {name}")

    if context.get("life_stage"):
        stages = {
            "student": "Student",
            "early_career": "Early Career Professional",
            "family": "Family / Mid-Career",
            "pre_retirement": "Pre-Retirement",
        }
        parts.append(f"Life stage: {stages.get(context['life_stage'], context['life_stage'])}")

    if context.get("monthly_income"):
        parts.append(f"Monthly income: Rs. {context['monthly_income']:,.0f}")
    if context.get("monthly_expenses"):
        parts.append(f"Monthly expenses: Rs. {context['monthly_expenses']:,.0f}")
    if context.get("monthly_savings"):
        parts.append(f"Monthly savings: Rs. {context['monthly_savings']:,.0f}")
    if context.get("savings_ratio") is not None:
        parts.append(f"Savings ratio: {context['savings_ratio']:.0%}")
    if context.get("liability_ratio") is not None:
        parts.append(f"Liability-to-income ratio: {context['liability_ratio']:.2f}")
    if context.get("emergency_fund_months") is not None:
        parts.append(f"Emergency fund: {context['emergency_fund_months']} months of expenses")
    if context.get("investment_experience"):
        parts.append(f"Investment experience: {context['investment_experience']}")
    if context.get("investment_horizon"):
        parts.append(f"Investment horizon: {context['investment_horizon']} years")
    if context.get("risk_score") is not None:
        parts.append(f"Risk score: {context['risk_score']:.0f}/100 ({context.get('risk_category', 'moderate')})")

    if len(parts) <= 1:
        parts.append("No financial profile available yet. The user hasn't completed the questionnaire.")

    return "USER CONTEXT:\n" + "\n".join(f"- {p}" for p in parts)


def _get_suggestions(message: str, context: dict) -> list[str]:
    """Generate contextual follow-up suggestions based on the conversation."""
    msg_lower = message.lower()

    if any(g in msg_lower for g in ["hello", "hi", "hey", "namaste"]):
        return [
            "What is my risk profile?",
            "Explain SIP investing",
            "How should I plan for retirement?",
            "How can I save tax?",
        ]

    if any(w in msg_lower for w in ["my profile", "my risk", "my score", "about me"]):
        return [
            "How can I improve my score?",
            "What investments suit my profile?",
            "How much should I save monthly?",
        ]

    if any(w in msg_lower for w in ["sip", "mutual fund"]):
        return ["How much SIP should I start?", "Index funds vs active funds?", "Explain compounding"]

    if any(w in msg_lower for w in ["tax", "80c", "elss"]):
        return ["Tell me about ELSS", "NPS tax benefits", "LTCG vs STCG rules"]

    if any(w in msg_lower for w in ["retire", "pension", "nps"]):
        return ["How much corpus do I need?", "NPS vs PPF?", "Explain the 25x rule"]

    if any(w in msg_lower for w in ["emergency", "safety net"]):
        return ["How much emergency fund do I need?", "Where to keep emergency fund?", "Liquid funds vs FD?"]

    if any(w in msg_lower for w in ["gold", "sgb"]):
        return ["How to buy SGBs?", "Gold vs equity long term?", "How much gold in portfolio?"]

    if any(w in msg_lower for w in ["loan", "emi", "debt", "credit card"]):
        return ["Should I prepay my loan?", "How to get debt-free?", "EMI vs investing?"]

    if any(w in msg_lower for w in ["budget", "expense", "save more", "saving"]):
        return ["How to save more?", "What is the 50-30-20 rule?", "How to track expenses?"]

    if any(w in msg_lower for w in ["fd", "fixed deposit"]):
        return ["FD vs debt funds?", "Tax on FD interest?", "Best alternatives to FD?"]

    if any(w in msg_lower for w in ["index", "passive", "etf"]):
        return ["Best index fund to start?", "Index vs active funds?", "How to start SIP in index fund?"]

    if any(w in msg_lower for w in ["compound", "grow money"]):
        return ["Show me compounding example", "How to start SIP?", "Best long-term investments?"]

    if any(w in msg_lower for w in ["insurance", "term plan", "health"]):
        return ["How much term insurance?", "Health insurance tips", "ULIP vs mutual fund?"]

    if any(w in msg_lower for w in ["inflation", "real return"]):
        return ["Best inflation-beating investments?", "Gold as inflation hedge?", "Equity vs FD returns?"]

    if any(w in msg_lower for w in ["diversif", "asset allocation", "portfolio mix"]):
        return ["Ideal asset allocation for me?", "How to rebalance portfolio?", "What is portfolio risk?"]

    if any(w in msg_lower for w in ["ppf", "provident"]):
        return ["PPF vs ELSS?", "PPF interest rate?", "How to open PPF account?"]

    if any(w in msg_lower for w in ["invest", "start", "beginner", "new to"]):
        return ["How to start investing?", "Best investment for beginners?", "What is SIP?", "Index funds explained"]

    return [
        "What is my risk profile?",
        "How to start investing?",
        "Explain mutual funds",
        "How to save tax?",
    ]


# --- Fallback rule-based system (used when Gemini is unavailable) ---

KNOWLEDGE_BASE = {
    "sip": {
        "keywords": ["sip", "systematic", "investment plan", "monthly invest"],
        "response": (
            "A Systematic Investment Plan (SIP) allows you to invest a fixed amount regularly "
            "in mutual funds. Benefits include: rupee cost averaging, disciplined investing, "
            "and the power of compounding. Even small SIPs of Rs. 500/month can grow significantly over 10-20 years."
        ),
    },
    "mutual_funds": {
        "keywords": ["mutual fund", "mf", "fund house", "amc"],
        "response": (
            "Mutual funds pool money from many investors to invest in stocks, bonds, or other assets. "
            "Types include: Equity funds (higher risk, higher returns), Debt funds (lower risk, steady returns), "
            "Hybrid funds (mix of both), and Index funds (track market indices with low fees)."
        ),
    },
    "stocks": {
        "keywords": ["stock", "share", "equity", "nifty", "sensex"],
        "response": (
            "Stocks represent ownership in a company. They offer high return potential but with higher volatility. "
            "For beginners, index funds or large-cap stocks are generally safer starting points."
        ),
    },
    "tax": {
        "keywords": ["tax", "80c", "80d", "elss", "tax saving", "ltcg", "stcg"],
        "response": (
            "Tax-efficient investing: ELSS funds offer tax deduction under 80C (up to Rs. 1.5L) with "
            "3-year lock-in. NPS offers additional Rs. 50K deduction under 80CCD(1B). "
            "Always consider post-tax returns when comparing investments."
        ),
    },
    "retirement": {
        "keywords": ["retire", "pension", "nps", "epf", "old age"],
        "response": (
            "Retirement planning rule of thumb: You need 25-30x your annual expenses as a corpus. "
            "Options: EPF, NPS, PPF, and Equity MFs for long-term growth. Start early — "
            "starting at 25 vs 35 can mean 2-3x more corpus due to compounding."
        ),
    },
    "emergency_fund": {
        "keywords": ["emergency", "rainy day", "safety net", "contingency"],
        "response": (
            "An emergency fund should cover 3-6 months of expenses, kept in liquid instruments like "
            "savings accounts, liquid mutual funds, or short-term FDs. This protects your long-term "
            "investments from being withdrawn during unexpected events."
        ),
    },
    "fd": {
        "keywords": ["fd", "fixed deposit", "bank deposit", "recurring deposit", "rd"],
        "response": (
            "Fixed Deposits (FDs) offer guaranteed returns with low risk. Current rates are around 6-7% p.a. "
            "for most banks. Tax-saving FDs under 80C have a 5-year lock-in. For better post-tax returns, "
            "consider debt mutual funds if your tax bracket is high."
        ),
    },
    "gold": {
        "keywords": ["gold", "sgb", "sovereign gold", "gold bond", "gold etf"],
        "response": (
            "Gold is a good portfolio diversifier and inflation hedge. Sovereign Gold Bonds (SGBs) "
            "offer 2.5% annual interest plus gold price appreciation, with tax-free capital gains at maturity. "
            "Gold ETFs and digital gold are convenient alternatives to physical gold."
        ),
    },
    "ppf": {
        "keywords": ["ppf", "public provident", "provident fund"],
        "response": (
            "PPF is a government-backed savings scheme with a 15-year lock-in. It offers tax-free returns "
            "(currently ~7.1% p.a.), qualifies for 80C deduction, and is ideal for risk-averse investors. "
            "You can invest Rs. 500 to Rs. 1.5L per year."
        ),
    },
    "insurance": {
        "keywords": ["insurance", "term plan", "life cover", "health insurance", "lic"],
        "response": (
            "Term insurance is essential — aim for 10-15x your annual income as cover. Health insurance "
            "should cover at least Rs. 5-10L per family member. Premiums qualify for tax deduction under "
            "80C (life) and 80D (health). Avoid mixing insurance with investment (ULIPs/endowment plans)."
        ),
    },
    "inflation": {
        "keywords": ["inflation", "purchasing power", "price rise", "real return"],
        "response": (
            "India's long-term inflation averages 5-6%. Your investments should earn above this rate "
            "to grow in real terms. FDs at 6% barely beat inflation after tax. Equity, over the long term, "
            "has historically delivered 10-12% returns in India, making it a strong inflation-beater."
        ),
    },
    "budget": {
        "keywords": ["budget", "expense", "spend", "save more", "saving", "cut cost"],
        "response": (
            "The 50-30-20 rule is a good starting point: 50% for needs, 30% for wants, and 20% for "
            "savings/investments. Track your expenses for a month to identify leaks. Automate your "
            "investments via SIPs right after salary credit — pay yourself first."
        ),
    },
    "debt": {
        "keywords": ["debt", "loan", "emi", "borrow", "credit card", "liability"],
        "response": (
            "Prioritize paying off high-interest debt (credit cards at 30-40% APR) before investing. "
            "For home loans, the interest is tax-deductible under Section 24 (up to Rs. 2L). "
            "Keep your total EMIs under 40% of income. Consider the debt avalanche method — "
            "pay minimums on all debts, then put extra towards the highest-interest one."
        ),
    },
    "index_fund": {
        "keywords": ["index fund", "index", "passive", "etf", "nifty 50", "nifty50"],
        "response": (
            "Index funds track a market index like Nifty 50 or Sensex with very low expense ratios "
            "(0.1-0.2%). They offer broad market exposure and have historically outperformed most "
            "active funds over long periods. A Nifty 50 index fund SIP is an excellent starting point "
            "for new investors."
        ),
    },
    "compound": {
        "keywords": ["compound", "compounding", "power of compounding", "grow money"],
        "response": (
            "Compounding is earning returns on your returns — it's the most powerful force in investing. "
            "Rs. 10,000/month SIP at 12% grows to ~Rs. 1 Cr in 20 years (you invest only Rs. 24L). "
            "The key is to start early, stay consistent, and let time do the heavy lifting."
        ),
    },
    "diversify": {
        "keywords": ["diversif", "asset allocation", "portfolio mix", "spread risk", "allocat"],
        "response": (
            "Diversification reduces risk by spreading investments across asset classes. A balanced portfolio "
            "might include: equity (for growth), debt (for stability), gold (for inflation hedge), and "
            "liquid funds (for emergencies). The right mix depends on your age, risk tolerance, and goals."
        ),
    },
}


def _fallback_response(message: str, context: dict) -> str:
    """Rule-based fallback when Gemini is unavailable."""
    msg_lower = message.lower().strip()

    if any(g in msg_lower for g in ["hello", "hi", "hey", "namaste"]):
        name = context.get("user_name", "there")
        return (
            f"Hello {name}! I'm your financial advisor assistant. "
            "I can help you understand investments, explain your risk profile, "
            "and answer questions about financial planning. What would you like to know?"
        )

    if any(w in msg_lower for w in ["my profile", "my risk", "my score", "about me"]):
        parts = []
        if context.get("risk_score"):
            parts.append(f"Risk score: **{context['risk_score']:.0f}/100** ({context.get('risk_category', 'moderate')})")
        if context.get("monthly_savings"):
            parts.append(f"Monthly savings: **Rs. {context['monthly_savings']:,.0f}**")
        if parts:
            return "Here's your profile:\n" + "\n".join(f"- {p}" for p in parts)
        return "Complete the questionnaire first for personalized advice."

    for data in KNOWLEDGE_BASE.values():
        if any(kw in msg_lower for kw in data["keywords"]):
            return data["response"]

    # Try partial matching for broader coverage
    if any(w in msg_lower for w in ["invest", "start", "begin", "new", "how to"]):
        return (
            "Great question! Here's a simple way to start investing:\n"
            "1. **Build an emergency fund** (3-6 months of expenses) in liquid funds or savings account\n"
            "2. **Get term + health insurance** before investing\n"
            "3. **Start a SIP** in an index fund (like Nifty 50) — even Rs. 500/month is a good start\n"
            "4. **Use 80C limit** (Rs. 1.5L) via ELSS/PPF for tax savings\n"
            "The key is to start early and stay consistent!"
        )

    if any(w in msg_lower for w in ["what", "how", "why", "when", "should", "can", "which", "tell", "explain"]):
        name = context.get("user_name", "there")
        return (
            f"That's a great question, {name}! While I work best with specific financial topics, "
            "here are areas I can help you with:\n"
            "- **Investments**: SIP, mutual funds, stocks, index funds, gold, FDs\n"
            "- **Planning**: Retirement, emergency fund, budgeting, insurance\n"
            "- **Tax**: 80C, 80D, ELSS, LTCG/STCG, NPS benefits\n"
            "- **Your profile**: Risk assessment, savings analysis, portfolio review\n"
            "Try asking about any of these topics!"
        )

    name = context.get("user_name", "there")
    return (
        f"Hi {name}! I'm your financial advisor assistant. I can help you with:\n"
        "- **SIP & mutual funds** — how they work, how much to invest\n"
        "- **Tax planning** — 80C, ELSS, NPS, and more\n"
        "- **Retirement planning** — corpus calculation, PPF vs NPS\n"
        "- **Your risk profile** — understanding your score and recommendations\n"
        "- **Budgeting** — saving more, managing debt, emergency funds\n"
        "What would you like to know?"
    )


def generate_response(message: str, context: dict) -> dict:
    """
    Generate a chatbot response using Gemini LLM with financial context.
    Falls back to rule-based responses if Gemini is unavailable.
    """
    suggestions = _get_suggestions(message, context)

    if not settings.GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY not set — using fallback rule-based responses")
        return {
            "response": _fallback_response(message, context),
            "suggestions": suggestions,
            "type": "fallback",
        }

    try:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        user_context = _build_user_context(context)
        system_instruction = SYSTEM_PROMPT.format(user_context=user_context)

        model = genai.GenerativeModel(
            model_name="gemini-2.5-flash",
            system_instruction=system_instruction,
            generation_config=genai.GenerationConfig(
                temperature=0.7,
                max_output_tokens=512,
            ),
        )

        response = model.generate_content(message)

        return {
            "response": response.text,
            "suggestions": suggestions,
            "type": "ai",
        }

    except Exception as e:
        logger.error(f"Gemini API error: {e}")
        return {
            "response": _fallback_response(message, context),
            "suggestions": suggestions,
            "type": "fallback",
        }
