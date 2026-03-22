"""
Licensing Service — Deal lifecycle, inquiry cards, parameter checking.

Handles the complete deal flow from submission through completion:
  SUBMITTED → UNDER_REVIEW → APPROVED → CONTRACT_SENT → EXECUTED → ACTIVE → COMPLETED

Key enforcement:
  - Gate 2 required: no deals without talent_authorization_at
  - Both-party contract signing before execution
  - Commission calculated by deal_number (30/25/20)
  - data_scope defines what ALCM modules client receives
  - PUL records are append-only
"""

import logging
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional, List, Dict
from uuid import UUID

from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.twin import Twin
from ..models.consent_record import ConsentRecord
from ..models.deal import Deal
from ..models.deal_milestone import DealMilestone
from ..models.deal_message import DealMessage
from ..models.deal_contract import DealContract
from ..models.permitted_use_record import PermittedUseRecord
from ..models.reference_data_agreement import ReferenceDataAgreement
from ..models.production_partner_disclosure import ProductionPartnerDisclosure
from ..models.client_validation_submission import ClientValidationSubmission
from ..models.licensing_rules_config import LicensingRulesConfig
from ..models.notification import Notification
from ..models.audit_log import AuditLog

logger = logging.getLogger(__name__)

# Commission rates by deal sequence per twin
COMMISSION_RATES = {1: Decimal("0.30"), 2: Decimal("0.25")}
DEFAULT_COMMISSION_RATE = Decimal("0.20")  # 3rd deal onward

# Valid status transitions
VALID_TRANSITIONS = {
    "SUBMITTED": ["UNDER_REVIEW"],
    "UNDER_REVIEW": ["APPROVED", "SUBMITTED"],  # can push back
    "APPROVED": ["CONTRACT_SENT", "UNDER_REVIEW"],
    "CONTRACT_SENT": ["EXECUTED", "APPROVED"],
    "EXECUTED": ["ACTIVE"],
    "ACTIVE": ["COMPLETED", "EXPIRED", "TERMINATED"],
    "COMPLETED": [],
    "EXPIRED": [],
    "TERMINATED": [],
}

VALID_DATA_SCOPE = {"identity_profile", "knowledge_base", "voice_identity", "visual_identity"}


