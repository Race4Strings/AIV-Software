"""
Permission enforcement middleware.

Provides decorators and dependencies for role-based access control
on API endpoints. Checks user's role and organization permissions.
"""

import logging
from uuid import UUID
from typing import List, Optional

from fastapi import Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..middleware.auth_middleware import require_auth
from ..models.organization import OrganizationMembership

logger = logging.getLogger(__name__)

# Role hierarchy (higher = more permissions)
ROLE_HIERARCHY = {
    "OWNER": 4,
    "ADMIN": 3,
    "MEMBER": 2,
    "VIEWER": 1,
}


async def get_user_role(
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get the user's organization role and permissions."""
    try:
        result = await db.execute(
            select(OrganizationMembership)
            .where(OrganizationMembership.user_id == UUID(user["id"]))
            .limit(1)
        )
        membership = result.scalar_one_or_none()
        if membership:
            return {
                **user,
                "org_role": membership.role,
                "org_permissions": membership.permissions or {},
                "org_id": str(membership.organization_id),
            }
    except Exception as e:
        logger.warning(f"Could not fetch user role: {e}")

    return {
        **user,
        "org_role": user.get("role", "TALENT"),
        "org_permissions": {},
        "org_id": None,
    }


def require_role(min_role: str):
    """Dependency that requires a minimum organization role.

    Usage: user = Depends(require_role("ADMIN"))
    """
    min_level = ROLE_HIERARCHY.get(min_role, 0)

    async def _check(
        user_with_role: dict = Depends(get_user_role),
    ) -> dict:
        user_level = ROLE_HIERARCHY.get(user_with_role.get("org_role", ""), 0)
        if user_level < min_level:
            raise HTTPException(
                status_code=403,
                detail=f"This action requires {min_role} role or higher. Your role: {user_with_role.get('org_role', 'unknown')}",
            )
        return user_with_role

    return _check


def require_permission(permission: str):
    """Dependency that requires a specific permission.

    Usage: user = Depends(require_permission("guardrails.edit"))
    """
    async def _check(
        user_with_role: dict = Depends(get_user_role),
    ) -> dict:
        # OWNER and ADMIN always have all permissions
        role = user_with_role.get("org_role", "")
        if role in ("OWNER", "ADMIN"):
            return user_with_role

        # Check specific permission in permissions JSON
        permissions = user_with_role.get("org_permissions", {})
        if not permissions.get(permission, False):
            raise HTTPException(
                status_code=403,
                detail=f"You don't have permission to perform this action ({permission}).",
            )
        return user_with_role

    return _check
