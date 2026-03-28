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

    return (
        "I can help with SIP, mutual funds, stocks, tax planning, retirement, "
        "and your risk profile. Try asking something like 'What is SIP?' or 'Tell me about my risk profile'."
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
