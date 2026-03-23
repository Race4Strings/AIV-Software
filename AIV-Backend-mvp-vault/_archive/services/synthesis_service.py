"""
Synthesis Service for AI Clone Personality Generation

Uses Gemini AI to analyze narrative data and generate personality profiles.
Ported from old cloning-engine.service.ts
"""

import json
import base64
import httpx
from typing import Optional, Dict, Any
from functools import lru_cache

from ..config import get_settings


class SynthesisService:
    """Service for synthesizing clone personality from narrative data."""
    
    def __init__(self):
        settings = get_settings()
        self.api_key = settings.google_genai_api_key
        self.base_url = "https://generativelanguage.googleapis.com/v1beta/openai"
        
        if not self.api_key:
            print("⚠️ GOOGLE_GENAI_API_KEY not configured. Synthesis will be disabled.")
    
    @property
    def is_configured(self) -> bool:
        """Check if Gemini API is configured."""
        return bool(self.api_key)
    
    async def synthesize_personality(
        self,
        clone_name: str,
        narrative_data: Optional[Dict[str, str]] = None,
        dimensions: Optional[Dict[str, Dict]] = None,
        voice_url: Optional[str] = None,
        image_data: Optional[Dict[str, str]] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Synthesize a clone's personality from narrative data OR dimensions.
        
        Args:
            clone_name: Name of the clone
            narrative_data: Dict of question answers (q1-q10) - OLD format
            dimensions: Dict of 10 dimensions - NEW format (preferred)
            voice_url: Optional URL to voice sample
            image_data: Optional dict with frontal/profile/body image URLs
        
        Returns:
            Synthesized personality dict with traits, values, speaking_style, etc.
        """
        if not self.is_configured:
            print("⚠️ Synthesis service not configured")
            return None
        
        # Require either dimensions or narrative_data
        if not dimensions and not narrative_data:
            print("⚠️ Either dimensions or narrative_data required")
            return None
        
        try:
            # Build the prompt - prefer dimensions if available
            if dimensions:
                prompt = self._build_dimensions_prompt(clone_name, dimensions, bool(voice_url))
            else:
                prompt = self._build_synthesis_prompt(clone_name, narrative_data, bool(voice_url))
            
            # Prepare messages for multimodal input
            messages = [
                {"role": "system", "content": "You are an expert profile synthesizer. Output ONLY valid JSON."},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt}
                    ]
                }
            ]
            
            # Add images if available
            if image_data:
                image_urls = [
                    image_data.get("frontal"),
                    image_data.get("profile"),
                    image_data.get("body")
                ]
                for url in filter(None, image_urls):
                    if url.startswith("http") and "mock" not in url:
                        try:
                            base64_image = await self._url_to_base64(url)
                            messages[1]["content"].append({
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{base64_image}"
                                }
                            })
                        except Exception as e:
                            print(f"⚠️ Failed to process image {url}: {e}")
            
            # Call Gemini API using OpenAI-compatible endpoint
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "gemini-2.5-flash",
                        "messages": messages,
                        "temperature": 0.7,
                        "response_format": {"type": "json_object"}
                    }
                )
                
                if response.status_code == 200:
                    result = response.json()
                    content = result.get("choices", [{}])[0].get("message", {}).get("content", "{}")
                    synthesis_result = json.loads(content)
                    print("✅ Personality synthesis complete")
                    return synthesis_result
                else:
                    print(f"❌ Synthesis API error: {response.status_code} - {response.text[:500]}")
                    return None
                    
        except json.JSONDecodeError as e:
            print(f"❌ Failed to parse synthesis JSON: {e}")
            return None
        except Exception as e:
            print(f"❌ Synthesis failed: {e}")
            return None
    
    def _build_synthesis_prompt(
        self,
        clone_name: str,
        narrative: Dict[str, str],
        has_audio: bool
    ) -> str:
        """Build the synthesis prompt from narrative data."""
        
        # Format answers
        answers = "\n\n".join([f"{q}: {a}" for q, a in narrative.items()])
        
        context = f"""Analyze the following user data to construct a hyper-realistic AI persona that talks EXACTLY like a real human texting.
        
DATA SOURCES:
1. NARRATIVE (Answers to deep personal questions)
2. VISUALS (Attached images - ANALYZE for physical description)"""
        
        if has_audio:
            context += "\n3. AUDIO (Attached voice recording - ANALYZE for tone, cadence, accent, and emotional baseline)"
        
        return f"""{context}

USER NARRATIVE:
{answers}

TASK:
Create a JSON object containing the personality architecture for {clone_name}'s digital clone.
You MUST integrate visual observations (hair color, style, glasses, expression, fashion) into the 'background' and 'description'.

CRITICAL HUMANIZATION RULES FOR THE SYSTEM PROMPT:
The systemPrompt you generate MUST enforce these behaviors:
1. NEVER use bullet points, numbered lists, or markdown formatting in responses
2. NEVER start responses with "Alright," "Certainly," "Of course," or AI-like phrases
3. Keep responses SHORT - typically 1-3 sentences for casual questions, like real texting
4. Use casual contractions (I'm, don't, can't, gonna, wanna) naturally
5. Include natural filler words occasionally (like, you know, I mean, honestly, tbh)
6. Sometimes start mid-thought or use incomplete sentences
7. Express uncertainty naturally ("hmm not sure", "I think maybe", "idk honestly")
8. React emotionally first, explain second (like a real human would)
9. Use lowercase casually, don't always capitalize perfectly
10. Include personal tangents and asides that real humans do
11. Reference personal memories/experiences from the narrative naturally
12. Show personality through word choice, not through explanations about personality
13. Avoid meta-commentary about being an AI or "my values are X"
14. When asked deep questions, respond thoughtfully but still conversationally - not like writing an essay

The clone should feel like you're texting with the actual person, not getting a response from an AI assistant pretending to be them.

OUTPUT JSON FORMAT:
{{
  "shortDescription": "One casual line about who this is",
  "background": "3-5 sentences about them, written naturally not formally",
  "systemPrompt": "You are {clone_name}. [Detailed 2nd person instructions incorporating ALL the humanization rules above. Include their specific speech patterns, favorite expressions, how they react to different topics, their conversational quirks. Make it feel like instructions for method acting, not for an AI assistant.]",
  "personality": {{
    "traits": ["trait1", "trait2", "trait3", "trait4", "trait5"],
    "speaking_style": "Their actual texting/speaking style - short sentences? lots of emojis? dry humor? enthusiastic? Include specific phrases they use.",
    "quirks": ["specific behavioral quirks"],
    "knowledge_areas": ["what they know a lot about"],
    "values": ["core values"]
  }}
}}

The 'systemPrompt' should be 200-400 words and read like character direction for an actor, focusing on HOW to respond naturally, not what information to convey."""
    
    def _build_dimensions_prompt(
        self,
        clone_name: str,
        dimensions: Dict[str, Dict],
        has_audio: bool
    ) -> str:
        """Build synthesis prompt from structured dimensions data."""
        
        # Format dimensions
        dims_text = ""
        for key, data in dimensions.items():
            content = data.get("content", "") if isinstance(data, dict) else str(data)
            dims_text += f"- {key.upper()}: {content}\n"
        
        context = """Analyze the following personality dimensions to construct a hyper-realistic AI persona that talks EXACTLY like a real human texting.

PERSONALITY DIMENSIONS:
""" + dims_text + """

VISUAL DATA: Attached images (if any) - ANALYZE for physical description"""
        
        if has_audio:
            context += "\nAUDIO DATA: Voice recording available - incorporate natural speech patterns"
        
        return f"""{context}

TASK:
Create a JSON object containing the personality architecture for {clone_name}'s digital clone.
Integrate all 10 personality dimensions into a cohesive, natural persona.

CRITICAL HUMANIZATION RULES FOR THE SYSTEM PROMPT:
The systemPrompt you generate MUST enforce these behaviors:
1. NEVER use bullet points, numbered lists, or markdown formatting in responses
2. NEVER start responses with "Alright," "Certainly," "Of course," or AI-like phrases
3. Keep responses SHORT - typically 1-3 sentences for casual questions, like real texting
4. Use casual contractions (I'm, don't, can't, gonna, wanna) naturally
5. Include natural filler words occasionally (like, you know, I mean, honestly, tbh)
6. Sometimes start mid-thought or use incomplete sentences
7. Express uncertainty naturally ("hmm not sure", "I think maybe", "idk honestly")
8. React emotionally first, explain second (like a real human would)
9. Use lowercase casually, don't always capitalize perfectly
10. Include personal tangents and asides that real humans do
11. Reference personal experiences from the dimensions naturally
12. Show personality through word choice, not through explanations about personality
13. Avoid meta-commentary about being an AI or "my values are X"
14. When asked deep questions, respond thoughtfully but still conversationally

OUTPUT JSON FORMAT:
{{
  "shortDescription": "One casual line about who this is",
  "background": "3-5 sentences about them, integrating key dimensions naturally",
  "systemPrompt": "You are {clone_name}. [Detailed instructions incorporating ALL dimensions and humanization rules. Include specific speech patterns, reactions, quirks from the dimensions. Make it feel like method acting instructions.]",
  "personality": {{
    "traits": ["trait1", "trait2", "trait3", "trait4", "trait5"],
    "speaking_style": "Their actual texting/speaking style from dimensions",
    "quirks": ["specific behavioral quirks from dimensions"],
    "knowledge_areas": ["what they know about from work/experiences"],
    "values": ["core values from heart/ethics dimensions"]
  }}
}}

The 'systemPrompt' should be 200-400 words and synthesize ALL 10 dimensions into natural character direction."""
    
    async def _url_to_base64(self, url: str) -> str:
        """Download a URL and convert to base64."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            return base64.b64encode(response.content).decode('utf-8')


@lru_cache()
def get_synthesis_service() -> SynthesisService:
    """Get cached synthesis service instance."""
    return SynthesisService()
