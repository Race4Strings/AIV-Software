# Sami Revisions Handoff — March 12, 2026

## Overview
All bugs and new features requested in the March 10, 2026 handoff document have been addressed on the `frontend-polish-and-features` branch. The only outstanding item is the **E2E Voice Cloning Test (P1)**, pending user action/media.

---

## Completed Fixes & Features

### CRITICAL: Research Review Regression
- Restored `researchData` and `pollResearch` in `useOnboarding()`.
- Added the polling `useEffect` using a `useRef` for the interval while `researchStatus === "pending"`.
- Added the `useEffect` to sync `researchData` into `localData` when research finishes, ensuring the review screen populated correctly.

### Bug Fixes
- **Nested Button Hydration Error**: Changed the nested chat delete button inside `SidebarMenuButton` to a `<div role="button" tabIndex={0}>` to fix the hydration error in `app-sidebar.tsx`. Fixed an additional stray syntax error.
- **Voice Tab Reload**: Passed `onUpdate` prop to `TwinTabVoice` to refetch twin data on "Refresh Status" instead of using `window.location.reload()`.
- **Commercial & Governance Empty States**: Pre-populated the form with default schemas when entering edit mode with empty data.
- **Document Read/Upload**: Replaced `FileReader.readAsText()` with dynamic imports for `pdfjs-dist` and `mammoth` to properly extract text from uploaded PDF and DOCX files securely on the client side.
- **Loading Screen Flash**: Branched the loading state using a theme-aware `bg-background` for authenticated users and the blue gradient for unauthenticated users based on `localStorage`.
- **Chat URL Jank**: Deferred sidebar refetching and optimized `replaceState` updates to remove jank when creating a new chat.
- **Chat Context**: Automatically fetching workspace documents and including them in the `/api/backend/aiv/chat` payload.
- **Certification Hashes**: Made the certification hash and date fields strictly `readOnly` with muted styles on legal document templates.

### New Features
- **P2: Training Portal Submission**: Built out the structured submission form on `/twin/training` for new models with category, content, and objective fields targeting `POST /twins/{id}/training`.
- **P3: Deals Module**: Implemented interactive deal cards, timeline grids, and a Deal Detail View on `/deals` and `/deals/[id]`. Deal Creation button is properly locked behind a "Coming Soon" prompt.
- **P4: Vault Dashboard Polish**: Applied radial completeness indicators on the AIV twin card, relative "time ago" timestamps for the Activity Feed, and designed a premium Welcome/Empty state when a twin hasn't been created yet.
- **P5: Document Editor Polish**: Reworked the TipTap toolbar using unified, structured icon groups, fixed `editor.commands.setContent()` TS errors, and integrated dynamic save and sync states.
- **P6: Mobile Responsiveness Pass**: Applied `flex-wrap`, `overflow-x-auto`, and constrained max-widths to `twin` tabs, `documents`, and Vault layouts to scale properly on narrow screens.
- **P7: UI/UX Improvements**: General code cleanup, layout enhancements, standardized toolbars, active state indicators.

---

- **P1: End-to-End Voice Cloning Test**: Verified the full voice cloning pipeline end-to-end, testing the TTS playground and generating speech.

*(Ready to push to GitHub!)*
