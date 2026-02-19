---
phase: 09-core-agent-pipeline-generation-execution
plan: 04
subsystem: pipeline, api, n8n
tags: [n8n, sub-workflow, internal-api, image-generation, compositing, resize, flux, sharp, hmac, circuit-breaker, fal-ai, supabase-storage]

# Dependency graph
requires:
  - phase: 09-core-agent-pipeline-generation-execution
    plan: 01
    provides: "Master Orchestrator workflow with stub nodes, /api/internal/build-prompt endpoint, AgentStep types"
  - phase: 09-core-agent-pipeline-generation-execution
    plan: 03
    provides: "Copywriter, Art Director, JP Localization agent sub-workflows; pipeline flow through all 5 agents"
  - phase: 09.1-agent-prompt-engineering-photorealistic-output
    provides: "Art Director prompt builder with Flux-compatible image prompts (no negativePrompt)"
provides:
  - "/api/internal/generate-images endpoint wrapping Flux via fal.ai with GENX-08 circuit breaker"
  - "/api/internal/composite endpoint wrapping Sharp + BudouX Japanese text overlay"
  - "/api/internal/resize endpoint wrapping smart crop/letterbox resize with Supabase upload"
  - "Image Generation n8n sub-workflow calling generate-images endpoint with progress callbacks"
  - "Compositing n8n sub-workflow calling composite endpoint with copy variant A"
  - "Resize n8n sub-workflow calling resize endpoint for all platform dimensions"
  - "Master Orchestrator updated: Image Gen -> Compositing -> Resize after agent phase"
