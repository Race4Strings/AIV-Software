"""
Calibration Service — BFI-2 Precision Tuning

Handles the 60-item Big Five Inventory-2 questionnaire:
- Item definitions with domain/facet assignments and reverse-scoring flags
- Domain scoring (5 domains, 12 items each)
- Facet scoring (15 facets, 4 items each)
- Live ALCM comparison with confidence-weighted divergence
- Tiered result framing (high alignment / moderate / full divergence)

BFI-2 instrument: Soto & John (2017). Free for research use.
Copyright Oliver P. John & Christopher J. Soto, 2015.

IMPORTANT: BFI-2 data never leaves the Platform DB. The ALCM derives
personality independently. This service validates that derivation.
"""
import logging
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.bfi2_response import BFI2Response
from ..models.twin import Twin
from .alcm_client import get_alcm_client, ALCMConnectionError, ALCMTimeoutError

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# BFI-2 Item Definitions (60 items)
# ---------------------------------------------------------------------------
# Each item: (item_number, text, domain, facet, is_reverse_scored)
# Domain codes: E=Extraversion, A=Agreeableness, C=Conscientiousness,
#               N=Negative Emotionality, O=Open-Mindedness
# All items prefixed with "I am someone who..."

BFI2_ITEMS = [
    # --- Extraversion (12 items) ---
    (1, "Is outgoing, sociable.", "E", "sociability", False),
    (6, "Is dominant, acts as a leader.", "E", "assertiveness", False),
    (11, "Is full of energy.", "E", "energy_level", False),
    (16, "Tends to be quiet.", "E", "sociability", True),
    (21, "Has an assertive personality.", "E", "assertiveness", False),
    (26, "Shows a lot of enthusiasm.", "E", "energy_level", False),
    (31, "Is sometimes shy, introverted.", "E", "sociability", True),
    (36, "Finds it hard to influence people.", "E", "assertiveness", True),
    (41, "Is less active than other people.", "E", "energy_level", True),
    (46, "Is talkative.", "E", "sociability", False),
    (51, "Tends to take charge.", "E", "assertiveness", False),
    (56, "Has a lot of energy.", "E", "energy_level", False),

    # --- Agreeableness (12 items) ---
    (2, "Is compassionate, has a soft heart.", "A", "compassion", False),
    (7, "Is respectful, treats others with respect.", "A", "respectfulness", False),
    (12, "Tends to trust others.", "A", "trust", False),
    (17, "Can be cold and uncaring.", "A", "compassion", True),
    (22, "Is sometimes rude to others.", "A", "respectfulness", True),
    (27, "Tends to find fault with others.", "A", "trust", True),
    (32, "Is helpful and unselfish with others.", "A", "compassion", False),
    (37, "Is polite, courteous to others.", "A", "respectfulness", False),
    (42, "Assumes the best about people.", "A", "trust", False),
    (47, "Can be indifferent to others' feelings.", "A", "compassion", True),
    (52, "Starts arguments with others.", "A", "respectfulness", True),
    (57, "Is suspicious of others' intentions.", "A", "trust", True),

    # --- Conscientiousness (12 items) ---
    (3, "Tends to be disorganized.", "C", "organization", True),
    (8, "Tends to be lazy.", "C", "productiveness", True),
    (13, "Is dependable, steady.", "C", "responsibility", False),
    (18, "Keeps things neat and tidy.", "C", "organization", False),
    (23, "Is persistent, works until the task is finished.", "C", "productiveness", False),
    (28, "Is reliable, can always be counted on.", "C", "responsibility", False),
    (33, "Leaves a mess, doesn't clean up.", "C", "organization", True),
    (38, "Has difficulty getting started on tasks.", "C", "productiveness", True),
    (43, "Is sometimes irresponsible.", "C", "responsibility", True),
    (48, "Is organized, likes to keep things in order.", "C", "organization", False),
    (53, "Is efficient, gets things done.", "C", "productiveness", False),
    (58, "Can be somewhat careless.", "C", "responsibility", True),

    # --- Negative Emotionality (12 items) ---
    (4, "Worries a lot.", "N", "anxiety", False),
    (9, "Tends to feel depressed, blue.", "N", "depression", False),
    (14, "Is emotionally stable, not easily upset.", "N", "emotional_volatility", True),
    (19, "Is relaxed, handles stress well.", "N", "anxiety", True),
    (24, "Feels secure, comfortable with self.", "N", "depression", True),
    (29, "Is temperamental, gets emotional easily.", "N", "emotional_volatility", False),
    (34, "Is anxious, easily stressed.", "N", "anxiety", False),
    (39, "Often feels sad.", "N", "depression", False),
    (44, "Rarely gets irritated or upset.", "N", "emotional_volatility", True),
    (49, "Remains calm in tense situations.", "N", "anxiety", True),
    (54, "Tends to feel that they are a failure.", "N", "depression", False),
    (59, "Is moody, has up and down mood swings.", "N", "emotional_volatility", False),

    # --- Open-Mindedness (12 items) ---
    (5, "Is fascinated by art, music, or literature.", "O", "aesthetic_sensitivity", False),
    (10, "Is curious about many different things.", "O", "intellectual_curiosity", False),
    (15, "Is inventive, finds clever ways to do things.", "O", "creative_imagination", False),
    (20, "Has few artistic interests.", "O", "aesthetic_sensitivity", True),
    (25, "Avoids intellectual, philosophical discussions.", "O", "intellectual_curiosity", True),
    (30, "Has little creativity.", "O", "creative_imagination", True),
    (35, "Values art and beauty.", "O", "aesthetic_sensitivity", False),
    (40, "Likes to reflect, play with ideas.", "O", "intellectual_curiosity", False),
    (45, "Has an active imagination.", "O", "creative_imagination", False),
    (50, "Thinks art and beauty are not very important.", "O", "aesthetic_sensitivity", True),
    (55, "Has little interest in abstract ideas.", "O", "intellectual_curiosity", True),
    (60, "Is original, comes up with new ideas.", "O", "creative_imagination", False),
]

