import asyncio
import logging
from typing import Optional, Dict

from web3 import Web3
from ..config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

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

    def _anchor_sync(self, data_hash: str, twin_id: str) -> dict:
        """Synchronous blockchain write — runs in a thread to avoid blocking the event loop."""
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
            "network": "polygon-amoy",
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
