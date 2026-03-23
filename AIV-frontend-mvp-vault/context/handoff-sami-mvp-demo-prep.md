# Sami Handoff — MVP Demo Prep

## Overview
This document covers everything needed to get the MVP to a demoable, polished state. It covers fixes from the last review, new work, and polish items. All work should be done on the `mvp/vault-ui-polish` branch. When everything is done, open a PR into `mvp/vault`. Do NOT merge directly.

Reference files:
- `context/codebase-context-for-mvp-review.md` (full codebase inventory)
- `context/handoff-sami-revisions-2026-03-10.md` (previous handoff)
- `context/handoff-sami-revisions-2026-03-12.md` (your summary)

---

## SECTION 1: Fixes From Last Review

### 1.1 Build Was Broken (Again)
I fixed these and pushed to your branch, but please run `npm run build` before every push going forward. This is the third time the build shipped broken.

What was wrong:
- Unescaped apostrophes in `src/app/(dashboard)/twin/training/page.tsx` (use `&apos;` or backtick strings)
- Missing type annotations (3 `any` types that needed explicit typing)
- `pdfjs-dist` TextItem union type mismatch in `src/app/(dashboard)/twin/documents/page.tsx`

### 1.2 Tab Persistence on Twin Page
When you refresh on Voice or Documents tab, it resets to Identity. Persist the active tab in the URL query param or hash so refreshing stays on the same tab.

### 1.3 Railway Deploy Fix
The `mvp/vault` branch on Railway has a separate syntax error in `src/components/twin/twin-tab-voice.tsx` that needs fixing before we can redeploy. This is on the `mvp/vault` branch, not your `mvp/vault-ui-polish` branch. When you open your PR and it gets merged, make sure this is resolved.

---

## SECTION 2: Certification Page Rework (HIGH PRIORITY)

The certification page needs significant changes. The cryptographic seal needs to feel like "court-ready documentation" and real immutable proof of creation.

### 2.1 Certification Must Be One-Time and Immutable
Right now users can hit "Re-Certify" and create v1.1, v1.2, etc. This is wrong. Certification is like a property title. You own it once. You can update your identity, commercial terms, governance rules all you want, but the certification seal stays. It's immutable proof of creation at a point in time.

Changes needed:
- Remove the "Re-Certify" button. Once certified, show a "Certified" badge/status instead
- Remove the version history section (there should only ever be one certification)
- Keep the audit trail section
- Backend: In `app/routers/certification.py`, the `POST` endpoint should reject the request if the twin already has a certification. Return a 409 Conflict with message like "Twin is already certified. Certification is immutable."
- The `create_proof` method in `app/services/certification_service.py` should check for existing certification before creating a new one

### 2.2 Blockchain-Anchored Cryptographic Seal
The product needs to deliver "immutable proof of creation" and "court-ready documentation." We want to anchor the SHA-256 hash to the Polygon blockchain for real on-chain proof.

**How it works (the pattern is called "Proof of Existence"):**

1. We already generate the SHA-256 hash of the ALCM data. That part is done.
2. Deploy a simple Solidity smart contract on Polygon with one function: `storeHash(bytes32 hash)` that emits an event with the hash, timestamp, and twin metadata.
3. When certification happens on the backend, after generating the SHA-256 hash, call the smart contract via `web3.py` to write the hash on-chain.
4. Store the transaction hash and block number in the certification record alongside the SHA-256 hash.
5. The verification page can then link to Polygonscan showing the on-chain proof.

**Implementation steps:**

Backend (`AIV-Backend`):
- `pip install web3` (add to requirements.txt)
- Create a simple Solidity contract (can use Remix IDE to deploy):
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract AIVCertificationRegistry {
    event IdentityCertified(
        bytes32 indexed dataHash,
        address indexed certifier,
        uint256 timestamp,
        string twinId
    );

    mapping(bytes32 => uint256) public certificationTimestamps;

    function certify(bytes32 dataHash, string calldata twinId) external {
        require(certificationTimestamps[dataHash] == 0, "Already certified");
        certificationTimestamps[dataHash] = block.timestamp;
        emit IdentityCertified(dataHash, msg.sender, block.timestamp, twinId);
    }

    function verify(bytes32 dataHash) external view returns (uint256) {
        return certificationTimestamps[dataHash];
    }
}
```
- Deploy this contract to Polygon mainnet (or Amoy testnet first). Cost is fractions of a cent per transaction on Polygon.
- Create `app/services/blockchain_service.py`:
```python
from web3 import Web3
from ..config import settings

