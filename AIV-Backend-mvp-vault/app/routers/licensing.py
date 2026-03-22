"""
Licensing router — Full deal lifecycle, inquiry cards, contracts, milestones,
messaging, PUL, RDA, production partner disclosures, validation.

This is the primary revenue-generating part of the platform.
"""

import json
from uuid import UUID
from decimal import Decimal
from typing import Optional, List
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..middleware import require_auth
from ..services.licensing_service import LicensingService
from ..services.commission_service import CommissionService
from ..services.notification_service import NotificationService

router = APIRouter(tags=["licensing"])


# ------------------------------------------------------------------
# Schemas
# ------------------------------------------------------------------

VALID_DATA_SCOPE_MODULES = {"identity_profile", "knowledge_base", "voice_identity", "visual_identity"}
VALID_DEAL_TYPES = {"BRAND_CAMPAIGN", "CONTENT_LICENSE", "CONVERSATIONAL", "EDUCATIONAL", "CORPORATE", "GAMING", "API_INTEGRATION"}


class CreateDealRequest(BaseModel):
    twin_id: str
    client_org_id: str
    deal_type: str
    value: Decimal
    data_scope: List[str]
    territory: List[str] = []
    exclusivity: bool = False
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    terms_summary: Optional[str] = None


class StatusTransitionRequest(BaseModel):
    status: str


