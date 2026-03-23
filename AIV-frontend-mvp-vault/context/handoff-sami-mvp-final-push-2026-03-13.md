# Sami Handoff — MVP Final Push (March 13, 2026)

## Overview
This document covers everything needed to get the MVP to a demoable, polished state. It builds on the work you already completed from the March 10 handoff. Some items are fixes to what was already shipped, others are new work. Everything here is frontend unless explicitly marked as backend.

Reference files:
- `context/handoff-sami-revisions-2026-03-10.md` (previous handoff)
- `context/handoff-sami-revisions-2026-03-12.md` (your summary)
- `context/codebase-context-for-mvp-review.md` (full codebase map)

---

## CRITICAL: Build Before You Push

The build was broken again on `mvp/vault-ui-polish`. I fixed it and pushed to your branch. Issues were:
- Unescaped apostrophes in training page (same issue as last time)
- Missing type annotations (`any` types)
- `pdfjs-dist` TextItem union type mismatch

Run `npm run build` locally before every push. No exceptions.

---

## 1. Certification Page Overhaul (HIGH PRIORITY)