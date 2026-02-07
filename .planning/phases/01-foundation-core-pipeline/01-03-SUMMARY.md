---
phase: 01-foundation-core-pipeline
plan: 03
subsystem: brand-management
tags: [brand-wizard, zustand, shadcn-ui, keigo, crud-api, supabase-storage, japanese-ui]

dependency-graph:
  requires:
    - "01-01: Next.js scaffold, Supabase clients, Drizzle schema, constants, i18n"
    - "01-02: Auth with proxy.ts, dashboard shell layout"
  provides:
    - "7-step brand wizard with logo upload, color extraction, font selection, keigo register, tone, products, positioning"
    - "Brand CRUD API (GET all, POST create, GET/PUT/DELETE single) with auth+team verification"
    - "Logo upload API with Supabase Storage and color palette extraction"
    - "Brand list page with card grid and empty state"
    - "Brand edit page with flat form layout and delete confirmation"
    - "Zustand brand wizard store for transient wizard state"
  affects:
    - "01-04: Brief form uses brand selection dropdown from GET /api/brands"
    - "01-05: Campaign results reference brand profile data"

tech-stack:
  added:
    - "shadcn/ui card, tabs, progress, label, textarea, select, badge, separator"
  patterns:
    - "Zustand store for multi-step wizard transient state"
    - "Supabase Storage for logo upload via admin client"
    - "extract-colors + sharp for server-side color palette extraction"
    - "Flat form layout for edit UX (wizard for creation, form for editing)"
    - "Next.js 16 async params on all [id] route handlers"
    - "Team membership verification on all brand API routes"

key-files:
  created:
    - "src/stores/brand-wizard-store.ts"
    - "src/components/brand/wizard-shell.tsx"
    - "src/components/brand/logo-upload-step.tsx"
    - "src/components/brand/color-picker-step.tsx"
    - "src/components/brand/font-select-step.tsx"
    - "src/components/brand/keigo-select-step.tsx"
    - "src/components/brand/tone-step.tsx"
    - "src/components/brand/product-info-step.tsx"
    - "src/components/brand/positioning-step.tsx"
    - "src/app/(dashboard)/brands/new/page.tsx"
    - "src/app/api/brands/[id]/route.ts"
    - "src/app/api/brands/logo-upload/route.ts"
    - "src/app/(dashboard)/brands/page.tsx"
    - "src/app/(dashboard)/brands/[id]/page.tsx"
    - "src/app/(dashboard)/brands/[id]/brand-edit-form.tsx"
    - "src/components/ui/card.tsx"
    - "src/components/ui/tabs.tsx"
    - "src/components/ui/progress.tsx"
    - "src/components/ui/label.tsx"
    - "src/components/ui/textarea.tsx"
    - "src/components/ui/select.tsx"
    - "src/components/ui/badge.tsx"
    - "src/components/ui/separator.tsx"
  modified:
    - "src/app/api/brands/route.ts (extended from GET-only to full GET+POST)"

decisions:
  - id: "flat-form-for-edit"
    decision: "Use flat form layout for brand editing (not wizard)"
    rationale: "Wizard is optimal for creation flow (guided, step-by-step). For editing, flat form is faster since user knows what they want to change."
  - id: "admin-only-delete"
    decision: "Brand deletion requires admin team role"
    rationale: "Prevents accidental deletion by non-admin team members; aligns with role-based access model."
  - id: "logo-upload-via-admin-client"
    decision: "Use Supabase admin client for storage operations"
    rationale: "Admin client bypasses RLS for storage bucket creation and file upload; user auth is verified separately in the route handler."
  - id: "color-extraction-skip-svg"
    decision: "Skip color extraction for SVG files"
    rationale: "Sharp may not handle SVG rasterization reliably; SVGs are typically vector and color extraction is less meaningful."

metrics:
  duration: "~17 minutes"
  completed: "2026-02-07"
---

# Phase 1 Plan 03: Brand Profile Wizard & Management Summary

7-step brand wizard with logo upload + color extraction, keigo register cards with real Japanese examples, curated font selection, tone tags, product catalog, and positioning templates. Full CRUD API with auth verification, brand list page with card grid, and flat-form edit page with delete confirmation.

## Task Commits

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Brand wizard UI with all 7 steps | 3d41479 (via 01-04) | wizard-shell.tsx, all step components, brand-wizard-store.ts |
| 2 | Brand CRUD API routes and list/edit pages | 5652b38 | brands/route.ts, brands/[id]/route.ts, logo-upload/route.ts, brands/page.tsx, brands/[id]/page.tsx |

## What Was Built

### Task 1: Brand Wizard UI with All 7 Steps

- **Zustand Store** (`brand-wizard-store.ts`): Manages all wizard state (currentStep, brandName, logoFile, colors, font, keigo register, tone tags, product catalog, positioning). Actions for step navigation, field updates, product CRUD, brand value management. No persistence -- wizard is transient.

- **WizardShell** (`wizard-shell.tsx`): Multi-step container with Progress bar, step labels and descriptions in Japanese, 200ms fade transition between steps, "next/back" navigation buttons, "save" button on final step that POSTs to /api/brands.

- **LogoUploadStep**: react-dropzone for drag-and-drop (PNG/JPG/SVG, max 5MB), upload preview, calls /api/brands/logo-upload for Supabase Storage upload + color extraction. Extracted color swatches shown below preview. Brand name input field (required).

- **ColorPickerStep**: 4 color slots (primary/secondary/accent/background) pre-filled from logo extraction. Each slot has native color picker overlay + hex text input with validation.

