"""
Agent Service — "Your assistant (by AIV)" orchestration.

One assistant, four modes:
  ASSISTANT   — Platform questions, deal status, revenue, help (platform DB only)
  DIGITAL_SELF — Talent talks to their twin (ALCM API /generate)
  TRAINING    — Add info, find interviews, upload files (ALCM API /classify + web)
  REFINEMENT  — Direct correction, side-by-side comparison (ALCM API /attribute)

Mode transitions are fluid. Context preserved across switches.

Permission enforcement:
  - Talent: all four modes
  - Manager/team: ASSISTANT + TRAINING (submissions require talent approval)
  - Digital Self requires talent auth — team cannot enter

Context windows per mode (spec Section 6.6):
  - Digital Self: last 20 messages + twin personality summary
  - Training: current message + source content only
  - Refinement: current correction + original + last 5 messages
  - Assistant: last 10 messages, no ALCM call
"""

import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, AsyncGenerator, List
from uuid import UUID

from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.agent_session import AgentSession
from ..models.agent_message import AgentMessage
from ..models.twin import Twin
from ..models.guardrail_config import GuardrailConfig
from .alcm_client import get_alcm_client, ALCMError

logger = logging.getLogger(__name__)

VALID_MODES = {"ASSISTANT", "DIGITAL_SELF", "TRAINING", "REFINEMENT"}

# Roles that can enter Digital Self mode
DIGITAL_SELF_ROLES = {"TALENT", "ADMIN"}

ASSISTANT_SYSTEM_PROMPT = """You are the AIV assistant — a knowledgeable helper for managing digital twin identities on the AIV platform.

You help with:
- Platform questions (how AIV works, commission structure, deal lifecycle)
- Deal status and revenue queries
- Guidance on training and refining the digital twin
- File upload and onboarding help

Be professional, concise, and helpful. You represent AIV — identity infrastructure for the digital twin economy."""

SESSION_TIMEOUT_HOURS = 4


