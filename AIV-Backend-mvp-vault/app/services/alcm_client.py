"""
ALCM Client SDK — The platform's ONLY way to talk to the ALCM API.

Every ALCM interaction goes through this file. The platform NEVER calls
ElevenLabs, rendering providers, or LLMs for identity work directly —
all of that is the ALCM API's job behind its abstraction layer.

Usage:
    from app.services.alcm_client import get_alcm_client

    client = get_alcm_client()
    twin = await client.create_twin()
    health = await client.get_health(twin["alcm_twin_id"])
"""

import json
import logging
from typing import Optional, Dict, List, AsyncGenerator
from functools import lru_cache

import httpx

from ..config import get_settings

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Error hierarchy
# ---------------------------------------------------------------------------

class ALCMError(Exception):
    """Base error for all ALCM client failures."""
    pass


class ALCMConnectionError(ALCMError):
    """ALCM API is unreachable."""
    pass


class ALCMTimeoutError(ALCMError):
    """Request to ALCM exceeded timeout."""
    pass


class ALCMValidationError(ALCMError):
    """ALCM returned a 400-level response (bad request)."""

    def __init__(self, message: str, status_code: int = 400, details: dict = None):
        super().__init__(message)
        self.status_code = status_code
        self.details = details or {}


class ALCMNotFoundError(ALCMError):
    """Twin not found in ALCM."""
    pass


class ALCMServerError(ALCMError):
    """ALCM returned a 500-level response."""
    pass


# ---------------------------------------------------------------------------
# Client
# ---------------------------------------------------------------------------

