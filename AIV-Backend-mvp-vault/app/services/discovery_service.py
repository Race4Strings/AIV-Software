"""Discovery service — parallel identity discovery via Wikipedia, Google CSE, and Gemini.

Used during onboarding Step 0 to build an initial identity profile from a name/handle/URL.
Each source runs independently and fails gracefully — partial results are still useful.
"""
import asyncio
import logging
import urllib.parse
from dataclasses import dataclass, field
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

WIKIPEDIA_API = "https://en.wikipedia.org/api/rest_v1/page/summary"
GOOGLE_CSE_API = "https://customsearch.googleapis.com/customsearch/v1"


@dataclass
class DiscoveryResult:
    """Merged result from all discovery sources."""
    name: str
    wikipedia: Optional[dict] = None
    google_results: list = field(default_factory=list)
    gemini_profile: Optional[dict] = None
    detected_categories: list = field(default_factory=list)
    social_profiles: list = field(default_factory=list)
    sources_used: list = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "wikipedia": self.wikipedia,
            "google_results": self.google_results,
            "gemini_profile": self.gemini_profile,
            "detected_categories": self.detected_categories,
            "social_profiles": self.social_profiles,
            "sources_used": self.sources_used,
        }


async def _fetch_wikipedia(name: str) -> Optional[dict]:
    """Fetch Wikipedia summary for a name. Returns None on failure."""
    search_name = name.strip().replace(" ", "_")
    url = f"{WIKIPEDIA_API}/{urllib.parse.quote(search_name)}"
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(url, headers={"Accept": "application/json"})
        if resp.status_code == 404:
            # Try search API as fallback
            search_url = f"https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch={urllib.parse.quote(name)}&format=json&srlimit=1"
            search_resp = await client.get(search_url)
            if search_resp.status_code == 200:
                data = search_resp.json()
                results = data.get("query", {}).get("search", [])
                if results:
                    title = results[0]["title"].replace(" ", "_")
                    resp = await client.get(
                        f"{WIKIPEDIA_API}/{urllib.parse.quote(title)}",
                        headers={"Accept": "application/json"},
                    )
                else:
                    return None
        if resp.status_code != 200:
            return None
        data = resp.json()
        if data.get("type") == "disambiguation":
            return {"type": "disambiguation", "title": data.get("title"), "extract": data.get("extract", "")}
        return {
            "title": data.get("title"),
            "extract": data.get("extract", ""),
            "description": data.get("description", ""),
            "thumbnail": data.get("thumbnail", {}).get("source"),
            "content_urls": data.get("content_urls", {}).get("desktop", {}).get("page"),
        }


async def _fetch_google_cse(name: str, api_key: str, cse_id: str) -> list:
    """Fetch Google Custom Search results for a name. Returns empty list on failure."""
    if not api_key or not cse_id:
        return []
    params = {
        "key": api_key,
        "cx": cse_id,
        "q": name,
        "num": 10,
    }
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(GOOGLE_CSE_API, params=params)
        if resp.status_code != 200:
            logger.warning(f"Google CSE returned {resp.status_code}: {resp.text[:200]}")
            return []
        data = resp.json()
        items = data.get("items", [])
        results = []
        social_domains = {
            "instagram.com", "twitter.com", "x.com", "facebook.com",
            "tiktok.com", "youtube.com", "linkedin.com", "spotify.com",
            "soundcloud.com", "twitch.tv",
        }
        for item in items:
            link = item.get("link", "")
            domain = urllib.parse.urlparse(link).netloc.replace("www.", "")
            results.append({
                "title": item.get("title"),
                "link": link,
                "snippet": item.get("snippet"),
                "domain": domain,
                "is_social": domain in social_domains,
            })
        return results


async def _synthesize_with_gemini(
    name: str, context: str, wikipedia_data: Optional[dict], search_results: list, api_key: str
) -> Optional[dict]:
    """Use Gemini to synthesize an identity profile from all gathered data."""
    if not api_key:
        return None

    from google import genai

    client = genai.Client(api_key=api_key)

    wiki_context = ""
    if wikipedia_data and wikipedia_data.get("extract"):
        wiki_context = f"\n\nWikipedia summary: {wikipedia_data['extract']}"

    search_context = ""
    if search_results:
        snippets = [f"- {r['title']}: {r['snippet']}" for r in search_results[:5] if r.get("snippet")]
        if snippets:
            search_context = f"\n\nSearch results:\n" + "\n".join(snippets)

    prompt = f"""Given the following information about "{name}", create a structured identity profile.
User input: {context}
{wiki_context}
{search_context}

Return a JSON object with these fields:
- "bio": A 2-3 sentence biography
- "known_for": List of 3-5 things they're known for
- "suggested_categories": List of 1-3 identity categories from: MUSIC, ENTERTAINMENT, SPORTS, BUSINESS, ACADEMIA, CULINARY, FASHION, MEDIA, GOVERNMENT, WELLNESS, ARTS, CHARACTER, VIRTUAL
- "social_profiles": List of objects with "platform" and "url" for any social profiles found
- "career_highlights": List of 3-5 career highlights
- "nationality": Country of origin if known, otherwise null

Return ONLY valid JSON, no markdown formatting."""

    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=prompt,
        config={
            "response_mime_type": "application/json",
            "temperature": 0.3,
        },
    )
    import json
    try:
        return json.loads(response.text)
    except (json.JSONDecodeError, AttributeError):
        logger.warning(f"Gemini returned non-JSON response for {name}")
        return None


async def discover_identity(
    name: str,
    context: str = "",
    google_cse_api_key: str = "",
    google_cse_id: str = "",
    gemini_api_key: str = "",
) -> DiscoveryResult:
    """Run Wikipedia + Google CSE + Gemini discovery in parallel.

    Each source is independent and fails gracefully.
    Results are merged into a single DiscoveryResult.
    """
    result = DiscoveryResult(name=name)

    # Phase 1: Wikipedia + Google CSE in parallel
    wiki_task = asyncio.create_task(_safe_run(_fetch_wikipedia(name), "wikipedia"))
    cse_task = asyncio.create_task(_safe_run(_fetch_google_cse(name, google_cse_api_key, google_cse_id), "google_cse"))

    wiki_data, cse_data = await asyncio.gather(wiki_task, cse_task)

    if wiki_data:
        result.wikipedia = wiki_data
        result.sources_used.append("wikipedia")

    if cse_data:
        result.google_results = cse_data
        result.social_profiles = [r for r in cse_data if r.get("is_social")]
        result.sources_used.append("google_cse")

    # Phase 2: Gemini synthesis (uses results from phase 1)
    gemini_data = await _safe_run(
        _synthesize_with_gemini(name, context, wiki_data, cse_data or [], gemini_api_key),
        "gemini",
    )
    if gemini_data:
        result.gemini_profile = gemini_data
        result.sources_used.append("gemini")
        # Use Gemini's suggested categories if available
        if gemini_data.get("suggested_categories"):
            result.detected_categories = gemini_data["suggested_categories"]

    return result


async def _safe_run(coro, source_name: str):
    """Run a coroutine with exception handling. Returns None on failure."""
    try:
        return await coro
    except Exception as e:
        logger.warning(f"Discovery source '{source_name}' failed: {e}")
        return None
