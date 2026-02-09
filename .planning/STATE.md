# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-06)

**Core value:** A non-technical user submits a brief and receives a complete, download-ready campaign kit with correct Japanese copy and platform-compliant assets in under 5 minutes.
**Current focus:** Phase 6 complete. All 4 plans complete. System ready for production deployment.

## Current Position

Phase: 6 of 6 (Billing & Compliance)
Plan: 4 of 4 in current phase
Status: Complete
Last activity: 2026-02-09 -- Completed 06-04-PLAN.md

Progress: [████████████████████] 100% (Phase 6: 4/4 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 24
- Average duration: ~21 min
- Total execution time: ~513 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 | 5/5 | ~69 min | ~14 min |
| 2 | 4/4 | ~18 min | ~5 min |
| 3 | 4/4 | ~42 min | ~11 min |
| 4 | 3/3 | ~15 min | ~5 min |
| 5 | 3/3 | ~15 min | ~5 min |
| 6 | 4/4 | ~354 min | ~89 min |

**Recent Trend:**
- Last 5 plans: 05-02, 05-03, 06-01, 06-03, 06-04
- Note: Phase 6 plan 04 at ~346min (longest plan, includes checkpoint pause + bug fix)

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
- [04-02]: downloadToStorage defined locally in webhook handler (not shared utility) for scope management
- [04-02]: Video pipeline uses dynamic imports for all provider modules to keep initial bundle small
- [04-02]: Stage-specific JSONB merge for progress updates prevents race conditions between concurrent callbacks
- [04-02]: Video/audio ZIP entries fetched via Supabase Storage admin client (storage keys are paths, not URLs)
- [04-03]: Data-driven step labels via Record lookup table instead of nested switch statements for all 5 stage types
- [04-03]: VideoAsset metadata field accepts undefined for backward compatibility with pre-Phase4 assets
- [05-01]: Self-referencing parentCampaignId on campaigns instead of separate history table (simpler, avoids joins)
- [05-01]: Image regeneration cascades: delete composited + platform images, then re-run compositing and resize
- [05-01]: Regenerate button positioned at top-right for copy variants, bottom-right for base images
- [05-01]: Japanese cascade warning in image regeneration dialog
- [05-02]: Campaign templates as typed constants (not DB) -- 4 templates sufficient for MVP, no CRUD overhead
- [05-02]: BriefForm initialValues prop enables both template and clone pre-filling with same mechanism
- [05-02]: Clone API returns brief data only; actual creation reuses existing POST /api/campaigns
- [05-02]: QA agent temperature 0 for deterministic validation; trend agent temperature 0.3 for creative synthesis
- [05-02]: Trend insights not persisted to DB (displayed on-demand, no storage overhead)
- [05-02]: QA and trend endpoints bundled under /api/campaigns/[id]/qa (POST=QA, GET=trends)
- [05-03]: Direct transition from revision_requested/rejected to pending_review on submit (skips intermediate draft for UX)
- [05-03]: Approval panel shown only for complete/partial campaigns
- [05-03]: History timeline collapsible by default to save sidebar space
- [05-03]: GET endpoint on approve route for workflow + history retrieval with actor display names
- [06-01]: Atomic credit deduction using SQL WHERE credit_balance >= amount to prevent negative balances
- [06-01]: Credit ledger records balanceAfter for audit trail without recomputation
- [06-01]: Stripe singleton with descriptive error for missing env var
- [06-03]: Compliance prompt covers Keihyouhou and Yakki Ho with specific article references and prohibited expressions in Japanese
- [06-03]: Temperature 0 for deterministic compliance checking, mirroring QA agent pattern
- [06-02]: Stripe v20 SDK adaptation: period dates from SubscriptionItem, invoice subscription from parent.subscription_details
- [06-02]: Webhook returns 200 even on handler errors to prevent Stripe retry storms (errors logged for investigation)
- [06-02]: Checkout route creates Stripe customer on-demand if not already mapped
- [06-03]: Platform rule issues use platform field instead of category to distinguish from law-based issues
- [06-04]: Stripe client lazy initialization via Proxy pattern to prevent build-time crash when STRIPE_SECRET_KEY not set
- [06-04]: Free tier shown as "現在のプラン" when no active subscription
- [06-04]: Compliance panel only shown for complete/partial campaigns (same condition as QA and Approval panels)
- [06-04]: Credit gate deducts before campaign creation (no rollback for MVP)

### Pending Todos

- Run `ALTER TABLE campaigns REPLICA IDENTITY FULL;` for optimal Supabase Realtime (optional, polling works without it)
- Create `composited-images` bucket in Supabase Storage (public: true) for composited image uploads
- Create `platform-images` bucket in Supabase Storage (public: true) for platform-resized images
- Create `campaign-videos` bucket in Supabase Storage (public: true) for video asset storage
- Create `campaign-audio` bucket in Supabase Storage (public: true) for audio asset storage
- Complete 04-USER-SETUP.md: configure Runway, ElevenLabs, fal.ai, HeyGen API keys and voice/avatar selections
- Configure Stripe: API keys, webhook secret, create 3 subscription products (Starter/Pro/Business) with JPY prices, enable Customer Portal

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-02-09
Stopped at: Completed 06-04-PLAN.md. Phase 6 complete. All phases complete. System ready for production deployment.
Resume file: .planning/phases/06-billing-compliance/06-04-SUMMARY.md
