# Sami Revisions Handoff — March 10, 2026

## Overview
Ricardo reviewed the `frontend-polish-and-features` branch and tested the UI end-to-end on the demo account. This document covers bugs to fix, regressions to restore, and new work to implement. All work should be done on the same `frontend-polish-and-features` branch. Pull latest first since Ricardo pushed a small fix (escaped apostrophe + unused import cleanup). When everything is done, open a PR into `mvp/vault`.

---

## CRITICAL: Research Review Regression

In `src/components/onboard/research-review.tsx`, the following were removed and need to be restored:

- `researchData` and `pollResearch` in the `useOnboarding()` destructure
- The polling `useEffect` that calls `pollResearch` every 3 seconds while `researchStatus === "pending"` (used a `useRef` for the interval)
- The `useEffect` that syncs `researchData` into `localData` when research completes

Without these, `localData` is always null. The review screen shows zero sections after research finishes. Users can't review their profile before twin creation.

The `onboarding-context.tsx` hook already exports `researchData` and `pollResearch`. They just need to be consumed again.

---

## Bugs Found During UI Testing

### 1. Nested Button Hydration Error (Sidebar Chat List)
`src/components/dashboard/app-sidebar.tsx` ~line 366: The delete chat `<button>` is nested inside `SidebarMenuButton` (which renders as `<button>`). This causes a React hydration error on every page:
```
In HTML, <button> cannot be a descendant of <button>
```
Fix: Change the inner delete button to a `<div role="button">` or restructure so it's not nested inside the SidebarMenuButton.

### 2. Voice Tab "Refresh Status" Causes Full Page Reload
`src/components/twin/twin-tab-voice.tsx` ~line 225: The "Refresh Status" button calls `window.location.reload()`. This reloads the entire page and resets the tab back to Identity (since `Tabs` uses `defaultValue="identity"`).
Fix: Instead of `window.location.reload()`, refetch just the twin data. The parent `TwinPage` passes `twin` as a prop. Either:
- Accept an `onRefresh` callback prop from the parent and call it
- Or use `router.refresh()` combined with persisting the active tab in the URL hash/query param

### 3. Commercial Tab Edit Mode Has No Fields
`src/components/twin/twin-tab-commercial.tsx`: When `commercial_terms` is empty/null, clicking "Add Commercial Terms" enters edit mode but `Object.entries(form)` is empty, so zero input fields render. Just Cancel and Save with nothing to edit.
Fix: When entering edit mode with empty data, pre-populate `form` with a default schema of expected commercial fields (e.g., `base_rate`, `availability`, `preferred_deal_types`, `exclusions`, `licensing_preferences`). Or better: redesign this as a structured form with predefined fields rather than a dynamic key-value editor.

### 4. Governance Tab Edit Mode Has No Fields
`src/components/twin/twin-tab-governance.tsx`: Same issue as Commercial. Empty governance rules means edit mode shows nothing.
Fix: Same approach. Pre-populate with expected governance fields (e.g., `no_go_topics`, `behavioral_tone`, `usage_restrictions`, `content_boundaries`). Or use a structured form.

### 5. Document Library Upload Only Reads Text
`src/app/(dashboard)/twin/documents/page.tsx`: The `handleUploadDocument` function uses `readFileAsText(file)` which calls `FileReader.readAsText()`. This works for `.txt` and `.md` but produces garbage for PDF and DOCX binary files.
Fix: For PDF files, use a client-side PDF parser (e.g., `pdf-parse` or `pdfjs-dist`) to extract text. For DOCX, use `mammoth` to extract text/HTML. Or upload the raw file to the backend and let it handle parsing. The upload dialog claims to accept `.pdf` and `.doc` but can't actually process them.

### 6. Loading Screen Shows Blue Landing Page Background
`src/app/page.tsx`: When a logged-in user hits `/`, the loading state renders the blue gradient background (`from-[#041030] via-[#0a3d9e] to-[#041030]`) while checking for twins. This flashes before the dashboard loads, clashing with the dark/light theme.
Fix: Use `bg-background` (theme-aware) for the authenticated loading state instead of the blue gradient. Only show the blue gradient for the unauthenticated landing page. Check `localStorage` for user data first and branch the loading UI accordingly.

### 7. Chat Creates New Chat on First Message with URL Change
`src/components/aiv/chat-interface.tsx`: When sending the first message in a new chat, the component creates the chat via API, refetches the sidebar, and then updates the URL with `window.history.replaceState`. This works but the sidebar refetch can cause visual jank. The URL update is deferred until after streaming which is good, but the overall experience feels like a "refresh."
Minor issue, but worth smoothing out.

### 8. Project Documents Not Passed to Chat Context
`src/components/aiv/chat-interface.tsx`: The chat sends `{ message, mode: "assistant" }` to `/api/backend/aiv/chat` but never includes workspace documents. Documents uploaded to a project's knowledge base via Project Settings are stored but never injected into the chat context.
Fix: When sending a chat message, fetch the workspace documents and include their content (or document IDs) in the chat request body so the backend can use them as context.

### 9. Certification Hash Fields Are Editable in Document Templates
`src/app/(dashboard)/twin/documents/templates/[templateId]/page.tsx`: The "AIV Certification Hash" and "Certification Date" fields on legal document templates are regular editable textboxes. Users can type in and modify the hash, which defeats the purpose.
Fix: Make these fields `readOnly` or `disabled` with appropriate styling (grayed out background, cursor not-allowed). They should be auto-populated and locked.

---

## New Feature Work (Priority Order)

### P1: End-to-End Voice Cloning Test
Before writing any new code, test the full voice cloning pipeline. Create a fresh account, go through signup and onboarding. Use a celebrity name for the research agent test. Use YOUR actual voice for video recording. After onboarding, test the TTS playground on the Voice tab. Verify it generates speech matching the recorded voice. Document any failures.

### P2: Training Portal Submission Form
Add the submission creation form to `/twin/training`. Currently only has list + approve/reject.
- Category dropdown, content fields, change description textarea
- Endpoint: `POST /twins/{id}/training`
- Data model: `{ category, content (JSON), target_fields, change_description }`
- Make it feel interactive and useful, not just a form

### P3: Deals List & Detail Pages
Build `/deals` and `/deals/[id]`. Backend is ready.
- List view: deal cards with brand name, type, value, status badge, dates
- Detail view: all fields, status timeline, terms summary
- Do NOT build deal creation (Stage 3). "New Deal" button opens "Coming Soon" modal
- Endpoints: `GET /deals`, `GET /deals/{id}`, `PUT /deals/{id}/status`

### P4: Vault Dashboard Polish
- Completeness score as progress ring (reuse the SVG ring from twin profile header)
- Activity feed with relative timestamps ("2 hours ago")
- Premium empty state when no twin exists

### P5: Document Editor Polish
- TipTap toolbar visual hierarchy
- Proper loading indicator for template generation
- Auto-save after generating from template

### P6: Mobile Responsiveness Pass
- Check all pages at mobile viewport widths
- Fix twin profile tabs, document editor, certification page at small screens

### P7: Propose UI/UX Improvements
- Write up suggestions for anything that could be better
- Drop ideas in the handoff doc

---

## Rules
- Existing shadcn/ui components only. No new libraries.
- Test both dark and light themes before marking done.
- Always pull latest `mvp/vault` before starting.
- When done, open a PR into `mvp/vault` for review.

## Reference Files
- `context/codebase-context-for-mvp-review.md`
- `context/research-prompt-vault-iteration.md`