# Domain -> item numbers lookup
DOMAIN_ITEMS = {}
for item_num, _, domain, _, _ in BFI2_ITEMS:
    DOMAIN_ITEMS.setdefault(domain, []).append(item_num)

# Facet -> item numbers lookup
FACET_ITEMS = {}
for item_num, _, _, facet, _ in BFI2_ITEMS:
    FACET_ITEMS.setdefault(facet, []).append(item_num)

# Reverse-scored item numbers
REVERSE_ITEMS = {item_num for item_num, _, _, _, is_rev in BFI2_ITEMS if is_rev}

# Domain code -> full name mapping
DOMAIN_NAMES = {
    "E": "extraversion",
    "A": "agreeableness",
    "C": "conscientiousness",
    "N": "negative_emotionality",
    "O": "open_mindedness",
}

# Trait -> talent-facing language
TRAIT_DISPLAY_NAMES = {
    "extraversion": "Social energy patterns",
    "agreeableness": "Collaboration style",
    "conscientiousness": "Work and planning approach",
    "negative_emotionality": "Emotional expression",
    "open_mindedness": "Creative and intellectual curiosity",
}


# ---------------------------------------------------------------------------
# Scoring Functions
# ---------------------------------------------------------------------------

def reverse_score(value: int) -> int:
    """Reverse-score a BFI-2 item (1->5, 2->4, 3->3, 4->2, 5->1)."""
    return 6 - value


def _build_response_map(responses: list[dict]) -> dict[int, int]:
    """Convert response list to {item_number: value} dict."""
    return {r["item"]: r["value"] for r in responses}


def score_domain(response_map: dict[int, int], domain_code: str) -> Optional[float]:
    """Compute domain mean (1.0-5.0) after reverse-scoring."""
    item_nums = DOMAIN_ITEMS.get(domain_code, [])
    values = []
    for item_num in item_nums:
        if item_num not in response_map:
            continue
        val = response_map[item_num]
        if item_num in REVERSE_ITEMS:
            val = reverse_score(val)
        values.append(val)
    if not values:
        return None
    return sum(values) / len(values)


