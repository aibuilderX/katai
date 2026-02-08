---
phase: 02-japanese-text-compositing
plan: 04
subsystem: compositing
tags: [sharp-composite, supabase-storage, pipeline-orchestrator, svg-overlay, campaign-generation, image-compositing]

# Dependency graph
requires:
  - phase: 02-japanese-text-compositing
    plan: 01
    provides: "Compositing type system, kinsoku line-breaking engine"
  - phase: 02-japanese-text-compositing
    plan: 02
    provides: "Contrast analyzer, text renderer (horizontal/vertical), logo placer"
  - phase: 02-japanese-text-compositing
    plan: 03
    provides: "Claude Vision layout engine with 3 layout alternatives"
  - phase: 01-foundation-core-pipeline
    provides: "Campaign generation pipeline, assets table, Supabase admin client, brand profiles"
provides:
  - "compositeCampaignImages() end-to-end pipeline orchestrator"
  - "Compositing stage integrated into runDirectGeneration() and n8n webhook handler"
  - "Image tab with composited/base image separation and layout labels"
  - "compositingStatus tracking in CampaignProgress interface"
  - "Supabase Storage upload of composited PNGs to composited-images bucket"
affects: [03-PLAN, phase-3]

# Tech tracking
tech-stack:
  added: []
  patterns: [parallel-image-compositing-with-error-isolation, graceful-compositing-degradation, dynamic-import-for-compositing-module]

key-files:
  created:
    - src/lib/compositing/index.ts
  modified:
    - src/lib/db/schema.ts
    - src/app/api/campaigns/route.ts
    - src/app/api/webhooks/n8n/route.ts
    - src/components/campaign/image-tab.tsx
    - src/app/(dashboard)/campaigns/[id]/campaign-detail-content.tsx
    - src/app/(dashboard)/campaigns/[id]/page.tsx

key-decisions:
  - "Compositing failure is non-fatal: campaign completes with base images, compositingStatus marked failed"
  - "Dynamic import for compositing module to keep initial bundle small"
  - "First copy variant (A案) used for compositing text overlay across all images"
  - "Tagline included only if bodyText <= 30 characters"
  - "Three layout variants per base image stored as separate composited_image assets"

patterns-established:
  - "Parallel image processing with per-image error isolation via Promise.all with null fallback"
  - "Per-element SVG error recovery: skip failed overlay, compose remaining elements"
  - "Dynamic import pattern for heavy compositing modules in API routes"
  - "Asset type filtering in UI: composited_image vs image for display separation"

# Metrics
duration: 6min
completed: 2026-02-08
---

# Phase 2 Plan 4: Compositing Pipeline Orchestrator & Pipeline Integration Summary

**End-to-end compositing pipeline orchestrating kinsoku line-breaking, Claude Vision layout, contrast analysis, SVG rendering, and Sharp compositing with Supabase Storage upload, wired into campaign generation flow with graceful degradation**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-08T08:52:46Z
- **Completed:** 2026-02-08T08:58:25Z
- **Tasks:** 2
- **Files created:** 1
- **Files modified:** 6

## Accomplishments

- Built compositeCampaignImages() orchestrator connecting all 6 compositing modules into a single pipeline: fetch base image -> Claude Vision layout -> kinsoku line-breaking -> contrast analysis -> SVG rendering -> Sharp compositing -> Supabase Storage upload -> assets table insert
- Wired compositing into campaign generation (both direct and n8n webhook) as a new stage after image generation with progress tracking
- Updated image tab to display composited images prominently with layout variant labels, base images in smaller grid below
- Implemented comprehensive error isolation: per-image, per-layout, and per-element failure recovery ensuring maximum output even with partial failures

## Task Commits

Each task was committed atomically:

1. **Task 1: Build compositing pipeline orchestrator and storage integration** - `937df7b` (feat)
2. **Task 2: Wire compositing into campaign generation pipeline and update image display** - `de20e07` (feat)

## Files Created/Modified

