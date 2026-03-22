"""
Deploy AIVCertificationRegistry to Polygon Amoy Testnet.

Usage:
  1. Get free Amoy POL from https://faucet.polygon.technology/
     or https://www.alchemy.com/faucets/polygon-amoy
  2. Set POLYGON_PRIVATE_KEY env var (or it will generate a new wallet)
  3. Run: python scripts/deploy_contract.py

The script will output the contract address to add to your .env
"""

import os
import sys
from web3 import Web3

AMOY_RPC = "https://rpc-amoy.polygon.technology/"

CONTRACT_ABI = [
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "internalType": "bytes32", "name": "dataHash", "type": "bytes32"},
            {"indexed": True, "internalType": "address", "name": "certifier", "type": "address"},
            {"indexed": False, "internalType": "uint256", "name": "timestamp", "type": "uint256"},
            {"indexed": False, "internalType": "string", "name": "twinId", "type": "string"},
        ],
        "name": "IdentityCertified",
        "type": "event",
    },
    {
        "inputs": [{"internalType": "bytes32", "name": "", "type": "bytes32"}],
        "name": "certificationTimestamps",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [
            {"internalType": "bytes32", "name": "dataHash", "type": "bytes32"},
            {"internalType": "string", "name": "twinId", "type": "string"},
        ],
        "name": "certify",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [{"internalType": "bytes32", "name": "dataHash", "type": "bytes32"}],
        "name": "verify",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
]

# Compiled bytecode from contracts/AIVCertificationRegistry.sol (solc 0.8.19)
CONTRACT_BYTECODE = (
    "608060405234801561001057600080fd5b50610452806100206000396000f3fe"
    "608060405234801561001057600080fd5b50600436106100415760003560e01c"
    "806375e3661614610046578063d388c79814610076578063e2fd23ac14610092"
    "575b600080fd5b610060600480360381019061005b91906101fa565b6100c256"
    "5b60405161006d9190610240565b60405180910390f35b6101009060048036038"
    "1019061008b91906102c0565b6100de565b005b6100ac600480360381019061"
    "00a791906101fa565b6101a2565b6040516100b99190610240565b6040518091"
    "0390f35b600080600083815260200190815260200160002054905091905056"
    "5b60008060008581526020019081526020016000205414610133576040517f08"
    "c379a000000000000000000000000000000000000000000000000000000000815"
    "260040161012a9061037d565b60405180910390fd5b4260008060008581526020"
    "01908152602001600020819055503373ffffffffffffffffffffffffffffffffffff"
    "ffffff16837f490f8b0699832abf88bd080668b8ef8c5c18cced7fa3943b8a4249"
    "e045443ce9428585604051610195939291906103ea565b60405180910390a35050"
    "50565b60006020528060005260406000206000915090505481565b600080fd5b60"
    "0080fd5b6000819050919050565b6101d7816101c4565b81146101e257600080fd"
    "5b50565b6000813590506101f4816101ce565b92915050565b60006020828403121"
    "5610210576102106101ba565b5b600061021e848285016101e5565b91505092915"
    "050565b6000819050919050565b61023a81610227565b82525050565b6000602082"
    "0190506102556000830184610231565b92915050565b600080fd5b600080fd5b60"
    "0080fd5b60008083601f8401126102805761027f61025b565b5b8235905067ffff"
    "ffffffffffff81111561029d5761029c610260565b5b602083019150836001820283"
    "0111156102b9576102b8610265565b5b9250929050565b600080600060408486031"
    "2156102d9576102d86101ba565b5b60006102e7868287016101e5565b9350506020"
    "84013567ffffffffffffffff811115610308576103076101bf565b5b610314868287"
    "0161026a565b92509250509250925092565b600082825260208201905092915050"
    "565b7f416c72656164792063657274696669656400000000000000000000000000"
    "000000600082015250565b6000610367601183610320565b91506103728261033156"
    "5b602082019050919050565b600060208201905081810360008301526103968161"
    "035a565b9050919050565b82818337600083830152505050565b6000601f19601f83"
    "01169050919050565b60006103c98385610320565b93506103d683858461039d565b"
    "6103df836103ac565b840190509392505050565b60006040820190506103ff600083"
    "0186610231565b81810360208301526104128184866103bd565b905094935050505"
    "056fea26469706673582212204afce8e6cd9d17d7c24330875a7bafe4be69cf20a2"
    "8eff27183fb60b6720e02064736f6c63430008130033"
)


def main():
    w3 = Web3(Web3.HTTPProvider(AMOY_RPC))

    if not w3.is_connected():
        print("ERROR: Cannot connect to Amoy RPC")
        sys.exit(1)

    chain_id = w3.eth.chain_id
    print(f"Connected to chain {chain_id} (Amoy = 80002)")

    pk = os.environ.get("POLYGON_PRIVATE_KEY", "")
    if not pk:
        acct = w3.eth.account.create()
        pk = acct.key.hex()
        print(f"\n⚠️  No POLYGON_PRIVATE_KEY set. Generated new wallet:")
        print(f"   Address:     {acct.address}")
        print(f"   Private Key: {pk}")
        print(f"\n   Fund this address with free Amoy POL from:")
        print(f"   https://faucet.polygon.technology/")
        print(f"   https://www.alchemy.com/faucets/polygon-amoy")
        print(f"\n   Then re-run this script with:")
        print(f"   POLYGON_PRIVATE_KEY={pk} python scripts/deploy_contract.py")
        return

    account = w3.eth.account.from_key(pk)
    balance = w3.eth.get_balance(account.address)
    print(f"Deployer: {account.address}")
    print(f"Balance:  {w3.from_wei(balance, 'ether')} POL")

    if balance == 0:
        print("\nERROR: Wallet has 0 POL. Get free testnet POL from:")
        print("  https://faucet.polygon.technology/")
        print("  https://www.alchemy.com/faucets/polygon-amoy")
        sys.exit(1)

    contract = w3.eth.contract(abi=CONTRACT_ABI, bytecode=CONTRACT_BYTECODE)
    tx = contract.constructor().build_transaction({
        "from": account.address,
        "nonce": w3.eth.get_transaction_count(account.address),
        "gas": 500000,
        "gasPrice": w3.eth.gas_price,
        "chainId": chain_id,
    })

    signed = account.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    print(f"\nDeploying... tx: {tx_hash.hex()}")

    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
    contract_address = receipt.contractAddress

    print(f"\n✅ Contract deployed!")
    print(f"   Address: {contract_address}")
    print(f"   TX:      {tx_hash.hex()}")
    print(f"   Block:   {receipt.blockNumber}")
    print(f"   Explorer: https://amoy.polygonscan.com/address/{contract_address}")
    print(f"\n   Add to your .env:")
    print(f"   POLYGON_RPC_URL={AMOY_RPC}")
    print(f"   POLYGON_PRIVATE_KEY={pk}")
    print(f"   CERT_CONTRACT_ADDRESS={contract_address}")


if __name__ == "__main__":
    main()