class ALCMClient:
    """SDK for all ALCM API calls from the platform.

    All methods handle errors gracefully — callers can catch specific
    error types or the base ALCMError for blanket handling.
    """

    def __init__(self, base_url: str, timeout: int = 30, auth_token: str = ""):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.auth_token = auth_token

    def _client(self, timeout_override: Optional[float] = None) -> httpx.AsyncClient:
        t = timeout_override or self.timeout
        headers = {}
        if self.auth_token:
            headers["Authorization"] = f"Bearer {self.auth_token}"
        return httpx.AsyncClient(
            base_url=self.base_url,
            timeout=httpx.Timeout(t, connect=10.0),
            headers=headers,
        )

    async def _request(self, method: str, path: str, **kwargs) -> dict:
        """Central request method with unified error handling."""
        try:
            async with self._client() as client:
                response = await client.request(method, path, **kwargs)

                if response.status_code == 404:
                    raise ALCMNotFoundError(f"Not found: {path}")
                if 400 <= response.status_code < 500:
                    detail = response.json() if response.headers.get("content-type", "").startswith("application/json") else {}
                    raise ALCMValidationError(
                        f"ALCM validation error on {path}: {response.status_code}",
                        status_code=response.status_code,
                        details=detail,
                    )
                if response.status_code >= 500:
                    raise ALCMServerError(f"ALCM server error on {path}: {response.status_code}")

                if response.headers.get("content-type", "").startswith("application/json"):
                    return response.json()
                return {"raw": response.text}

        except httpx.ConnectError:
            raise ALCMConnectionError(f"Cannot reach ALCM API at {self.base_url}")
        except httpx.TimeoutException:
            raise ALCMTimeoutError(f"ALCM API timed out on {path} ({self.timeout}s)")

    # ------------------------------------------------------------------
    # Twin lifecycle
    # ------------------------------------------------------------------

    async def create_twin(self) -> dict:
        """POST /twin -> {alcm_twin_id}"""
        return await self._request("POST", "/twin")

    async def delete_twin(self, alcm_twin_id: str) -> bool:
        """DELETE /twin/{id} -> bool"""
        result = await self._request("DELETE", f"/twin/{alcm_twin_id}")
        return result.get("deleted", False)

    # ------------------------------------------------------------------
    # Data processing
    # ------------------------------------------------------------------

    async def classify(self, alcm_twin_id: str, content: str,
                       modality: str = "TEXT", source_reliability: float = 0.6) -> dict:
        """POST /classify
        Returns: {categories_affected, confidence_scores, processing_id}
        """
        return await self._request("POST", "/classify", json={
            "twin_id": alcm_twin_id,
            "content": content,
            "modality": modality,
            "source_reliability": source_reliability,
        })

    async def analyze_media(self, alcm_twin_id: str, media_url: str,
                            media_type: str) -> dict:
        """POST /analyze-media
        Returns: {voice_profile, visual_descriptors, processing_id}
        """
        return await self._request("POST", "/analyze-media", json={
            "twin_id": alcm_twin_id,
            "media_url": media_url,
            "media_type": media_type,
        })

    async def attribute(self, alcm_twin_id: str, classified_data: dict) -> dict:
        """POST /attribute
        Returns: {sub_components_updated, confidence_deltas}
        """
        return await self._request("POST", "/attribute", json={
            "twin_id": alcm_twin_id,
            "classified_data": classified_data,
        })

    # ------------------------------------------------------------------
    # Generation
    # ------------------------------------------------------------------

    async def generate(self, alcm_twin_id: str, context: str,
                       guardrails: dict = None, mode: str = "conversation") -> str:
        """POST /generate
        Returns: response text (extracted from full response)
        """
        result = await self._request("POST", "/generate", json={
            "twin_id": alcm_twin_id,
            "context": context,
            "guardrails": guardrails or {},
            "mode": mode,
        })
        return result.get("response_text", "")

    async def generate_stream(self, alcm_twin_id: str, context: str,
                              guardrails: dict = None,
                              mode: str = "conversation") -> AsyncGenerator[str, None]:
        """POST /generate/stream -> SSE stream of text chunks.

        Yields text chunks as they arrive. Caller is responsible for
        assembling the full response if needed.
        """
        try:
            async with self._client(timeout_override=120.0) as client:
                async with client.stream("POST", "/generate/stream", json={
                    "twin_id": alcm_twin_id,
                    "context": context,
                    "guardrails": guardrails or {},
                    "mode": mode,
                }) as response:
                    if response.status_code != 200:
                        logger.error(f"ALCM stream error: {response.status_code}")
                        return
                    async for line in response.aiter_lines():
                        if not line.startswith("data: "):
                            continue
                        data_str = line[6:]
                        if data_str.strip() == "[DONE]":
                            break
                        try:
                            data = json.loads(data_str)
                            if "text" in data:
                                yield data["text"]
                        except json.JSONDecodeError:
                            continue
        except httpx.ConnectError:
            raise ALCMConnectionError(f"Cannot reach ALCM API at {self.base_url}")
        except httpx.TimeoutException:
            raise ALCMTimeoutError("ALCM stream timed out")

    async def generate_speech(self, alcm_twin_id: str, text: str) -> bytes:
        """POST /generate-speech -> audio bytes (mp3)"""
        try:
            async with self._client(timeout_override=60.0) as client:
                response = await client.post("/generate-speech", json={
                    "twin_id": alcm_twin_id,
                    "text": text,
                })
                if response.status_code == 200:
                    return response.content
                raise ALCMServerError(f"Speech generation failed: {response.status_code}")
        except httpx.ConnectError:
            raise ALCMConnectionError(f"Cannot reach ALCM API at {self.base_url}")
        except httpx.TimeoutException:
            raise ALCMTimeoutError("ALCM speech generation timed out")

    # ------------------------------------------------------------------
    # Validation
    # ------------------------------------------------------------------

    async def validate_output(self, alcm_twin_id: str, sample: str,
                              context: str = "") -> dict:
        """POST /validate
        Returns: {consistency_score, passed, details}
        """
        return await self._request("POST", "/validate", json={
            "twin_id": alcm_twin_id,
            "sample_content": sample,
            "sample_context": context,
        })

    # ------------------------------------------------------------------
    # Health & monitoring
    # ------------------------------------------------------------------

    async def get_health(self, alcm_twin_id: str) -> dict:
        """GET /twin/{id}/health
        Returns: {cfs, psychographic_coverage, personality_confidence, health_status}
        """
        return await self._request("GET", f"/twin/{alcm_twin_id}/health")

    async def get_drift(self, alcm_twin_id: str) -> dict:
        """GET /twin/{id}/drift
        Returns: {drift_score, threshold_status, details}
        """
        return await self._request("GET", f"/twin/{alcm_twin_id}/drift")

    # ------------------------------------------------------------------
    # Package delivery
    # ------------------------------------------------------------------

    async def get_package(self, alcm_twin_id: str, scope: List[str]) -> dict:
        """GET /twin/{id}/package?scope=identity_profile,voice_identity
        Returns scoped identity data per deal manifest.
        """
        scope_str = ",".join(scope)
        return await self._request("GET", f"/twin/{alcm_twin_id}/package",
                                   params={"scope": scope_str})

    async def create_snapshot(self, alcm_twin_id: str) -> dict:
        """POST /twin/{id}/snapshot
        Returns: {snapshot_ref, seal_hash, version_number}
        """
        return await self._request("POST", f"/twin/{alcm_twin_id}/snapshot")

    # ------------------------------------------------------------------
    # Configuration
    # ------------------------------------------------------------------

    async def push_guardrails(self, alcm_twin_id: str, config: dict) -> dict:
        """POST /twin/{id}/guardrails
        Pushes updated guardrail config to the ALCM for enforcement.
        """
        return await self._request("POST", f"/twin/{alcm_twin_id}/guardrails",
                                   json=config)

    # ------------------------------------------------------------------
    # Feedback / Learning
    # ------------------------------------------------------------------

    async def submit_feedback(self, alcm_twin_id: str, interaction_id: str,
                              feedback_type: str, signal: dict) -> dict:
        """POST /twin/{id}/feedback
        feedback_type: USER_CORRECTION | RATING | IMPLICIT_ACCEPT | REFINEMENT
        """
        return await self._request("POST", f"/twin/{alcm_twin_id}/feedback", json={
            "interaction_id": interaction_id,
            "feedback_type": feedback_type,
            "signal": signal,
        })

    # ------------------------------------------------------------------
    # Service health
    # ------------------------------------------------------------------

    async def health_check(self) -> dict:
        """GET /health — check if the ALCM API is alive."""
        return await self._request("GET", "/health")


