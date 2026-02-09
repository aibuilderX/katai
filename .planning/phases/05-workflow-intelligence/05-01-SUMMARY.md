---
phase: 05-workflow-intelligence
plan: 01
subsystem: database, api, ui
tags: [drizzle, regeneration, selective-update, cascade, approval-workflow, qa-reports]

# Dependency graph
requires:
  - phase: 01-foundation-core-pipeline
    provides: "campaigns, copyVariants, assets tables and Flux/Claude generation functions"
  - phase: 02-compositing
    provides: "compositeCampaignImages function for cascade re-compositing"
  - phase: 03-platform-delivery
    provides: "resizeForPlatforms function for cascade re-resizing"
provides:
  - "approvalWorkflows, approvalHistory, qaReports schema tables for plans 02 and 03"
  - "campaigns.parentCampaignId for campaign re-run history tracking"
  - "campaigns.templateId for template association"
  - "campaigns.approvalStatus for denormalized approval state"
  - "POST /api/campaigns/[id]/regenerate endpoint for selective asset regeneration"
  - "regenerateCopyVariant() and regenerateImage() functions"
  - "RegenerateDialog reusable UI component"
affects: [05-workflow-intelligence]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Selective regeneration with downstream cascade", "Per-asset mutation instead of full pipeline re-run"]

key-files:
  created:
    - "src/lib/ai/regeneration.ts"
    - "src/app/api/campaigns/[id]/regenerate/route.ts"
    - "src/components/campaign/regenerate-dialog.tsx"
  modified:
    - "src/lib/db/schema.ts"
    - "src/components/campaign/copy-tab.tsx"
    - "src/components/campaign/image-tab.tsx"
    - "src/app/(dashboard)/campaigns/[id]/campaign-detail-content.tsx"

key-decisions:
  - "Self-referencing parentCampaignId on campaigns instead of separate history table (simpler, avoids joins)"
  - "Image regeneration cascades: delete composited + platform images, then re-run compositing and resize"
  - "Regenerate button on copy variants positioned at top-right of wrapper div (not inside VariantCard)"
  - "Regenerate button on images positioned at bottom-right with semi-transparent backdrop"
  - "Japanese cascade warning in image regeneration dialog"

patterns-established:
  - "RegenerateDialog: reusable confirmation modal with loading state and Japanese labels"
  - "Selective regeneration pattern: per-asset API dispatch to type-specific handler functions"

# Metrics
duration: 5min
completed: 2026-02-09
---

# Phase 5 Plan 1: Schema Extensions & Selective Regeneration Summary

**Extended DB schema with approval/QA tables and built per-asset regeneration API with downstream cascade for copy variants and images**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-09T06:31:38Z
- **Completed:** 2026-02-09T06:36:13Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Extended campaigns table with parentCampaignId, templateId, approvalStatus columns for Phase 5 downstream plans
- Created approvalWorkflows, approvalHistory, and qaReports tables (schema foundation for plans 02 and 03)
- Built selective regeneration system: regenerate a single copy variant or a single base image without re-running the entire pipeline
- Image regeneration cascades to delete and re-create downstream composited and platform-resized images
- Added regenerate buttons to copy tab (per variant) and image tab (per base image) with confirmation dialog

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend database schema and create selective regeneration logic** - `d7465c0` (feat)
2. **Task 2: Add regenerate buttons to copy and image tabs with confirmation dialog** - `17463e4` (feat)

## Files Created/Modified
- `src/lib/db/schema.ts` - Added integer import, 3 new columns on campaigns, 3 new tables (approvalWorkflows, approvalHistory, qaReports)
- `src/lib/ai/regeneration.ts` - Per-asset regeneration functions with cascade for images
- `src/app/api/campaigns/[id]/regenerate/route.ts` - POST endpoint dispatching to copy or image regeneration
- `src/components/campaign/regenerate-dialog.tsx` - Reusable confirmation dialog with Japanese labels
- `src/components/campaign/copy-tab.tsx` - Added RefreshCw regenerate button per variant, dialog integration
- `src/components/campaign/image-tab.tsx` - Added campaignId prop, RefreshCw button on base images, dialog integration
- `src/app/(dashboard)/campaigns/[id]/campaign-detail-content.tsx` - Pass campaignId to ImageTab

## Decisions Made
- Self-referencing parentCampaignId on campaigns instead of separate history table (simpler, avoids joins)
- Image regeneration cascades: delete composited + platform images, then re-run compositing and resize
- Regenerate button positioned at top-right for copy, bottom-right for images (different layout contexts)
- Japanese cascade warning in image regeneration dialog to inform users about downstream effects

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Schema tables for approval workflows, approval history, and QA reports are ready for plans 02 and 03
- Selective regeneration transforms the platform from one-shot to iterative creative workflow
- All build checks pass with zero errors

## Self-Check: PASSED

All 7 files verified on disk. Both commits (d7465c0, 17463e4) confirmed in git log. Schema exports (approvalWorkflows, approvalHistory, qaReports), regeneration exports (regenerateCopyVariant, regenerateImage), POST handler, and RefreshCw UI imports all verified present. `pnpm build` passes with zero errors.

---
*Phase: 05-workflow-intelligence*
*Completed: 2026-02-09*