- **FontSelectStep**: Grid of 7 curated Japanese-safe fonts from `constants/fonts.ts`. Each card shows font name, category badge (ゴシック/明朝/丸ゴシック), and preview text rendered in the actual font via Google Fonts CSS import.

- **KeigoSelectStep**: 3 large visual cards with real Japanese examples:
  - カジュアル: "新商品出たよ！チェックしてみて！"
  - 標準: "新商品が登場しました。ぜひご覧ください。"
  - 敬語: "新商品のご案内を申し上げます。何卒ご高覧賜りますようお願い申し上げます。"
  - Selected card has vermillion border + subtle vermillion background.

- **ToneStep**: 15 toggleable tone tags (洗練, 親しみやすい, 大胆, 信頼感, 革新的, 伝統的, ユーモア, 高級感, エネルギッシュ, ミニマル, 温かみ, プロフェッショナル, エレガント, 遊び心, ナチュラル). Warm-gold styling when selected. Free text textarea for tone nuance.

- **ProductInfoStep**: Brand story textarea, target market textarea, brand values tag input (add/remove), dynamic product catalog with add/remove entries. Each product has: name, description, key features (comma-separated), price range, target segment.

- **PositioningStep**: Free text textarea for positioning statement. 3 Japanese template examples shown as read-only reference cards.

- **brands/new page**: Page wrapper with breadcrumb (ブランド > 新規作成).

### Task 2: Brand CRUD API Routes and List/Edit Pages

- **GET /api/brands**: Returns all brand profiles (all fields) for the user's team. Auth via getUser(), team lookup via teamMembers table.

- **POST /api/brands**: Creates brand profile with full field validation. Required: name. Default register validated against allowed values. Inserts into brandProfiles table with user's teamId.

- **GET /api/brands/[id]**: Fetches single brand with team ownership verification. Uses `await props.params` (Next.js 16 async params).

- **PUT /api/brands/[id]**: Partial update -- only provided fields are updated. Validates name and defaultRegister if provided. Sets updatedAt timestamp.

- **DELETE /api/brands/[id]**: Requires admin role on team. Returns 403 for non-admins. Deletes brand profile.

- **POST /api/brands/logo-upload**: Accepts FormData, validates file type (PNG/JPG/SVG) and size (<5MB). Creates 'brand-logos' bucket if not exists. Uploads to Supabase Storage via admin client. Runs color palette extraction (skips SVG). Returns public URL + extracted colors.

- **Brand List Page** (`brands/page.tsx`): Server Component that fetches brands from DB. Header with "ブランド一覧" title and "新しいブランドを作成" CTA. Grid layout (1-3 columns). Each card shows: logo thumbnail (or initial letter), brand name, keigo register badge, color swatches, tone tags as warm-gold pills, product count, creation date. Empty state with icon, message, and CTA.

- **Brand Edit Page** (`brands/[id]/page.tsx` + `brand-edit-form.tsx`): Server component fetches brand data and verifies access. Client component renders flat form with all editable fields: name, colors (with native pickers), font selection grid, keigo radio buttons, tone tags, tone description, brand story, target market, brand values, positioning statement, product catalog. Delete button with confirmation dialog (admin only). Save button updates via PUT.

## Decisions Made

1. **Flat form for editing**: Wizard is for creation (guided, step-by-step). Edit page uses a flat form layout so users can jump directly to any field they want to change.

2. **Admin-only deletion**: Brand deletion requires admin team role to prevent accidental deletion by non-admin members.

3. **Logo upload via admin client**: Supabase admin client handles storage operations (bucket creation, file upload) to bypass RLS. User authentication is verified separately at the route handler level.

4. **Color extraction skips SVG**: SVG files are vector format where pixel-based color extraction is unreliable. Sharp may not handle SVG rasterization consistently.

## Deviations from Plan

### Coordination with Parallel Execution

**Task 1 components pre-committed by 01-04 agent**: The parallel 01-04 execution agent created the brand wizard components (wizard-shell, all step components, store) as part of its brief form dependencies. Both agents produced identical implementations. Task 1 files were committed under `3d41479` (01-04 commit). This is expected behavior in parallel wave execution -- the 01-03 plan wrote the same code independently and confirmed it matches requirements.

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed invalid crypto import in logo-upload route**
- **Found during:** Task 2 build verification
- **Issue:** `import { v4 as uuidv4 } from "crypto"` -- Node.js crypto module has no `v4` export
- **Fix:** Removed the import; the file already uses `crypto.randomUUID()` which is available globally
- **Files modified:** `src/app/api/brands/logo-upload/route.ts`
- **Commit:** 5652b38

## Verification Results

All verification criteria met:
1. `pnpm build` passes -- all pages and API routes compile
2. Brand wizard has 7 steps with correct Japanese labels
3. Logo upload triggers color extraction (extractPaletteFromLogo)
4. Keigo cards show 3 registers with real Japanese example text
5. Font selection offers curated list only (imports from constants/fonts.ts)
6. Brand API routes verify auth (getUser()) and team membership (teamMembers)
7. Brand list shows card grid, brand edit shows flat form
8. All text is Japanese-only

## Next Phase Readiness

Ready for Plans 01-04 (Brief Form) and 01-05 (Campaign Results):
- Brand wizard fully functional for creating brand profiles
- Brand CRUD API available for brief form brand selection
- Brand list and edit pages integrated into dashboard shell
- All brand data persists to brandProfiles table
- Supabase Storage configured for logo uploads

## Self-Check: PASSED
