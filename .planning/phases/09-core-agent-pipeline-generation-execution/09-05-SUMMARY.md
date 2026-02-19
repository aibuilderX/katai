---
phase: 09-core-agent-pipeline-generation-execution
plan: 05
subsystem: pipeline, api, ui, n8n
tags: [video-pipeline, elevenlabs, kling, runway, heygen, circuit-breaker, strategy-accordion, zip-download, async-workflow, hmac]

# Dependency graph
requires:
  - phase: 09-core-agent-pipeline-generation-execution
    plan: 04
    provides: "3 internal API endpoints (generate-images, composite, resize), 3 n8n generation sub-workflows, Master Orchestrator with generation chain"
  - phase: 09-core-agent-pipeline-generation-execution
    plan: 01
    provides: "AgentStep types with video_pipeline definition, PipelineState with strategicInsight, callback handler"
provides:
  - "/api/internal/video-pipeline endpoint wrapping runVideoPipeline() with HMAC security"
  - "n8n video-pipeline-agent.json async sub-workflow with progress callbacks"
  - "Master Orchestrator updated: sends completion callback BEFORE async video fork (waitForSubWorkflow: false)"
  - "StrategyAccordion component showing plain-language Japanese conclusions with steel-blue accent"
  - "GENX-07: ZIP download endpoint verified with all v1.1 asset types"
affects: [phase-10, phase-12]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Async sub-workflow fork: Master Orchestrator sends completion callback first, then executes video pipeline with waitForSubWorkflow: false"
    - "Strategy accordion: maps internal classification (awareness/LF8/framework) to plain-language Japanese, never exposes methodology"
    - "Campaign delivers copy+images immediately; video arrives later via Supabase Realtime"

key-files:
  created:
    - "src/app/api/internal/video-pipeline/route.ts"
    - "n8n/workflows/video-pipeline-agent.json"
    - "src/components/campaign/strategy-accordion.tsx"
  modified:
    - "n8n/workflows/master-orchestrator.json"
    - "src/app/(dashboard)/campaigns/[id]/campaign-detail-content.tsx"

key-decisions:
  - "Master Orchestrator sends completion callback BEFORE forking video pipeline -- campaign delivers copy+images immediately"
  - "Video pipeline runs via waitForSubWorkflow: false -- orchestrator does not wait, video sub-workflow sends its own callbacks"
  - "ZIP download endpoint already covers all v1.1 asset types -- no modifications needed (composited, resized, video, audio, copy variants)"
  - "StrategyAccordion uses Unicode escape sequences for all user-visible Japanese text -- no English text rendered"

patterns-established:
  - "Async fork pattern: completion callback -> prepare data -> Execute Sub-workflow (waitForSubWorkflow: false)"
  - "Strategy display: internal classification -> plain-language Japanese mapping with fallback"

requirements-completed: [GENX-03, GENX-04, GENX-05, GENX-07, GENX-08]

# Metrics
duration: 6min
completed: 2026-02-19
---

# Phase 09 Plan 05: Video Pipeline, Strategy Accordion, and End-to-End Verification Summary

**Async video/audio/avatar pipeline via HMAC-secured endpoint + n8n sub-workflow (waitForSubWorkflow: false), strategy accordion with plain-language Japanese conclusions and steel-blue accent, ZIP download verified with all v1.1 asset types**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-19T10:39:55Z
- **Completed:** 2026-02-19T10:46:18Z
- **Tasks:** 3 auto tasks completed (1 checkpoint pending)
- **Files modified:** 5

