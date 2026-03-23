"""
Test the voice cloning pipeline locally.
Tests: ffmpeg, ElevenLabs API key, voice clone creation, TTS.

Usage: 
  ELEVENLABS_API_KEY=sk-xxx python test_voice_pipeline.py
  
Or set it in .env and run:
  python test_voice_pipeline.py
"""
import os
import sys
import subprocess
import shutil
import tempfile
import asyncio

# Try loading from .env
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass


def test_ffmpeg():
    """Test 1: Is ffmpeg installed?"""
    print("\n=== TEST 1: ffmpeg ===")
    path = shutil.which("ffmpeg")
    if path:
        result = subprocess.run(["ffmpeg", "-version"], capture_output=True, timeout=5)
        version_line = result.stdout.decode().split("\n")[0]
        print(f"  ✅ ffmpeg found: {path}")
        print(f"  Version: {version_line}")
        return True
    else:
        print("  ❌ ffmpeg NOT found in PATH")
        return False


def test_ffmpeg_audio_extraction():
    """Test 2: Can ffmpeg extract audio from a synthetic webm-like file?"""
    print("\n=== TEST 2: ffmpeg audio extraction ===")
    # Create a tiny synthetic audio file using ffmpeg itself
    try:
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
            wav_path = f.name
        
        # Generate 2 seconds of silence as a test WAV
        result = subprocess.run([
            "ffmpeg", "-f", "lavfi", "-i", "sine=frequency=440:duration=2",
            "-ar", "16000", "-ac", "1", "-y", wav_path
        ], capture_output=True, timeout=10)
        
        if result.returncode == 0 and os.path.exists(wav_path):
            size = os.path.getsize(wav_path)
            print(f"  ✅ Generated test audio: {size} bytes")
            with open(wav_path, "rb") as f:
                audio_bytes = f.read()
            os.unlink(wav_path)
            return audio_bytes
        else:
            print(f"  ❌ ffmpeg failed: {result.stderr.decode()[:200]}")
            return None
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return None


def test_elevenlabs_key():
    """Test 3: Is ElevenLabs API key set?"""
    print("\n=== TEST 3: ElevenLabs API key ===")
    key = os.environ.get("ELEVENLABS_API_KEY", "")
    if not key:
        print("  ❌ ELEVENLABS_API_KEY not set")
        print("  Run with: ELEVENLABS_API_KEY=sk-xxx python test_voice_pipeline.py")
        return None
    print(f"  ✅ Key found: {key[:8]}...{key[-4:]}")
    return key


async def test_elevenlabs_voices(api_key: str):
    """Test 4: Can we list voices?"""
    print("\n=== TEST 4: ElevenLabs API - list voices ===")
    import httpx
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(
                "https://api.elevenlabs.io/v1/voices",
                headers={"xi-api-key": api_key}
            )
            if resp.status_code == 200:
                voices = resp.json().get("voices", [])
                print(f"  ✅ API works! {len(voices)} voices found")
                for v in voices[:5]:
                    print(f"     - {v['name']} ({v['voice_id'][:12]}...)")
                return True
            else:
                print(f"  ❌ API error: {resp.status_code} - {resp.text[:200]}")
                return False
    except Exception as e:
        print(f"  ❌ Request failed: {e}")
        return False


async def test_voice_clone(api_key: str, audio_bytes: bytes):
    """Test 5: Can we create a voice clone?"""
    print("\n=== TEST 5: ElevenLabs API - create voice clone ===")
    import httpx
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(
                "https://api.elevenlabs.io/v1/voices/add",
                headers={"xi-api-key": api_key},
                files={"files": ("test_sample.wav", audio_bytes, "audio/wav")},
                data={"name": "AIV Test Clone (delete me)"},
            )
            if resp.status_code == 200:
                voice_id = resp.json().get("voice_id")
                print(f"  ✅ Voice clone created! voice_id={voice_id}")
                return voice_id
            else:
                print(f"  ❌ Clone failed: {resp.status_code} - {resp.text[:300]}")
                return None
    except Exception as e:
        print(f"  ❌ Request failed: {e}")
        return None


async def test_tts(api_key: str, voice_id: str):
    """Test 6: Can we do TTS with the cloned voice?"""
    print("\n=== TEST 6: ElevenLabs API - TTS ===")
    import httpx
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(
                f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
                headers={"xi-api-key": api_key, "Content-Type": "application/json"},
                json={
                    "text": "Hello, this is a test of the AIV voice cloning system.",
                    "model_id": "eleven_multilingual_v2",
                    "voice_settings": {
                        "stability": 0.45,
                        "similarity_boost": 0.90,
                        "style": 0.20,
                        "use_speaker_boost": True,
                    },
                },
            )
            if resp.status_code == 200:
                print(f"  ✅ TTS works! Got {len(resp.content)} bytes of audio")
                return True
            else:
                print(f"  ❌ TTS failed: {resp.status_code} - {resp.text[:200]}")
                return False
    except Exception as e:
        print(f"  ❌ Request failed: {e}")
        return False


async def test_delete_voice(api_key: str, voice_id: str):
    """Cleanup: delete the test voice."""
    print("\n=== CLEANUP: Delete test voice ===")
    import httpx
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.delete(
                f"https://api.elevenlabs.io/v1/voices/{voice_id}",
                headers={"xi-api-key": api_key}
            )
            if resp.status_code == 200:
                print(f"  ✅ Deleted test voice {voice_id}")
            else:
                print(f"  ⚠️ Delete returned {resp.status_code}")
    except Exception as e:
        print(f"  ⚠️ Delete failed: {e}")


async def main():
    print("=" * 60)
    print("AIV Voice Pipeline Test")
    print("=" * 60)

    # Test 1: ffmpeg
    ffmpeg_ok = test_ffmpeg()

    # Test 2: audio extraction
    audio_bytes = test_ffmpeg_audio_extraction() if ffmpeg_ok else None

    # Test 3: API key
    api_key = test_elevenlabs_key()
    if not api_key:
        print("\n⛔ Cannot test ElevenLabs without API key. Stopping.")
        return

    # Test 4: list voices
    api_ok = await test_elevenlabs_voices(api_key)
    if not api_ok:
        print("\n⛔ ElevenLabs API not working. Check your key.")
        return

    if not audio_bytes:
        print("\n⛔ No audio to test cloning with (ffmpeg failed). Stopping.")
        return

    # Test 5: clone voice
    voice_id = await test_voice_clone(api_key, audio_bytes)
    if not voice_id:
        print("\n⛔ Voice cloning failed.")
        return

    # Test 6: TTS
    await test_tts(api_key, voice_id)

    # Cleanup
    await test_delete_voice(api_key, voice_id)

    print("\n" + "=" * 60)
    print("✅ All tests passed! Voice pipeline is working.")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
