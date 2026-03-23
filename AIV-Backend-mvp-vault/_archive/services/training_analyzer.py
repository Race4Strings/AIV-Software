"""
TrainingAnalyzer Service

Analyzes user messages during training to extract personality updates.
"""
from typing import Dict, List, Optional, Any
import json

from .gemini_service import get_gemini_service


ANALYSIS_PROMPT = """Analyze this message from a user who is training their AI clone.

The user is chatting with their clone to help it learn about them better.
Your job is to detect if this message reveals NEW information or CORRECTIONS about their personality.

USER MESSAGE:
"{message}"

CURRENT PERSONALITY DIMENSIONS:
{dimensions}

RECENT CONVERSATION CONTEXT:
{context}

DETECTION CRITERIA:
1. CORRECTION: User says "Actually...", "No, I...", "I don't...", contradicts existing dimensions
2. NEW INFO: User shares something not in current dimensions
3. CLARIFICATION: User elaborates on existing dimension with more detail
4. IRRELEVANT: Message is just chatting, no personality info

If this message contains personality-relevant information, return:
{{
    "has_update": true,
    "dimension": "mind|heart|spirit|physicality|experiences|relationships|surroundings|work|ethics|future",
    "update_type": "correction|new|clarification",
    "extracted_content": "What we learned about this dimension",
    "confidence": 0.0-1.0,
    "reasoning": "Why this is relevant"
}}

If the message is just casual chat with no personality info, return:
{{
    "has_update": false,
    "reasoning": "Why no update is needed"
}}

ONLY return valid JSON. Be conservative - only flag updates for clear, confident insights.
"""


class TrainingAnalyzer:
    """Analyzes training messages for personality updates."""
    
    def __init__(self):
        self.gemini = get_gemini_service()
    
    async def analyze_message(
        self,
        message: str,
        current_dimensions: Dict[str, Any],
        conversation_context: List[Dict[str, str]]
    ) -> Optional[Dict[str, Any]]:
        """
        Analyze a user message for personality insights.
        
        Args:
            message: The user's message
            current_dimensions: Current 10 dimensions
            conversation_context: Recent messages for context
            
        Returns:
            Analysis result with update info, or None if no update
        """
        # Format dimensions for prompt
        dims_text = ""
        for key, data in current_dimensions.items():
            content = data.get("content", "") if isinstance(data, dict) else str(data)
            dims_text += f"- {key}: {content[:300]}\n"
        
        # Format context
        context_text = ""
        for msg in conversation_context[-5:]:
            context_text += f"{msg['role'].upper()}: {msg['content']}\n"
        
        prompt = ANALYSIS_PROMPT.format(
            message=message,
            dimensions=dims_text,
            context=context_text
        )
        
        try:
            response = await self.gemini.generate_text(
                prompt=prompt,
                temperature=0.3,  # Low temperature for analytical task
                max_tokens=500
            )
            
            result = self._parse_json_response(response)
            
            # Only return if update found with good confidence
            if result.get("has_update") and result.get("confidence", 0) >= 0.7:
                return result
            
            return None
            
        except Exception as e:
            print(f"❌ Training analysis failed: {e}")
            return None
    
    def _parse_json_response(self, response: str) -> Dict:
        """Parse JSON from LLM response."""
        text = response.strip()
        
        # Remove markdown code blocks if present
        if text.startswith("```"):
            lines = text.split("\n")
            text = "\n".join(lines[1:-1])
        
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            return {"has_update": False, "reasoning": "Failed to parse analysis"}
    
    async def apply_update(
        self,
        dimensions: Dict[str, Any],
        analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Apply an update to dimensions based on analysis.
        
        Args:
            dimensions: Current dimensions
            analysis: The analysis result
            
        Returns:
            Updated dimensions
        """
        dimension_key = analysis.get("dimension")
        if not dimension_key or dimension_key not in dimensions:
            return dimensions
        
        current = dimensions[dimension_key]
        current_content = current.get("content", "") if isinstance(current, dict) else str(current)
        new_content = analysis.get("extracted_content", "")
        
        update_type = analysis.get("update_type")
        
        if update_type == "correction":
            # Replace the content
            updated_content = new_content
        elif update_type == "new":
            # Append to existing
            updated_content = f"{current_content} {new_content}".strip()
        else:  # clarification
            # Merge intelligently
            updated_content = f"{current_content} Additionally: {new_content}"
        
        from datetime import datetime
        dimensions[dimension_key] = {
            "content": updated_content,
            "source": "training",
            "updated_at": datetime.utcnow().isoformat() + "Z"
        }
        
        return dimensions


# Singleton
_training_analyzer: Optional[TrainingAnalyzer] = None


def get_training_analyzer() -> TrainingAnalyzer:
    """Get singleton TrainingAnalyzer instance."""
    global _training_analyzer
    if _training_analyzer is None:
        _training_analyzer = TrainingAnalyzer()
    return _training_analyzer