## Accomplishments
- Created HMAC-secured video pipeline internal endpoint wrapping runVideoPipeline() for voiceover (ElevenLabs), video ads (Kling/Runway), cinematic video (Runway), and avatar video (HeyGen) with Supabase Storage persistence
- Created 6-node n8n video-pipeline-agent.json async sub-workflow with progress callbacks and updated Master Orchestrator to fork video generation with waitForSubWorkflow: false after sending completion callback
- Verified existing ZIP download endpoint and packager already include all v1.1 pipeline asset types (composited images, platform-resized images, video, audio, copy variants)
- Created StrategyAccordion component mapping awareness levels and LF8 desires to plain-language Japanese, collapsed by default with steel-blue (#6B8FA3) accent, wired into campaign detail page between header and tab bar

## Task Commits

Each task was committed atomically:

1. **Task 1: Create video pipeline internal endpoint and n8n async sub-workflow** - `41541e3` (feat)
2. **Task 1B: Verify ZIP download endpoint** - No commit needed (verification-only, all requirements already met)
3. **Task 2: Create strategy accordion component and wire into campaign detail page** - `8af317d` (feat)
4. **Task 3: End-to-end pipeline verification checkpoint** - PENDING (checkpoint:human-verify)

## Files Created/Modified
- `src/app/api/internal/video-pipeline/route.ts` - HMAC-secured endpoint wrapping runVideoPipeline(), persists voiceover/video/avatar to Supabase Storage with asset records
- `n8n/workflows/video-pipeline-agent.json` - 6-node async sub-workflow: trigger, progress active, build request, HTTP call (300s timeout), parse response, progress complete/failed
- `n8n/workflows/master-orchestrator.json` - Replaced Video Pipeline stub with async fork pattern: Final Callback -> Prepare Video Data -> Execute Sub-workflow (waitForSubWorkflow: false)
- `src/components/campaign/strategy-accordion.tsx` - Collapsible strategy summary with steel-blue accent, plain-language Japanese, awareness/LF8 mapping
- `src/app/(dashboard)/campaigns/[id]/campaign-detail-content.tsx` - Added StrategyAccordion between campaign header and tab bar, conditional on v1.1 pipelineState.strategicInsight

## Decisions Made
- **Completion callback before video fork:** The Master Orchestrator sends the success callback to Next.js (marking campaign as complete with copy + images) BEFORE forking the video pipeline. This ensures immediate campaign delivery while video generation runs in the background.
- **Async sub-workflow pattern:** Video pipeline uses waitForSubWorkflow: false on the Execute Sub-workflow node. The sub-workflow sends its own progress callbacks directly to Next.js. Dashboard receives video assets via Supabase Realtime.
- **ZIP packager already complete:** The existing buildCampaignZip() already queries all asset types (platform_image, composited_image, video, audio) and includes copy variants as text files. No modifications needed for GENX-07.
- **Unicode escapes for Japanese text:** StrategyAccordion uses Unicode escape sequences (e.g., \u6226\u7565\u30B5\u30DE\u30EA\u30FC) for all user-visible Japanese text to ensure consistent encoding across all editors and environments.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - the video pipeline endpoint uses the same N8N_WEBHOOK_SECRET and Supabase Storage credentials already configured. The n8n video-pipeline-agent.json workflow requires import into n8n alongside the updated Master Orchestrator.

## Checkpoint Status

Task 3 (end-to-end pipeline verification) is a checkpoint:human-verify that requires manual testing of the complete 7-agent pipeline from webhook to campaign delivery. This checkpoint is pending user verification.

## Next Phase Readiness
- Complete v1.1 pipeline: webhook -> 5 agents -> image generation -> compositing -> resize -> completion callback -> async video pipeline
- All 4 internal API endpoints operational (build-prompt, generate-images, composite, resize, video-pipeline)
- All n8n sub-workflows created (10 workflow JSON files at n8n/workflows/)
- Strategy accordion ready for v1.1 campaigns with strategicInsight data
- ZIP download includes all asset types
- Pending: End-to-end verification via test campaign (Task 3 checkpoint)

## Self-Check: PASSED

All 5 files verified present. Both task commits (41541e3, 8af317d) verified in git log.

---
*Phase: 09-core-agent-pipeline-generation-execution*
*Completed: 2026-02-19*
