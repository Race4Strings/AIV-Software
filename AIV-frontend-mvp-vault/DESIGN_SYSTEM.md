# AIV Design System

## Design Principles

Every decision must satisfy these five principles. When they conflict, the order is the priority.

1. **Protection is the product.** Every screen reinforces that the user's identity is guarded. Visual language conveys security, control, permanence.
2. **One number, one action.** Each section shows one primary metric and one primary action. Detail lives behind progressive disclosure.
3. **Never show the database.** No raw enums, no internal IDs, no developer strings. Every visible text is written for celebrity managers and entertainment lawyers. Use `humanizeEnum()` from `src/lib/humanize.ts`.
4. **Irreversible actions require ceremony.** Lock, execute, certify, transition — all require: consequence description → confirmation step → visible receipt.
5. **Training is the center of gravity.** Training creates value. Everything else configures, protects, or monetizes what Training builds. Navigation guides users back to Training as the productive default.

---

## Typography

**Font:** Satoshi VF (variable, 100–900 weight)

### Scale

| Class | Size | Line Height | Usage |
|-------|------|-------------|-------|
| `text-xs` | 12px | 16px | Captions, timestamps, metadata |
| `text-sm` | 14px | 20px | Secondary text, descriptions, table cells |
| `text-base` | 16px | 24px | Body text, form inputs, list items |
| `text-lg` | 18px | 28px | Subheadings, card titles |
| `text-xl` | 20px | 28px | Section headings |
| `text-2xl` | 24px | 32px | Page headings |
| `text-3xl` | 30px | 36px | Hero headings |
| `text-4xl` | 36px | 40px | Landing page headlines only |

### Rules

- **Hard floor: 12px (`text-xs`).** Nothing smaller, ever. No `text-[10px]`, `text-[11px]`, `text-[9px]`.
- **No arbitrary pixel sizes.** Use only the scale classes above. Never `text-[15px]` or `text-[13px]`.
- **Weight convention:** 400 body, 500 labels/emphasis, 600 headings, 700 hero/brand.
- **Monospace:** `font-mono` for hashes, blockchain addresses, IDs.

---

## Spacing

**Base unit:** 4px. All spacing uses Tailwind's default `rem`-based scale mapped to the 4px grid.

### Sanctioned Values

| Tailwind | Pixels | Use for |
|----------|--------|---------|
| `1` | 4px | Icon-to-text gap, tight inline spacing |
| `2` | 8px | Internal component padding (badges, pills) |
| `3` | 12px | Compact card padding, input padding-x |
| `4` | 16px | Standard card padding, section gap on mobile |
| `6` | 24px | Card padding on desktop, between related elements |
| `8` | 32px | Section separation within a page |
| `10` | 40px | Major section gaps |
| `12` | 48px | Page-level vertical rhythm |
| `16` | 64px | Hero section padding, top-level containers |

### Conventions

- **Do not use:** `p-5` (20px), `p-7` (28px), `p-9` (36px), `p-11` (44px), `p-14` (56px). These break the grid.
- **Grid gaps:** Use `gap-3` (compact), `gap-4` (standard), `gap-6` (spacious).
- **Card internal padding:** `p-4` mobile, `p-6` desktop.
- **Page container:** `px-4 sm:px-6 lg:px-8` with `max-w-7xl mx-auto`.

---

## Color Tokens

All colors are defined as OKLch values in `globals.css`. Always use semantic tokens — never raw hex or Tailwind named colors.

### Semantic Tokens

