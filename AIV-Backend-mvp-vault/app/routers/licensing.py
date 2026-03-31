"""
Licensing router — Full deal lifecycle, inquiry cards, contracts, milestones,
messaging, PUL, RDA, production partner disclosures, validation.

This is the primary revenue-generating part of the platform.
"""

import json
import logging
from uuid import UUID
from decimal import Decimal
from typing import Optional, List
from datetime import date

logger = logging.getLogger(__name__)

from fastapi import APIRouter, Depends, HTTPException, Query, Request, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

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
@limiter.limit("10/minute")
async def create_deal(
    request: Request,
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

        # On execution: create commission invoice + payout + blockchain anchor
        if req.status == "EXECUTED":
            csvc = CommissionService(db)
            await csvc.create_commission_invoice(deal)
            await csvc.create_payout(deal)

            # Anchor deal execution on blockchain
            try:
                from ..services.blockchain_service import BlockchainService
                bc = BlockchainService()
                previous_hash = await bc.get_latest_hash(str(deal.twin_id), db)
                await bc.anchor_deal_execution(
                    twin_id=str(deal.twin_id),
                    deal_data={
                        "deal_id": str(deal.id),
                        "deal_number": deal.deal_number,
                        "deal_type": deal.deal_type,
                        "value": str(deal.value),
                        "commission_rate": str(deal.commission_rate),
                        "territory": deal.territory,
                        "data_scope": deal.data_scope,
                        "executed_at": deal.executed_at.isoformat() if deal.executed_at else None,
                    },
                    previous_hash=previous_hash,
                )
            except Exception as e:
                logger.warning(f"Deal blockchain anchoring failed (non-blocking): {e}")

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


@router.post("/deals/{deal_id}/generate-contract")
async def generate_contract(
    deal_id: str,
    template_type: str = Query("licensing_agreement", description="licensing_agreement | psa | dpa"),
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Auto-generate a contract from deal terms.

    template_type: licensing_agreement (default), psa, dpa
    """
    from ..services.contract_generator import (
        generate_licensing_agreement,
        generate_platform_services_agreement,
        generate_data_processing_agreement,
    )
    from ..models.deal_contract import DealContract
    from ..models.twin import Twin
    from ..models.organization import Organization

    svc = LicensingService(db)
    deal = await svc.get_deal(UUID(deal_id))
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    # Get twin and client org names
    twin = (await db.execute(select(Twin).where(Twin.id == deal.twin_id))).scalar_one_or_none()
    twin_name = twin.display_name if twin else "Unknown"
    twin_category = (twin.identity_category[0] if twin and twin.identity_category else "ENTERTAINMENT")

    client_org = None
    if deal.client_organization_id:
        client_org = (await db.execute(
            select(Organization).where(Organization.id == deal.client_organization_id)
        )).scalar_one_or_none()
    client_name = client_org.name if client_org else "Client Organization"

    if template_type == "psa":
        contract_text = generate_platform_services_agreement(
            user_name=twin_name,
            org_name=client_name,
            role="TALENT",
        )
    elif template_type == "dpa":
        contract_text = generate_data_processing_agreement(
            twin_name=twin_name,
            org_name=client_name,
        )
    else:
        contract_text = generate_licensing_agreement(
            twin_name=twin_name,
            twin_category=twin_category,
            client_org_name=client_name,
            deal_type=deal.deal_type,
            deal_value=float(deal.value),
            currency=deal.currency or "USD",
            territory=deal.territory or [],
            data_scope=deal.data_scope or [],
            exclusivity=deal.exclusivity or False,
            commission_rate=deal.commission_rate or 0.30,
            deal_number=deal.deal_number or 1,
        )

    # Create contract record
    existing = await db.execute(
        select(DealContract).where(DealContract.deal_id == deal.id)
    )
    version = len(existing.scalars().all()) + 1

    contract = DealContract(
        deal_id=deal.id,
        version=version,
        contract_text=contract_text,
        contract_url=None,
    )
    db.add(contract)
    await db.flush()

    return _serialize(contract)


@router.get("/deals/{deal_id}/contract/{contract_id}/pdf")
async def download_contract_pdf(
    deal_id: str,
    contract_id: str,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Download a contract as PDF."""
    from ..services.contract_generator import text_to_pdf
    from ..models.deal_contract import DealContract
    from fastapi.responses import Response

    contract = (await db.execute(
        select(DealContract).where(DealContract.id == UUID(contract_id))
    )).scalar_one_or_none()

    if not contract or not contract.contract_text:
        raise HTTPException(status_code=404, detail="Contract not found")

    pdf_bytes = text_to_pdf("AIV Identity Licensing Agreement", contract.contract_text)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=AIV-Contract-{deal_id[:8]}.pdf"},
    )


@router.post("/deals/{deal_id}/contract/{contract_id}/send-for-signature")
async def send_for_signature(
    deal_id: str,
    contract_id: str,
    talent_email: str = Query(...),
    client_email: str = Query(...),
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Send a contract for e-signature via Dropbox Sign.

    Both talent representative and client must sign before the deal
    can transition to EXECUTED status.
    """
    from ..services.esign_service import ESignService
    from ..models.deal_contract import DealContract

    contract = (await db.execute(
        select(DealContract).where(DealContract.id == UUID(contract_id))
    )).scalar_one_or_none()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    esign = ESignService(db)
    result = await esign.create_signature_request(
        title=f"AIV Licensing Agreement — Deal #{contract.version}",
        subject="AIV Licensing Agreement for Signature",
        message="Please review and sign the attached licensing agreement.",
        signers=[
            {"email": talent_email, "name": "Talent Representative", "role": "talent"},
            {"email": client_email, "name": "Client Representative", "role": "client"},
        ],
        metadata={"deal_id": deal_id, "contract_id": contract_id},
    )

    if result:
        contract.signature_request_id = result.get("signature_request_id")
        contract.esignature_ref = result.get("signature_request_id")
        await db.flush()
        return {"status": "sent", **result}

    raise HTTPException(status_code=500, detail="Failed to send for signature")


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
# Package Delivery
# ------------------------------------------------------------------

@router.post("/deals/{deal_id}/deliver")
async def deliver_package(
    deal_id: str,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Deliver identity package to client after deal execution.

    Scoped to the deal's data_scope. Generates a secure access token
    with a 30-day expiry.
    """
    from ..services.delivery_service import DeliveryService

    svc = LicensingService(db)
    deal = await svc.get_deal(UUID(deal_id))
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    if deal.status not in ("EXECUTED", "ACTIVE"):
        raise HTTPException(status_code=400, detail="Deal must be executed before delivery")

    delivery = DeliveryService(db)
    result = await delivery.deliver_package(
        deal_id=UUID(deal_id),
        twin_id=deal.twin_id,
        data_scope=deal.data_scope or [],
        client_org_id=deal.client_organization_id,
        delivered_by=UUID(user["id"]),
    )
    return result


@router.get("/deals/{deal_id}/package")
async def get_deal_package(
    deal_id: str,
    access_token: str = Query(...),
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Access the delivered identity package for a deal.

    Requires a valid access token. Returns scoped identity data
    matching the deal's data_scope.
    """
    from ..services.delivery_service import DeliveryService

    svc = LicensingService(db)
    deal = await svc.get_deal(UUID(deal_id))
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    delivery = DeliveryService(db)
    package = await delivery.get_package_for_client(
        twin_id=deal.twin_id,
        data_scope=deal.data_scope or [],
        access_token=access_token,
    )
    if not package:
        raise HTTPException(status_code=404, detail="Package not available")
    return package


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


# ------------------------------------------------------------------
# Client Output Validation
# ------------------------------------------------------------------

class ValidateOutputRequest(BaseModel):
    sample_content: str
    sample_context: str = ""


@router.post("/{deal_id}/validate")
async def validate_client_output(
    deal_id: str,
    req: ValidateOutputRequest,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Validate client-submitted output against twin's personality profile.

    Calls ALCM /validate and records the result in client_validation_submissions.
    """
    from ..services.alcm_client import get_alcm_client
    from ..models.client_validation_submission import ClientValidationSubmission

    svc = LicensingService(db)
    deal = await svc.get_deal(UUID(deal_id))
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    # Get twin's ALCM ID
    from ..models.twin import Twin
    twin = (await db.execute(
        select(Twin).where(Twin.id == deal.twin_id)
    )).scalar_one_or_none()
    if not twin or not twin.alcm_twin_id:
        raise HTTPException(status_code=400, detail="Twin has no ALCM identity linked")

    # Call ALCM validation
    alcm = get_alcm_client()
    result = await alcm.validate_output(
        str(twin.alcm_twin_id), req.sample_content, req.sample_context,
    )

    if result.get("_alcm_unavailable"):
        raise HTTPException(status_code=503, detail="Identity engine temporarily unavailable")

    # Record the submission
    submission = ClientValidationSubmission(
        deal_id=UUID(deal_id),
        sample_content=req.sample_content,
        sample_context=req.sample_context,
        consistency_score=result.get("consistency_score"),
        status="PASS" if result.get("passed") else "FAIL",
        feedback=result.get("details", "") + ("\n" + result.get("recommendation", "") if result.get("recommendation") else ""),
    )
    db.add(submission)
    await db.flush()

    return {
        "id": str(submission.id),
        "consistency_score": result.get("consistency_score"),
        "passed": result.get("passed"),
        "details": result.get("details"),
        "divergent_traits": result.get("divergent_traits", []),
        "recommendation": result.get("recommendation"),
    }


# ------------------------------------------------------------------
# Contract File Upload
# ------------------------------------------------------------------

@router.post("/deals/{deal_id}/contract/upload")
async def upload_contract_file(
    deal_id: str,
    file: UploadFile = File(...),
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Upload a contract file (PDF/DOCX) for a deal."""
    from ..services.storage_service import StorageService

    storage = StorageService()
    upload_result = await storage.upload_document(file, file.filename, user["id"])

    svc = LicensingService(db)
    contract = await svc.upload_contract(UUID(deal_id), upload_result.get("url", upload_result.get("key", "")))
    return _serialize(contract)


# ------------------------------------------------------------------
# Negotiation Knowledge (Opt-In Assistant Training)
# ------------------------------------------------------------------

class TrainAssistantRequest(BaseModel):
    reasoning: str = ""


@router.post("/deals/{deal_id}/train-assistant")
async def train_assistant_from_deal(
    deal_id: str,
    req: TrainAssistantRequest,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Record a deal decision as negotiation knowledge for the assistant.

    Called after approve/reject/modify decisions. Opt-in only.
    """
    from ..models.negotiation_knowledge import NegotiationKnowledge

    svc = LicensingService(db)
    deal = await svc.get_deal(UUID(deal_id))
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    knowledge = NegotiationKnowledge(
        twin_id=deal.twin_id,
        created_by=UUID(user["id"]),
        knowledge_type="INQUIRY_DECISION",
        deal_id=UUID(deal_id),
        decision=deal.status,
        context={
            "deal_type": deal.deal_type,
            "value": str(deal.value) if deal.value else None,
            "territory": deal.territory,
            "data_scope": deal.data_scope,
            "exclusivity": deal.exclusivity,
            "commission_rate": str(deal.commission_rate) if deal.commission_rate else None,
        },
        reasoning=req.reasoning,
    )
    db.add(knowledge)
    await db.flush()

    return {
        "id": str(knowledge.id),
        "knowledge_type": knowledge.knowledge_type,
        "decision": knowledge.decision,
        "message": "Decision recorded. Your assistant will learn from this pattern.",
    }


@router.get("/twins/{twin_id}/negotiation-knowledge")
async def get_negotiation_knowledge(
    twin_id: str,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """List negotiation knowledge entries for a twin."""
    from ..models.negotiation_knowledge import NegotiationKnowledge
    from sqlalchemy import desc

    result = await db.execute(
        select(NegotiationKnowledge)
        .where(NegotiationKnowledge.twin_id == UUID(twin_id))
        .order_by(desc(NegotiationKnowledge.created_at))
        .limit(100)
    )
    entries = result.scalars().all()
    return [
        {
            "id": str(e.id),
            "knowledge_type": e.knowledge_type,
            "decision": e.decision,
            "deal_id": str(e.deal_id) if e.deal_id else None,
            "context": e.context,
            "reasoning": e.reasoning,
            "created_at": e.created_at.isoformat() if e.created_at else None,
        }
        for e in entries
    ]


# ------------------------------------------------------------------
# Client-Facing Licensing Info (Public Qualification)
# ------------------------------------------------------------------

@router.get("/twins/{twin_id}/licensing-info")
async def get_licensing_info(
    twin_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint: returns what's available for licensing.

    Reads the active LicensingRulesConfig and returns a client-friendly summary.
    No auth required — meant for client qualification before deal submission.
    """
    from ..models.licensing_rules_config import LicensingRulesConfig
    from ..models.twin import Twin

    twin = (await db.execute(
        select(Twin).where(Twin.id == UUID(twin_id))
    )).scalar_one_or_none()
    if not twin:
        raise HTTPException(status_code=404, detail="Identity not found")

    if not twin.talent_authorization_at:
        raise HTTPException(status_code=403, detail="This identity is not yet available for licensing")

    # Get active licensing rules
    rules = (await db.execute(
        select(LicensingRulesConfig)
        .where(LicensingRulesConfig.twin_id == UUID(twin_id), LicensingRulesConfig.is_active == True)
        .limit(1)
    )).scalar_one_or_none()

    if not rules:
        return {
            "twin_id": str(twin.id),
            "display_name": twin.display_name,
            "category": twin.identity_category,
            "available": True,
            "message": "Licensing is available. Contact the talent's team for specific terms.",
        }

    all_modules = ["identity_profile", "knowledge_base", "voice_identity", "visual_identity"]

    return {
        "twin_id": str(twin.id),
        "display_name": twin.display_name,
        "category": twin.identity_category,
        "available": True,
        "available_modules": all_modules,
        "pricing_floor": float(rules.pricing_floor) if rules.pricing_floor else None,
        "currency": rules.currency or "USD",
        "territories_restricted": rules.territory_restrictions or [],
        "permitted_use_cases": rules.permitted_use_cases or [],
        "blacklisted_use_cases": rules.blacklisted_use_cases or [],
        "exclusivity_available": rules.exclusivity_available,
    }
