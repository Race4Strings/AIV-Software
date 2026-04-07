# AIV Frontend — Development Rules

## Project

Next.js 15 (App Router) + TypeScript + Tailwind CSS + shadcn/ui. Deployed on Vercel. Backend is FastAPI on Railway.

## Design System

Read `DESIGN_SYSTEM.md` before making any UI changes. It is the single source of truth for tokens, spacing, typography, and component usage.

## UX Principles (non-negotiable)

1. **Protection is the product.** Visual language conveys security, control, permanence.
2. **One number, one action.** Each section: one primary metric, one primary action.
3. **Never show the database.** No raw enums, IDs, or developer strings in UI. Always use `humanizeEnum()` from `src/lib/humanize.ts`.
4. **Irreversible actions require ceremony.** Preview → Confirm (ConfirmDialog) → Receipt.
5. **Training is the center of gravity.** Navigation guides users to Training as the default productive action.

## Hard Rules

### Typography
- Minimum font size: 12px (`text-xs`). Never use `text-[10px]`, `text-[11px]`, `text-[9px]`, or any arbitrary size below `text-xs`.
- Use only the Tailwind scale: `text-xs`, `text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl`, `text-3xl`, `text-4xl`.
- No arbitrary pixel sizes like `text-[15px]` or `text-[13px]`.

### Colors
- Use semantic tokens only: `bg-primary`, `text-destructive`, `bg-success/10`, etc.
- Never use raw Tailwind colors: no `bg-green-500`, `text-red-400`, `bg-blue-600`.
- Never use hardcoded hex: no `bg-[#2563eb]`, `text-[#fff]`.
- Exception: Landing page may use `white/X` opacity patterns on guaranteed dark backgrounds.

### Spacing
- Use sanctioned values only: `1` (4px), `2` (8px), `3` (12px), `4` (16px), `6` (24px), `8` (32px), `10` (40px), `12` (48px), `16` (64px).
- Do not use: `p-5`, `p-7`, `p-9`, `p-11`, `p-14`.

### Enum Display
- Import `humanizeEnum` from `@/lib/humanize` for any value from the backend.
- If a new enum value appears that isn't mapped, add it to the `KNOWN_ENUMS` object in `src/lib/humanize.ts` before displaying it.

### Components
- Use `EmptyState` from `@/components/shared/empty-state` for all empty states.
- Use `StatusBadge` from `@/components/shared/status-badge` for status indicators.
- Use Badge variants (`warning`, `success`, `destructive`) — never override badge colors with className.
- Use Button `loading` prop for async states — never custom spinners.
- Use `ConfirmDialog` for any destructive or irreversible action.

### Theme
- Dark mode is forced. `forcedTheme="dark"` in providers.
- Light mode is "Coming Soon" — do not implement light mode styling.
- All new components must look correct on dark backgrounds.

### Shadows
- Use `shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-xl` — they adapt to dark mode automatically.
- Never use Tailwind's default shadows (`shadow`, `shadow-2xl`) which don't have dark mode variants.

### Animation
- Use animation utilities: `animate-fade-in`, `animate-slide-in-right`, `animate-slide-in-bottom`, `animate-scale-in`.
- All animations respect `prefers-reduced-motion` automatically.
- No animation purely for decoration — every animation communicates state change.

## File Structure

```
src/
  app/              # Pages (App Router)
  components/
    ui/             # shadcn/ui base components
    shared/         # Reusable domain components (StatusBadge, EmptyState, etc.)
    dashboard/      # Dashboard-specific components
    assistant/      # Training chat components
    twin/           # Identity management components
    landing/        # Landing page components
    providers/      # Context providers
  lib/              # Utilities (humanize.ts, api.ts, etc.)
  hooks/            # Custom React hooks
```