class LicensingService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ------------------------------------------------------------------
    # Deal creation
    # ------------------------------------------------------------------

    async def create_deal(
        self,
        twin_id: UUID,
        client_org_id: UUID,
        deal_type: str,
        value: Decimal,
        data_scope: List[str],
        territory: List[str] = None,
        exclusivity: bool = False,
        start_date=None,
        end_date=None,
        terms_summary: str = None,
        actor_id: UUID = None,
    ) -> Deal:
        """Create a new deal. Enforces Gate 2 and validates data_scope."""
        # Gate 2 check
        twin = await self._get_twin(twin_id)
        if not twin:
            raise ValueError("Twin not found")
        if not twin.talent_authorization_at:
            raise PermissionError(
                "Licensing Portal blocked: talent has not completed Gate 2 authorization. "
                "The talent must personally authorize their twin for commercial use."
            )

        # Validate data_scope
        invalid = set(data_scope) - VALID_DATA_SCOPE
        if invalid:
            raise ValueError(f"Invalid data_scope modules: {invalid}. Valid: {VALID_DATA_SCOPE}")

        # Validate consent for each data_scope module
        await self._validate_consent(twin_id, data_scope)

        # Assign deal_number (sequence per twin)
        result = await self.db.execute(
            select(func.coalesce(func.max(Deal.deal_number), 0)).where(Deal.twin_id == twin_id)
        )
        next_number = result.scalar() + 1

        # Calculate commission
        rate = COMMISSION_RATES.get(next_number, DEFAULT_COMMISSION_RATE)
        commission = value * rate

        # Get grace period from licensing rules
        grace_hours = await self._get_grace_period(twin_id)

        deal = Deal(
            twin_id=twin_id,
            client_organization_id=client_org_id,
            deal_number=next_number,
            deal_type=deal_type,
            value=value,
            commission_rate=rate,
            commission_amount=commission,
            territory=territory or [],
            exclusivity=exclusivity,
            start_date=start_date,
            end_date=end_date,
            terms_summary=terms_summary,
            data_scope=data_scope,
            grace_period_hours=grace_hours,
            status="SUBMITTED",
        )
        self.db.add(deal)
        await self.db.flush()

        # Audit
        self.db.add(AuditLog(
            actor_id=actor_id, actor_type="CLIENT", action="CREATE",
            entity_type="deal", entity_id=deal.id, twin_id=twin_id,
            details={"deal_number": next_number, "value": str(value), "data_scope": data_scope},
        ))
        await self.db.flush()

        return deal

    # ------------------------------------------------------------------
    # Inquiry card — parameter checking
    # ------------------------------------------------------------------

    async def check_deal_parameters(self, deal: Deal) -> Dict:
        """Check deal parameters against the twin's licensing rules.

        Returns a dict with per-parameter flags:
          {"territory": {"status": "ok"}, "value": {"status": "flagged", "reason": "..."}}
        """
        rules = await self._get_active_licensing_rules(deal.twin_id)
        if not rules:
            return {"_no_rules": True}

        flags = {}

        # Check pricing floor
        if rules.pricing_floor and deal.value < rules.pricing_floor:
            flags["value"] = {
                "status": "flagged",
                "reason": f"Below minimum ${rules.pricing_floor}",
            }
        else:
            flags["value"] = {"status": "ok"}

        # Check territory restrictions
        if rules.territory_restrictions and deal.territory:
            blocked = set(deal.territory) & set(rules.territory_restrictions)
            if blocked:
                flags["territory"] = {
                    "status": "flagged",
                    "reason": f"Restricted territories: {', '.join(blocked)}",
                }
            else:
                flags["territory"] = {"status": "ok"}
        else:
            flags["territory"] = {"status": "ok"}

        # Check use case
        if rules.blacklisted_use_cases and deal.deal_type in rules.blacklisted_use_cases:
            flags["deal_type"] = {
                "status": "flagged",
                "reason": f"Use case '{deal.deal_type}' is blacklisted",
            }
        else:
            flags["deal_type"] = {"status": "ok"}

        # Check exclusivity
        if deal.exclusivity and not rules.exclusivity_available:
            flags["exclusivity"] = {
                "status": "flagged",
                "reason": "Exclusivity is not available",
            }
        else:
            flags["exclusivity"] = {"status": "ok"}

        # Overall
        all_ok = all(f["status"] == "ok" for f in flags.values())
        flags["_all_within_range"] = all_ok

        return flags

    # ------------------------------------------------------------------
    # Status transitions
    # ------------------------------------------------------------------

    async def transition_status(
        self, deal_id: UUID, new_status: str, actor_id: UUID = None
    ) -> Deal:
        """Transition deal status with validation."""
        deal = await self._get_deal(deal_id)
        if not deal:
            raise ValueError("Deal not found")

        allowed = VALID_TRANSITIONS.get(deal.status, [])
        if new_status not in allowed:
            raise ValueError(
                f"Cannot transition from {deal.status} to {new_status}. "
                f"Allowed: {allowed}"
            )

        # EXECUTED requires both-party contract signature
        if new_status == "EXECUTED":
            contract = await self._get_latest_contract(deal_id)
            if not contract:
                raise ValueError("No contract uploaded. Upload and sign before executing.")
            if not contract.signed_by_talent_at:
                raise ValueError("Talent team has not signed the contract.")
            if not contract.signed_by_client_at:
                raise ValueError("Client has not signed the contract.")
            deal.executed_at = datetime.now(timezone.utc)

        if new_status == "COMPLETED":
            deal.completed_at = datetime.now(timezone.utc)

        old_status = deal.status
        deal.status = new_status
        deal.updated_at = datetime.now(timezone.utc)

        self.db.add(AuditLog(
            actor_id=actor_id, actor_type="SYSTEM", action="UPDATE",
            entity_type="deal", entity_id=deal_id, twin_id=deal.twin_id,
            details={"from": old_status, "to": new_status},
        ))
        await self.db.flush()

        return deal

    # ------------------------------------------------------------------
    # Contract management
    # ------------------------------------------------------------------

    async def upload_contract(
        self, deal_id: UUID, contract_url: str, is_amendment: bool = False,
        parent_contract_id: UUID = None,
    ) -> DealContract:
        deal = await self._get_deal(deal_id)
        if not deal:
            raise ValueError("Deal not found")

        # Get next version number
        result = await self.db.execute(
            select(func.coalesce(func.max(DealContract.version), 0))
            .where(DealContract.deal_id == deal_id)
        )
        next_version = result.scalar() + 1

        contract = DealContract(
            deal_id=deal_id,
            version=next_version,
            contract_url=contract_url,
            is_amendment=is_amendment,
            parent_contract_id=parent_contract_id,
        )
        self.db.add(contract)
        await self.db.flush()
        return contract

    async def sign_contract(
        self, contract_id: UUID, party: str
    ) -> DealContract:
        """Record a signature. party: 'talent' or 'client'."""
        result = await self.db.execute(
            select(DealContract).where(DealContract.id == contract_id)
        )
        contract = result.scalar_one_or_none()
        if not contract:
            raise ValueError("Contract not found")

        now = datetime.now(timezone.utc)
        if party == "talent":
            contract.signed_by_talent_at = now
        elif party == "client":
            contract.signed_by_client_at = now
        else:
            raise ValueError("party must be 'talent' or 'client'")

        await self.db.flush()
        return contract

    # ------------------------------------------------------------------
    # Milestones
    # ------------------------------------------------------------------

    async def add_milestone(
        self, deal_id: UUID, title: str, description: str = None, due_date=None,
    ) -> DealMilestone:
        result = await self.db.execute(
            select(func.coalesce(func.max(DealMilestone.sort_order), -1))
            .where(DealMilestone.deal_id == deal_id)
        )
        next_order = result.scalar() + 1

        milestone = DealMilestone(
            deal_id=deal_id, title=title, description=description,
            due_date=due_date, sort_order=next_order,
        )
        self.db.add(milestone)
        await self.db.flush()
        return milestone

    async def complete_milestone(
        self, milestone_id: UUID, user_id: UUID, comments: str = None,
    ) -> DealMilestone:
        result = await self.db.execute(
            select(DealMilestone).where(DealMilestone.id == milestone_id)
        )
        milestone = result.scalar_one_or_none()
        if not milestone:
            raise ValueError("Milestone not found")

        milestone.completed_at = datetime.now(timezone.utc)
        milestone.completed_by = user_id
        if comments:
            milestone.comments = comments
        await self.db.flush()
        return milestone

    # ------------------------------------------------------------------
    # Deal messaging
    # ------------------------------------------------------------------

    async def send_message(
        self, deal_id: UUID, sender_id: UUID, content: str,
    ) -> DealMessage:
        msg = DealMessage(deal_id=deal_id, sender_id=sender_id, content=content)
        self.db.add(msg)
        await self.db.flush()
        return msg

    async def get_messages(
        self, deal_id: UUID, limit: int = 50, offset: int = 0,
    ) -> List[DealMessage]:
        result = await self.db.execute(
            select(DealMessage)
            .where(DealMessage.deal_id == deal_id)
            .order_by(DealMessage.created_at)
            .offset(offset).limit(limit)
        )
        return list(result.scalars().all())

    # ------------------------------------------------------------------
    # PUL (Permitted Use Lifecycle) — APPEND-ONLY
    # ------------------------------------------------------------------

    async def submit_pul(
        self, deal_id: UUID, submitted_by: UUID, record_type: str, **kwargs,
    ) -> PermittedUseRecord:
        record = PermittedUseRecord(
            deal_id=deal_id, submitted_by=submitted_by, record_type=record_type,
            content_produced=kwargs.get("content_produced", {}),
            platforms_used=kwargs.get("platforms_used", []),
            territories_reached=kwargs.get("territories_reached", []),
            production_partners=kwargs.get("production_partners", []),
            ai_tools_used=kwargs.get("ai_tools_used", []),
            scope_changes=kwargs.get("scope_changes"),
            period_start=kwargs.get("period_start"),
            period_end=kwargs.get("period_end"),
        )
        self.db.add(record)
        await self.db.flush()
        return record

    # ------------------------------------------------------------------
    # RDA (Reference Data Agreement)
    # ------------------------------------------------------------------

    async def create_rda(
        self, deal_id: UUID, recipient_org: str, recipient_contact: str,
        purpose: str, restrictions: dict = None,
    ) -> ReferenceDataAgreement:
        deal = await self._get_deal(deal_id)
        if not deal:
            raise ValueError("Deal not found")

        # Build manifest from deal's data_scope
        manifest = {scope: True for scope in (deal.data_scope or [])}

        rda = ReferenceDataAgreement(
            deal_id=deal_id, data_manifest=manifest,
            recipient_org=recipient_org, recipient_contact=recipient_contact,
            purpose=purpose, restrictions=restrictions or {},
        )
        self.db.add(rda)
        await self.db.flush()
        return rda

    # ------------------------------------------------------------------
    # Production Partner Disclosure
    # ------------------------------------------------------------------

    async def disclose_partner(
        self, deal_id: UUID, partner_name: str, partner_role: str,
        data_access_scope: str = None, approved_by: UUID = None,
    ) -> ProductionPartnerDisclosure:
        ppd = ProductionPartnerDisclosure(
            deal_id=deal_id, partner_name=partner_name, partner_role=partner_role,
            data_access_scope=data_access_scope, approved_by=approved_by,
        )
        self.db.add(ppd)
        await self.db.flush()
        return ppd

    # ------------------------------------------------------------------
    # Pipeline queries
    # ------------------------------------------------------------------

    async def get_pipeline(self, twin_id: UUID = None, status: str = None) -> List[Deal]:
        """Get deals for pipeline view, optionally filtered."""
        query = select(Deal).order_by(desc(Deal.created_at))
        if twin_id:
            query = query.where(Deal.twin_id == twin_id)
        if status:
            query = query.where(Deal.status == status)
        result = await self.db.execute(query.limit(100))
        return list(result.scalars().all())

    async def get_deal_workspace(self, deal_id: UUID) -> Dict:
        """Get everything about a deal for the workspace view."""
        deal = await self._get_deal(deal_id)
        if not deal:
            return {}

        milestones = await self.db.execute(
            select(DealMilestone).where(DealMilestone.deal_id == deal_id)
            .order_by(DealMilestone.sort_order)
        )
        contracts = await self.db.execute(
            select(DealContract).where(DealContract.deal_id == deal_id)
            .order_by(DealContract.version)
        )
        pul = await self.db.execute(
            select(PermittedUseRecord).where(PermittedUseRecord.deal_id == deal_id)
            .order_by(PermittedUseRecord.submitted_at)
        )
        validations = await self.db.execute(
            select(ClientValidationSubmission)
            .where(ClientValidationSubmission.deal_id == deal_id)
        )

        return {
            "deal": deal,
            "milestones": list(milestones.scalars().all()),
            "contracts": list(contracts.scalars().all()),
            "pul_records": list(pul.scalars().all()),
            "validations": list(validations.scalars().all()),
        }

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    async def _get_twin(self, twin_id: UUID) -> Optional[Twin]:
        result = await self.db.execute(select(Twin).where(Twin.id == twin_id))
        return result.scalar_one_or_none()

    async def _get_deal(self, deal_id: UUID) -> Optional[Deal]:
        result = await self.db.execute(select(Deal).where(Deal.id == deal_id))
        return result.scalar_one_or_none()

    async def _get_latest_contract(self, deal_id: UUID) -> Optional[DealContract]:
        result = await self.db.execute(
            select(DealContract).where(DealContract.deal_id == deal_id)
            .order_by(desc(DealContract.version)).limit(1)
        )
        return result.scalar_one_or_none()

    async def _get_active_licensing_rules(self, twin_id: UUID) -> Optional[LicensingRulesConfig]:
        result = await self.db.execute(
            select(LicensingRulesConfig)
            .where(LicensingRulesConfig.twin_id == twin_id, LicensingRulesConfig.is_active.is_(True))
            .order_by(desc(LicensingRulesConfig.version)).limit(1)
        )
        return result.scalar_one_or_none()

    async def _get_grace_period(self, twin_id: UUID) -> int:
        rules = await self._get_active_licensing_rules(twin_id)
        return rules.default_grace_period_hours if rules else 48

    async def _validate_consent(self, twin_id: UUID, data_scope: List[str]):
        """Validate that the talent has granted consent for each data_scope module."""
        SCOPE_TO_CONSENT = {
            "voice_identity": "VOICE_LICENSING",
            "visual_identity": "VISUAL_LICENSING",
            "identity_profile": "IN_PLATFORM_CAPTURE",
            "knowledge_base": "DATA_PROCESSING",
        }

        result = await self.db.execute(
            select(ConsentRecord)
            .where(ConsentRecord.twin_id == twin_id, ConsentRecord.action == "GRANTED")
        )
        granted = {r.consent_type for r in result.scalars().all()}

        missing = []
        for scope in data_scope:
            required_consent = SCOPE_TO_CONSENT.get(scope)
            if required_consent and required_consent not in granted:
                missing.append(f"{scope} requires {required_consent} consent")

        if missing:
            raise ValueError(f"Missing consent: {'; '.join(missing)}")
