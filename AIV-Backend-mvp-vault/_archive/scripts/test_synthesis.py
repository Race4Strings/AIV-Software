"""
Test script to run AI personality synthesis on test user's clone.
Run with: python -m app.scripts.test_synthesis
"""

import asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.config import get_settings
from app.models.clone import Clone
from app.services.synthesis_service import SynthesisService

# Sample narrative answers for testing
SAMPLE_NARRATIVE = {
    "q1": "I'm a visual and intuitive thinker - I see problems as interconnected systems rather than linear steps. I retain random trivia really well but forget names immediately. My humor is dry and sarcastic, often self-deprecating. When learning something new, I dive in headfirst and learn by breaking things. My internal dialogue is constant and often debates itself.",
    
    "q2": "I feel deeply but express it sparingly. My core values are authenticity, curiosity, and independence. I express love through acts of service and quality time, not words. Anger comes out as cold silence rather than explosions. Joy comes from solving puzzles, helping others succeed, and late-night conversations. I cope with vulnerability by intellectualizing it.",
    
    "q3": "I find meaning in creating things that outlive me - code, ideas, connections. I'm spiritually curious but skeptical of organized religion. 'The good life' means having interesting problems to solve, people who challenge me, and the freedom to explore. I hope to leave behind tools and ideas that help others think differently.",
    
    "q4": "Definitely a night owl - my brain doesn't wake up until noon. I love the smell of rain, the sound of keyboards clicking, and the feeling of warm coffee mugs. I have a complicated relationship with exercise - I know I should but... Netflix. I gesture a lot when explaining things and pace when thinking.",
    
    "q5": "Dropping out of a 'safe' career path to pursue tech was terrifying but defining. My biggest failure was a startup that crashed - but it taught me more than any success. My earliest vivid memory is taking apart electronics to see how they worked. Traveling solo through Asia fundamentally changed how I see the world.",
    
    "q6": "I'm usually the quiet observer until I have something valuable to add, then I take charge. I have strong boundaries around my time and energy. I resolve conflict through direct but calm conversation - I hate passive aggression. My parents and one particular mentor shaped who I am. I show loyalty through reliability.",
    
    "q7": "I thrive in organized chaos - my desk looks messy but I know where everything is. My ideal space has good lighting, minimal noise, and a comfortable chair. Daily rituals include morning coffee while reading news, afternoon walks, and evening coding sessions. I'm financially cautious but will spend on tools and experiences.",
    
    "q8": "Success means having impact and autonomy, not titles or money. I enter flow state when coding with music, late at night, with a clear problem to solve. I lead by example rather than authority. Criticism stings initially but I process it and use it. I work well under pressure but prefer not living there.",
    
    "q9": "I believe in situational ethics over absolute rules. The 'right' thing depends on context and consequences. I try to balance self-interest with collective good, leaning toward collective when it matters. I'm passionate about digital privacy, education access, and mental health destigmatization.",
    
    "q10": "I hope to become someone who balances ambition with presence - achieving things while actually enjoying the journey. I embrace unpredictability in ideas but resist it in personal relationships. The world needs more nuance and less tribalism. People often think I'm aloof or cold when I'm actually just thinking deeply."
}

async def run_synthesis():
    """Run synthesis on test user's clone."""
    settings = get_settings()
    
    # Create async engine
    engine = create_async_engine(settings.database_url.replace("postgresql://", "postgresql+asyncpg://"))
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as db:
        # Find the first clone (test user's)
        result = await db.execute(
            select(Clone).limit(1)
        )
        clone = result.scalar_one_or_none()
        
        if not clone:
            print("❌ No test clone found")
            return
        
        print(f"📝 Found clone: {clone.name} (ID: {clone.id})")
        print(f"   Current status: {clone.status}")
        
        # Update with sample narrative
        clone.narrative_data = SAMPLE_NARRATIVE
        await db.commit()
        print("✅ Added sample narrative data")
        
        # Run synthesis
        synthesis = SynthesisService()
        if not synthesis.is_configured:
            print("❌ Synthesis service not configured (missing GOOGLE_GENAI_API_KEY)")
            return
        
        print("🧠 Running AI personality synthesis...")
        result = await synthesis.synthesize_personality(
            clone_name=clone.name,
            narrative_data=SAMPLE_NARRATIVE,
            voice_url=clone.voice_data.get("sampleUrl") if clone.voice_data else None,
            image_data=clone.image_data
        )
        
        if result:
            print("\n" + "="*60)
            print("✅ SYNTHESIS RESULT:")
            print("="*60)
            
            print(f"\n📄 Short Description:")
            print(f"   {result.get('shortDescription', 'N/A')}")
            
            print(f"\n📖 Background:")
            print(f"   {result.get('background', 'N/A')}")
            
            personality = result.get('personality', {})
            print(f"\n🎭 Personality Traits:")
            print(f"   {', '.join(personality.get('traits', []))}")
            
            print(f"\n💎 Core Values:")
            print(f"   {', '.join(personality.get('values', []))}")
            
            print(f"\n🗣️ Speaking Style:")
            print(f"   {personality.get('speaking_style', 'N/A')}")
            
            print(f"\n🤪 Quirks:")
            print(f"   {', '.join(personality.get('quirks', []))}")
            
            print(f"\n🧠 Knowledge Areas:")
            print(f"   {', '.join(personality.get('knowledge_areas', []))}")
            
            print(f"\n📜 System Prompt (first 500 chars):")
            system_prompt = result.get('systemPrompt', 'N/A')
            print(f"   {system_prompt[:500]}...")
            
            # Update the clone
            clone.system_prompt = result.get("systemPrompt")
            clone.personality = result.get("personality")
            clone.description = result.get("shortDescription")
            clone.background = result.get("background")
            await db.commit()
            print("\n✅ Clone updated with synthesized personality!")
            
        else:
            print("❌ Synthesis failed")


if __name__ == "__main__":
    asyncio.run(run_synthesis())
