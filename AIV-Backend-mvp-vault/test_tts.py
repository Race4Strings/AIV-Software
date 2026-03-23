"""
Test script for ElevenLabs TTS
"""
import asyncio
import os
import sys

# Add app to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

from app.services.elevenlabs_service import get_elevenlabs_service


async def test_tts():
    elevenlabs = get_elevenlabs_service()
    
    if not elevenlabs.is_configured:
        print("❌ ElevenLabs is not configured. Set ELEVENLABS_API_KEY in .env")
        return
    
    print("✅ ElevenLabs is configured")
    
    # Get voice ID from command line or use a test voice
    voice_id = sys.argv[1] if len(sys.argv) > 1 else None
    
    if not voice_id:
        print("\nUsage: python test_tts.py <voice_id>")
        print("\nTo get your voice_id, check the clone in the database:")
        print("  SELECT elevenlabs_voice_id FROM clone_table WHERE owner_id = 'YOUR_USER_ID';")
        return
    
    print(f"\n🎤 Testing TTS with voice ID: {voice_id}")
    
    test_text = "Hey there! This is a test of the text to speech system. How does my voice sound?"
    
    print(f"📝 Text: {test_text}")
    print("⏳ Generating audio...")
    
    audio_bytes = await elevenlabs.text_to_speech(
        voice_id=voice_id,
        text=test_text
    )
    
    if audio_bytes:
        # Save to file
        output_file = "test_output.mp3"
        with open(output_file, "wb") as f:
            f.write(audio_bytes)
        print(f"✅ Success! Audio saved to: {output_file}")
        print(f"   File size: {len(audio_bytes)} bytes")
        print(f"\n🎧 Play it with: open {output_file}")
    else:
        print("❌ Failed to generate audio")


if __name__ == "__main__":
    asyncio.run(test_tts())
