---
phase: 09-core-agent-pipeline-generation-execution
plan: 03
subsystem: pipeline, n8n
tags: [n8n, sub-workflow, copywriter, art-director, jp-localization, anthropic-api, tool-use, build-prompt, critique-loop, parallel-branch, partial-delivery, hmac]

# Dependency graph
requires:
  - phase: 09-core-agent-pipeline-generation-execution
    plan: 01
    provides: "Master Orchestrator workflow with stub nodes, /api/internal/build-prompt endpoint, AgentStep types"
  - phase: 09-core-agent-pipeline-generation-execution
    plan: 02
    provides: "Strategic Insight and Creative Director agent sub-workflows, quality gate (ORCH-09)"
  - phase: 09.1-agent-prompt-engineering-photorealistic-output
    provides: "Copywriter, Art Director, JP Localization prompt builders with tool schemas, revision context support"
provides:
  - "Copywriter Agent n8n sub-workflow with build-prompt integration and 4-variant per-platform copy generation"
  - "Art Director Agent n8n sub-workflow with Flux-compatible image prompts (no negativePrompt), GENX-09 default inference"
  - "JP Localization Agent n8n sub-workflow with critique loop (max 2 attempts, auto-approve on final)"
  - "Parallel branching in Master Orchestrator for Copywriter/Art Director with PipelineState merge"
  - "Master Orchestrator updated: all 5 agent stubs replaced with Execute Sub-workflow nodes"
