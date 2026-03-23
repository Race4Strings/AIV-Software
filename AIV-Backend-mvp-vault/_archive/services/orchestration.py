"""
Orchestration Service

AI-powered service to determine which clone(s) should respond to a message.
"""
from typing import List, Optional
import json
import httpx

from ..models import Clone
from ..config import get_settings


class OrchestrationService:
    """Service for AI-powered orchestration of clone responses."""
    
    def __init__(self):
        settings = get_settings()
        self.api_key = settings.google_genai_api_key
        self.base_url = "https://generativelanguage.googleapis.com/v1beta/openai"
    
    @property
    def is_configured(self) -> bool:
        return bool(self.api_key)
    
    async def select_responders(
        self,
        message: str,
        clones: List[Clone],
        max_responders: int = 2
    ) -> List[Clone]:
        """
        Select which clone(s) should respond to a message.
        
        Uses AI to analyze the message and clone profiles to determine
        the most appropriate responder(s).
        
        Args:
            message: The user's message
            clones: List of available clone participants
            max_responders: Maximum number of clones to respond
            
        Returns:
            List of clones that should respond
        """
        if not clones:
            return []
        
        if len(clones) == 1:
            return clones  # Only one option
        
        if not self.is_configured:
            return [clones[0]]  # Fallback
        
        # Build clone profiles for context
        clone_profiles = []
        for clone in clones:
            profile = {
                "id": str(clone.id),
                "name": clone.name,
                "description": clone.description or "",
                "personality_summary": self._extract_personality_summary(clone)
            }
            clone_profiles.append(profile)
        
        # Build prompt
        prompt = f"""You are an AI orchestrator that determines which participant(s) should respond to a message in a group chat.

AVAILABLE PARTICIPANTS:
{json.dumps(clone_profiles, indent=2)}

USER MESSAGE: "{message}"

TASK: Analyze the message and participants to determine who should respond.
Consider:
1. Does the message ask about a specific topic that one participant is expert in?
2. Is the message casual/social (anyone can respond) or specialized?
3. Would multiple perspectives be valuable?

RULES:
- Return 1-{max_responders} responders
- If message is general, pick the most engaging participant
- If message requires expertise, pick the most knowledgeable
- Return participant IDs only

Respond in JSON format:
{{"responders": ["<clone_id_1>", "<clone_id_2>"], "reason": "<brief explanation>"}}
"""
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "gemini-2.0-flash",
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.3,
                        "max_tokens": 200
                    }
                )
                
                if response.status_code == 200:
                    result = response.json()
                    content = result.get("choices", [{}])[0].get("message", {}).get("content", "{}")
                    
                    # Parse JSON response
                    try:
                        # Handle markdown code blocks
                        if "```json" in content:
                            content = content.split("```json")[1].split("```")[0]
                        elif "```" in content:
                            content = content.split("```")[1].split("```")[0]
                        
                        data = json.loads(content.strip())
                        responder_ids = data.get("responders", [])
                        
                        # Map IDs back to clones
                        id_to_clone = {str(c.id): c for c in clones}
                        selected = [id_to_clone[rid] for rid in responder_ids if rid in id_to_clone]
                        
                        if selected:
                            print(f"🎯 Orchestrator selected: {[c.name for c in selected]}")
                            return selected[:max_responders]
                    except json.JSONDecodeError:
                        print(f"⚠️ Failed to parse orchestration response: {content}")
                else:
                    print(f"❌ Orchestration API error: {response.status_code}")
        
        except Exception as e:
            print(f"❌ Orchestration failed: {e}")
        
        # Fallback: return first clone
        return [clones[0]]
    
    def _extract_personality_summary(self, clone: Clone) -> str:
        """Extract a brief personality summary from clone data."""
        parts = []
        
        if clone.personality:
            traits = clone.personality.get("traits", [])
            if traits:
                parts.append(f"Traits: {', '.join(traits[:3])}")
            
            speaking = clone.personality.get("speaking_style", {})
            if speaking:
                tone = speaking.get("tone", [])
                if tone:
                    parts.append(f"Tone: {', '.join(tone[:2])}")
        
        if clone.dimensions:
            work = clone.dimensions.get("work", {})
            if isinstance(work, dict) and work.get("content"):
                parts.append(f"Work: {work['content'][:100]}")
        
        return " | ".join(parts) if parts else "General conversationalist"


# Singleton instance
_orchestration_service: Optional[OrchestrationService] = None


def get_orchestration_service() -> OrchestrationService:
    """Get the orchestration service singleton."""
    global _orchestration_service
    if _orchestration_service is None:
        _orchestration_service = OrchestrationService()
    return _orchestration_service