def score_facet(response_map: dict[int, int], facet_name: str) -> Optional[float]:
    """Compute facet mean (1.0-5.0) after reverse-scoring."""
    item_nums = FACET_ITEMS.get(facet_name, [])
    values = []
    for item_num in item_nums:
        if item_num not in response_map:
            continue
        val = response_map[item_num]
        if item_num in REVERSE_ITEMS:
            val = reverse_score(val)
        values.append(val)
    if not values:
        return None
    return sum(values) / len(values)


def score_all(responses: list[dict]) -> tuple[dict[str, float], dict[str, float]]:
    """Score all domains and facets from raw responses.

    Returns: (domain_scores, facet_scores)
        domain_scores: {"extraversion": 3.5, ...}
        facet_scores: {"sociability": 4.0, "assertiveness": 3.2, ...}
    """
    response_map = _build_response_map(responses)

    domain_scores = {}
    for code, name in DOMAIN_NAMES.items():
        score = score_domain(response_map, code)
        if score is not None:
            domain_scores[name] = round(score, 2)

    facet_scores = {}
    for facet_name in FACET_ITEMS:
        score = score_facet(response_map, facet_name)
        if score is not None:
            facet_scores[facet_name] = round(score, 2)

    return domain_scores, facet_scores


def alcm_to_bfi2_scale(alcm_score: float) -> float:
    """Normalize ALCM score (0-100) to BFI-2 scale (1.0-5.0)."""
    return (alcm_score / 100) * 4 + 1


# ---------------------------------------------------------------------------
# Live Comparison
# ---------------------------------------------------------------------------

# ALCM Big Five key -> BFI-2 domain name mapping
# Note: ALCM uses "neuroticism" (high = neurotic), BFI-2 uses
# "negative_emotionality" (same direction). No inversion needed.
ALCM_TO_BFI2_DOMAIN = {
    "extraversion": "extraversion",
    "agreeableness": "agreeableness",
    "conscientiousness": "conscientiousness",
    "neuroticism": "negative_emotionality",
    "openness": "open_mindedness",
}


