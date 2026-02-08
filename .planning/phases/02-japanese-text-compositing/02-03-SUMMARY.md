---
phase: 02-japanese-text-compositing
plan: 03
subsystem: compositing
tags: [claude-vision, layout-analysis, tool-use, structured-output, coordinate-validation, fallback-layouts]

# Dependency graph
requires:
  - phase: 02-japanese-text-compositing
    plan: 01
    provides: "Compositing type system (LayoutAlternative, TextPlacement, ContrastZone, TextOrientation)"
  - phase: 01-foundation-core-pipeline
    provides: "Anthropic SDK installed, Claude API integration pattern (tool_use forced output)"
provides:
  - "LAYOUT_ANALYSIS_TOOL Anthropic tool definition for structured 3-alternative layout output"
  - "buildLayoutAnalysisPrompt() context-aware prompt builder with tategaki eligibility logic"
  - "analyzeImageLayout() Claude Vision integration returning 3 validated LayoutAlternative objects"
  - "validateLayoutCoordinates() post-processor: 20px grid snap, 40px edge clamp, overlap resolution"
  - "Fallback safe layouts (3 alternatives) for when Claude API is unavailable"
affects: [02-04-PLAN]

# Tech tracking
tech-stack:
  added: []
  patterns: [claude-vision-tool-use-for-layout, coordinate-validation-pipeline, percentage-based-fallback-layouts]

key-files:
  created:
    - src/lib/ai/prompts/layout-analysis.ts
    - src/lib/compositing/layout-engine.ts
  modified: []

key-decisions:
  - "Tategaki eligibility: headline <= 12 chars, >60% CJK, aspect ratio <= 1.5:1"
  - "Logo position fixed at bottom-right with 40px padding, not varied across alternatives"
  - "Coordinate validation: 20px grid snap, 40px edge padding, min 200px headline maxWidth"
  - "Fallback layouts use percentage-based positioning for any image dimension"
  - "Overlap resolution: sort elements by y-position, push down overlapping elements"

patterns-established:
  - "Claude Vision tool_use pattern: base64 image + text prompt + forced tool output for structured coordinates"
  - "Coordinate validation pipeline: snap -> clamp -> enforce minimums -> resolve overlaps"
  - "Graceful API degradation: try Claude Vision, fall back to safe defaults with console.warn"

# Metrics
duration: 3min
completed: 2026-02-08
---

# Phase 2 Plan 3: Claude Vision Layout Analysis Engine Summary

**Claude Vision layout analysis engine with structured tool output for 3 text placement alternatives, 20px grid coordinate validation, and percentage-based fallback layouts**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-08T08:45:56Z
- **Completed:** 2026-02-08T08:49:16Z
- **Tasks:** 2
- **Files created:** 2
- **Files modified:** 0

## Accomplishments

- Built Claude Vision tool definition (LAYOUT_ANALYSIS_TOOL) enforcing exactly 3 layout alternatives with structured coordinate output
- Created context-aware prompt builder that evaluates tategaki eligibility based on headline length, CJK ratio, and image aspect ratio
- Implemented layout engine that sends base64 images to Claude Vision and returns validated LayoutAlternative objects
- Built coordinate validation pipeline: 20px grid snap, 40px edge clamping, min-width enforcement, vertical overlap resolution
- Created 3 percentage-based fallback layouts (top-center, top-left, right-side) for graceful degradation when Claude API is unavailable

## Task Commits

Each task was committed atomically:

1. **Task 1: Create layout analysis prompt and Claude Vision tool definition** - `9d3bfca` (feat)
2. **Task 2: Build layout engine with Claude Vision integration and coordinate validation** - `736d735` (feat)

## Files Created/Modified

- `src/lib/ai/prompts/layout-analysis.ts` - LAYOUT_ANALYSIS_TOOL schema (3-alternative constraint, headline/tagline/CTA/contrastZones) and buildLayoutAnalysisPrompt() with tategaki eligibility logic
- `src/lib/compositing/layout-engine.ts` - analyzeImageLayout() Claude Vision integration, validateLayoutCoordinates() post-processor, buildFallbackLayouts() safe defaults

## Decisions Made

- **Tategaki eligibility criteria:** Headline must be <= 12 characters, >60% CJK characters, and image aspect ratio <= 1.5:1 (not a wide banner). This follows the research recommendation from 02-RESEARCH.md.
- **Logo position consistency:** Logo is always fixed at bottom-right (imageWidth - 160, imageHeight - 80) regardless of Claude's suggestions, matching the locked decision in CONTEXT.md.
- **Coordinate grid snapping:** 20px grid (not finer) balances precision with preventing pixel-level jitter between alternatives, per research pitfall #4.
- **Fallback layout strategy:** Three distinct placements (top-center, top-left aligned, right-side) using percentage-based positioning that scales to any image dimension.
- **Overlap resolution:** Elements sorted by y-position then pushed down with 20px padding between blocks. Simple linear scan avoids complex constraint solving.

## Deviations from Plan

None -- plan executed exactly as written.

## Issues Encountered

None -- plan executed smoothly.

## User Setup Required

None -- no external service configuration required. The layout engine uses ANTHROPIC_API_KEY which was already configured in Phase 1 for copy generation.

## Next Phase Readiness

- layout-engine.ts exports analyzeImageLayout() ready for import by the compositing pipeline orchestrator (02-04)
- layout-analysis.ts exports LAYOUT_ANALYSIS_TOOL and buildLayoutAnalysisPrompt() for potential reuse or testing
- validateLayoutCoordinates() is exported for unit testing coordinate validation independently
- Fallback layouts ensure the pipeline never fails even without API access -- critical for development and testing of 02-04
- All interfaces align with types.ts LayoutAlternative, TextPlacement, and ContrastZone types from 02-01

## Self-Check: PASSED

- All 2 created files exist on disk
- All 2 commits (9d3bfca, 736d735) verified in git log
- Build compiles without errors
- validateLayoutCoordinates verified: snap, clamp, min-width, and overlap resolution all working

---
*Phase: 02-japanese-text-compositing*
*Completed: 2026-02-08*
