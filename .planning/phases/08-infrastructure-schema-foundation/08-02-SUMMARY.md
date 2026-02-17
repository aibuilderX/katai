---
phase: 08-infrastructure-schema-foundation
plan: 02
subsystem: database, api
tags: [drizzle, supabase, pipeline, typescript, webhook, milestones, cost-tracking]

# Dependency graph
requires:
  - phase: 01-07 (v1.0)
    provides: "Existing schema.ts with campaigns/brand_profiles tables, webhook routes, campaign types"
provides:
  - "brand_memory table for voice/style signal accumulation"
  - "campaign_costs table for per-agent/provider cost tracking"
  - "PipelineState type for agent scratchpad pattern"
  - "PipelineMilestone type with 4 Japanese-labeled milestones"
  - "N8nWebhookPayload with v1.1 fields (mode, agentConfig, brandMemory, pipelineVersion)"
  - "N8nCallbackPayload with milestone updates and cost entries"
  - "PIPELINE_MILESTONES constant mapping agents to milestones"
  - "CRITICAL_STOP_ERRORS with Japanese error messages"
  - "BrandMemorySignal and BrandVoiceSummary types"
  - "CostEntry type for cost persistence"
affects: [09-agent-pipeline, 10-auto-mode, 11-brand-memory, 12-compliance]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dynamic import types for JSONB columns: $type<import('@/types/pipeline').Type>()"
    - "Drizzle numeric() returns strings; parseFloat() for arithmetic"
    - "Agent-to-milestone mapping via PIPELINE_MILESTONES constant"
    - "Additive v1.1 fields on webhook/callback for backward compatibility"

key-files:
  created:
    - "src/types/pipeline.ts"
    - "src/lib/db/migrations/0001_add-brand-memory-campaign-costs.sql"
  modified:
    - "src/lib/db/schema.ts"
    - "src/types/campaign.ts"
    - "src/app/api/campaigns/route.ts"
    - "src/app/api/webhooks/n8n/route.ts"

key-decisions:
  - "All agents default to claude-opus-4-6 via AGENT_*_MODEL env vars"
  - "brandMemory set to null in webhook payload until Phase 11 populates"
  - "Pipeline mode defaults to 'pro' until Auto mode (Phase 10)"
  - "Cost alert threshold configurable via CAMPAIGN_COST_ALERT_THRESHOLD_YEN (default 5000)"
  - "4 milestones with Japanese labels: strategy/content/assets/packaging"

patterns-established:
  - "v1.1 types live in src/types/pipeline.ts, imported by schema and routes"
  - "JSONB columns use dynamic import types to avoid circular deps"
  - "CampaignProgress expanded with optional v1.1 fields for backward compat"
  - "Webhook payload always v1.1; callback handler accepts both v1.0 and v1.1"

requirements-completed: [ORCH-03, ORCH-10, ORCH-11, ORCH-12, ORCH-13, ORCH-15]

# Metrics
duration: 6min
completed: 2026-02-18
---

# Phase 08 Plan 02: Schema + Pipeline Types Summary

**brand_memory and campaign_costs tables with PipelineState scratchpad types, milestone progress tracking, and v1.1 webhook/callback expansion**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-17T22:07:04Z
- **Completed:** 2026-02-17T22:12:42Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Created comprehensive pipeline type system (PipelineState, milestones, agent outputs, error types, webhook/callback payloads, cost entries, brand memory types) in src/types/pipeline.ts
- Added brand_memory and campaign_costs tables to Drizzle schema with proper foreign keys, JSONB typing, and migration SQL
- Expanded webhook payload with v1.1 fields (mode, agentConfig, brandMemory, pipelineVersion) and milestone initialization
- Added cost entry persistence and alert threshold check to callback handler while preserving all v1.0 backward compatibility

## Task Commits

Each task was committed atomically:

1. **Task 1: Add database tables and pipeline types** - `2774048` (feat)
2. **Task 2: Expand webhook payload and callback handler for v1.1** - `a34219f` (feat)

## Files Created/Modified
- `src/types/pipeline.ts` - All v1.1 pipeline types: PipelineState, milestones, agent outputs, webhook/callback payloads, cost entries, brand memory
- `src/lib/db/schema.ts` - Added numeric import, brand_memory table, campaign_costs table, expanded CampaignProgress with milestones
- `src/types/campaign.ts` - Added PipelineMilestone import, milestones and pipelineVersion fields to CampaignProgress
- `src/app/api/campaigns/route.ts` - v1.1 webhook payload with agentConfig/mode/brandMemory, milestone initialization on trigger
- `src/app/api/webhooks/n8n/route.ts` - v1.1 callback handling: milestone updates, cost entry persistence, cost alert threshold
- `src/lib/db/migrations/0001_add-brand-memory-campaign-costs.sql` - Drizzle-generated migration SQL for new tables

## Decisions Made
- All 5 agents default to claude-opus-4-6 model, configurable via AGENT_*_MODEL env vars
- brandMemory field set to null in webhook payload until Phase 11 implements signal accumulation
- Pipeline mode defaults to "pro" (Auto mode added in Phase 10)
- Cost alert threshold defaults to 5000 yen, configurable via CAMPAIGN_COST_ALERT_THRESHOLD_YEN env var
- 4 milestones with Japanese labels map agents cleanly: strategy (1 agent), content (3 agents), assets (1 agent), packaging (0 agents)
- Used dynamic import types for JSONB column typing to avoid circular dependencies between schema.ts and pipeline.ts

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required. Migration SQL generated but `drizzle-kit push` requires DATABASE_URL which is already configured for the project.

## Next Phase Readiness
- Pipeline types are fully defined and ready for Phase 9 agent implementation
- brand_memory table ready for Phase 11 to populate
- campaign_costs table ready for cost tracking in n8n workflows
- Webhook payload sends agent model configuration that n8n can use for dynamic model selection
- Callback handler accepts milestone updates and cost entries that n8n will send

## Self-Check: PASSED

All 6 created/modified files verified on disk. Both task commits (2774048, a34219f) verified in git log. TypeScript compiles clean (npx tsc --noEmit).

---
*Phase: 08-infrastructure-schema-foundation*
*Completed: 2026-02-18*