def compute_comparison(
    bfi2_domains: dict[str, float],
    alcm_big_five: dict[str, float],
    alcm_confidence: float,
    per_trait_confidence: Optional[dict[str, float]] = None,
) -> dict:
    """Compare BFI-2 self-report against ALCM-derived Big Five.

    Args:
        bfi2_domains: {"extraversion": 3.5, ...} on 1-5 scale
        alcm_big_five: {"openness": 72, ...} on 0-100 scale
        alcm_confidence: overall personality confidence (0-1)
        per_trait_confidence: optional per-trait confidence (0-1)

    Returns:
        {
            "has_sufficient_data": bool,
            "traits": [
                {"name": "extraversion", "display_name": "...",
                 "bfi2_score": 3.5, "alcm_score": 3.8,
                 "aligned": True, "status": "aligned|divergent|insufficient_data"},
                ...
            ],
            "aligned_count": 4,
            "divergent_count": 1,
            "insufficient_count": 0,
            "tier": "high_alignment|moderate|full_divergence",
            "summary": "...",
            "aligned_traits": ["Communication style", ...],
            "divergent_traits": ["Assertiveness patterns"],
        }
    """
    CONFIDENCE_THRESHOLD = 0.5
    DIVERGENCE_THRESHOLD = 1.0

    # Check overall data sufficiency
    has_sufficient_data = alcm_confidence >= 0.3

    traits = []
    aligned = []
    divergent = []
    insufficient = []

    for alcm_key, bfi2_key in ALCM_TO_BFI2_DOMAIN.items():
        bfi2_val = bfi2_domains.get(bfi2_key)
        alcm_raw = alcm_big_five.get(alcm_key)

        if bfi2_val is None or alcm_raw is None:
            insufficient.append(bfi2_key)
            traits.append({
                "name": bfi2_key,
                "display_name": TRAIT_DISPLAY_NAMES.get(bfi2_key, bfi2_key),
                "bfi2_score": bfi2_val,
                "alcm_score": None,
                "aligned": None,
                "status": "insufficient_data",
            })
            continue

        alcm_normalized = alcm_to_bfi2_scale(alcm_raw)
        trait_conf = (per_trait_confidence or {}).get(alcm_key, alcm_confidence)

        if trait_conf < CONFIDENCE_THRESHOLD:
            insufficient.append(bfi2_key)
            status = "insufficient_data"
            is_aligned = None
        elif abs(bfi2_val - alcm_normalized) > DIVERGENCE_THRESHOLD:
            divergent.append(bfi2_key)
            status = "divergent"
            is_aligned = False
        else:
            aligned.append(bfi2_key)
            status = "aligned"
            is_aligned = True

        traits.append({
            "name": bfi2_key,
            "display_name": TRAIT_DISPLAY_NAMES.get(bfi2_key, bfi2_key),
            "bfi2_score": round(bfi2_val, 2),
            "alcm_score": round(alcm_normalized, 2),
            "confidence": round(trait_conf, 2),
            "aligned": is_aligned,
            "status": status,
        })

    # Determine tier
    div_count = len(divergent)
    ali_count = len(aligned)

    if div_count <= 1:
        tier = "high_alignment"
        summary = (
            "Your public presence is remarkably consistent with who you are privately. "
            "Your twin had a strong foundation from day one."
        )
    elif div_count <= 3:
        aligned_names = [TRAIT_DISPLAY_NAMES.get(t, t) for t in aligned]
        divergent_names = [TRAIT_DISPLAY_NAMES.get(t, t) for t in divergent]
        summary = (
            f"Your twin captured your {', '.join(aligned_names)} well from public data. "
            f"{', '.join(divergent_names)} {'is' if len(divergent_names) == 1 else 'are'} "
            f"where you differ from your public persona — exactly the kind of depth "
            f"only you can provide."
        )
    else:
        tier = "full_divergence"
        summary = (
            "Your public persona and private personality are significantly different — "
            "which means this was exceptionally valuable. Your twin now has dimensions "
            "it couldn't possibly get from public content."
        )

    if div_count <= 1:
        tier = "high_alignment"
    elif div_count <= 3:
        tier = "moderate"
    else:
        tier = "full_divergence"

    return {
        "has_sufficient_data": has_sufficient_data,
        "traits": traits,
        "aligned_count": ali_count,
        "divergent_count": div_count,
        "insufficient_count": len(insufficient),
        "tier": tier,
        "summary": summary,
        "aligned_traits": [TRAIT_DISPLAY_NAMES.get(t, t) for t in aligned],
        "divergent_traits": [TRAIT_DISPLAY_NAMES.get(t, t) for t in divergent],
    }


# ---------------------------------------------------------------------------
# Service Functions
# ---------------------------------------------------------------------------

def get_items_for_client() -> list[dict]:
    """Return BFI-2 items formatted for the frontend.

    Each item has: item_number, text (without "I am someone who..." prefix
    since the frontend shows that once at the top).
    """
    return [
        {"item": item_num, "text": text}
        for item_num, text, _, _, _ in BFI2_ITEMS
    ]


async def start_calibration(
    twin_id: UUID, user_id: UUID, source: str, db: AsyncSession,
) -> BFI2Response:
    """Create a new calibration record and return it with items."""
    record = BFI2Response(
        twin_id=twin_id,
        user_id=user_id,
        source=source,
        responses=[],
        progress=0,
    )
    db.add(record)
    await db.flush()
    return record


async def save_responses(
    cal_id: UUID, responses: list[dict], db: AsyncSession,
) -> BFI2Response:
    """Save partial or complete responses. Supports auto-save per item."""
    result = await db.execute(
        select(BFI2Response).where(BFI2Response.id == cal_id)
    )
    record = result.scalar_one_or_none()
    if not record:
        return None

    record.responses = responses
    record.progress = len(responses)
    await db.flush()
    return record


async def complete_calibration(cal_id: UUID, db: AsyncSession) -> BFI2Response:
    """Score the completed BFI-2 responses (domains + facets). No ALCM call."""
    result = await db.execute(
        select(BFI2Response).where(BFI2Response.id == cal_id)
    )
    record = result.scalar_one_or_none()
    if not record:
        return None

    if not record.responses or len(record.responses) < 60:
        return None

    domain_scores, facet_scores = score_all(record.responses)

    record.score_extraversion = domain_scores.get("extraversion")
    record.score_agreeableness = domain_scores.get("agreeableness")
    record.score_conscientiousness = domain_scores.get("conscientiousness")
    record.score_negative_emotionality = domain_scores.get("negative_emotionality")
    record.score_open_mindedness = domain_scores.get("open_mindedness")
    record.facet_scores = facet_scores
    record.completed = True
    record.completed_at = datetime.now(timezone.utc)
    record.progress = 60

    await db.flush()
    return record


