# AI Streaming Debug Log — March 15, 2026

## Deadline
Demo with Andres + investors is TODAY (March 15, 2026). Must work.

## Branches
- Frontend: `mvp/vault-ui-polish` (deployed to Railway `mvp` env)
- Backend: `backend-polish` (deployed to Railway `mvp` env)
- Railway project: `peaceful-curiosity`, environment: `mvp`
- Frontend URL: `aiv-frontend-mvp.up.railway.app`
- Backend URL: `aiv-backend-mvp.up.railway.app`

## Problem
AI chat shows blinking cursor but never streams any text. No errors thrown in console.

## Root Cause Found
On `mvp/vault` (working branch), chat-interface.tsx used:
```
fetch("/api/backend/aiv/chat", ...)
```
This goes through Next.js rewrites (`/api/backend/:path*` → `${BACKEND_URL}/:path*`), which the browser handles as a native SSE stream.

On `mvp/vault-ui-polish` (broken branch), it was changed to:
```
fetch("/api/chat", ...)
```
This hits a custom Next.js API route handler (`src/app/api/chat/route.ts`) that does server-side `fetch` to the backend and tries to pipe `upstream.body` back. The problem: Next.js server-side fetch buffers the response body — the `ReadableStream` from the upstream SSE response doesn't stream through properly. The chunks never arrive at the client.

Additionally, the broken version added `context_documents` fetching before the AI call (fetching all workspace documents via `documentApi.getDocuments(workspaceId)`), but `workspaceId` was being passed where `twinId` was expected, potentially causing a silent 404 that delayed the request.

## Fix Applied
1. Reverted chat fetch URL back to `/api/backend/aiv/chat` (the Next.js rewrite proxy that works)
2. Removed the `context_documents` fetch that was added (not needed, backend already has twin context)
3. Removed unused `documentApi` import

## UI Fix Applied
Blue user bubbles were too narrow (`max-w-[85%]`), causing text to orphan into too many lines.
- Changed user bubbles to `max-w-[90%] sm:max-w-[75%]` (wider on mobile, reasonable on desktop)
- Changed assistant bubbles to `max-w-[85%] sm:max-w-[75%]` (slightly wider on mobile)

## Files Modified
- `src/components/aiv/chat-interface.tsx` — reverted fetch URL, removed context_documents
- `src/components/aiv/message-bubble.tsx` — wider bubble max-widths

## Build Status
`npm run build` passes clean.

## What Still Needs Testing
- [ ] AI streaming works locally (need backend running locally OR pointing to Railway)
- [ ] AI streaming works on Railway after deploy
- [ ] Governance guardrails still trigger properly
- [ ] Voice cloning E2E (hero feature for demo)
- [ ] Full demo walkthrough with demo account (`demo@vault.dev` / `VaultDemo#2026`)

## Key Architecture Note
- The `/api/backend/:path*` rewrite in `next.config.ts` proxies to `BACKEND_INTERNAL_URL` or `NEXT_PUBLIC_API_URL`
- On Railway, `BACKEND_INTERNAL_URL` should be set to the internal Railway URL for lower latency
- Locally, it falls back to `NEXT_PUBLIC_API_URL` which points to Railway backend
- The custom `/api/chat` route handler approach does NOT work for SSE streaming in Next.js