class BlockchainService:
    def __init__(self):
        self.w3 = Web3(Web3.HTTPProvider(settings.POLYGON_RPC_URL))
        self.contract = self.w3.eth.contract(
            address=settings.CERT_CONTRACT_ADDRESS,
            abi=CERT_ABI  # ABI from compiled contract
        )
        self.account = self.w3.eth.account.from_key(settings.POLYGON_PRIVATE_KEY)

    async def anchor_hash(self, data_hash: str, twin_id: str) -> dict:
        """Anchor a SHA-256 hash to Polygon blockchain."""
        hash_bytes = bytes.fromhex(data_hash)
        tx = self.contract.functions.certify(hash_bytes, twin_id).build_transaction({
            'from': self.account.address,
            'nonce': self.w3.eth.get_transaction_count(self.account.address),
            'gas': 100000,
            'gasPrice': self.w3.eth.gas_price,
        })
        signed = self.account.sign_transaction(tx)
        tx_hash = self.w3.eth.send_raw_transaction(signed.raw_transaction)
        receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
        return {
            'tx_hash': receipt.transactionHash.hex(),
            'block_number': receipt.blockNumber,
            'network': 'polygon',
        }
```
- Add env vars: `POLYGON_RPC_URL`, `POLYGON_PRIVATE_KEY`, `CERT_CONTRACT_ADDRESS`
- Update `certification_service.py` to call `blockchain_service.anchor_hash()` after generating the SHA-256 hash
- Add `tx_hash`, `block_number`, `network` columns to the `certifications` table (new Alembic migration)
- Update `CertificationResponse` schema to include blockchain fields

Frontend:
- Update the certification page to show:
  - "Blockchain-Anchored Cryptographic Seal" as the header (not just "SHA-256 Certification Hash")
  - Polygon network indicator with green status dot
  - Transaction hash with link to Polygonscan (`https://polygonscan.com/tx/{tx_hash}`)
  - Block number
  - The existing SHA-256 hash display stays
- Update the public verification page (`/verify/[hash]`) to also show blockchain proof

**If blockchain integration proves too complex or you run into issues:**
- Build the UI as if blockchain is there (show "Blockchain Seal" section, Polygon indicator, etc.)
- Add a "Coming Soon" badge on the blockchain section
- The SHA-256 certification still works and is still legitimate
- We can wire up the actual Polygon anchoring later

### 2.3 Real PDF Certificate Generation
The current "Download PDF" button just calls `window.print()`. Replace this with actual PDF generation.

Options (pick one):
- `html2canvas` + `jsPDF`: Render the certificate card to canvas, then to PDF. Quick to implement.
- Print-specific CSS: Create a `@media print` stylesheet that makes the certificate look like a real legal document when printed. This is simpler but less controlled.
- `@react-pdf/renderer`: Build a proper PDF template. More work but best result.

The generated PDF should look like a real legal certificate:
- AIV branding and logo at the top
- "Certificate of Digital Identity Ownership" title
- Owner name, certification date
- SHA-256 hash prominently displayed
- Blockchain transaction hash (if available)
- List of certified assets
- Public verification URL as a QR code or link
- Footer with "This document was generated by the AIV Identity Protection Platform"
- Professional typography and layout

### 2.4 Certification Page Overall Polish
The page should feel authoritative and premium. Think legal document, not tech dashboard.
- The certificate card should look like an actual certificate (borders, seals, formal typography)
- Add a visual "seal" graphic (can be SVG) next to the hash
- The "Certified Assets" badges should feel weighty, not like casual tags
- Consider adding a "What This Means" section explaining in plain language what the certification protects and how it can be used in court

---

## SECTION 3: Governance Guardrails in AI Chat (HIGH PRIORITY — WOW FACTOR)

This is a demo wow-moment. "Watch, I just told the twin not to discuss politics, and now it won't."

### The Problem
The Governance tab lets users set rules (no_go_topics, behavioral_tone, usage_restrictions, content_boundaries). But the AI chat completely ignores them. The backend `aiv_service.py` builds a system prompt but never reads `twin.governance`. The router `aiv.py` loads `twin.alcm_data` but not `twin.governance`.

### The Fix

Backend (`AIV-Backend/app/services/aiv_service.py`):
- In the `_build_context` method, accept a `governance` parameter
- Inject governance rules into the system prompt when mode is "assistant":
```python
if governance:
    rules = []
    if governance.get("no_go_topics"):
        rules.append(f"STRICT RULE: You must REFUSE to discuss these topics: {governance['no_go_topics']}. If asked, say 'My governance limits prevent me from discussing that topic.'")
    if governance.get("behavioral_tone"):
        rules.append(f"TONE: Always respond with this tone: {governance['behavioral_tone']}")
    if governance.get("usage_restrictions"):
        rules.append(f"RESTRICTIONS: {governance['usage_restrictions']}")
    if governance.get("content_boundaries"):
        rules.append(f"CONTENT BOUNDARIES: {governance['content_boundaries']}")
    if rules:
        parts.append("\\n--- GOVERNANCE GUARDRAILS (MUST OBEY) ---\\n" + "\\n".join(rules))
```

