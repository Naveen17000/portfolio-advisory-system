import asyncio
import json
import logging
import queue
import threading

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

import google.generativeai as genai

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.risk_assessment import RiskAssessment
from app.models.chat_message import ChatMessage
from app.services.profile_service import get_profile
from app.services.chatbot import generate_response, SYSTEM_PROMPT, _build_user_context, _get_suggestions, _fallback_response

logger = logging.getLogger(__name__)

router = APIRouter()


class ChatMessageRequest(BaseModel):
    message: str


@router.get("/history")
async def get_chat_history(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = 50,
):
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.user_id == user.id)
        .order_by(ChatMessage.created_at.desc())
        .limit(limit)
    )
    messages = result.scalars().all()
    return [
        {"role": m.role, "content": m.content, "created_at": m.created_at.isoformat()}
        for m in reversed(messages)
    ]


@router.post("/message")
async def chat(
    data: ChatMessageRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Save user message
    user_msg = ChatMessage(user_id=user.id, role="user", content=data.message)
    db.add(user_msg)
    await db.flush()

    # Build context from user's financial data
    parts = user.full_name.split() if user.full_name else []
    context = {"user_name": parts[0] if parts else "there"}

    profile = await get_profile(db, user.id)
    if profile:
        income = float(profile.monthly_income)
        context.update({
            "life_stage": profile.life_stage,
            "monthly_income": income,
            "monthly_expenses": float(profile.monthly_expenses),
            "monthly_savings": float(profile.monthly_savings),
            "savings_ratio": float(profile.monthly_savings) / income if income > 0 else 0,
            "liability_ratio": float(profile.total_liabilities) / (income * 12) if income > 0 else 0,
            "emergency_fund_months": profile.emergency_fund_months,
            "investment_experience": profile.investment_experience,
            "investment_horizon": profile.investment_horizon_years,
        })

    result = await db.execute(
        select(RiskAssessment)
        .where(RiskAssessment.user_id == user.id)
        .order_by(RiskAssessment.created_at.desc())
        .limit(1)
    )
    assessment = result.scalar_one_or_none()
    if assessment:
        context.update({
            "risk_score": float(assessment.overall_score),
            "risk_category": assessment.risk_category,
        })

    response = generate_response(data.message, context)

    # Save assistant response
    assistant_msg = ChatMessage(user_id=user.id, role="assistant", content=response["response"])
    db.add(assistant_msg)

    response["disclaimer"] = "This is for educational purposes only. Not financial advice."
    return response


async def _build_context(user: User, db: AsyncSession) -> dict:
    """Build user context dict from financial data (shared by /message and /stream)."""
    parts = user.full_name.split() if user.full_name else []
    context: dict = {"user_name": parts[0] if parts else "there"}

    profile = await get_profile(db, user.id)
    if profile:
        income = float(profile.monthly_income)
        context.update({
            "life_stage": profile.life_stage,
            "monthly_income": income,
            "monthly_expenses": float(profile.monthly_expenses),
            "monthly_savings": float(profile.monthly_savings),
            "savings_ratio": float(profile.monthly_savings) / income if income > 0 else 0,
            "liability_ratio": float(profile.total_liabilities) / (income * 12) if income > 0 else 0,
            "emergency_fund_months": profile.emergency_fund_months,
            "investment_experience": profile.investment_experience,
            "investment_horizon": profile.investment_horizon_years,
        })

    result = await db.execute(
        select(RiskAssessment)
        .where(RiskAssessment.user_id == user.id)
        .order_by(RiskAssessment.created_at.desc())
        .limit(1)
    )
    assessment = result.scalar_one_or_none()
    if assessment:
        context.update({
            "risk_score": float(assessment.overall_score),
            "risk_category": assessment.risk_category,
        })

    return context


@router.post("/stream")
async def chat_stream(
    data: ChatMessageRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """SSE streaming endpoint for real-time token-by-token chat responses."""
    # Save user message
    user_msg = ChatMessage(user_id=user.id, role="user", content=data.message)
    db.add(user_msg)
    await db.flush()

    # Build context
    context = await _build_context(user, db)
    suggestions = _get_suggestions(data.message, context)

    # Fallback if no API key
    if not settings.GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY not set — using fallback for stream endpoint")
        fallback_text = _fallback_response(data.message, context)
        assistant_msg = ChatMessage(user_id=user.id, role="assistant", content=fallback_text)
        db.add(assistant_msg)
        await db.commit()

        async def fallback_stream():
            yield f"data: {json.dumps({'token': fallback_text})}\n\n"
            yield f"data: {json.dumps({'suggestions': suggestions})}\n\n"
            yield "data: [DONE]\n\n"

        return StreamingResponse(fallback_stream(), media_type="text/event-stream")

    # Stream from Gemini using a background thread to avoid blocking the event loop
    user_context = _build_user_context(context)
    system_instruction = SYSTEM_PROMPT.format(user_context=user_context)

    # Use a thread-safe queue to pass chunks from the blocking Gemini call
    chunk_queue: queue.Queue[str | None] = queue.Queue()

    def _generate_in_thread():
        """Run the blocking Gemini streaming call in a separate thread."""
        try:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            model = genai.GenerativeModel(
                model_name="gemini-2.5-flash",
                system_instruction=system_instruction,
                generation_config=genai.GenerationConfig(
                    temperature=0.7,
                    max_output_tokens=1024,
                ),
            )
            response = model.generate_content(data.message, stream=True)
            for chunk in response:
                if chunk.text:
                    chunk_queue.put(chunk.text)
        except Exception as e:
            logger.error(f"Gemini streaming error: {e}")
            fallback_text = _fallback_response(data.message, context)
            chunk_queue.put(fallback_text)
        finally:
            chunk_queue.put(None)  # Sentinel to signal completion

    async def event_stream():
        full_response = ""
        # Start the blocking Gemini call in a background thread
        thread = threading.Thread(target=_generate_in_thread, daemon=True)
        thread.start()

        loop = asyncio.get_event_loop()
        while True:
            # Non-blocking read from the queue
            token = await loop.run_in_executor(None, chunk_queue.get)
            if token is None:
                break
            full_response += token
            yield f"data: {json.dumps({'token': token})}\n\n"

        # Send suggestions
        yield f"data: {json.dumps({'suggestions': suggestions})}\n\n"
        yield "data: [DONE]\n\n"

        # Save assistant response to DB
        assistant_msg = ChatMessage(user_id=user.id, role="assistant", content=full_response)
        db.add(assistant_msg)
        await db.commit()

    return StreamingResponse(event_stream(), media_type="text/event-stream")