| Token | Usage | Light | Dark |
|-------|-------|-------|------|
| `background` | Page background | White | `oklch(0.13 0.015 262)` |
| `foreground` | Primary text | Near-black | `oklch(0.96 0.005 262)` |
| `card` | Card surfaces | White | `oklch(0.16 0.018 262)` |
| `card-foreground` | Card text | Near-black | `oklch(0.96 0.005 262)` |
| `primary` | Brand blue, CTAs | `oklch(0.49 0.225 262)` | `oklch(0.55 0.2 262)` |
| `primary-foreground` | Text on primary | White | White |
| `secondary` | Subtle backgrounds | Light gray | `oklch(0.22 0.02 262)` |
| `muted` | Disabled surfaces | Light gray | `oklch(0.20 0.015 262)` |
| `muted-foreground` | Secondary text | Gray | `oklch(0.65 0.015 262)` |
| `accent` | Hover states | Light accent | `oklch(0.22 0.025 262)` |
| `destructive` | Errors, danger | Red | Red |
| `warning` | Caution states | Amber | Amber |
| `success` | Positive states | Green | Green |
| `border` | Borders, dividers | Light gray | `oklch(0.25 0.02 262)` |
| `input` | Input backgrounds | Light gray | `oklch(0.22 0.02 262)` |
| `ring` | Focus rings | Brand blue | Brand blue |

### Status Colors

Use semantic tokens for status indicators, not raw Tailwind colors.

| State | Background | Text | Border |
|-------|-----------|------|--------|
| Success/Active/Verified | `bg-success/10` | `text-success` | `border-success/20` |
| Warning/Review/Building | `bg-warning/10` | `text-warning` | `border-warning/20` |
| Error/Terminated/Failed | `bg-destructive/10` | `text-destructive` | `border-destructive/20` |
| Info/Submitted/Progress | `bg-primary/10` | `text-primary` | `border-primary/20` |
| Neutral/Completed/Draft | `bg-muted` | `text-muted-foreground` | `border-border` |

### Color Migration Table

Replace these hardcoded values found in the codebase:

| Found in code | Replace with | Meaning |
|---------------|-------------|---------|
| `#041030` | `bg-background` | Dark page background |
| `#2563eb`, `bg-blue-500`, `bg-blue-600` | `bg-primary` | Brand blue / CTA |
| `hover:bg-blue-700` | `hover:bg-primary/90` | CTA hover state |
| `text-blue-500`, `text-blue-600` | `text-primary` | Primary text accent |
| `bg-blue-500/10` | `bg-primary/10` | Info/progress background |
| `bg-emerald-500`, `bg-emerald-600`, `bg-green-500`, `bg-green-600` | `bg-success` | Success state |
| `hover:bg-emerald-700` | `hover:bg-success/90` | Success hover |
| `text-emerald-500`, `text-emerald-400`, `text-green-400`, `text-green-600` | `text-success` | Success text |
| `bg-emerald-500/10`, `bg-green-500/10`, `bg-green-600/10` | `bg-success/10` | Success background |
| `border-emerald-500/20`, `border-green-500/20` | `border-success/20` | Success border |
| `text-red-500`, `text-red-400` | `text-destructive` | Error text |
| `bg-red-500`, `bg-red-500/10` | `bg-destructive` / `bg-destructive/10` | Error state |
| `text-yellow-500`, `text-amber-500`, `text-amber-400` | `text-warning` | Warning text |
| `bg-yellow-500/10`, `bg-amber-500/10` | `bg-warning/10` | Warning background |
| `border-yellow-500/20`, `border-amber-500/20` | `border-warning/20` | Warning border |
| `text-orange-500`, `bg-orange-500/10` | `text-warning` / `bg-warning/10` | Expiration (use warning) |
| `bg-gray-500/10`, `text-gray-500` | `bg-muted` / `text-muted-foreground` | Neutral/completed |
| `bg-purple-500/10`, `text-purple-500`, `text-purple-400` | `bg-accent` / `text-accent-foreground` | Blockchain/special state |
| `bg-teal-500/10`, `text-teal-500` | `bg-success/10` / `text-success` | Executed (use success) |
| `rgba(59,130,246,0.06)`, `rgba(59,130,246,0.07)` | Inline: use CSS variable or `bg-primary/[0.06]` | Gradient accents |

### Opacity Patterns