Backend (`AIV-Backend/app/routers/aiv.py`):
- When loading the twin, also grab `twin.governance`
- Pass it to `aiv.chat()` as a new parameter
- Update the `AIVService.chat()` method signature to accept `governance`

Frontend:
- When the AI responds with a governance refusal (contains "governance limits prevent me from"), show a subtle toast or inline indicator like "Governance guardrail activated" so the user knows the rules are working
- The chat-interface.tsx already detects this text in message-bubble.tsx, just make sure it's visually clear

---

## SECTION 4: Voice Cloning E2E Verification

I haven't been able to verify voice cloning end-to-end since Railway is down. It should be back up soon. Please make sure you've tested this yourself with a fresh account:

1. Create new account
2. Go through full onboarding (all 6 steps with real video recording)
3. After twin creation, go to Voice tab
4. Verify voice status shows "Ready"
5. Use TTS playground to generate speech
6. Confirm the generated speech sounds like the recorded voice
7. Document any failures or issues

This is critical for the demo. Voice cloning is the hero feature.

---

## SECTION 5: Vault Dashboard Polish

The vault dashboard is the first thing users see after login. It needs to look premium and polished.

Current state (from code review): You've already added the completeness ring, activity feed, protection checklist, and premium empty state. Good work.

Polish items:
- Make sure the completeness ring is prominent and animated (smooth fill animation on load)
- Activity feed should show relative timestamps ("2 hours ago", "yesterday") — confirm this is working
- Protection checklist items should link to the relevant page when clicked
- Quick action buttons should be clearly visible and functional
- The overall layout should feel premium and spacious, not cramped
- Test both light and dark themes

---

## SECTION 6: Training Portal Polish

Current state: You built the submission form with category, content, description, and the approve/reject flow. Good.

Polish items:
- The form should feel interactive and useful, not just a basic form
- Add helpful placeholder text in each field explaining what to enter
- After submitting, show a success animation or clear feedback
- The submissions list should show status clearly (pending/approved/rejected)
- Make sure at least one training submission can be created and approved during a demo walkthrough
- Consider adding example/suggested categories to guide users

---

## SECTION 7: Onboarding Flow Polish

The onboarding is the first thing anyone experiences. It needs to feel premium.

Check and polish:
- Video recording step: camera preview should be smooth, recording indicator clear, playback works
- Research agent loading: the animated loading screen with rotating rings should feel impressive, not anxious
- Transition animations between steps should be smooth (you have Framer Motion, make sure it's polished)
- Error handling: if camera access is denied, if voice cloning fails, if research times out — all should have clear, friendly error messages
- The "Processing" step before completion should feel like something impressive is happening (progress indicators, status messages)
- The completion screen should feel celebratory

---

## SECTION 8: Mobile Responsiveness Final Pass

Do a final check on all pages at mobile viewport widths (375px, 414px):
- Vault dashboard
- Twin profile (all 6 tabs)
- Certification page
- Training portal
- Deals page
- Document editor
- Chat interface
- Onboarding flow

Fix any overflow, text truncation, or layout breaking issues.

---

## SECTION 9: General Polish & Testing

### 9.1 Theme Testing
Test every page in both light and dark themes. Fix any contrast issues, missing theme variables, or elements that look wrong in one theme.

### 9.2 Loading States
Every page that fetches data should have a clean loading state (spinner or skeleton). No blank screens while data loads.

### 9.3 Empty States
Every list/collection page should have a meaningful empty state when there's no data. Not just blank space.

### 9.4 Error Handling
API failures should show toast notifications, not silent failures or console errors.

### 9.5 Navigation
- Sidebar should highlight the current page
- All links should work
- Back navigation should work correctly

---

## SECTION 10: End-to-End Demo Walkthrough

Before opening the PR, do a complete demo walkthrough on the demo account (`demo@vault.dev` / `VaultDemo#2026`):

1. Sign in
2. If no twin exists, go through full onboarding
3. Land on vault dashboard — verify completeness ring, checklist, activity feed
4. Go to Twin profile — check all 6 tabs, edit some fields
5. Go to Governance tab — set some rules (e.g., no_go_topics: "politics, religion")
6. Go to AI chat — ask about a no-go topic, verify guardrails kick in
7. Go to Voice tab — generate TTS, verify it works
8. Go to Training — create a submission, approve it
9. Go to Certification — certify the twin, verify one-time seal
10. Download the PDF certificate
11. Open the public verification URL in incognito
12. Go to Documents — create a document from template
13. Go to Deals — verify the page loads with "Coming Soon" for new deals
14. Check Settings page
15. Test on mobile viewport
16. Test in both light and dark themes

Document any issues you find during this walkthrough.

---

## Rules
- Run `npm run build` before every push
- Existing shadcn/ui components only for frontend. New pip packages are fine for backend (web3, etc.)
- Test both dark and light themes
- Pull latest `mvp/vault` before starting
- When done, open a PR from `mvp/vault-ui-polish` into `mvp/vault` and ping me
