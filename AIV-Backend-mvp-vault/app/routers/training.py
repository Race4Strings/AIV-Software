"""Training Contributions endpoints.

Handles the lifecycle of training data submissions for a twin:
list, create, approve, reject.  Maps between the internal
TrainingContribution model and the frontend TrainingSubmission shape.
"""

import json
import logging
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..middleware import require_auth
from ..models.training_contribution import TrainingContribution
from ..models.twin import Twin

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Training"])


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------

class CreateTrainingRequest(BaseModel):
    category: str = "commercial"
    change_description: str
    target_fields: list[str] = []
    content: dict


class RejectTrainingRequest(BaseModel):
    reason: str = ""


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_STATUS_MAP = {
    "AUTO_APPROVED": "approved",
    "APPROVED": "approved",
    "PENDING_APPROVAL": "pending",
    "REJECTED": "rejected",
}


def _serialize(record: TrainingContribution) -> dict:
    """Map a TrainingContribution row to the frontend TrainingSubmission shape."""

    # Derive target_fields from alcm_processing_result when available
    target_fields: list[str] = []
    if record.alcm_processing_result and isinstance(record.alcm_processing_result, dict):
        target_fields = record.alcm_processing_result.get("categories_affected", [])

    # If nothing from ALCM, try parsing from the stored content
    if not target_fields:
        try:
            parsed = json.loads(record.content) if isinstance(record.content, str) else record.content
            if isinstance(parsed, dict):
                target_fields = parsed.get("target_fields", [])
        except (json.JSONDecodeError, TypeError):
            pass

    return {
        "id": str(record.id),
        "twin_id": str(record.twin_id),
        "category": record.modality or "commercial",
        "content": record.content,
        "status": _STATUS_MAP.get(record.approval_status, "pending"),
        "target_fields": target_fields,
        "change_description": record.source_description or "",
        "created_at": record.created_at.isoformat() if record.created_at else None,
    }


async def _get_twin_or_404(twin_id: UUID, db: AsyncSession) -> Twin:
    result = await db.execute(select(Twin).where(Twin.id == twin_id))
    twin = result.scalar_one_or_none()
    if not twin:
        raise HTTPException(status_code=404, detail="Twin not found")
    return twin


async def _alcm_classify_background(
    twin: Twin,
    contribution: TrainingContribution,
    db_url: str,
) -> None:
    """Run ALCM classification in the background for a new contribution."""
    try:
        from ..services.alcm_client import get_alcm_client

        client = get_alcm_client()
        if not client.is_available:
            logger.info("ALCM not available — skipping background classification")
            return

        alcm_twin_id = str(twin.alcm_twin_id) if twin.alcm_twin_id else None
        if not alcm_twin_id:
            logger.info("Twin %s has no alcm_twin_id — skipping classification", twin.id)
            return

        # Classify
        result = await client.classify(
            alcm_twin_id=alcm_twin_id,
            content=contribution.content,
            modality=contribution.modality or "STRUCTURED_DATA",
            contributor_id=str(contribution.contributor_id),
            contributor_type=contribution.contributor_type,
        )

        # Persist result back — need a fresh session for background work
        from ..database import async_session_maker

        async with async_session_maker() as session:
            db_contribution = await session.get(TrainingContribution, contribution.id)
            if db_contribution:
                db_contribution.alcm_processing_status = "CLASSIFIED"
                db_contribution.alcm_processing_result = result
                await session.commit()
                logger.info(
                    "ALCM classification complete for contribution %s",
                    contribution.id,
                )
    except Exception:
        logger.exception("Background ALCM classification failed for contribution %s", contribution.id)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/twins/{twin_id}/training")
