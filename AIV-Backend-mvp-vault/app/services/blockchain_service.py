"""
Blockchain Service — Polygon identity provenance anchoring.

Anchors SHA-256 hashes to Polygon smart contract for tamper-proof provenance.
Supports typed records (IDENTITY_SEAL, DEAL_EXECUTION, AUDIT_ANCHOR, IDENTITY_UPDATE)
with evolution chain linking (each record references previous_hash).

Cost: ~$0.01-0.05 per anchor on Polygon mainnet.
"""
import asyncio
import hashlib
import json
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, List
from uuid import UUID

from sqlalchemy import select, desc, and_
from sqlalchemy.ext.asyncio import AsyncSession

from web3 import Web3
from ..config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Record types for typed anchoring
RECORD_TYPES = {
    "IDENTITY_SEAL": "Identity creation or certification",
    "IDENTITY_UPDATE": "Identity profile update (training, upload, edit)",
    "DEAL_EXECUTION": "Deal executed (both parties signed)",
    "AUDIT_ANCHOR": "Periodic audit log integrity hash",
}

CERT_ABI = [
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "internalType": "bytes32", "name": "dataHash", "type": "bytes32"},
            {"indexed": True, "internalType": "address", "name": "certifier", "type": "address"},
            {"indexed": False, "internalType": "uint256", "name": "timestamp", "type": "uint256"},
            {"indexed": False, "internalType": "string", "name": "twinId", "type": "string"}
        ],
        "name": "IdentityCertified",
        "type": "event"
    },
    {
        "inputs": [{"internalType": "bytes32", "name": "", "type": "bytes32"}],
        "name": "certificationTimestamps",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {"internalType": "bytes32", "name": "dataHash", "type": "bytes32"},
            {"internalType": "string", "name": "twinId", "type": "string"}
        ],
        "name": "certify",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "bytes32", "name": "dataHash", "type": "bytes32"}],
        "name": "verify",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    }
]


