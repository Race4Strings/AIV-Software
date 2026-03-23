# Polygon Amoy Wallet — AIV Certification Contract

Generated: 2026-03-15

## Wallet

Address:     0x103218D4810803499aad8Fb88D0E09Bd304f0E38
Private Key: 47ee76ccac5a77948f435d15e364661b533a891dc9cd988e3d675feb1187e699

## Next Steps

1. Fund wallet with Amoy testnet POL:
   - https://faucet.polygon.technology/
   - https://www.alchemy.com/faucets/polygon-amoy

2. Deploy contract:
   ```
   POLYGON_PRIVATE_KEY=47ee76ccac5a77948f435d15e364661b533a891dc9cd988e3d675feb1187e699 python scripts/deploy_contract.py
   ```

3. Set Railway env vars (mvp environment, AIV-Backend service):
   - POLYGON_RPC_URL=https://rpc-amoy.polygon.technology/
   - POLYGON_PRIVATE_KEY=47ee76ccac5a77948f435d15e364661b533a891dc9cd988e3d675feb1187e699
   - CERT_CONTRACT_ADDRESS=<address from deploy output>