async def list_training_contributions(
    twin_id: str,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """List all training contributions for a twin, most recent first."""
    twin_uuid = UUID(twin_id)
    await _get_twin_or_404(twin_uuid, db)

    result = await db.execute(
        select(TrainingContribution)
        .where(TrainingContribution.twin_id == twin_uuid)
        .order_by(TrainingContribution.created_at.desc())
    )
    contributions = result.scalars().all()
    return [_serialize(c) for c in contributions]


@router.post("/twins/{twin_id}/training", status_code=201)
async def create_training_contribution(
    twin_id: str,
    body: CreateTrainingRequest,
    background_tasks: BackgroundTasks,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Create a new training contribution for a twin."""
    twin_uuid = UUID(twin_id)
    twin = await _get_twin_or_404(twin_uuid, db)

    # Determine contributor type from user role
    user_role = (user.get("role") or "TALENT").upper()
    contributor_type_map = {
        "TALENT": "TALENT",
        "MANAGER": "TEAM_MEMBER",
        "ADMIN": "AIV_INTERNAL",
        "TEAM_MEMBER": "TEAM_MEMBER",
    }
    contributor_type = contributor_type_map.get(user_role, "TALENT")

    # Store target_fields inside the content payload so it round-trips
    content_payload = dict(body.content)
    if body.target_fields:
        content_payload["target_fields"] = body.target_fields

    contribution = TrainingContribution(
        twin_id=twin_uuid,
        contributor_id=UUID(user["id"]),
        contributor_type=contributor_type,
        modality="STRUCTURED_DATA",
        content=json.dumps(content_payload),
        source_description=body.change_description,
        approval_status="PENDING_APPROVAL",
        alcm_processing_status="PENDING",
    )
    db.add(contribution)
    await db.commit()
    await db.refresh(contribution)

    logger.info(
        "Training contribution %s created for twin %s by user %s",
        contribution.id, twin_id, user["id"],
    )

    # Kick off ALCM classification in the background
    background_tasks.add_task(
        _alcm_classify_background,
        twin,
        contribution,
        "",  # db_url placeholder — we use async_session_factory inside
    )

    return _serialize(contribution)


@router.put("/twins/{twin_id}/training/{submission_id}/approve")
async def approve_training_contribution(
    twin_id: str,
    submission_id: str,
    background_tasks: BackgroundTasks,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Approve a training contribution. Triggers ALCM attribution if classified."""
    twin_uuid = UUID(twin_id)
    twin = await _get_twin_or_404(twin_uuid, db)

    result = await db.execute(
        select(TrainingContribution).where(
            TrainingContribution.id == UUID(submission_id),
            TrainingContribution.twin_id == twin_uuid,
        )
    )
    contribution = result.scalar_one_or_none()
    if not contribution:
        raise HTTPException(status_code=404, detail="Training contribution not found")

    if contribution.approval_status == "APPROVED":
        return _serialize(contribution)

    contribution.approval_status = "APPROVED"
    contribution.approved_by = UUID(user["id"])
    contribution.approved_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(contribution)

    logger.info(
        "Training contribution %s approved by %s",
        submission_id, user["id"],
    )

    # If classified but not yet applied, kick off ALCM attribution
    if (
        contribution.alcm_processing_status == "CLASSIFIED"
        and contribution.alcm_processing_result
        and twin.alcm_twin_id
    ):
        background_tasks.add_task(
            _alcm_attribute_background,
            twin,
            contribution,
        )

    return _serialize(contribution)


@router.put("/twins/{twin_id}/training/{submission_id}/reject")
async def reject_training_contribution(
    twin_id: str,
    submission_id: str,
    body: RejectTrainingRequest = RejectTrainingRequest(),
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Reject a training contribution."""
    twin_uuid = UUID(twin_id)
    await _get_twin_or_404(twin_uuid, db)

    result = await db.execute(
        select(TrainingContribution).where(
            TrainingContribution.id == UUID(submission_id),
            TrainingContribution.twin_id == twin_uuid,
        )
    )
    contribution = result.scalar_one_or_none()
    if not contribution:
        raise HTTPException(status_code=404, detail="Training contribution not found")

    contribution.approval_status = "REJECTED"
    contribution.rejection_reason = body.reason or None
    await db.commit()
    await db.refresh(contribution)

    logger.info(
        "Training contribution %s rejected by %s",
        submission_id, user["id"],
    )

    return _serialize(contribution)


# ---------------------------------------------------------------------------
# Background: ALCM attribution after approval
# ---------------------------------------------------------------------------

async def _alcm_attribute_background(
    twin: Twin,
    contribution: TrainingContribution,
) -> None:
    """Apply classified data to the twin's identity via ALCM /attribute."""
    try:
        from ..services.alcm_client import get_alcm_client

        client = get_alcm_client()
        if not client.is_available:
            logger.info("ALCM not available — skipping attribution")
            return

        alcm_twin_id = str(twin.alcm_twin_id)
        classified_data = contribution.alcm_processing_result

        result = await client.attribute(
            alcm_twin_id=alcm_twin_id,
            classified_data=classified_data,
        )

        from ..database import async_session_maker

        async with async_session_maker() as session:
            db_contribution = await session.get(TrainingContribution, contribution.id)
            if db_contribution:
                db_contribution.alcm_processing_status = "APPLIED"
                # Merge attribution result into the existing processing result
                existing = db_contribution.alcm_processing_result or {}
                existing["attribution_result"] = result
                db_contribution.alcm_processing_result = existing
                await session.commit()
                logger.info(
                    "ALCM attribution applied for contribution %s",
                    contribution.id,
                )
    except Exception:
        logger.exception(
            "Background ALCM attribution failed for contribution %s",
            contribution.id,
        )
