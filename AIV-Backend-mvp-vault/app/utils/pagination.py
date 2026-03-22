"""Cursor-based pagination utility per spec Section 2.2.

Usage:
    from app.utils.pagination import paginate, PaginatedResponse

    items, pagination = await paginate(
        db, select(Deal).where(...), limit=20, cursor=cursor_str
    )
    return PaginatedResponse(data=items, pagination=pagination)

Response format:
    {
      "data": [...],
      "pagination": {
        "has_more": true,
        "next_cursor": "eyJpZCI6IjEyMyJ9",
        "total": 142
      }
    }
"""

import base64
import json
from typing import Any, List, Optional, Tuple
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel


class PaginationMeta(BaseModel):
    has_more: bool
    next_cursor: Optional[str] = None
    total: Optional[int] = None


class PaginatedResponse(BaseModel):
    data: List[Any]
    pagination: PaginationMeta


def encode_cursor(record_id: str) -> str:
    """Encode a record ID as an opaque cursor string."""
    return base64.urlsafe_b64encode(json.dumps({"id": record_id}).encode()).decode()


def decode_cursor(cursor: str) -> Optional[str]:
    """Decode an opaque cursor string to a record ID."""
    try:
        data = json.loads(base64.urlsafe_b64decode(cursor.encode()))
        return data.get("id")
    except Exception:
        return None


async def paginate(
    db: AsyncSession,
    query,
    model_class,
    limit: int = 20,
    cursor: Optional[str] = None,
    count_total: bool = True,
) -> Tuple[list, PaginationMeta]:
    """Execute a paginated query with cursor-based pagination.

    Args:
        db: AsyncSession
        query: SQLAlchemy select query (should have ordering already applied)
        model_class: The SQLAlchemy model class (for ID column reference)
        limit: Items per page (max 100)
        cursor: Opaque cursor from previous response
        count_total: Whether to count total records (can be expensive)

    Returns:
        Tuple of (items list, PaginationMeta)
    """
    limit = min(limit, 100)

    # Apply cursor filter
    if cursor:
        last_id = decode_cursor(cursor)
        if last_id:
            try:
                query = query.where(model_class.id < UUID(last_id))
            except ValueError:
                pass

    # Count total if requested
    total = None
    if count_total:
        count_query = select(func.count()).select_from(query.subquery())
        result = await db.execute(count_query)
        total = result.scalar()

    # Fetch limit + 1 to check if there are more
    result = await db.execute(query.limit(limit + 1))
    items = list(result.scalars().all())

    has_more = len(items) > limit
    if has_more:
        items = items[:limit]

    next_cursor = None
    if has_more and items:
        next_cursor = encode_cursor(str(items[-1].id))

    return items, PaginationMeta(
        has_more=has_more,
        next_cursor=next_cursor,
        total=total,
    )
