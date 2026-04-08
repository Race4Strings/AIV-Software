"""Organization endpoints per spec Section 3.11."""
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..middleware import require_auth
from ..middleware.permissions import require_role
from ..models.organization import Organization, OrganizationMembership, OrganizationUser
from ..models.user import User
from ..services.notification_service import NotificationService

router = APIRouter(prefix="/organizations", tags=["Organizations"])


class UpdateOrganizationRequest(BaseModel):
    name: str


class InviteRequest(BaseModel):
    email: str
    role: str = "MEMBER"  # OWNER|ADMIN|MEMBER|VIEWER
    permissions: dict = {}


class UpdateMemberRequest(BaseModel):
    role: Optional[str] = None
    permissions: Optional[dict] = None


@router.get("/me")
async def get_my_organization(
    user: dict = Depends(require_auth), db: AsyncSession = Depends(get_db),
):
    """Get the authenticated user's organization. Creates one if missing."""
    org = None

    # Try OrganizationUser table
    try:
        result = await db.execute(
            select(Organization).join(
                OrganizationUser, OrganizationUser.organization_id == Organization.id
            ).where(OrganizationUser.user_id == UUID(user["id"])).limit(1)
        )
        org = result.scalar_one_or_none()
    except Exception:
        pass

    # Fallback: try OrganizationMembership
    if not org:
        try:
            result = await db.execute(
                select(Organization).join(
                    OrganizationMembership, OrganizationMembership.organization_id == Organization.id
                ).where(OrganizationMembership.user_id == UUID(user["id"])).limit(1)
            )
            org = result.scalar_one_or_none()
        except Exception:
            pass

    # Last resort: create org + link for this user
    if not org:
        user_name = user.get("name", user.get("user_name", "User"))
        org = Organization(name=f"{user_name}'s Organization")
        db.add(org)
        await db.flush()
        # Link via both tables for maximum compatibility
        try:
            db.add(OrganizationUser(
                user_id=UUID(user["id"]),
                organization_id=org.id,
                role="owner",
            ))
        except Exception:
            pass
        try:
            db.add(OrganizationMembership(
                organization_id=org.id,
                user_id=UUID(user["id"]),
                role="OWNER",
                permissions={"manage_team": True, "manage_deals": True, "manage_twins": True},
            ))
        except Exception:
            pass
        await db.flush()

    return {
        "id": str(org.id), "name": org.name, "type": org.type,
        "created_at": org.created_at.isoformat() if org.created_at else None,
    }


@router.get("/{org_id}")
async def get_organization(
    org_id: str, user: dict = Depends(require_auth), db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Organization).where(Organization.id == UUID(org_id)))
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return {
        "id": str(org.id), "name": org.name, "type": org.type,
        "created_at": org.created_at.isoformat() if org.created_at else None,
    }


@router.put("/{org_id}")
async def update_organization(
    org_id: str, req: UpdateOrganizationRequest,
    user: dict = Depends(require_role("ADMIN")), db: AsyncSession = Depends(get_db),
):
    """Update organization details. Requires ADMIN or OWNER role."""
    result = await db.execute(select(Organization).where(Organization.id == UUID(org_id)))
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    org.name = req.name.strip()
    await db.flush()
    return {
        "id": str(org.id), "name": org.name, "type": org.type,
        "created_at": org.created_at.isoformat() if org.created_at else None,
    }


@router.get("/{org_id}/members")
async def list_members(
    org_id: str, user: dict = Depends(require_auth), db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(OrganizationMembership, User)
        .join(User, OrganizationMembership.user_id == User.id)
        .where(OrganizationMembership.organization_id == UUID(org_id))
    )
    members = []
    for membership, u in result.all():
        members.append({
            "id": str(membership.id),
            "user_id": str(u.id),
            "name": u.name,
            "email": u.email,
            "role": membership.role,
            "permissions": membership.permissions or {},
            "accepted_at": membership.accepted_at.isoformat() if membership.accepted_at else None,
        })
    return members


@router.post("/{org_id}/invite")
async def invite_member(
    org_id: str, req: InviteRequest,
    user: dict = Depends(require_role("ADMIN")), db: AsyncSession = Depends(get_db),
):
    """Invite a user to the organization. Requires ADMIN or OWNER role."""
    # Check if user exists
    user_result = await db.execute(select(User).where(User.email == req.email))
    target_user = user_result.scalar_one_or_none()
    if not target_user:
        raise HTTPException(status_code=404, detail=f"No user found with email {req.email}")

    # Check for duplicate
    existing = await db.execute(
        select(OrganizationMembership).where(
            OrganizationMembership.organization_id == UUID(org_id),
            OrganizationMembership.user_id == target_user.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="User is already a member")

    membership = OrganizationMembership(
        organization_id=UUID(org_id),
        user_id=target_user.id,
        role=req.role,
        permissions=req.permissions,
        invited_by=UUID(user["id"]),
    )
    db.add(membership)
    await db.flush()

    # Notify the invited user
    nsvc = NotificationService(db)
    await nsvc.create(
        target_user.id, "SYSTEM_ALERT", "Team Invitation",
        f"You've been invited to join an organization as {req.role}.",
    )

    return {"id": str(membership.id), "user_id": str(target_user.id), "role": req.role}


@router.put("/{org_id}/members/{user_id}")
async def update_member(
    org_id: str, user_id: str, req: UpdateMemberRequest,
    user: dict = Depends(require_auth), db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(OrganizationMembership).where(
            OrganizationMembership.organization_id == UUID(org_id),
            OrganizationMembership.user_id == UUID(user_id),
        )
    )
    membership = result.scalar_one_or_none()
    if not membership:
        raise HTTPException(status_code=404, detail="Member not found")

    if req.role:
        membership.role = req.role
    if req.permissions is not None:
        membership.permissions = req.permissions
    await db.flush()

    return {"id": str(membership.id), "role": membership.role, "permissions": membership.permissions}


@router.delete("/{org_id}/members/{user_id}")
async def remove_member(
    org_id: str, user_id: str,
    user: dict = Depends(require_role("ADMIN")), db: AsyncSession = Depends(get_db),
):
    """Remove a member from the organization. Requires ADMIN or OWNER role."""
    result = await db.execute(
        select(OrganizationMembership).where(
            OrganizationMembership.organization_id == UUID(org_id),
            OrganizationMembership.user_id == UUID(user_id),
        )
    )
    membership = result.scalar_one_or_none()
    if not membership:
        raise HTTPException(status_code=404, detail="Member not found")

    if membership.role == "OWNER":
        raise HTTPException(status_code=403, detail="Cannot remove the organization owner")

    await db.delete(membership)
    await db.flush()

    return {"message": "Member removed"}