affects: [09-04, 09-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Partial-delivery agent pattern: onError continueRegularOutput, parse node checks for errors, logs to agentErrors, pipeline continues"
    - "Parallel branch merge: Code node merges copywriter + artDirector from separate branches, deduplicates agentErrors"
    - "Critique loop as sequential nodes: Review #1 -> If -> Revision -> If -> Review #2 (no n8n loop node needed for max 2 attempts)"
    - "Auto-approve on final attempt: flagged status sent via agentStep for dashboard display"
    - "Cost accumulator across loop iterations: allCostEntries array collects all API call costs"

key-files:
  created:
    - "n8n/workflows/copywriter-agent.json"
    - "n8n/workflows/art-director-agent.json"
    - "n8n/workflows/jp-localization-agent.json"
  modified:
    - "n8n/workflows/master-orchestrator.json"

key-decisions:
  - "Partial-delivery pattern for Copywriter/Art Director: onError continueRegularOutput instead of stopWorkflow, parse node gracefully handles errors"
  - "Critique loop implemented as sequential nodes rather than n8n loop node (simpler for fixed max 2 attempts)"
  - "JP Localization auto-approve sends 'flagged' status (not 'complete') to differentiate in dashboard UI"
  - "Merge node uses field presence detection to combine parallel branch outputs (not order-dependent)"

patterns-established:
  - "Partial-delivery agent sub-workflow: 7 nodes (trigger, progress active, build-prompt fetch, prepare, Anthropic API, parse with error handling, progress complete/failed)"
  - "Critique loop sub-workflow: 19 nodes with If branching for revision path and auto-approve on final attempt"

requirements-completed: [ORCH-06, ORCH-07, ORCH-08, GENX-09]

# Metrics
duration: 7min
completed: 2026-02-19
---

# Phase 09 Plan 03: Copywriter, Art Director, and JP Localization Agent Sub-workflows Summary

**Three n8n agent sub-workflows (Copywriter + Art Director in parallel, JP Localization with critique loop) calling /api/internal/build-prompt and Anthropic API with tool-use, partial-delivery error handling, and Master Orchestrator updated with parallel branching and PipelineState merge**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-19T10:21:13Z
- **Completed:** 2026-02-19T10:28:10Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Created Copywriter Agent sub-workflow (7 nodes) with build-prompt integration for register maps, platform norms, and copywriting frameworks; generates 4 copy variants (A-D) per platform with partial-delivery error handling
- Created Art Director Agent sub-workflow (7 nodes) with build-prompt integration for GENX-09 brand default inference, camera/lens database, Flux constraints; mode-dependent parsing (auto: flat imagePrompts, pro: variations wrapper); no negativePrompt field
- Created JP Localization Agent sub-workflow (19 nodes) with critique loop: Review #1 via build-prompt, If rejected -> Copywriter revision via build-prompt -> Review #2 (auto-approves on final attempt with flagged status); all API call costs tracked across loop iterations
- Updated Master Orchestrator: replaced all 3 agent stubs (Copywriter, Art Director, JP Localization) with Execute Sub-workflow nodes; improved Merge node to properly combine copywriter + artDirector from parallel branches with agentError deduplication

## Task Commits

Each task was committed atomically:

1. **Task 1A: Create Copywriter n8n sub-workflow** - `e0032da` (feat)
2. **Task 1B: Create Art Director n8n sub-workflow and wire parallel branch** - `d82cbc2` (feat)
3. **Task 2: Create JP Localization sub-workflow with critique loop** - `4f2f92c` (feat)

## Files Created/Modified
- `n8n/workflows/copywriter-agent.json` - 7-node sub-workflow: trigger, progress callbacks, build-prompt fetch (copywriter + upstreamOutputs), Anthropic API call (180s timeout), response parsing (4 variants per platform), partial-delivery error handling
- `n8n/workflows/art-director-agent.json` - 7-node sub-workflow: trigger, progress callbacks, build-prompt fetch (artDirector + GENX-09, Flux constraints, mode-dependent schema), Anthropic API call (180s timeout), response parsing (no negativePrompt), partial-delivery error handling
- `n8n/workflows/jp-localization-agent.json` - 19-node sub-workflow: trigger, progress, loop init, Review #1 (build-prompt + Anthropic), If branch, Copywriter revision (build-prompt + Anthropic), If re-review, Review #2 (build-prompt + Anthropic), auto-approve parse, finalize, progress complete
- `n8n/workflows/master-orchestrator.json` - Replaced Copywriter/Art Director/JP Localization stubs with Execute Sub-workflow nodes; updated Merge node with proper parallel branch combination logic

## Decisions Made
- **Partial-delivery pattern:** Copywriter and Art Director use `onError: continueRegularOutput` on both build-prompt fetch and Anthropic API calls, with the Parse Response node checking for errors gracefully. This differs from Strategic Insight and Creative Director which use `onError: stopWorkflow` (critical-stop). The pipeline continues even if these agents fail.
- **Critique loop as sequential nodes:** Rather than using n8n's loop node, the critique loop is implemented as sequential Review #1 -> If -> Revision -> If -> Review #2 nodes. This is simpler and more explicit for the fixed max of 2 total attempts.
- **Flagged status for auto-approve:** When JP Localization auto-approves on the final attempt, the agentStep sends `status: 'flagged'` (not `'complete'`) so the dashboard can visually distinguish approved-with-concerns from fully-approved.
- **Merge node field detection:** The Merge Parallel Branches node uses field presence detection (`branch.pipelineState?.copywriter`) rather than assuming branch order, making it robust regardless of which parallel branch completes first.

## Deviations from Plan

None - plan executed exactly as written. The n8n JSON file approach (instead of MCP tools) was already established in Plan 09-01 and is the expected pattern.

## Issues Encountered
None.

## User Setup Required
None - sub-workflow JSON files require import into n8n alongside the Master Orchestrator (existing deployment process). The Anthropic API Key httpHeaderAuth credential must be configured in n8n.

## Next Phase Readiness
- All 5 agent sub-workflows now have JSON files ready for import (strategic-insight, creative-director, copywriter, art-director, jp-localization)
- Master Orchestrator pipeline flow: webhook -> HMAC -> init -> Strategic Insight -> Creative Director -> (parallel) Copywriter + Art Director -> Merge -> JP Localization -> (stubs) Image Generation -> Compositing -> Platform Resize -> Video Pipeline -> Final Callback
- Remaining stubs: Image Generation (Plan 09-04), Compositing/Platform Resize/Video Pipeline (Plan 09-05)
- Build-prompt endpoint already handles all 5 agents including revision context for the critique loop

## Self-Check: PASSED