White/black opacity classes (`text-white/70`, `bg-white/10`, etc.) are acceptable in:
- Landing page where dark backgrounds are guaranteed
- Glass-morphism utilities
- SVG overlays

They must NOT be used in platform UI where semantic tokens exist. Use `text-foreground`, `text-muted-foreground`, `bg-muted`, etc.

---

## Elevation / Shadows

Dark mode shadows use blue-tinted RGBA (`rgba(2, 10, 40, ...)`) to blend with the oklch(262) hue.

| Utility | Use for |
|---------|---------|
| `shadow-sm` | Subtle lift: badges, pills, inline elements |
| `shadow-md` | Standard elevation: cards, dropdowns |
| `shadow-lg` | Prominent elevation: modals, popovers, floating panels |
| `shadow-xl` | Maximum elevation: toast notifications, command palette |

Tokens are defined in `globals.css` as `--shadow-sm` through `--shadow-xl` and mapped in `tailwind.config.js`.

---

## Glass-Morphism

Two variant families for comparison. Decision pending user review on rendered components.

### Variant A: Frosted Glass (translucent surfaces)

| Class | Opacity | Blur | Border | Use for |
|-------|---------|------|--------|---------|
| `.glass-sm` | 5% / 3% dark | blur-sm | none | Subtle overlays, hover states |
| `.glass` | 10% / 6% dark | blur-lg | none | Cards, panels, nav backgrounds |
| `.glass-lg` | 15% / 8% dark | blur-xl | `border-white/10` | Featured surfaces, hero sections |

### Variant B: Solid Dark + Glass Accents

| Class | Background | Border | Use for |
|-------|-----------|--------|---------|
| `.glass-solid` | `bg-card` (solid) | `border-white/[0.06]` | Cards that need readability over effect |

### Rules

- Glass requires sufficient contrast behind it. Test against the actual background.
- Never glass-on-glass (blur compounds, text becomes unreadable).
- Text on glass surfaces must meet WCAG AA contrast (4.5:1 for body, 3:1 for large).

---

## Animation / Motion

### Duration Tokens

| Variable | Value | Use for |
|----------|-------|---------|
| `--duration-fast` | 150ms | Micro-interactions: hover, focus, toggle |
| `--duration-normal` | 250ms | Enter/exit: panels, modals, drawers |
| `--duration-slow` | 400ms | Page transitions, complex animations |

### Easing Tokens

| Variable | Value | Use for |
|----------|-------|---------|
| `--ease-default` | `cubic-bezier(0.25, 0.1, 0.25, 1)` | General purpose |
| `--ease-in-out` | `cubic-bezier(0.45, 0, 0.55, 1)` | Symmetrical enter/exit |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Bouncy feedback (scale, buttons) |

### Animation Utilities

| Class | Duration | Easing | Use for |
|-------|----------|--------|---------|
| `animate-fade-in` | 300ms | default | Content appearing on page |
| `animate-slide-in-right` | 250ms | default | Drawers, side panels |
| `animate-slide-in-bottom` | 250ms | default | Toasts, bottom sheets |
| `animate-scale-in` | 150ms | spring | Modals, popovers |
| `animate-fade-out` | 150ms | default | Content dismissal |
| `animate-shimmer` | 2s loop | linear | Loading skeletons |

### Rules

- All animations respect `prefers-reduced-motion` (handled in `globals.css`).
- No animation purely for decoration. Every animation must communicate state change, hierarchy, or spatial relationship.
- Loading states: use `animate-shimmer` skeleton, never spinners except on buttons (which use the Button `loading` prop).

---

## Border Radius

| Utility | Value | Use for |
|---------|-------|---------|
| `rounded-sm` | `calc(var(--radius) - 4px)` ≈ 6px | Small elements: badges, pills |
| `rounded-md` | `calc(var(--radius) - 2px)` ≈ 8px | Inputs, buttons |
| `rounded-lg` | `var(--radius)` = 10px | Cards, modals, containers |
| `rounded-full` | 9999px | Avatars, circular buttons |

---