affects: [09-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Internal API endpoint pattern: HMAC-verified POST handler wrapping existing TypeScript module"
    - "Circuit breaker in endpoint: providerHealth.shouldUseProvider check before each API call, recordSuccess/recordFailure after"
    - "Generation sub-workflow pattern: trigger -> progress active -> build request -> check skip -> HTTP call -> parse response -> progress complete"
    - "Skip pattern: sub-workflows gracefully skip when upstream data is missing (e.g., no Art Director prompts)"

key-files:
  created:
    - "src/app/api/internal/generate-images/route.ts"
    - "src/app/api/internal/composite/route.ts"
    - "src/app/api/internal/resize/route.ts"
    - "n8n/workflows/image-generation-agent.json"
    - "n8n/workflows/compositing-agent.json"
    - "n8n/workflows/resize-agent.json"
  modified:
    - "n8n/workflows/master-orchestrator.json"

key-decisions:
  - "GENX-08 circuit breaker added at endpoint level since flux.ts does not integrate providerHealth -- checks before batch and before each individual image"
  - "Generate-images endpoint uses generateCampaignImages per-prompt (count=1) rather than batch, enabling per-image circuit breaker tracking"
  - "Compositing sub-workflow uses copy variant A for text overlay -- consistent with v1.0 behavior"
  - "Resize sub-workflow resizes generated base images (not composited), as composited images are already stored with DB records"

patterns-established:
  - "Internal API endpoint: verifySignature + parse body + validate required fields + call existing module + return JSON"
  - "Generation sub-workflow: 7 nodes with skip-check pattern for graceful handling of missing upstream data"
  - "Cost tracking: ~9 yen per image (fal.ai Flux 1.1 Pro Ultra pricing)"

requirements-completed: [GENX-01, GENX-02, GENX-06, GENX-08]

# Metrics
duration: 6min
completed: 2026-02-19
---

# Phase 09 Plan 04: Generation Pipeline Endpoints and Sub-workflows Summary

**3 internal HMAC-secured API endpoints (Flux image generation with GENX-08 circuit breaker, Sharp text compositing, platform resize with Supabase upload) plus 3 n8n sub-workflows wired into Master Orchestrator after JP Localization for end-to-end generation pipeline**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-19T10:30:59Z
- **Completed:** 2026-02-19T10:37:26Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Created 3 internal API endpoints wrapping existing TypeScript modules (generateCampaignImages, compositeCampaignImages, resizeForPlatforms) with HMAC security and graceful error handling
- Added GENX-08 circuit breaker to image generation endpoint -- providerHealth tracks fal_ai consecutive failures, opens circuit after 3 failures with 5-minute cooldown, checks before batch and before each individual image
- Created 3 n8n sub-workflows (image-generation, compositing, resize) each with 7 nodes following the generation sub-workflow pattern: trigger, progress active, build request, check skip, HTTP call, parse response, progress complete
- Updated Master Orchestrator: replaced 3 stub nodes with Execute Sub-workflow nodes, establishing the full generation chain (Image Gen -> Compositing -> Resize) after the agent phase

## Task Commits

Each task was committed atomically:

1. **Task 1: Create internal API endpoints for image generation, compositing, and resize** - `c83db84` (feat)
2. **Task 2: Create image generation, compositing, and resize n8n sub-workflows** - `9c8f15c` (feat)

## Files Created/Modified
- `src/app/api/internal/generate-images/route.ts` - Flux image generation endpoint with HMAC, circuit breaker (GENX-08), per-prompt generation, DB asset insertion
- `src/app/api/internal/composite/route.ts` - Text compositing endpoint with HMAC, wrapping compositeCampaignImages (Claude Vision layout, kinsoku, contrast, Sharp overlay)
- `src/app/api/internal/resize/route.ts` - Platform resize endpoint with HMAC, smart crop/letterbox, Supabase Storage upload, platform_image asset records
- `n8n/workflows/image-generation-agent.json` - 7-node sub-workflow: extract Art Director prompts, call generate-images API, track costs (~9 yen/image), send progress callbacks
- `n8n/workflows/compositing-agent.json` - 7-node sub-workflow: extract generated images + copy variant A, call composite API, send progress callbacks
- `n8n/workflows/resize-agent.json` - 7-node sub-workflow: extract platforms + source assets, call resize API, send progress callbacks
- `n8n/workflows/master-orchestrator.json` - Replaced Image Generation/Compositing/Platform Resize stubs with Execute Sub-workflow nodes; updated connections and notes

## Decisions Made
- **GENX-08 circuit breaker at endpoint level:** The existing flux.ts does not integrate providerHealth. Rather than modifying the shared library (which would affect v1.0 code paths), added circuit breaker checks in the generate-images endpoint. Checks both before starting the batch and before each individual image generation, with recordSuccess/recordFailure after each call.
- **Per-prompt generation (count=1):** The generate-images endpoint calls generateCampaignImages once per Art Director prompt (with count=1) rather than batching. This enables per-image circuit breaker tracking and partial delivery -- if the circuit opens mid-batch, already-generated images are still returned.
- **Copy variant A for compositing:** The compositing sub-workflow uses the first copy variant (A) for text overlay, consistent with v1.0 behavior. Future enhancement could composite multiple variants.
- **Resize base images, not composited:** The resize sub-workflow resizes the generated base images. Composited images are stored separately with their own asset records by the compositing pipeline.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added GENX-08 circuit breaker to generate-images endpoint**
- **Found during:** Task 1 (verification step)
- **Issue:** Plan's verification step explicitly checks for providerHealth in flux.ts; confirmed it is NOT present. Without circuit breaker, a fal.ai outage would cause cascading timeouts across all pipeline executions.
- **Fix:** Imported ProviderHealthTracker from provider-health.ts, added shouldUseProvider check before batch and before each individual generation, recordSuccess/recordFailure after each call
- **Files modified:** src/app/api/internal/generate-images/route.ts
- **Verification:** `grep providerHealth src/app/api/internal/generate-images/route.ts` returns 6 matches
- **Committed in:** c83db84 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical -- GENX-08)
**Impact on plan:** The circuit breaker addition was explicitly required by the plan's verify step. No scope creep.

## Issues Encountered
None.

## User Setup Required
None - sub-workflow JSON files require import into n8n alongside the Master Orchestrator (existing deployment process). The NEXTJS_BASE_URL environment variable must be set in n8n for the sub-workflows to call the internal API endpoints.

## Next Phase Readiness
- Full generation pipeline chain operational: Image Generation -> Compositing -> Platform Resize
- Only Video Pipeline stub remains in Master Orchestrator (Plan 09-05)
- All 3 internal API endpoints ready for production use
- Pipeline supports partial delivery: each generation step is non-fatal (continueOnFail=true), and sub-workflows gracefully skip when upstream data is missing
- TypeScript compiles cleanly with zero errors

## Self-Check: PASSED