class BlockchainService:
    def __init__(self):
        self.enabled = bool(
            settings.polygon_rpc_url
            and settings.polygon_private_key
            and settings.cert_contract_address
        )
        if self.enabled:
            self.w3 = Web3(Web3.HTTPProvider(settings.polygon_rpc_url))
            self.contract = self.w3.eth.contract(
                address=Web3.to_checksum_address(settings.cert_contract_address),
                abi=CERT_ABI,
            )
            self.account = self.w3.eth.account.from_key(settings.polygon_private_key)
            logger.info(
                "BlockchainService enabled — network=%s, contract=%s",
                settings.polygon_rpc_url,
                settings.cert_contract_address,
            )
        else:
            logger.warning(
                "BlockchainService disabled — missing one or more env vars: "
                "POLYGON_RPC_URL, POLYGON_PRIVATE_KEY, CERT_CONTRACT_ADDRESS"
            )

    # ------------------------------------------------------------------
    # Core anchoring
    # ------------------------------------------------------------------

    def _anchor_sync(self, data_hash: str, twin_id: str) -> dict:
        """Synchronous blockchain write — runs in a thread to avoid blocking."""
        hash_bytes = bytes.fromhex(data_hash)
        nonce = self.w3.eth.get_transaction_count(self.account.address)
        tx = self.contract.functions.certify(hash_bytes, str(twin_id)).build_transaction({
            "from": self.account.address,
            "nonce": nonce,
            "gas": 150000,
            "gasPrice": self.w3.eth.gas_price,
        })
        signed = self.account.sign_transaction(tx)
        tx_hash = self.w3.eth.send_raw_transaction(signed.raw_transaction)
        receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
        return {
            "tx_hash": receipt.transactionHash.hex(),
            "block_number": receipt.blockNumber,
            "network": settings.polygon_network,
        }

    async def anchor_hash(self, data_hash: str, twin_id: str) -> Optional[Dict]:
        """Anchor a SHA-256 hash to Polygon blockchain (non-blocking)."""
        if not self.enabled:
            return None

        try:
            result = await asyncio.to_thread(self._anchor_sync, data_hash, twin_id)
            logger.info(
                "Blockchain anchor success — tx=%s block=%s",
                result["tx_hash"],
                result["block_number"],
            )
            return result
        except Exception as e:
            logger.error("Blockchain anchoring failed: %s", e, exc_info=True)
            return None

    # ------------------------------------------------------------------
    # Typed record anchoring
    # ------------------------------------------------------------------

    async def anchor_typed(
        self,
        twin_id: str,
        record_type: str,
        data: dict,
        previous_hash: Optional[str] = None,
    ) -> Optional[Dict]:
        """Anchor a typed record with evolution chain linking.

        Args:
            twin_id: The twin this record belongs to
            record_type: IDENTITY_SEAL | IDENTITY_UPDATE | DEAL_EXECUTION | AUDIT_ANCHOR
            data: The data to hash (deal terms, identity snapshot, audit summary)
            previous_hash: Hash of the previous record in this twin's chain (for evolution tracking)

        Returns:
            {tx_hash, block_number, network, data_hash, record_type, previous_hash}
        """
        if record_type not in RECORD_TYPES:
            logger.error(f"Invalid record type: {record_type}")
            return None

        # Build the record payload including type and chain link
        record = {
            "twin_id": twin_id,
            "record_type": record_type,
            "data": data,
            "previous_hash": previous_hash,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        data_hash = hashlib.sha256(
            json.dumps(record, sort_keys=True, default=str).encode()
        ).hexdigest()

        result = await self.anchor_hash(data_hash, twin_id)
        if result:
            result["data_hash"] = data_hash
            result["record_type"] = record_type
            result["previous_hash"] = previous_hash
        return result

    async def anchor_identity_seal(
        self, twin_id: str, identity_data: dict, previous_hash: Optional[str] = None,
    ) -> Optional[Dict]:
        """Anchor an identity creation or certification event."""
        return await self.anchor_typed(
            twin_id, "IDENTITY_SEAL", identity_data, previous_hash,
        )

    async def anchor_deal_execution(
        self, twin_id: str, deal_data: dict, previous_hash: Optional[str] = None,
    ) -> Optional[Dict]:
        """Anchor a deal execution event (both parties signed)."""
        return await self.anchor_typed(
            twin_id, "DEAL_EXECUTION", deal_data, previous_hash,
        )

    async def anchor_identity_update(
        self, twin_id: str, update_summary: dict, previous_hash: Optional[str] = None,
    ) -> Optional[Dict]:
        """Anchor an identity update (training, file upload, profile edit)."""
        return await self.anchor_typed(
            twin_id, "IDENTITY_UPDATE", update_summary, previous_hash,
        )

    async def anchor_audit_period(
        self, twin_id: str, audit_data: dict, previous_hash: Optional[str] = None,
    ) -> Optional[Dict]:
        """Anchor a periodic audit log integrity hash."""
        return await self.anchor_typed(
            twin_id, "AUDIT_ANCHOR", audit_data, previous_hash,
        )

    # ------------------------------------------------------------------
    # Evolution chain helpers
    # ------------------------------------------------------------------

    async def get_latest_hash(self, twin_id: str, db: AsyncSession) -> Optional[str]:
        """Get the most recent data_hash for a twin's evolution chain.

        Reads from identity_package_versions table (seal_hash field).
        """
        from ..models.identity_package_version import IdentityPackageVersion
        result = await db.execute(
            select(IdentityPackageVersion.seal_hash)
            .where(IdentityPackageVersion.twin_id == UUID(twin_id))
            .order_by(desc(IdentityPackageVersion.created_at))
            .limit(1)
        )
        return result.scalar_one_or_none()

    # ------------------------------------------------------------------
    # Wallet monitoring
    # ------------------------------------------------------------------

    async def check_wallet_balance(self) -> Optional[Dict]:
        """Check the anchoring wallet's MATIC balance.

        Returns balance info and warning if below threshold.
        """
        if not self.enabled:
            return {"enabled": False, "message": "Blockchain service disabled"}

        try:
            balance_wei = await asyncio.to_thread(
                self.w3.eth.get_balance, self.account.address
            )
            balance_matic = self.w3.from_wei(balance_wei, "ether")

            # Warn if below 10 MATIC (~5,000-10,000 anchors at current gas prices)
            low_balance = float(balance_matic) < 10.0

            result = {
                "enabled": True,
                "address": self.account.address,
                "balance_matic": float(balance_matic),
                "balance_wei": balance_wei,
                "low_balance": low_balance,
                "network": settings.polygon_network,
            }

            if low_balance:
                logger.warning(
                    "Blockchain wallet low balance: %.4f MATIC (address: %s)",
                    float(balance_matic), self.account.address,
                )

            return result
        except Exception as e:
            logger.error("Wallet balance check failed: %s", e)
            return {"enabled": True, "error": str(e)}

    # ------------------------------------------------------------------
    # Verification
    # ------------------------------------------------------------------

    async def verify_on_chain(self, data_hash: str) -> Optional[int]:
        """Verify a hash exists on-chain. Returns timestamp if found, None if not."""
        if not self.enabled:
            return None
        try:
            hash_bytes = bytes.fromhex(data_hash)
            timestamp = await asyncio.to_thread(
                self.contract.functions.verify(hash_bytes).call
            )
            return timestamp if timestamp > 0 else None
        except Exception as e:
            logger.error("On-chain verification failed: %s", e)
            return None
