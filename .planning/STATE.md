# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-06)

**Core value:** A non-technical user submits a brief and receives a complete, download-ready campaign kit with correct Japanese copy and platform-compliant assets in under 5 minutes.
**Current focus:** Phase 4 in progress. Provider client modules complete.

## Current Position

Phase: 4 of 6 (Video & Audio Pipeline)
Plan: 1 of 3 in current phase
Status: In progress
Last activity: 2026-02-09 -- Completed 04-01-PLAN.md

Progress: [█████████████████░░░] 85% (Phase 4: 1/3 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 15
- Average duration: ~9 min
- Total execution time: ~135 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 | 5/5 | ~69 min | ~14 min |
| 2 | 4/4 | ~18 min | ~5 min |
| 3 | 4/4 | ~42 min | ~11 min |
| 4 | 1/3 | ~6 min | ~6 min |

**Recent Trend:**
- Last 5 plans: 03-02, 03-01(copy), 03-03, 03-04, 04-01
- Note: 04-01 completed in 6min (SDK install + 4 client modules + constants)

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
- [02-04]: Compositing failure non-fatal: campaign completes with base images, compositingStatus tracked separately
- [02-04]: Dynamic import for compositing module to keep initial bundle small
- [02-04]: First copy variant (A案) used for compositing text overlay
- [02-04]: Tagline included only if bodyText <= 30 characters
- [03-01]: Codepoint-accurate character counting via [...str].length (not .length which double-counts surrogates)
- [03-01]: Single Claude API call for all platform variants (max_tokens 8192) for cost efficiency
- [03-01]: Server-side truncation as safety net -- log warnings, don't reject over-limit copy
- [03-01]: Ellipsis character (U+2026) as single-char truncation marker
- [03-02]: 3x aspect ratio threshold for cover vs contain resize strategy
- [03-02]: Sequential resize processing (not parallel) to avoid sharp memory spikes
- [03-02]: Japanese labels stripped to ASCII for filenames, original preserved in dimensionLabel
- [03-03]: archiver library with zlib level 6 for ZIP creation
- [03-03]: Batched parallel asset fetching (groups of 5) in ZIP builder
- [03-03]: Platform resize and email stages non-fatal -- campaign completes with warning
- [03-03]: Layout A composited image selected per base image for resize source
- [03-03]: Email HTML uploaded to platform-images bucket alongside image assets
- [03-04]: DownloadButton in sidebar, visible only for complete/partial campaigns
- [03-04]: Extreme aspect ratio threshold >3x or <1/3x for "要調整" warning badge
- [03-04]: Copy sections in platform grid collapsed by default (accordion pattern)
- [04-01]: Runway Gen-4 Turbo aspect ratios corrected to SDK-valid values (1280:720 not 1920:1080)
- [04-01]: Kling accessed via fal.ai proxy for simpler API key auth (no JWT token management)
- [04-01]: ElevenLabs language text normalization omitted by default (latency concern)
- [04-01]: Provider health tracker is in-memory only (resets on server restart, acceptable for MVP)

### Pending Todos

- Run `ALTER TABLE campaigns REPLICA IDENTITY FULL;` for optimal Supabase Realtime (optional, polling works without it)
- Create `composited-images` bucket in Supabase Storage (public: true) for composited image uploads
- Create `platform-images` bucket in Supabase Storage (public: true) for platform-resized images
- Complete 04-USER-SETUP.md: configure Runway, ElevenLabs, fal.ai, HeyGen API keys and voice/avatar selections

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-02-09
Stopped at: Phase 4, Plan 1 complete (provider client modules). Next: 04-02 (pipeline orchestration).
Resume file: .planning/phases/04-video-audio-pipeline/04-02-PLAN.md
