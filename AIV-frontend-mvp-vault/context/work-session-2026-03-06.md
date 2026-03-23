# Work Session — March 6, 2026

## Revision Notes from User Feedback (with screenshots)

### Status: IMPLEMENTED

### Changes Made:

1. **Sign-Up Name Pre-fill** ✅ — Onboarding step 1 now auto-populates the name from localStorage (set during signup). Still editable.

2. **Auth Pages = Light Theme** ✅ — Auth layout forces light theme via `useTheme('light')` on mount. Onboarding switches to dark on "Get Started".

3. **Pill/Tag Editing UX Overhaul** ✅ — Created shared `PillEditor` component. In edit mode: pills stay as pills with X to delete, click to edit inline, + button to add. Text fields use full-width textarea. Applied to personality tab and onboarding research review.

4. **Profile Completeness Score Fix** ✅ — Dashboard now uses checklist-based percentage (completedCount/total * 100) instead of raw backend score. After onboarding with identity captured, shows ~20% instead of 1%.

5. **Visual Tab — "Start Onboarding" removed** ✅ — Changed to "Upload Visual Assets" with appropriate description.

6. **Voice Cloning Error Fix** ✅ — MediaRecorder now auto-detects supported codec (vp9 → webm → mp4 fallback). Blob type matches recorder's actual mimeType.

7. **Sidebar Navigation Restructure** ✅ — Removed Identity sub-items. Now flat: Dashboard, Identity, Documents, Training, Certification, Deals. Identity goes to /twin with horizontal tabs. Removed horizontal scroll (overflow-x-hidden on sidebar).

8. **Deals → Coming Soon** ✅ — Replaced with Coming Soon page including marketplace vision. Old page archived. Deal detail route redirects to /deals.

9. **Chat/Project Folder UI Fixes** ✅:
   - Removed chat count from project dropdown
   - Project name centered vertically
   - Send button moved outside text box
   - Added AI disclaimer and info tooltip
   - Shows current folder name in empty state
   - Added project rename/delete via dropdown menu

10. **Chat 401 Error Fix** ✅ — Chat now routes through `/api/backend/aiv/chat` proxy instead of direct API_URL, fixing CORS and auth cookie issues.

11. **Sidebar Horizontal Scroll Bug** ✅ — Added `overflow-hidden` to sidebar wrapper and `overflow-x-hidden` to SidebarContent component.

12. **Notifications → Coming Soon** ✅ — Changed from "No notifications yet" to "Coming Soon" with description.

13. **Voice Tab "Start Onboarding" Fix** ✅ — Changed to "Go to Voice Settings" with updated description when voice is pending post-onboarding.

### Not Implemented (per user decision):
- Email change in settings — too complex for MVP timeline

---

## Project Knowledge Base Uploads

### Status: IMPLEMENTED

### Backend:
- **Model**: `WorkspaceDocument` — id, workspace_id, uploaded_by, filename, content_type, file_size, storage_key, storage_url, description, timestamps
- **Relationship**: Added `documents` relationship to `Workspace` model (cascade delete)
- **Schemas**: `WorkspaceDocumentResponse`, `WorkspaceDocumentUpdate`
- **Endpoints** on workspace router:
  - `GET /workspaces/{id}/documents` — list docs
  - `POST /workspaces/{id}/documents` — upload (multipart form, max 50MB)
  - `GET /workspaces/{id}/documents/{doc_id}` — get single (refreshes presigned URL)
  - `PATCH /workspaces/{id}/documents/{doc_id}` — update description
  - `DELETE /workspaces/{id}/documents/{doc_id}` — delete from S3 + DB
- **Alembic migration**: `20260306_add_workspace_documents.py`
- **Storage**: Files stored in S3 under `knowledge/{workspace_id}/{uuid}.{ext}` via existing StorageService

### Frontend:
- **API client**: `workspace-documents.ts` — list, upload, get, update, delete
- **UI**: `ProjectSettingsDialog` with Knowledge Base tab (upload, list, delete) and Settings tab (rename, color, description)
- **Sidebar integration**: MoreHorizontal menu on ALL workspaces (including default "General") shows Project Settings with knowledge base access. Non-default workspaces also show Rename and Delete.
- **Workspace context**: Created `WorkspaceProvider` to share active workspace state between sidebar and chat page. Chat page now receives `workspaceName` prop.

### Architecture:
- Documents persist in PostgreSQL (`workspace_documents` table) with S3 storage for file content
- Presigned URLs refreshed on access (7-day expiry)
- Workspace ownership verified on all document operations
- Cascade delete: deleting a workspace removes all its documents
