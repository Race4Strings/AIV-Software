"""
Avatar Service — Visual identity generation abstraction.

Per spec Section 22: "Avatar — Evaluate at Stage 2. Market evolving —
build abstraction now, pick provider later."

This service provides a provider-agnostic interface for avatar generation.
Concrete providers (Synthesia, D-ID, HeyGen, etc.) are plugged in via
configuration. The ALCM API's visual_identity module feeds into this.

Current state: Abstraction layer built with ALCM-backed generation.
Provider-specific implementations added as integrations mature.
"""

import logging
from typing import Optional, Dict, List
from uuid import UUID

from ..config import get_settings
from .alcm_client import get_alcm_client

logger = logging.getLogger(__name__)


class AvatarProvider:
    """Base class for avatar generation providers."""

    async def generate_static(
        self, twin_id: str, prompt: str, style: str = "realistic"
    ) -> Optional[Dict]:
        """Generate a static avatar image."""
        raise NotImplementedError

    async def generate_animated(
        self, twin_id: str, text: str, emotion: str = "neutral"
    ) -> Optional[Dict]:
        """Generate an animated avatar clip."""
        raise NotImplementedError

    async def get_status(self, job_id: str) -> Dict:
        """Check generation job status."""
        raise NotImplementedError


class ALCMAvatarProvider(AvatarProvider):
    """Avatar generation via ALCM API visual identity module.

    Uses ALCM's visual_identity package data to inform generation.
    Actual rendering deferred to provider integration.
    """

    def __init__(self):
        self.alcm = get_alcm_client()

    async def generate_static(
        self, twin_id: str, prompt: str, style: str = "realistic"
    ) -> Optional[Dict]:
        """Request visual identity data from ALCM for avatar generation."""
        try:
            package = await self.alcm.get_package(twin_id, ["visual_identity"])
            if package.get("_alcm_unavailable"):
                return {
                    "status": "unavailable",
                    "message": "Visual identity data not available. Upload reference photos to build your visual profile.",
                }
            visual_data = package.get("modules", {}).get("visual_identity", {})
            return {
                "status": "ready",
                "visual_identity": visual_data,
                "prompt": prompt,
                "style": style,
                "message": "Visual identity data retrieved. Avatar generation will be available when a provider is configured.",
                "provider": "pending_selection",
            }
        except Exception as e:
            logger.warning(f"Avatar generation failed for twin {twin_id}: {e}")
            return {"status": "error", "message": "Avatar generation temporarily unavailable."}

    async def generate_animated(
        self, twin_id: str, text: str, emotion: str = "neutral"
    ) -> Optional[Dict]:
        """Animated avatar requires both visual + voice identity."""
        try:
            package = await self.alcm.get_package(twin_id, ["visual_identity", "voice_identity"])
            if package.get("_alcm_unavailable"):
                return {
                    "status": "unavailable",
                    "message": "Identity data not available for animated avatar.",
                }
            return {
                "status": "ready",
                "visual_identity": package.get("modules", {}).get("visual_identity", {}),
                "voice_identity": package.get("modules", {}).get("voice_identity", {}),
                "text": text,
                "emotion": emotion,
                "message": "Identity data retrieved. Animated avatar generation will be available when a provider is configured.",
                "provider": "pending_selection",
            }
        except Exception as e:
            logger.warning(f"Animated avatar failed for twin {twin_id}: {e}")
            return {"status": "error", "message": "Animated avatar temporarily unavailable."}

    async def get_status(self, job_id: str) -> Dict:
        return {"job_id": job_id, "status": "pending_provider", "message": "Avatar provider not yet configured."}


def get_avatar_service() -> AvatarProvider:
    """Get the configured avatar provider. Defaults to ALCM-backed provider."""
    return ALCMAvatarProvider()