## Icon Scale

| Context | Size | Class |
|---------|------|-------|
| Inline with `text-sm` | 14px | `h-3.5 w-3.5` |
| Inline with `text-base` | 16px | `h-4 w-4` |
| Card/section header | 20px | `h-5 w-5` |
| Empty state / feature icon | 24px | `h-6 w-6` |
| Hero / illustration | 32–48px | `h-8 w-8` to `h-12 w-12` |

Always use Lucide icons. Import from `lucide-react`.

---

## Transaction Receipt Pattern

For irreversible actions (certification, deal execution, consent changes):

```
Step 1: Preview
  └─ Show what will happen in plain language
  └─ Display all data that will be committed
  └─ "This cannot be undone" warning if truly irreversible

Step 2: Confirm
  └─ ConfirmDialog component with consequence description
  └─ Require explicit action (button click, not just close-to-dismiss)
  └─ For high-stakes: password confirmation (lock/unlock, financial)

Step 3: Receipt
  └─ Toast or inline confirmation with timestamp
  └─ For financial/legal: persistent record in audit trail
  └─ "What just happened" summary in plain language
```

---

## Component Variant Requirements

### Badge (`src/components/ui/badge.tsx`)

Current variants: `default`, `secondary`, `destructive`, `outline`, `warning`, `success`

**Status:** Complete. All semantic variants exist.

**Usage rule:** Never override badge colors with `className`. If you need a color not covered by the variants, the design system is missing a token — add it here first.

### Button (`src/components/ui/button.tsx`)

Current variants: `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`
Current sizes: `default`, `sm`, `lg`, `icon`

**Status:** Complete. Has `loading` prop for async actions.

**Usage rules:**
- Primary CTA: `variant="default"` (brand blue)
- Destructive action: `variant="destructive"` (red, requires ConfirmDialog)
- Secondary action: `variant="outline"` or `variant="secondary"`
- Tertiary/navigation: `variant="ghost"` or `variant="link"`
- Always use `loading` prop during async operations — never custom spinners

### Card (`src/components/ui/card.tsx`)

No variants. Composed of: `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`.

**Usage rules:**
- Default card: uses `bg-card` (semantic token, automatic dark mode)
- Glass card: add `.glass` or `.glass-solid` class to `Card`
- Elevated card: add `shadow-md` or `shadow-lg`

### StatusBadge (`src/components/shared/status-badge.tsx`)

Current variants: `twin`, `voice`

**Gap:** Missing `deal` variant. Deal status colors are duplicated in both `deals/page.tsx` and `deals/[id]/page.tsx` as inline `STATUS_COLORS` objects.

**Action (Phase 2):** Extend StatusBadge with `deal` variant, consolidate the duplicate mappings, and use `humanizeEnum()` for labels.

### EmptyState (`src/components/shared/empty-state.tsx`)

Props: `icon`, `title`, `description`, `ctaLabel`, `ctaHref`, `className`

**Usage rule:** Every page/section that can be empty must use this component. No ad-hoc empty state markup.

---

## Do / Don't

### Colors

- **Do:** `bg-success/10 text-success` for positive states
- **Don't:** `bg-emerald-500/10 text-emerald-500` or `bg-green-500`

### Typography

- **Do:** `text-sm text-muted-foreground` for secondary text
- **Don't:** `text-[11px] text-gray-400`

### Status Display

- **Do:** `humanizeEnum(deal.status)` → "Under Review"
- **Don't:** Display `UNDER_REVIEW` or `deal.status` directly

### Spacing

- **Do:** `p-4 md:p-6` for card padding
- **Don't:** `p-5` or `p-[18px]`

### Irreversible Actions

- **Do:** Preview → ConfirmDialog → Receipt
- **Don't:** Single click triggers financial/legal action

### Empty States

- **Do:** `<EmptyState icon={FileX} title="No deals yet" description="..." ctaLabel="Create Deal" />`
- **Don't:** `<p className="text-gray-400">No data</p>`
