"""Identity Package endpoints per spec Section 3.8."""
import hashlib
import json
from uuid import UUID, uuid4
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..middleware import require_auth
from ..models.twin import Twin
from ..models.identity_package_version import IdentityPackageVersion
from ..services.alcm_client import get_alcm_client
from ..services.blockchain_service import BlockchainService

router = APIRouter(tags=["Packages"])


def _serialize(v: IdentityPackageVersion) -> dict:
    return {
        "id": str(v.id), "twin_id": str(v.twin_id),
        "version_number": v.version_number,
        "alcm_snapshot_ref": v.alcm_snapshot_ref,
        "change_summary": v.change_summary,
        "change_categories": v.change_categories or [],
        "seal_id": str(v.seal_id),
        "seal_hash": v.seal_hash,
        "seal_generated_at": v.seal_generated_at.isoformat() if v.seal_generated_at else None,
        "tx_hash": v.tx_hash,
        "block_number": v.block_number,
        "network": v.network,
        "is_current": v.is_current,
        "cascaded_to_deals": v.cascaded_to_deals,
        "created_at": v.created_at.isoformat() if v.created_at else None,
    }


@router.get("/twins/{twin_id}/packages")
async def list_versions(
    twin_id: str, user: dict = Depends(require_auth), db: AsyncSession = Depends(get_db),
):
    """List all identity package versions for a twin."""
    result = await db.execute(
        select(IdentityPackageVersion).where(IdentityPackageVersion.twin_id == UUID(twin_id))
        .order_by(desc(IdentityPackageVersion.version_number))
    )
    return [_serialize(v) for v in result.scalars().all()]


@router.get("/twins/{twin_id}/packages/current")
async def get_current(
    twin_id: str, user: dict = Depends(require_auth), db: AsyncSession = Depends(get_db),
):
    """Get the current active identity package version."""
    result = await db.execute(
        select(IdentityPackageVersion).where(
            IdentityPackageVersion.twin_id == UUID(twin_id),
            IdentityPackageVersion.is_current.is_(True),
        )
    )
    version = result.scalar_one_or_none()
    if not version:
        raise HTTPException(status_code=404, detail="No current package version")
    return _serialize(version)


@router.post("/twins/{twin_id}/packages/snapshot")
async def create_snapshot(
    twin_id: str, user: dict = Depends(require_auth), db: AsyncSession = Depends(get_db),
):
    """Create a new versioned snapshot from ALCM, anchor seal on blockchain."""
    tid = UUID(twin_id)

    twin_r = await db.execute(select(Twin).where(Twin.id == tid))
    twin = twin_r.scalar_one_or_none()
    if not twin:
        raise HTTPException(status_code=404, detail="Twin not found")
    if not twin.alcm_twin_id:
        raise HTTPException(status_code=400, detail="No ALCM identity linked")

    # Get snapshot from ALCM
    alcm = get_alcm_client()
    snap = await alcm.create_snapshot(str(twin.alcm_twin_id))

    # Deactivate current version
    current = await db.execute(
        select(IdentityPackageVersion).where(
            IdentityPackageVersion.twin_id == tid, IdentityPackageVersion.is_current.is_(True),
        )
    )
    for old in current.scalars().all():
        old.is_current = False

    # Get next version number
    ver_r = await db.execute(
        select(IdentityPackageVersion.version_number)
        .where(IdentityPackageVersion.twin_id == tid)
        .order_by(desc(IdentityPackageVersion.version_number)).limit(1)
    )
    next_ver = (ver_r.scalar() or 0) + 1

    seal_hash = snap.get("seal_hash", hashlib.sha256(str(tid).encode()).hexdigest())

    # Anchor on blockchain
    tx_hash = None
    block_number = None
    network = None
    try:
        bc = BlockchainService()
        anchor = await bc.anchor_hash(seal_hash, str(tid))
        if anchor:
            tx_hash = anchor.get("tx_hash")
            block_number = str(anchor.get("block_number", ""))
            network = anchor.get("network")
    except Exception:
        pass  # Blockchain optional

    version = IdentityPackageVersion(
        twin_id=tid,
        version_number=next_ver,
        alcm_snapshot_ref=snap.get("snapshot_ref", str(uuid4())),
        seal_id=uuid4(),
        seal_hash=seal_hash,
        tx_hash=tx_hash,
        block_number=block_number,
        network=network,
        is_current=True,
        created_by=UUID(user["id"]),
    )
    db.add(version)
    await db.flush()

    # Cascade notification to active deals using this twin
    try:
        from ..models.deal import Deal
        from ..services.notification_service import NotificationService

        active_deals = await db.execute(
            select(Deal).where(
                Deal.twin_id == tid,
                Deal.status.in_(["EXECUTED", "ACTIVE"]),
            )
        )
        nsvc = NotificationService(db)
        for deal in active_deals.scalars().all():
            # Notify the twin's talent user
            if twin.talent_user_id:
                await nsvc.create(
                    twin.talent_user_id, "PACKAGE_UPDATE",
                    f"Identity package updated to v{next_ver}",
                    f"A new version of {twin.display_name}'s identity package is available for deal #{deal.deal_number}.",
                    action_url=f"/deals/{deal.id}",
                    entity_type="identity_package", entity_id=version.id,
                )
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"Cascade notification failed (non-blocking): {e}")

    return _serialize(version)