class AgentService:
    """Orchestrates the multi-mode assistant."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.alcm = get_alcm_client()

    # ------------------------------------------------------------------
    # Session management
    # ------------------------------------------------------------------

    async def create_session(self, user_id: UUID, twin_id: Optional[UUID] = None) -> AgentSession:
        """Create a new assistant session."""
        session = AgentSession(
            user_id=user_id,
            twin_id=twin_id,
            current_mode="ASSISTANT",
            auth_expires_at=datetime.now(timezone.utc) + timedelta(hours=SESSION_TIMEOUT_HOURS),
        )
        self.db.add(session)
        await self.db.flush()
        return session

    async def get_session(self, session_id: UUID) -> Optional[AgentSession]:
        result = await self.db.execute(
            select(AgentSession).where(AgentSession.id == session_id)
        )
        return result.scalar_one_or_none()

    async def get_active_sessions(self, user_id: UUID, limit: int = 10) -> List[AgentSession]:
        result = await self.db.execute(
            select(AgentSession)
            .where(AgentSession.user_id == user_id, AgentSession.ended_at.is_(None))
            .order_by(desc(AgentSession.last_activity_at))
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_session_messages(
        self, session_id: UUID, limit: int = 50, offset: int = 0
    ) -> List[AgentMessage]:
        result = await self.db.execute(
            select(AgentMessage)
            .where(AgentMessage.session_id == session_id)
            .order_by(AgentMessage.created_at)
            .offset(offset)
            .limit(limit)
        )
        return list(result.scalars().all())

    # ------------------------------------------------------------------
    # Mode switching
    # ------------------------------------------------------------------

    async def switch_mode(
        self, session: AgentSession, new_mode: str, user_role: str
    ) -> AgentSession:
        """Switch the session's mode with permission checking."""
        if new_mode not in VALID_MODES:
            raise ValueError(f"Invalid mode: {new_mode}. Valid: {VALID_MODES}")

        if new_mode == "DIGITAL_SELF" and user_role not in DIGITAL_SELF_ROLES:
            raise PermissionError("Only the talent can enter Digital Self mode.")

        session.current_mode = new_mode
        session.last_activity_at = datetime.now(timezone.utc)
        await self.db.flush()

        # Record the mode switch as a system message
        system_msg = AgentMessage(
            session_id=session.id,
            role="SYSTEM",
            mode_at_time=new_mode,
            content=f"Mode switched to {new_mode}",
        )
        self.db.add(system_msg)
        await self.db.flush()

        return session

    # ------------------------------------------------------------------
    # Message handling (non-streaming)
    # ------------------------------------------------------------------

    async def send_message(
        self, session: AgentSession, content: str, user_role: str = "TALENT"
    ) -> AgentMessage:
        """Send a message and get a response (non-streaming)."""
        mode = session.current_mode

        # Permission check
        if mode == "DIGITAL_SELF" and user_role not in DIGITAL_SELF_ROLES:
            raise PermissionError("Only the talent can use Digital Self mode.")

        # Record user message
        user_msg = AgentMessage(
            session_id=session.id,
            role="USER",
            mode_at_time=mode,
            content=content,
        )
        self.db.add(user_msg)
        await self.db.flush()

        # Generate response based on mode
        response_text = await self._generate_response(session, content, mode)

        # Record agent response
        agent_msg = AgentMessage(
            session_id=session.id,
            role="AGENT",
            mode_at_time=mode,
            content=response_text,
            actions=self._build_actions_log(mode),
        )
        self.db.add(agent_msg)
        session.last_activity_at = datetime.now(timezone.utc)
        await self.db.flush()

        return agent_msg

    # ------------------------------------------------------------------
    # Message handling (streaming)
    # ------------------------------------------------------------------

    async def send_message_stream(
        self, session: AgentSession, content: str, user_role: str = "TALENT"
    ) -> AsyncGenerator[str, None]:
        """Send a message and stream the response via SSE."""
        mode = session.current_mode

        if mode == "DIGITAL_SELF" and user_role not in DIGITAL_SELF_ROLES:
            raise PermissionError("Only the talent can use Digital Self mode.")

        # Record user message
        user_msg = AgentMessage(
            session_id=session.id,
            role="USER",
            mode_at_time=mode,
            content=content,
        )
        self.db.add(user_msg)
        await self.db.flush()

        # Stream response
        full_response = []
        async for chunk in self._stream_response(session, content, mode):
            full_response.append(chunk)
            yield chunk

        # Record full response
        agent_msg = AgentMessage(
            session_id=session.id,
            role="AGENT",
            mode_at_time=mode,
            content="".join(full_response),
            actions=self._build_actions_log(mode),
        )
        self.db.add(agent_msg)
        session.last_activity_at = datetime.now(timezone.utc)
        await self.db.flush()

    # ------------------------------------------------------------------
    # Mode-specific generation
    # ------------------------------------------------------------------

    async def _generate_response(self, session: AgentSession, content: str, mode: str) -> str:
        """Route to the correct backend based on mode."""
        if mode == "ASSISTANT":
            return await self._assistant_response(session, content)
        elif mode == "DIGITAL_SELF":
            return await self._digital_self_response(session, content)
        elif mode == "TRAINING":
            return await self._training_response(session, content)
        elif mode == "REFINEMENT":
            return await self._refinement_response(session, content)
        return "Unknown mode."

    async def _stream_response(
        self, session: AgentSession, content: str, mode: str
    ) -> AsyncGenerator[str, None]:
        """Stream from the correct backend based on mode."""
        if mode == "DIGITAL_SELF" and session.twin_id:
            twin = await self._get_twin(session.twin_id)
            if twin and twin.alcm_twin_id:
                guardrails = await self._get_active_guardrails(twin.id)
                conversation_history = await self._build_conversation_history(session.id, limit=20)
                async for chunk in self.alcm.generate_stream(
                    str(twin.alcm_twin_id),
                    context=content,
                    guardrails=guardrails,
                    mode="CONVERSATION",
                    conversation_history=conversation_history,
                    deployment_scope="TRAINING_AREA",
                ):
                    yield chunk
                # Submit implicit accept for the previous exchange
                await self._submit_implicit_accept(twin, session, content)
                return

        # Fallback: non-streaming for other modes
        response = await self._generate_response(session, content, mode)
        yield response

    async def _assistant_response(self, session: AgentSession, content: str) -> str:
        """ASSISTANT mode: platform DB + docs only. Uses Anthropic API directly (not ALCM)."""
        history = await self._get_recent_messages(session.id, limit=10)
        context = self._format_history(history)

        from ..config import get_settings
        settings = get_settings()

        # Use Anthropic API for assistant mode (platform LLM, not identity engine)
        if settings.anthropic_api_key:
            try:
                import httpx
                messages = []
                for msg in history:
                    if msg.role == "USER":
                        messages.append({"role": "user", "content": msg.content})
                    elif msg.role == "AGENT":
                        messages.append({"role": "assistant", "content": msg.content})
                messages.append({"role": "user", "content": content})

                async with httpx.AsyncClient(timeout=30) as client:
                    resp = await client.post(
                        "https://api.anthropic.com/v1/messages",
                        headers={
                            "x-api-key": settings.anthropic_api_key,
                            "anthropic-version": "2023-06-01",
                            "content-type": "application/json",
                        },
                        json={
                            "model": "claude-haiku-4-5-20251001",
                            "max_tokens": 1024,
                            "system": ASSISTANT_SYSTEM_PROMPT,
                            "messages": messages[-10:],  # Last 10 messages
                        },
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        return data.get("content", [{}])[0].get("text", "")
            except Exception as e:
                logger.warning(f"Anthropic API call failed, falling back to ALCM: {e}")

        # Fallback: try ALCM generate if Anthropic unavailable
        if session.twin_id:
            twin = await self._get_twin(session.twin_id)
            if twin and twin.alcm_twin_id:
                try:
                    prompt = f"{ASSISTANT_SYSTEM_PROMPT}\n\nConversation:\n{context}\n\nUser: {content}\n\nAssistant:"
                    return await self.alcm.generate(
                        str(twin.alcm_twin_id), prompt, guardrails={}, mode="assistant"
                    )
                except ALCMError:
                    pass

        return "I'm here to help with your AIV platform questions. Please try again in a moment."

    async def _digital_self_response(self, session: AgentSession, content: str) -> str:
        """DIGITAL_SELF mode: calls ALCM /generate with twin personality and conversation history."""
        if not session.twin_id:
            return "No twin is linked to this session. Please select a twin first."

        twin = await self._get_twin(session.twin_id)
        if not twin or not twin.alcm_twin_id:
            return "This twin doesn't have an ALCM identity record yet."

        guardrails = await self._get_active_guardrails(twin.id)
        conversation_history = await self._build_conversation_history(session.id, limit=20)

        result = await self.alcm.generate(
            str(twin.alcm_twin_id),
            context=content,
            guardrails=guardrails,
            mode="CONVERSATION",
            conversation_history=conversation_history,
            deployment_scope="TRAINING_AREA",
        )

        if isinstance(result, dict):
            response_text = result.get("response_text", "")
            # Submit implicit accept feedback for the previous exchange
            await self._submit_implicit_accept(twin, session, content)
            return response_text
        return str(result)

    async def _training_response(self, session: AgentSession, content: str) -> str:
        """TRAINING mode: classify → attribute chain. Current message only, no history."""
        if not session.twin_id:
            return "No twin linked to this session."

        twin = await self._get_twin(session.twin_id)
        if not twin or not twin.alcm_twin_id:
            return "This twin doesn't have an ALCM identity record yet."

        alcm_twin_id = str(twin.alcm_twin_id)

        # Step 1: Classify content
        classify_result = await self.alcm.classify(
            alcm_twin_id, content,
            contributor_type="TALENT",
            source_reliability=1.0,
        )

        if classify_result.get("_alcm_unavailable"):
            return "The identity engine is temporarily unavailable. Training content saved — it will be processed when the engine is back."

        categories = classify_result.get("categories_affected", [])
        psychographic_data_id = classify_result.get("psychographic_data_id")

        if not categories:
            return "I wasn't able to extract identity-relevant information from that. Could you provide more specific content — like an interview quote, a biography passage, or a description of your expertise?"

        # Step 2: Attribute — update dimensional scores from classified data
        if psychographic_data_id:
            top_category = categories[0] if isinstance(categories[0], str) else categories[0].get("category", "")
            top_confidence = categories[0].get("confidence", 0.5) if isinstance(categories[0], dict) else 0.5

            attr_result = await self.alcm.attribute(
                alcm_twin_id,
                {
                    "psychographic_data_id": psychographic_data_id,
                    "category": top_category,
                    "content_summary": content[:200],
                    "confidence": top_confidence,
                    "source_reliability": 1.0,
                },
            )

            updated = attr_result.get("sub_components_updated", [])
            core_updated = attr_result.get("personality_core_updated", False)

            # Build response with what was learned
            cat_names = [c if isinstance(c, str) else c.get("category", "") for c in categories]
            response = f"Content analyzed and applied. Categories: {', '.join(cat_names)}."
            if core_updated:
                response += " Your twin's personality model was updated."
            if updated:
                dims = [u.get("dimension", u) if isinstance(u, dict) else str(u) for u in updated[:3]]
                response += f" Dimensions affected: {', '.join(dims)}."

            # Step 3: Check coverage gaps and steer conversation
            response += await self._get_steering_suggestion(alcm_twin_id)

            return response

        cat_names = [c if isinstance(c, str) else c.get("category", "") for c in categories]
        return f"Content analyzed. Categories: {', '.join(cat_names)}. Would you like to add more?"

    async def _refinement_response(self, session: AgentSession, content: str) -> str:
        """REFINEMENT mode: direct correction via /attribute + /feedback."""
        if not session.twin_id:
            return "No twin linked to this session."

        twin = await self._get_twin(session.twin_id)
        if not twin or not twin.alcm_twin_id:
            return "This twin doesn't have an ALCM identity record yet."

        alcm_twin_id = str(twin.alcm_twin_id)

        # Build context: current correction + last 5 messages
        history = await self._get_recent_messages(session.id, limit=5)
        context_parts = [self._format_history(history)]
        context_parts.append(f"Refinement request: {content}")

        # Step 1: Apply correction via /attribute
        result = await self.alcm.attribute(
            alcm_twin_id,
            {
                "category": "REFINEMENT",
                "content_summary": content[:200],
                "confidence": 0.9,
                "source_reliability": 1.0,
            },
        )

        if result.get("_alcm_unavailable"):
            return "The identity engine is temporarily unavailable. Your correction has been saved and will be applied when the engine is back."

        # Step 2: Submit feedback with REFINEMENT type
        # Find the previous assistant message to reference as "original"
        original_response = ""
        for msg in reversed(history):
            if msg.role == "AGENT":
                original_response = msg.content
                break

        try:
            await self.alcm.submit_feedback(
                alcm_twin_id,
                interaction_id=str(session.id),
                feedback_type="REFINEMENT",
                signal={
                    "original_response": original_response,
                    "corrected_response": content,
                    "context": "\n".join(context_parts),
                },
            )
        except ALCMError as e:
            logger.warning(f"Feedback submission failed (non-blocking): {e}")

        updated = result.get("sub_components_updated", [])
        if updated:
            dims = [u.get("sub_component", str(u)) if isinstance(u, dict) else str(u) for u in updated[:3]]
            return f"Refinement applied to: {', '.join(dims)}. Your twin's identity has been updated."
        return "Correction noted and applied to your twin's profile."

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    async def _get_twin(self, twin_id: UUID) -> Optional[Twin]:
        result = await self.db.execute(select(Twin).where(Twin.id == twin_id))
        return result.scalar_one_or_none()

    async def _get_active_guardrails(self, twin_id: UUID) -> dict:
        result = await self.db.execute(
            select(GuardrailConfig)
            .where(GuardrailConfig.twin_id == twin_id, GuardrailConfig.is_active.is_(True))
            .order_by(desc(GuardrailConfig.version))
            .limit(1)
        )
        config = result.scalar_one_or_none()
        if not config:
            return {}
        return {
            "blocked_topics": config.blocked_topics or [],
            "humor_permitted": config.humor_permitted,
            "require_ai_disclosure": config.require_ai_disclosure,
            "disclosure_text": config.disclosure_text or "",
        }

    async def _get_recent_messages(self, session_id: UUID, limit: int = 10) -> List[AgentMessage]:
        result = await self.db.execute(
            select(AgentMessage)
            .where(AgentMessage.session_id == session_id)
            .order_by(desc(AgentMessage.created_at))
            .limit(limit)
        )
        messages = list(result.scalars().all())
        messages.reverse()  # Oldest first
        return messages

    async def _build_conversation_history(
        self, session_id: UUID, limit: int = 20
    ) -> List[dict]:
        """Build structured conversation_history for ALCM /generate.
        Returns: [{role: "user", content: "..."}, {role: "assistant", content: "..."}]
        """
        messages = await self._get_recent_messages(session_id, limit=limit)
        history = []
        for msg in messages:
            if msg.role == "USER":
                history.append({"role": "user", "content": msg.content})
            elif msg.role == "AGENT":
                history.append({"role": "assistant", "content": msg.content})
        return history

    async def _submit_implicit_accept(
        self, twin: Twin, session: AgentSession, current_content: str
    ) -> None:
        """Submit IMPLICIT_ACCEPT feedback when user continues without correcting.
        Called after each Digital Self exchange — the act of continuing implies
        the previous response was acceptable.
        """
        if not twin.alcm_twin_id:
            return
        try:
            await self.alcm.submit_feedback(
                str(twin.alcm_twin_id),
                interaction_id=str(session.id),
                feedback_type="IMPLICIT_ACCEPT",
                signal={"context": current_content[:200]},
            )
        except ALCMError as e:
            logger.debug(f"Implicit accept feedback failed (non-blocking): {e}")

    async def _get_steering_suggestion(self, alcm_twin_id: str) -> str:
        """Check coverage gaps and suggest what to train next."""
        try:
            health = await self.alcm.get_health(alcm_twin_id)
            if health.get("_alcm_unavailable"):
                return ""
            coverage = health.get("coverage", {})
            per_category = coverage.get("per_category", {})

            # Find categories below 30% coverage
            gaps = [cat for cat, score in per_category.items() if score < 30]
            if gaps:
                gap_names = ", ".join(gaps[:3])
                return f"\n\nI noticed your twin could use more depth in: {gap_names}. Want to share something about that?"
        except ALCMError:
            pass
        return ""

    def _format_history(self, messages: List[AgentMessage]) -> str:
        lines = []
        for msg in messages:
            role = "User" if msg.role == "USER" else "Assistant"
            if msg.role == "SYSTEM":
                role = "System"
            lines.append(f"{role}: {msg.content}")
        return "\n".join(lines)

    def _build_actions_log(self, mode: str) -> list:
        """Build actions metadata for the message."""
        if mode == "DIGITAL_SELF":
            return [
                {"type": "alcm_query", "endpoint": "/generate"},
                {"type": "alcm_feedback", "endpoint": "/feedback", "feedback_type": "IMPLICIT_ACCEPT"},
            ]
        elif mode == "TRAINING":
            return [
                {"type": "alcm_query", "endpoint": "/classify"},
                {"type": "alcm_query", "endpoint": "/attribute"},
            ]
        elif mode == "REFINEMENT":
            return [
                {"type": "alcm_query", "endpoint": "/attribute"},
                {"type": "alcm_feedback", "endpoint": "/feedback", "feedback_type": "REFINEMENT"},
            ]
        return [{"type": "platform_query"}]
