# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-06)

**Core value:** A non-technical user submits a brief and receives a complete, download-ready campaign kit with correct Japanese copy and platform-compliant assets in under 5 minutes.
**Current focus:** Phase 2 - Japanese Text Compositing (In Progress)

## Current Position

Phase: 2 of 6 (Japanese Text Compositing)
Plan: 3 of 4 in current phase
Status: In progress
Last activity: 2026-02-08 -- Completed 02-03-PLAN.md

Progress: [███████░░░] 75% (Phase 2: 3/4 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 8
- Average duration: ~10 min
- Total execution time: ~81 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 | 5/5 | ~69 min | ~14 min |
| 2 | 3/4 | ~12 min | ~4 min |

**Recent Trend:**
- Last 5 plans: 01-05, 02-01, 02-02, 02-03
- Trend: Accelerating (02-03 completed in ~3 min)

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: 6-phase structure derived from 42 requirements; research-suggested Phase 7 (polish) deferred since all its features are v2 scope
- [Roadmap]: Phases 1-3 form image+copy MVP; Phase 4 adds video; Phases 5-6 add agency workflow and billing
- [01-03]: Flat form for brand editing (wizard for creation, flat form for edits)
- [01-03]: Admin-only brand deletion
- [01-03]: Logo upload via Supabase admin client, color extraction skips SVG
- [01-04]: Sequential Flux image generation to avoid rate limiting (acceptable for Phase 1)
- [01-04]: Store Flux image URLs directly in assets table (no Supabase Storage upload in Phase 1)
- [01-04]: English image prompts for Flux (Japanese text compositing is Phase 2)
- [01-05]: Server-then-Client pattern for campaign detail (Server Component fetches, Client Component renders interactive UI)
- [01-05]: Optimistic UI for favorite toggle with API revert on failure
- [01-05]: Fallback 5s polling alongside Supabase Realtime (works without REPLICA IDENTITY FULL)
- [01-05]: Auto-refresh page 1.5s after generation completes to re-fetch full results
- [02-01]: BudouX singleton parser loaded at module level for performance
- [02-01]: Character width estimation: CJK = 1em, ASCII = 0.5em via Unicode ranges
- [02-01]: Kinsoku cascade capped at 3 iterations to prevent infinite loops
- [02-02]: Three-tier contrast: backdrop (variance>50), stroke (variance<25 + extreme luminance), shadow (medium)
- [02-02]: Vertical text uses character-by-character SVG, not CSS writing-mode (librsvg incompatible)
- [02-02]: Logo scaled to 12% of image width with 40px edge padding at bottom-right
- [02-03]: Tategaki eligibility: headline <= 12 chars, >60% CJK, aspect ratio <= 1.5:1
- [02-03]: Coordinate validation: 20px grid snap, 40px edge padding, min 200px headline maxWidth
- [02-03]: Logo position fixed bottom-right, not varied across layout alternatives

### Pending Todos

- Run `ALTER TABLE campaigns REPLICA IDENTITY FULL;` for optimal Supabase Realtime (optional, polling works without it)

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-02-08
Stopped at: Phase 2, Plan 3 complete. Ready for Plan 4 (compositing pipeline orchestrator)
Resume file: .planning/phases/02-japanese-text-compositing/02-04-PLAN.md
