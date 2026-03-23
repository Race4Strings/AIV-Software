"""
DimensionExpander Service

Expands a single paragraph input into 10 personality dimensions using AI.
"""
from typing import Dict, Optional
import json

from .gemini_service import get_gemini_service


# The 10 personality dimensions
DIMENSIONS = [
    "mind",         # How you think, learn, process information
    "heart",        # Emotions, values, what you care about
    "spirit",       # Meaning, purpose, beliefs, philosophy
    "physicality",  # Energy, habits, senses, physical preferences
    "experiences",  # Key life events, memories that shaped you
    "relationships", # How you interact with others
    "surroundings", # Environment preferences, where you thrive
    "work",         # Career, productivity, professional style
    "ethics",       # Moral compass, decision-making principles
    "future"        # Goals, aspirations, fears, dreams
]


EXPANSION_PROMPT = """Analyze this self-description and extract personality insights for 10 dimensions.

Self-description from the user:
"{raw_input}"

For each dimension below, extract relevant information from the description.
If a dimension is not explicitly mentioned, make reasonable inferences based on 
what IS mentioned, and mark those with [inferred].

Dimensions to extract:
1. mind - How they think, learn, process information
2. heart - Emotions, values, what they care about
3. spirit - Meaning, purpose, beliefs, philosophy
4. physicality - Energy, habits, senses, physical preferences
5. experiences - Key life events, memories that shaped them
6. relationships - How they interact with others
7. surroundings - Environment preferences, where they thrive
8. work - Career, productivity, professional style
9. ethics - Moral compass, decision-making principles
10. future - Goals, aspirations, fears, dreams

IMPORTANT:
- Write in third person (e.g., "They are analytical..." not "You are...")
- Be specific and detailed, using the user's own words where possible
- Each dimension should be 2-4 sentences
- If truly no information available, write "[Needs more information]"

Return ONLY valid JSON in this exact format:
{{
    "mind": "Description of how they think...",
    "heart": "Description of their emotions and values...",
    "spirit": "Description of their beliefs and purpose...",
    "physicality": "Description of their physical traits and habits...",
    "experiences": "Description of key life events...",
    "relationships": "Description of how they interact with others...",
    "surroundings": "Description of their environment preferences...",
    "work": "Description of their work style...",
    "ethics": "Description of their moral principles...",
    "future": "Description of their goals and aspirations..."
}}
"""


class DimensionExpander:
    """Expands single paragraph input into 10 personality dimensions."""
    
    def __init__(self):
        self.gemini = get_gemini_service()
    
    async def expand(self, raw_input: str) -> Dict[str, Dict]:
        """
        Expand a single paragraph into 10 personality dimensions.
        
        Args:
            raw_input: The user's self-description paragraph
            
        Returns:
            Dictionary with 10 dimensions, each containing:
            {
                "mind": {
                    "content": "...",
                    "source": "initial",
                    "updated_at": "ISO timestamp"
                },
                ...
            }
        """
        if not raw_input or len(raw_input.strip()) < 50:
            raise ValueError("Input must be at least 50 characters")
        
        prompt = EXPANSION_PROMPT.format(raw_input=raw_input)
        
        # Use Gemini to expand
        response = await self.gemini.generate_text(
            prompt=prompt,
            temperature=0.7,
            max_tokens=2000
        )
        
        # Parse JSON response
        dimensions_raw = self._parse_json_response(response)
        
        # Format with metadata
        from datetime import datetime
        now = datetime.utcnow().isoformat() + "Z"
        
        dimensions = {}
        for key in DIMENSIONS:
            content = dimensions_raw.get(key, "[Needs more information]")
            dimensions[key] = {
                "content": content,
                "source": "initial",
                "updated_at": now
            }
        
        return dimensions
    
    def _parse_json_response(self, response: str) -> Dict:
        """Parse JSON from LLM response, handling markdown code blocks."""
        text = response.strip()
        
        # Remove markdown code blocks if present
        if text.startswith("```"):
            lines = text.split("\n")
            # Remove first line (```json) and last line (```)
            text = "\n".join(lines[1:-1])
        
        try:
            return json.loads(text)
        except json.JSONDecodeError as e:
            print(f"Failed to parse JSON: {e}")
            print(f"Response was: {text[:500]}")
            # Return empty dimensions
            return {key: "[Error parsing response]" for key in DIMENSIONS}


# Singleton instance
_dimension_expander: Optional[DimensionExpander] = None


def get_dimension_expander() -> DimensionExpander:
    """Get singleton DimensionExpander instance."""
    global _dimension_expander
    if _dimension_expander is None:
        _dimension_expander = DimensionExpander()
    return _dimension_expander