async def get_calibration_status(twin_id: UUID, db: AsyncSession) -> dict:
    """Quick status check: has this twin completed calibration?"""
    result = await db.execute(
        select(BFI2Response)
        .where(BFI2Response.twin_id == twin_id)
        .order_by(desc(BFI2Response.created_at))
        .limit(1)
    )
    record = result.scalar_one_or_none()

    if not record:
        return {
            "has_calibration": False,
            "completed": False,
            "progress": 0,
            "calibration_id": None,
        }

    return {
        "has_calibration": True,
        "completed": record.completed,
        "progress": record.progress,
        "calibration_id": str(record.id),
        "started_at": record.started_at.isoformat() if record.started_at else None,
        "completed_at": record.completed_at.isoformat() if record.completed_at else None,
    }


async def get_calibrations(twin_id: UUID, db: AsyncSession) -> list[BFI2Response]:
    """List all calibration records for a twin (most recent first)."""
    result = await db.execute(
        select(BFI2Response)
        .where(BFI2Response.twin_id == twin_id)
        .order_by(desc(BFI2Response.created_at))
    )
    return list(result.scalars().all())


async def compute_live_comparison(twin_id: UUID, db: AsyncSession) -> dict:
    """Pull current ALCM Big Five, compare against stored BFI-2 scores.

    Returns live comparison with confidence-weighted divergence and tiered framing.
    Returns None if no completed calibration exists.
    """
    # Get most recent completed calibration
    result = await db.execute(
        select(BFI2Response)
        .where(BFI2Response.twin_id == twin_id, BFI2Response.completed.is_(True))
        .order_by(desc(BFI2Response.created_at))
        .limit(1)
    )
    record = result.scalar_one_or_none()
    if not record:
        return None

    bfi2_domains = {
        "extraversion": record.score_extraversion,
        "agreeableness": record.score_agreeableness,
        "conscientiousness": record.score_conscientiousness,
        "negative_emotionality": record.score_negative_emotionality,
        "open_mindedness": record.score_open_mindedness,
    }

    # Get twin's ALCM reference
    twin_result = await db.execute(select(Twin).where(Twin.id == twin_id))
    twin = twin_result.scalar_one_or_none()
    if not twin or not twin.alcm_twin_id:
        return {
            "has_sufficient_data": False,
            "message": "ALCM identity not yet linked. Comparison will be available after identity processing.",
            "bfi2_completed": True,
            "bfi2_completed_at": record.completed_at.isoformat() if record.completed_at else None,
        }

    # Pull live ALCM Big Five
    alcm = get_alcm_client()
    try:
        health = await alcm.get_health(str(twin.alcm_twin_id))
    except (ALCMConnectionError, ALCMTimeoutError):
        return {
            "has_sufficient_data": False,
            "message": "Identity engine temporarily unavailable. Try again shortly.",
            "bfi2_completed": True,
        }

    if health.get("_alcm_unavailable"):
        return {
            "has_sufficient_data": False,
            "message": "Identity engine temporarily unavailable. Try again shortly.",
            "bfi2_completed": True,
        }

    # Extract Big Five and confidence from ALCM health response
    personality_core = health.get("personality_core", {})
    big_five = personality_core.get("big_five", {})
    alcm_confidence = health.get("personality_confidence", 0.0)

    if not big_five:
        return {
            "has_sufficient_data": False,
            "message": "Your twin is still processing data. Comparison will be available once enough information has been analyzed.",
            "bfi2_completed": True,
            "bfi2_completed_at": record.completed_at.isoformat() if record.completed_at else None,
        }

    return compute_comparison(
        bfi2_domains=bfi2_domains,
        alcm_big_five=big_five,
        alcm_confidence=alcm_confidence,
    )
