---
phase: 09-core-agent-pipeline-generation-execution
plan: 01
subsystem: pipeline, api, ui
tags: [n8n, orchestrator, webhook, agent-step, pipeline-state, progress-timeline, hmac, prompt-serialization]

# Dependency graph
requires:
  - phase: 08-infrastructure-schema-foundation
    provides: "Pipeline types (pipeline.ts), CampaignProgress, webhook handler, n8n callback infrastructure"
  - phase: 09.1-agent-prompt-engineering-photorealistic-output
    provides: "5 agent prompt builders (strategic-insight, creative-director, copywriter, art-director, jp-localization), shared modules, agent-config"
provides:
  - "AgentStep interface with 9 agent names and Japanese labels"
  - "AGENT_STEP_DEFINITIONS constant for pipeline initialization"
  - "Per-agent step callback handling in webhook route (merge pattern)"
  - "PipelineState storage in progress.pipelineState on completion"
  - "Per-agent vertical timeline UI with elapsed timer, status icons, and Japanese summaries"
  - "n8n Master Orchestrator workflow definition (importable JSON)"
  - "/api/internal/build-prompt endpoint serializing all 5 agent prompts"
affects: [09-02, 09-03, 09-04, 09-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "AgentStep callback merge: read progress -> init agentSteps if absent -> find by agentName -> merge update"
    - "PipelineState stored inside progress JSONB (avoids schema migration)"
    - "n8n workflow as importable JSON at n8n/workflows/"
    - "Build-prompt endpoint as single source of truth: n8n calls TypeScript builders via HTTP"

key-files:
  created:
    - "n8n/workflows/master-orchestrator.json"
    - "src/app/api/internal/build-prompt/route.ts"
  modified:
    - "src/types/pipeline.ts"
    - "src/types/campaign.ts"
    - "src/lib/db/schema.ts"
    - "src/app/api/webhooks/n8n/route.ts"
    - "src/components/campaign/generation-progress.tsx"

key-decisions:
  - "n8n workflow created as importable JSON file rather than via MCP (n8n MCP tools not configured in project)"
  - "PipelineState stored inside progress JSONB as progress.pipelineState to avoid schema migration"
  - "AgentStep definitions cover all 9 pipeline stages including generation/compositing/resize/video"
  - "v1.0 flat step display preserved as fallback when agentSteps not present in progress"

patterns-established:
  - "n8n workflow definitions stored at n8n/workflows/ as importable JSON"
  - "Build-prompt endpoint pattern: n8n sub-workflows call /api/internal/build-prompt instead of inlining prompts"
  - "Agent step timeline with section grouping (strategy/content vs asset generation)"

requirements-completed: [ORCH-02]

# Metrics
duration: 8min
completed: 2026-02-19
---

# Phase 09 Plan 01: Master Orchestrator and Pipeline Infrastructure Summary

**n8n Master Orchestrator workflow with webhook trigger, per-agent progress timeline UI with Japanese labels and elapsed timers, callback handler with AgentStep merge, and /api/internal/build-prompt endpoint as single source of truth for all 5 agent prompts**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-19T10:01:44Z
- **Completed:** 2026-02-19T10:10:20Z
- **Tasks:** 4
- **Files modified:** 7

## Accomplishments
- Added AgentStep types with 9 agent names and Japanese labels, extended callback handler with per-agent step merge and pipelineState storage
- Redesigned progress UI with v1.1 per-agent vertical timeline (elapsed timer, status icons, section grouping, completion summaries) while preserving v1.0 fallback
- Created n8n Master Orchestrator workflow with webhook trigger, HMAC verification, PipelineState initialization, Copywriter/Art Director parallel branches, and stub nodes for all 9 stages
- Created /api/internal/build-prompt endpoint serializing all 5 agent prompt builders (Strategic Insight, Creative Director, Copywriter, Art Director, JP Localization) with HMAC security and revision context support

## Task Commits

Each task was committed atomically:

1. **Task 1: Add AgentStep types, pipelineState column, and extend callback handler** - `6a629a6` (feat)
2. **Task 2: Redesign generation-progress.tsx for per-agent timeline** - `4f2f99e` (feat)
3. **Task 3: Create n8n Master Orchestrator workflow via MCP** - `7e27a9d` (feat)
4. **Task 4: Create /api/internal/build-prompt endpoint** - `275992e` (feat)

## Files Created/Modified
- `src/types/pipeline.ts` - Added AgentStep interface, AGENT_STEP_DEFINITIONS constant, agentStep field on N8nCallbackPayload
- `src/types/campaign.ts` - Added agentSteps and pipelineState to CampaignProgress
- `src/lib/db/schema.ts` - Added agentSteps and pipelineState to CampaignProgress interface
- `src/app/api/webhooks/n8n/route.ts` - Added agentStep merge handler and pipelineState storage on completion
- `src/components/campaign/generation-progress.tsx` - Complete redesign with v1.1 per-agent timeline and v1.0 fallback
- `n8n/workflows/master-orchestrator.json` - 17-node Master Orchestrator workflow with all pipeline stages
- `src/app/api/internal/build-prompt/route.ts` - HMAC-secured prompt serialization endpoint for all 5 agents

## Decisions Made
- **n8n workflow as importable JSON:** The n8n MCP tools listed in the plan were not configured in the project's `.mcp.json`. Created the workflow as an importable JSON file at `n8n/workflows/master-orchestrator.json` instead. This is functionally equivalent -- downstream plans can import it via n8n UI or API.
- **PipelineState in progress JSONB:** Stored pipelineState inside the existing `progress` JSONB column as `progress.pipelineState` rather than adding a new database column. This avoids a Supabase migration while keeping the data accessible.
- **9 agent steps (not 5):** Extended AgentStep definitions to cover all 9 pipeline stages (5 agents + image_generation, compositing, platform_resize, video_pipeline) for complete end-to-end progress visibility.
- **v1.0 fallback preserved:** The progress UI detects v1.1 pipeline by checking for `agentSteps` in progress data, falling back to the original flat step display for v1.0 pipelines.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] n8n MCP tools not available, created importable JSON instead**
- **Found during:** Task 3 (Create n8n Master Orchestrator workflow)
- **Issue:** The plan specified using n8n MCP tools (mcp__n8n-mcp__n8n_create_workflow etc.) but no n8n MCP server is configured in .mcp.json
- **Fix:** Created the workflow as an importable n8n JSON file at n8n/workflows/master-orchestrator.json with all 17 nodes, connections, and HMAC verification
- **Files modified:** n8n/workflows/master-orchestrator.json (created)
- **Verification:** JSON validates correctly, contains all required nodes (webhook, HMAC, PipelineState init, 9 agent stubs, quality gate, merge, final callback)
- **Committed in:** 7e27a9d (Task 3 commit)

