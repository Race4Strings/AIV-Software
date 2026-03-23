"""
CloneInference Service

Generates AI responses using the clone's personality and system prompt.
"""
from typing import List, Dict, Optional
import httpx

from ..config import get_settings
from ..models.clone import Clone


class CloneInference:
    """Service for generating clone responses."""
    
    def __init__(self):
        settings = get_settings()
        self.api_key = settings.google_genai_api_key
        self.base_url = "https://generativelanguage.googleapis.com/v1beta/openai"
    
    @property
    def is_configured(self) -> bool:
        return bool(self.api_key)
    
    async def generate_response(
        self,
        clone: Clone,
        conversation_history: List[Dict[str, str]],
        user_message: str,
        tool_context: Optional[str] = None
    ) -> str:
        """
        Generate a response as the clone.
        
        Args:
            clone: The Clone object with personality data
            conversation_history: Previous messages [{"role": "user/assistant", "content": "..."}]
            user_message: The new message from the user
            tool_context: Optional context about available tools
            
        Returns:
            The clone's response
        """
        if not self.is_configured:
            return "I'm having trouble responding right now. Please try again later."
        
        # Build system prompt
        system_prompt = self._build_system_prompt(clone)
        
        # Append tool context if available
        if tool_context:
            system_prompt += tool_context
        
        # Format messages for API
        messages = [{"role": "system", "content": system_prompt}]
        
        # Add conversation history
        for msg in conversation_history[-20:]:  # Last 20 messages for context
            messages.append({
                "role": msg["role"],
                "content": msg["content"]
            })
        
        # Add new user message
        messages.append({"role": "user", "content": user_message})
        
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "gemini-2.0-flash",
                        "messages": messages,
                        "temperature": 0.85,
                        "max_tokens": 500
                    }
                )
                
                if response.status_code == 200:
                    result = response.json()
                    content = result.get("choices", [{}])[0].get("message", {}).get("content", "")
                    return content
                else:
                    print(f"❌ Clone inference error: {response.status_code}")
                    return "hmm, I'm having trouble thinking right now. can you try again?"
                    
        except Exception as e:
            print(f"❌ Clone inference failed: {e}")
            return "sorry, something went wrong. try again?"
    
    async def generate_aiv_response(
        self,
        conversation_history: List[Dict[str, str]],
        user_message: str
    ) -> str:
        """
        Generate a response as AIV - the general AI assistant.
        Used when no specific clone participants are in the chat.
        """
        if not self.is_configured:
            return "I'm having trouble responding right now. Please try again later."
        
        system_prompt = """You are AIV, a helpful and friendly AI assistant.

You are here to help users with any questions they have. Be:
- Helpful and informative
- Friendly and conversational (like texting a friend)
- Concise (1-3 sentences usually, unless more detail is needed)
- Honest about your limitations

You are not roleplaying as anyone specific - you're just AIV, a general assistant.
If users want to chat with a specific personality, suggest they add a Person from their Library."""

        # Format messages for API
        messages = [{"role": "system", "content": system_prompt}]
        
        for msg in conversation_history[-20:]:
            messages.append({
                "role": msg["role"],
                "content": msg["content"]
            })
        
        messages.append({"role": "user", "content": user_message})
        
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "gemini-2.0-flash",
                        "messages": messages,
                        "temperature": 0.7,
                        "max_tokens": 500
                    }
                )
                
                if response.status_code == 200:
                    result = response.json()
                    content = result.get("choices", [{}])[0].get("message", {}).get("content", "")
                    return content
                else:
                    print(f"❌ AIV inference error: {response.status_code}")
                    return "hmm, I'm having trouble thinking right now. can you try again?"
                    
        except Exception as e:
            print(f"❌ AIV inference failed: {e}")
            return "sorry, something went wrong. try again?"
    
    def _build_system_prompt(self, clone: Clone) -> str:
        """Build the system prompt from clone data."""
        
        # Use stored system prompt if available
        if clone.system_prompt:
            base_prompt = clone.system_prompt
        else:
            # Fallback: build from personality
            personality = clone.personality or {}
            traits = ", ".join(personality.get("traits", ["friendly"]))
            style = personality.get("speaking_style", "casual and natural")
            
            base_prompt = f"""You are {clone.name}'s digital clone.

Your personality traits: {traits}
Your speaking style: {style}

Respond as {clone.name} would - naturally, conversationally, like texting a friend.
Keep responses short (1-3 sentences usually). Use their vocabulary and mannerisms.
Never break character or acknowledge being an AI."""
        
        # Add dimensions context if available
        if clone.dimensions:
            dims_context = "\n\nKey personality dimensions:"
            for key, data in clone.dimensions.items():
                content = data.get("content", "") if isinstance(data, dict) else str(data)
                if content and len(content) > 10:
                    dims_context += f"\n- {key}: {content[:200]}"
            base_prompt += dims_context
        
        # Add transcription example for speech patterns
        if clone.onboard_transcription:
            base_prompt += f"""

Here is an example of how {clone.name} speaks and formulates sentences. Use this as a reference for phrasing, vocabulary, and speaking patterns:
"{clone.onboard_transcription[:1000]}"

Match their speech patterns, word choices, and sentence structure when responding."""
        
        return base_prompt


# Singleton
_clone_inference: Optional[CloneInference] = None


def get_clone_inference() -> CloneInference:
    """Get singleton CloneInference instance."""
    global _clone_inference
    if _clone_inference is None:
        _clone_inference = CloneInference()
    return _clone_inference
