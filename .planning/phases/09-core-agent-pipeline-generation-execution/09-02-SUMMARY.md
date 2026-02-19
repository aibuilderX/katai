---
phase: 09-core-agent-pipeline-generation-execution
plan: 02
subsystem: pipeline, n8n
tags: [n8n, sub-workflow, strategic-insight, creative-director, anthropic-api, tool-use, quality-gate, build-prompt, hmac]

# Dependency graph
requires:
  - phase: 09-core-agent-pipeline-generation-execution
    plan: 01
    provides: "Master Orchestrator workflow with stub nodes, /api/internal/build-prompt endpoint, AgentStep types"
  - phase: 09.1-agent-prompt-engineering-photorealistic-output
    provides: "Strategic Insight and Creative Director prompt builders with tool schemas"
provides:
  - "Strategic Insight Agent n8n sub-workflow (9 nodes) with Anthropic API tool-use and quality gate"
  - "Creative Director Agent n8n sub-workflow (8 nodes) with mode-dependent concept generation"
  - "Quality gate (ORCH-09) validating awarenessLevel, lf8Desires, copywritingFramework, targetInsight, creativeDirection, keyMessages, tonalGuidance"
  - "Master Orchestrator updated with Execute Sub-workflow nodes for both agents"
affects: [09-03, 09-04, 09-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Agent sub-workflow pattern: trigger -> progress callback -> build-prompt fetch -> Anthropic API -> parse response -> quality gate -> completion callback"
    - "Build-prompt integration: n8n HTTP Request calls /api/internal/build-prompt with agentName and upstreamOutputs"
    - "Mode-dependent parsing: pro mode stores allConcepts array, uses first concept for pipeline continuation"
    - "Critical-stop pattern: retryOnFail with maxTries:2 on Anthropic API, then error handler sends Japanese failure callback"
    - "Tool schema field mapping: tool uses primaryDesires, PipelineState uses lf8Desires (mapped in parse node)"

key-files:
  created:
    - "n8n/workflows/strategic-insight-agent.json"
    - "n8n/workflows/creative-director-agent.json"
  modified:
    - "n8n/workflows/master-orchestrator.json"

key-decisions:
  - "Sub-workflows created as importable JSON files (consistent with Plan 09-01 pattern since n8n MCP tools not configured)"
  - "Quality gate inside sub-workflow rather than Master Orchestrator -- sub-workflow returns only validated data"
  - "Pro mode Creative Director stores all concepts in allConcepts field but pipeline continues with first concept"
  - "Field mapping handled in parse node: tool schema primaryDesires mapped to PipelineState lf8Desires"

patterns-established:
  - "Agent sub-workflow standard: 8-9 nodes with trigger, progress callbacks, build-prompt fetch, Anthropic API call, response parsing, error handling"
  - "n8n httpHeaderAuth credential reference pattern for Anthropic API key"

requirements-completed: [ORCH-04, ORCH-05, ORCH-09]

# Metrics
duration: 5min
completed: 2026-02-19
---

# Phase 09 Plan 02: Strategic Insight and Creative Director Agent Sub-workflows Summary

**Two n8n agent sub-workflows calling /api/internal/build-prompt and Anthropic API with tool-use, quality gate (ORCH-09) validating 7 fields, mode-dependent Creative Director output, and Master Orchestrator updated with Execute Sub-workflow nodes**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-19T10:13:21Z
- **Completed:** 2026-02-19T10:18:48Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created Strategic Insight Agent sub-workflow (9 nodes) with quality gate validating awarenessLevel, lf8Desires, copywritingFramework (PAS/AIDA/BAB/AIDMA/AISAS only), targetInsight, creativeDirection, keyMessages, and tonalGuidance
- Created Creative Director Agent sub-workflow (8 nodes) with mode-dependent response parsing (auto: flat concept, pro: 2-3 concepts array with allConcepts storage)
- Updated Master Orchestrator to replace both stub nodes (and quality gate stub) with Execute Sub-workflow nodes, creating the pipeline flow: Init -> Strategic Insight -> Creative Director -> Copywriter/Art Director parallel

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Strategic Insight agent n8n sub-workflow with quality gate** - `537d76e` (feat)
2. **Task 2: Create Creative Director agent n8n sub-workflow** - `70abc8a` (feat)

## Files Created/Modified
- `n8n/workflows/strategic-insight-agent.json` - 9-node sub-workflow: trigger, progress callbacks, build-prompt fetch, Anthropic API call, response parsing (primaryDesires -> lf8Desires mapping), quality gate (ORCH-09), error handler with Japanese critical-stop message
- `n8n/workflows/creative-director-agent.json` - 8-node sub-workflow: trigger, progress callbacks, build-prompt fetch (with upstreamOutputs.strategicInsight), Anthropic API call, mode-dependent response parsing (auto: flat, pro: concepts array), error handler
- `n8n/workflows/master-orchestrator.json` - Replaced Strategic Insight stub + quality gate stub and Creative Director stub with Execute Sub-workflow nodes; updated connections

## Decisions Made
- **Quality gate inside sub-workflow:** Moved the quality gate from the Master Orchestrator into the Strategic Insight sub-workflow itself. The sub-workflow now returns only validated data -- if the quality gate fails, the sub-workflow errors out (critical-stop). This is cleaner than having a separate quality gate node in the orchestrator.
- **Pro mode allConcepts storage:** For Creative Director pro mode (2-3 concepts), all concepts are stored in pipelineState.creativeDirector.allConcepts for dashboard display, while the first concept's fields are used as the primary for pipeline continuation by downstream agents.
- **Field mapping in parse node:** The Anthropic tool schema uses `primaryDesires` (matching the tool schema field name) while PipelineState uses `lf8Desires` (matching the TypeScript type). The mapping is handled in the Parse Response code node.

## Deviations from Plan

None - plan executed exactly as written. The n8n JSON file approach (instead of MCP tools) was already established in Plan 09-01 and is the expected pattern.

## Issues Encountered
None.

## User Setup Required
None - sub-workflow JSON files require import into n8n alongside the Master Orchestrator (existing deployment process). The Anthropic API Key httpHeaderAuth credential must be configured in n8n.

## Next Phase Readiness
- Strategic Insight and Creative Director sub-workflows ready for import alongside Master Orchestrator
- Pipeline flow established: webhook -> HMAC -> init -> Strategic Insight -> Creative Director -> (parallel) Copywriter/Art Director
- Remaining stubs: Copywriter (Plan 09-03), Art Director (Plan 09-04), JP Localization (Plan 09-05)
- Build-prompt endpoint already handles all 5 agents; only sub-workflow JSON files needed for remaining agents

## Self-Check: PASSED