# ---------------------------------------------------------------------------
# Graceful degradation wrapper
# ---------------------------------------------------------------------------

class GracefulALCMClient:
    """Wraps ALCMClient with graceful degradation.

    When the ALCM API is unreachable, returns fallback data instead of
    crashing the platform. Logs warnings so ops can investigate.

    Usage:
        client = get_alcm_client()  # returns GracefulALCMClient
        health = await client.get_health(twin_id)
        # Returns real data if ALCM is up, fallback if down
    """

    def __init__(self, inner: ALCMClient):
        self._inner = inner
        self._available = True  # optimistic start

    async def _safe(self, coro, fallback, operation: str):
        """Execute an ALCM call with fallback on connection/timeout errors."""
        try:
            result = await coro
            self._available = True
            return result
        except (ALCMConnectionError, ALCMTimeoutError) as e:
            self._available = False
            logger.warning(f"ALCM unavailable during {operation}: {e}")
            return fallback
        except ALCMNotFoundError:
            raise  # Not found is a real error — don't swallow
        except ALCMValidationError:
            raise  # Validation errors should surface
        except ALCMServerError as e:
            logger.error(f"ALCM server error during {operation}: {e}")
            return fallback

    @property
    def is_available(self) -> bool:
        return self._available

    # --- Twin lifecycle (no fallback — these must succeed) ---
    async def create_twin(self) -> dict:
        return await self._inner.create_twin()

    async def delete_twin(self, alcm_twin_id: str) -> bool:
        return await self._inner.delete_twin(alcm_twin_id)

    # --- Data processing (fallback: empty results) ---
    async def classify(self, alcm_twin_id: str, content: str,
                       modality: str = "TEXT", source_reliability: float = 0.6) -> dict:
        return await self._safe(
            self._inner.classify(alcm_twin_id, content, modality, source_reliability),
            {"categories_affected": [], "confidence_scores": {}, "_alcm_unavailable": True},
            "classify",
        )

    async def analyze_media(self, alcm_twin_id: str, media_url: str,
                            media_type: str) -> dict:
        return await self._safe(
            self._inner.analyze_media(alcm_twin_id, media_url, media_type),
            {"_alcm_unavailable": True},
            "analyze_media",
        )

    async def attribute(self, alcm_twin_id: str, classified_data: dict) -> dict:
        return await self._safe(
            self._inner.attribute(alcm_twin_id, classified_data),
            {"sub_components_updated": [], "_alcm_unavailable": True},
            "attribute",
        )

    # --- Generation (fallback: message explaining unavailability) ---
    async def generate(self, alcm_twin_id: str, context: str,
                       guardrails: dict = None, mode: str = "conversation") -> str:
        return await self._safe(
            self._inner.generate(alcm_twin_id, context, guardrails, mode),
            "The identity engine is temporarily unavailable. Please try again shortly.",
            "generate",
        )

    async def generate_stream(self, alcm_twin_id: str, context: str,
                              guardrails: dict = None,
                              mode: str = "conversation") -> AsyncGenerator[str, None]:
        try:
            async for chunk in self._inner.generate_stream(
                alcm_twin_id, context, guardrails, mode
            ):
                self._available = True
                yield chunk
        except (ALCMConnectionError, ALCMTimeoutError) as e:
            self._available = False
            logger.warning(f"ALCM unavailable during generate_stream: {e}")
            yield "The identity engine is temporarily unavailable. Please try again shortly."

    async def generate_speech(self, alcm_twin_id: str, text: str) -> Optional[bytes]:
        return await self._safe(
            self._inner.generate_speech(alcm_twin_id, text),
            None,
            "generate_speech",
        )

    # --- Validation ---
    async def validate_output(self, alcm_twin_id: str, sample: str,
                              context: str = "") -> dict:
        return await self._safe(
            self._inner.validate_output(alcm_twin_id, sample, context),
            {"consistency_score": None, "passed": None, "_alcm_unavailable": True},
            "validate_output",
        )

    # --- Health (fallback: stale/unknown indicators) ---
    async def get_health(self, alcm_twin_id: str) -> dict:
        return await self._safe(
            self._inner.get_health(alcm_twin_id),
            {"cfs": 0.0, "psychographic_coverage": 0.0, "personality_confidence": 0.0,
             "health_status": "UNKNOWN", "_alcm_unavailable": True},
            "get_health",
        )

    async def get_drift(self, alcm_twin_id: str) -> dict:
        return await self._safe(
            self._inner.get_drift(alcm_twin_id),
            {"drift_score": None, "_alcm_unavailable": True},
            "get_drift",
        )

    # --- Package delivery ---
    async def get_package(self, alcm_twin_id: str, scope: List[str]) -> dict:
        return await self._safe(
            self._inner.get_package(alcm_twin_id, scope),
            {"_alcm_unavailable": True},
            "get_package",
        )

    async def create_snapshot(self, alcm_twin_id: str) -> dict:
        return await self._safe(
            self._inner.create_snapshot(alcm_twin_id),
            {"_alcm_unavailable": True},
            "create_snapshot",
        )

    # --- Configuration ---
    async def push_guardrails(self, alcm_twin_id: str, config: dict) -> dict:
        return await self._safe(
            self._inner.push_guardrails(alcm_twin_id, config),
            {"_alcm_unavailable": True},
            "push_guardrails",
        )

    # --- Feedback ---
    async def submit_feedback(self, alcm_twin_id: str, interaction_id: str,
                              feedback_type: str, signal: dict) -> dict:
        return await self._safe(
            self._inner.submit_feedback(alcm_twin_id, interaction_id, feedback_type, signal),
            {"processed": False, "_alcm_unavailable": True},
            "submit_feedback",
        )

    # --- Service health ---
    async def health_check(self) -> dict:
        return await self._safe(
            self._inner.health_check(),
            {"status": "unavailable", "_alcm_unavailable": True},
            "health_check",
        )


# ---------------------------------------------------------------------------
# Singleton
# ---------------------------------------------------------------------------

@lru_cache()
def get_alcm_client() -> GracefulALCMClient:
    """Get the singleton ALCM client with graceful degradation."""
    settings = get_settings()
    inner = ALCMClient(
        base_url=settings.alcm_api_url,
        timeout=settings.alcm_api_timeout,
        auth_token=settings.alcm_auth_token,
    )
    return GracefulALCMClient(inner)
