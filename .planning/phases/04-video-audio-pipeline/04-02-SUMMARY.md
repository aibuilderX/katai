---
phase: 04-video-audio-pipeline
plan: 02
subsystem: ai, api
tags: [video-pipeline, webhook, zip, supabase-storage, fallback-routing, voiceover, kling, runway, heygen, elevenlabs]

# Dependency graph
requires:
  - phase: 04-video-audio-pipeline
    plan: 01
    provides: "4 typed provider client modules, provider health circuit breaker, video provider constants"
  - phase: 03-multi-platform-formatting
    provides: "Complete image+copy campaign pipeline with platform formatting, ZIP packager"
provides:
  - "Video pipeline orchestrator (runVideoPipeline) with sequential generation and per-step fallback"
  - "Extended n8n webhook handler for video/audio asset persistence with provider URL download"
  - "Campaign direct generation fallback with video pipeline stage"
  - "ZIP packager extended to include videos/ and audio/ folders"
  - "downloadToStorage utility for immediate provider URL download to Supabase Storage"
affects: [04-03-progressive-ui]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Sequential video generation (cheapest first)", "Provider URL download to Supabase Storage", "Stage-specific JSONB progress merge"]

key-files:
  created:
    - "src/lib/ai/video-pipeline.ts"
  modified:
    - "src/app/api/webhooks/n8n/route.ts"
    - "src/app/api/campaigns/route.ts"
    - "src/lib/platforms/zip-packager.ts"

key-decisions:
  - "downloadToStorage defined in webhook handler (not shared module) to keep plan scope manageable"
  - "Video pipeline uses dynamic imports for all provider modules to keep initial bundle small"
  - "Stage-specific JSONB merge pattern prevents race conditions between concurrent webhook callbacks"
  - "Video/audio files fetched from Supabase Storage in ZIP packager (not URL fetch like images)"

patterns-established:
  - "Provider URL download: always download to Supabase Storage immediately, never store provider URLs"
  - "Progress merge: read current progress, spread new fields, write back (prevents overwriting concurrent updates)"
  - "Non-fatal video pipeline: video generation failures produce warnings, not campaign failures"

# Metrics
duration: 5min
completed: 2026-02-09
---

# Phase 4 Plan 2: Pipeline Orchestration Summary

**Video/audio pipeline orchestrator wiring voiceover, video ads, cinematic, and avatar generation into campaign creation with provider URL storage, webhook extension, and ZIP packaging**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-08T18:49:25Z
- **Completed:** 2026-02-08T18:54:25Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Created video pipeline orchestrator with sequential generation order (voiceover -> video ads -> cinematic -> avatar) and per-step fallback routing
- Extended n8n webhook handler with videoAssets/audioAssets payload processing and downloadToStorage utility
- Integrated video pipeline into campaign direct generation fallback path (Stage 6 after email)
- Extended ZIP packager with videos/ and audio/ folders fetched from Supabase Storage

## Task Commits

Each task was committed atomically:

1. **Task 1: Create video pipeline orchestrator with fallback routing** - `e602ca7` (feat)
2. **Task 2: Extend webhook, campaign pipeline, and ZIP packager** - `be425bf` (feat)

## Files Created/Modified
- `src/lib/ai/video-pipeline.ts` - Video pipeline orchestrator with sequential generation, fallback routing, non-fatal error collection
- `src/app/api/webhooks/n8n/route.ts` - Extended with videoAssets/audioAssets handling, downloadToStorage utility, stage-specific progress merge
- `src/app/api/campaigns/route.ts` - Added Stage 6 video pipeline, provider URL download to Supabase Storage, video/audio asset persistence
- `src/lib/platforms/zip-packager.ts` - Added videos/ and audio/ archive sections with fetchStorageBuffersBatched helper

## Decisions Made
- [04-02]: downloadToStorage defined locally in webhook handler rather than shared utility (scope management)
- [04-02]: Video pipeline uses dynamic imports for all 4 provider modules to keep initial bundle small
- [04-02]: Stage-specific JSONB merge pattern for progress updates to prevent race conditions between concurrent webhook callbacks
- [04-02]: Video/audio ZIP entries fetched via Supabase Storage admin client (not URL fetch) since storage keys are paths, not URLs

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed CampaignProgress type assertion for spread merge**
- **Found during:** Task 2 (Campaign route video pipeline integration)
- **Issue:** Spreading `existing` (Partial<CampaignProgress>) with `update` (Partial<CampaignProgress>) resulted in all-optional fields, but drizzle requires the full CampaignProgress type for the progress column
- **Fix:** Added explicit type assertion `as CampaignProgress` on the merged object
- **Files modified:** `src/app/api/campaigns/route.ts`
- **Verification:** `pnpm build` passes with no type errors
- **Committed in:** be425bf (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Essential for TypeScript compilation. No scope creep.

## Issues Encountered
None beyond the type assertion fix documented above.

## User Setup Required

**Supabase Storage buckets must be created manually:**
- Create `campaign-videos` bucket (public: true) for video asset storage
- Create `campaign-audio` bucket (public: true) for audio asset storage

These are in addition to the existing `composited-images` and `platform-images` buckets.

**External service configuration:** See [04-USER-SETUP.md](./04-USER-SETUP.md) for provider API keys.

## Next Phase Readiness
- Video pipeline orchestrator ready for end-to-end campaign generation with video/audio
- Webhook handler ready to receive video/audio assets from n8n workflows
- ZIP packager includes all asset types (images, composited, platform, video, audio)
- Next: 04-03 (progressive UI) for real-time video generation status display

---
*Phase: 04-video-audio-pipeline*
*Completed: 2026-02-09*