**2. [Rule 2 - Missing Critical] CampaignProgress in campaign.ts was out of sync**
- **Found during:** Task 1
- **Issue:** CampaignProgress interface exists in both src/lib/db/schema.ts and src/types/campaign.ts. The campaign.ts copy was missing the agentSteps field.
- **Fix:** Updated src/types/campaign.ts CampaignProgress to include agentSteps and pipelineState fields, matching schema.ts
- **Files modified:** src/types/campaign.ts
- **Verification:** npx tsc --noEmit passes
- **Committed in:** 6a629a6 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 missing critical)
**Impact on plan:** Both fixes necessary for correctness. No scope creep. The n8n JSON approach is functionally equivalent to MCP creation.

## Issues Encountered
None beyond the deviations documented above.

## User Setup Required
None - no external service configuration required. The n8n workflow JSON requires import into n8n (with N8N_WEBHOOK_SECRET and NEXTJS_CALLBACK_URL env vars), but this is part of the existing deployment setup documented in previous phases.

## Next Phase Readiness
- Master Orchestrator workflow ready for import -- stub nodes will be replaced by Execute Sub-workflow nodes in Plans 09-02 through 09-05
- AgentStep types and callback handler ready to receive per-agent progress updates from sub-workflows
- /api/internal/build-prompt endpoint ready for n8n HTTP Request nodes to call
- Progress UI will display per-agent timeline as soon as agentSteps appear in campaign progress data
- All TypeScript types compile cleanly with zero errors

## Self-Check: PASSED

All 7 files verified present. All 4 task commits (6a629a6, 4f2f99e, 7e27a9d, 275992e) verified in git log.

---
*Phase: 09-core-agent-pipeline-generation-execution*
*Completed: 2026-02-19*