class MilestoneRequest(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: Optional[str] = None


class MilestoneUpdateRequest(BaseModel):
    comments: Optional[str] = None


class MessageRequest(BaseModel):
    content: str


class PULRequest(BaseModel):
    record_type: str
    content_produced: dict = {}
    platforms_used: List[str] = []
    territories_reached: List[str] = []
    production_partners: List[str] = []
    ai_tools_used: List[str] = []
    scope_changes: Optional[str] = None
    period_start: Optional[str] = None
    period_end: Optional[str] = None


class RDARequest(BaseModel):
    recipient_org: str
    recipient_contact: str
    purpose: str
    restrictions: dict = {}


class PartnerRequest(BaseModel):
    partner_name: str
    partner_role: str
    data_access_scope: Optional[str] = None


class ContractSignRequest(BaseModel):
    party: str  # "talent" or "client"


class ValidationRequest(BaseModel):
    sample_content: str
    sample_context: Optional[str] = None


def _serialize(obj) -> dict:
    """Quick serializer for SQLAlchemy models."""
    d = {}
    for c in obj.__table__.columns:
        val = getattr(obj, c.name)
        if val is None:
            d[c.name] = None
        elif isinstance(val, (UUID,)):
            d[c.name] = str(val)
        elif isinstance(val, (date,)):
            d[c.name] = val.isoformat()
        elif isinstance(val, Decimal):
            d[c.name] = float(val)
        else:
            d[c.name] = val
    return d


# ------------------------------------------------------------------
# Deal CRUD + pipeline
# ------------------------------------------------------------------

@router.get("/deals")
async def list_deals(
    twin_id: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = Query(20, le=100),
    cursor: Optional[str] = None,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import select as sa_select, desc
    from ..models.deal import Deal as DealModel
    from ..utils.pagination import paginate

    query = sa_select(DealModel).order_by(desc(DealModel.created_at))
    if twin_id:
        query = query.where(DealModel.twin_id == UUID(twin_id))
    if status:
        query = query.where(DealModel.status == status)

    deals, pagination = await paginate(db, query, DealModel, limit=limit, cursor=cursor)

    svc = LicensingService(db)
    result = []
    for deal in deals:
        d = _serialize(deal)
        d["parameter_flags"] = await svc.check_deal_parameters(deal)
        result.append(d)

    return {"data": result, "pagination": pagination.dict()}


@router.post("/deals")
async def create_deal(
    req: CreateDealRequest,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    svc = LicensingService(db)
    try:
        deal = await svc.create_deal(
            twin_id=UUID(req.twin_id),
            client_org_id=UUID(req.client_org_id),
            deal_type=req.deal_type,
            value=Decimal(str(req.value)),
            data_scope=req.data_scope,
            territory=req.territory,
            exclusivity=req.exclusivity,
            start_date=date.fromisoformat(req.start_date) if req.start_date else None,
            end_date=date.fromisoformat(req.end_date) if req.end_date else None,
            terms_summary=req.terms_summary,
            actor_id=UUID(user["id"]),
        )
        return _serialize(deal)
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/deals/{deal_id}")
async def get_deal_workspace(
    deal_id: str,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    svc = LicensingService(db)
    workspace = await svc.get_deal_workspace(UUID(deal_id))
    if not workspace or not workspace.get("deal"):
        raise HTTPException(status_code=404, detail="Deal not found")

    deal = workspace["deal"]
    result = _serialize(deal)
    result["parameter_flags"] = await svc.check_deal_parameters(deal)
    result["milestones"] = [_serialize(m) for m in workspace["milestones"]]
    result["contracts"] = [_serialize(c) for c in workspace["contracts"]]
    result["pul_records"] = [_serialize(p) for p in workspace["pul_records"]]
    result["validations"] = [_serialize(v) for v in workspace["validations"]]
    return result


@router.put("/deals/{deal_id}/status")
async def transition_deal_status(
    deal_id: str,
    req: StatusTransitionRequest,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    svc = LicensingService(db)
    try:
        deal = await svc.transition_status(UUID(deal_id), req.status, UUID(user["id"]))

        # On execution: create commission invoice + payout
        if req.status == "EXECUTED":
            csvc = CommissionService(db)
            await csvc.create_commission_invoice(deal)
            await csvc.create_payout(deal)

        return _serialize(deal)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ------------------------------------------------------------------
# Contracts
# ------------------------------------------------------------------

@router.post("/deals/{deal_id}/contract")
async def upload_contract(
    deal_id: str,
    contract_url: str = Query(...),
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    svc = LicensingService(db)
    try:
        contract = await svc.upload_contract(UUID(deal_id), contract_url)
        return _serialize(contract)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/deals/{deal_id}/contract/{contract_id}/sign")
async def sign_contract(
    deal_id: str,
    contract_id: str,
    req: ContractSignRequest,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    svc = LicensingService(db)
    try:
        contract = await svc.sign_contract(UUID(contract_id), req.party)
        return _serialize(contract)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ------------------------------------------------------------------
# Milestones
# ------------------------------------------------------------------

@router.post("/deals/{deal_id}/milestones")
async def add_milestone(
    deal_id: str,
    req: MilestoneRequest,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    svc = LicensingService(db)
    milestone = await svc.add_milestone(
        UUID(deal_id), req.title, req.description,
        date.fromisoformat(req.due_date) if req.due_date else None,
    )
    return _serialize(milestone)


@router.put("/deals/{deal_id}/milestones/{milestone_id}")
async def complete_milestone(
    deal_id: str,
    milestone_id: str,
    req: MilestoneUpdateRequest,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    svc = LicensingService(db)
    try:
        milestone = await svc.complete_milestone(UUID(milestone_id), UUID(user["id"]), req.comments)
        return _serialize(milestone)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ------------------------------------------------------------------
# Messaging
# ------------------------------------------------------------------

@router.post("/deals/{deal_id}/messages")
async def send_deal_message(
    deal_id: str,
    req: MessageRequest,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    svc = LicensingService(db)
    msg = await svc.send_message(UUID(deal_id), UUID(user["id"]), req.content)
    return _serialize(msg)


@router.get("/deals/{deal_id}/messages")
async def get_deal_messages(
    deal_id: str,
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    svc = LicensingService(db)
    messages = await svc.get_messages(UUID(deal_id), limit, offset)
    return [_serialize(m) for m in messages]


# ------------------------------------------------------------------
# PUL (Permitted Use Lifecycle) — APPEND-ONLY
# ------------------------------------------------------------------

@router.post("/deals/{deal_id}/pul")
async def submit_pul(
    deal_id: str,
    req: PULRequest,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    svc = LicensingService(db)
    record = await svc.submit_pul(
        UUID(deal_id), UUID(user["id"]), req.record_type,
        content_produced=req.content_produced,
        platforms_used=req.platforms_used,
        territories_reached=req.territories_reached,
        production_partners=req.production_partners,
        ai_tools_used=req.ai_tools_used,
        scope_changes=req.scope_changes,
        period_start=date.fromisoformat(req.period_start) if req.period_start else None,
        period_end=date.fromisoformat(req.period_end) if req.period_end else None,
    )
    return _serialize(record)


# ------------------------------------------------------------------
# RDA + Production Partners
# ------------------------------------------------------------------

@router.post("/deals/{deal_id}/rda")
async def create_rda(
    deal_id: str,
    req: RDARequest,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    svc = LicensingService(db)
    try:
        rda = await svc.create_rda(
            UUID(deal_id), req.recipient_org, req.recipient_contact,
            req.purpose, req.restrictions,
        )
        return _serialize(rda)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/deals/{deal_id}/partners")
async def disclose_partner(
    deal_id: str,
    req: PartnerRequest,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    svc = LicensingService(db)
    ppd = await svc.disclose_partner(
        UUID(deal_id), req.partner_name, req.partner_role,
        req.data_access_scope, UUID(user["id"]),
    )
    return _serialize(ppd)