- `src/lib/compositing/index.ts` - Main pipeline orchestrator: compositeCampaignImages(), compositeOneImage(), compositeOneLayout() with parallel processing, error isolation, Supabase Storage upload, and assets table insertion
- `src/lib/db/schema.ts` - Added optional compositingStatus field to CampaignProgress interface
- `src/app/api/campaigns/route.ts` - Added compositing stage to runDirectGeneration() with progress updates and failure handling
- `src/app/api/webhooks/n8n/route.ts` - Added compositing post-processing after webhook receives image assets
- `src/components/campaign/image-tab.tsx` - Redesigned to separate composited images (with layout labels) from base images, backward compatible
- `src/app/(dashboard)/campaigns/[id]/campaign-detail-content.tsx` - Added type and metadata fields to Asset interface
- `src/app/(dashboard)/campaigns/[id]/page.tsx` - Cast metadata field for proper type propagation

## Decisions Made

- **Compositing failure is non-fatal:** Campaign still completes with base images if compositing fails. compositingStatus is tracked separately from overall campaign status. This ensures users always get their base images even if text overlay encounters issues.
- **First copy variant (A案) for compositing:** Uses the first copy variant's headline/body/CTA for text overlay. Future phases can allow variant selection.
- **Tagline inclusion threshold:** bodyText included as tagline only if <= 30 characters. Longer body text is omitted from the image overlay to prevent visual clutter.
- **Dynamic import for compositing:** Uses `await import('@/lib/compositing')` to avoid loading Sharp and all compositing modules until they're actually needed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed BrandColors import path**
- **Found during:** Task 1 (Pipeline orchestrator)
- **Issue:** Plan specified importing BrandColors from './types' but it's defined in '@/lib/db/schema'
- **Fix:** Changed import to `import type { BrandColors } from "@/lib/db/schema"`
- **Files modified:** src/lib/compositing/index.ts
- **Verification:** Build passes
- **Committed in:** 937df7b (Task 1 commit)

**2. [Rule 3 - Blocking] Fixed LayoutMetadata type cast for Drizzle jsonb column**
- **Found during:** Task 1 (Pipeline orchestrator)
- **Issue:** TypeScript error: LayoutMetadata not directly assignable to Record<string, unknown> for Drizzle's jsonb metadata column
- **Fix:** Used double cast `as unknown as Record<string, unknown>` for the metadata field
- **Files modified:** src/lib/compositing/index.ts
- **Verification:** Build passes
- **Committed in:** 937df7b (Task 1 commit)

**3. [Rule 3 - Blocking] Added type and metadata fields to asset prop types**
- **Found during:** Task 2 (Pipeline integration)
- **Issue:** ImageTab needed asset `type` field to distinguish composited vs base images, and `metadata` for layout labels. Neither was in the prop interface chain.
- **Fix:** Added type and metadata to CampaignDetailContentProps asset interface, cast metadata in page.tsx serialization
- **Files modified:** campaign-detail-content.tsx, page.tsx
- **Verification:** Build passes, type propagation verified
- **Committed in:** de20e07 (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (3 blocking)
**Impact on plan:** All auto-fixes were necessary type corrections. No scope creep.

## Issues Encountered

None beyond the type issues documented as deviations above.

## User Setup Required

A Supabase Storage bucket named `composited-images` must exist for composited image uploads. Create it via the Supabase Dashboard (Storage > New Bucket > name: "composited-images", public: true).

## Next Phase Readiness

- Phase 2 is now complete: all 4 plans executed, full compositing pipeline operational
- End-to-end flow: campaign brief -> copy generation -> image generation -> compositing -> results display
- Ready for Phase 3 (Multi-Platform Formatting & Delivery) which will consume composited images for platform-specific resizing
- The composited-images bucket needs to be created in Supabase Storage before compositing will work in production

## Self-Check: PASSED

- All 1 created file exists on disk
- All 6 modified files exist on disk
- All 2 commits (937df7b, de20e07) verified in git log
- Build compiles without errors

---
*Phase: 02-japanese-text-compositing*
*Completed: 2026-02-08*
