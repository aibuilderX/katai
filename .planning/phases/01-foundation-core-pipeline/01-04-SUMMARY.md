---
phase: 01-foundation-core-pipeline
plan: 04
subsystem: brief-form-ai-pipeline
tags: [campaign-brief, claude-api, flux-api, n8n-webhook, hmac, structured-output, japanese-copy, keigo]

dependency-graph:
  requires:
    - "01-01: Next.js scaffold, Supabase clients, schema, constants, i18n"
    - "01-02: Auth, dashboard shell, sidebar navigation"
  provides:
    - "Campaign brief submission form with 8 structured fields"
    - "Platform grid with all 11 supported platforms"
    - "Keigo register override per campaign"
    - "Creative direction with mood tags + free text + reference image"
    - "Claude API client for structured 4-variant copy generation"
    - "Flux 1.1 Pro Ultra API client with async submit+poll"
    - "n8n webhook handler with HMAC-SHA256 verification"
    - "Direct generation fallback (no n8n required for dev)"
    - "Campaign creation API with n8n webhook trigger"
    - "Brands listing API for form population"
  affects:
    - "01-05: Campaign results page (uses campaigns, copyVariants, assets tables)"
    - "Phase 2: Text compositing (uses generated base images from Flux)"
    - "Phase 3: Platform-specific formatting (uses copy variants per platform)"
    - "Phase 5: n8n workflow enhancements (uses webhook handler)"

tech-stack:
  added:
    - "@anthropic-ai/sdk@0.73.0"
  patterns:
    - "Claude tool-based structured output with tool_choice forced"
    - "Flux async submit + poll pattern (2s interval, 60s timeout)"
    - "HMAC-SHA256 webhook signature with timing-safe comparison"
    - "Direct generation fallback when N8N_WEBHOOK_URL unset"
    - "Dynamic import for AI modules in fallback path"

key-files:
  created:
    - "src/components/brief/brief-form.tsx"
    - "src/components/brief/platform-grid.tsx"
    - "src/components/brief/keigo-override.tsx"
    - "src/components/brief/creative-direction.tsx"
    - "src/app/(dashboard)/campaigns/new/page.tsx"
    - "src/app/api/campaigns/route.ts"
    - "src/app/api/brands/route.ts"
    - "src/lib/ai/claude.ts"
    - "src/lib/ai/flux.ts"
    - "src/lib/ai/prompts/copy-generation.ts"
    - "src/lib/ai/prompts/image-generation.ts"
    - "src/app/api/webhooks/n8n/route.ts"
  modified:
    - "package.json (@anthropic-ai/sdk added)"

decisions:
  - id: "sequential-image-generation"
    decision: "Generate Flux images sequentially, not in parallel"
    rationale: "Avoids rate limiting; acceptable for Phase 1 performance"
  - id: "dynamic-import-ai"
    decision: "Use dynamic import() for AI modules in direct generation fallback"
    rationale: "Avoids bundling AI SDKs into campaign route when n8n is configured"
  - id: "store-flux-url-directly"
    decision: "Store Flux image URLs directly in assets table (no Supabase Storage upload in Phase 1)"
    rationale: "Simplifies Phase 1; Supabase Storage upload will be added when persistent storage is needed"
  - id: "english-image-prompts"
    decision: "Image prompts are written in English, no Japanese text"
    rationale: "Flux performs better with English prompts; Japanese text compositing is Phase 2"

metrics:
  duration: "~11 minutes"
  completed: "2026-02-07"
---

# Phase 1 Plan 04: Brief Form & AI Generation Pipeline Summary

**Structured campaign brief form with 8 fields (Japanese-only), Claude API for 4-variant keigo-controlled copy, Flux 1.1 Pro Ultra for base images, and n8n webhook handler with HMAC-SHA256 verification.**

## Performance

- **Duration:** ~11 min
- **Started:** 2026-02-07T16:05:01Z
- **Completed:** 2026-02-07T16:16:15Z
- **Tasks:** 2
- **Files created:** 12

## Accomplishments

- Complete campaign brief form with 8 structured fields (brand, name, objective, audience, platforms, keigo, creative direction, product info)
- Claude copy generation producing exactly 4 A/B variants with keigo register control and tri-script mixing guidelines
- Flux image generation via async submit + poll with prompt variations for visual diversity
- n8n webhook handler with HMAC-SHA256 signature verification and timing-safe comparison
- Direct generation fallback that works without n8n configured

## Task Commits

Each task was committed atomically:

1. **Task 1: Build campaign brief submission form** - `3d41479` (feat)
2. **Task 2: Build AI generation pipeline (Claude + Flux + n8n webhook handler)** - `3eb7938` (feat)

## Files Created/Modified

- `src/components/brief/brief-form.tsx` - Main brief form with 8 fields, validation, submit to /api/campaigns
- `src/components/brief/platform-grid.tsx` - Visual icon grid for 11 platforms with multi-select
- `src/components/brief/keigo-override.tsx` - 3 register cards with brand default indicator
- `src/components/brief/creative-direction.tsx` - Mood tags + free text + reference image dropzone
- `src/app/(dashboard)/campaigns/new/page.tsx` - Page wrapper with breadcrumb and title
- `src/app/api/campaigns/route.ts` - GET (list) + POST (create + trigger generation) with HMAC webhook
- `src/app/api/brands/route.ts` - GET brands for brief form dropdown
- `src/lib/ai/claude.ts` - Claude API client, model claude-sonnet-4-5-20250514, temp 0.2, tool-based structured output
- `src/lib/ai/flux.ts` - Flux API client, async submit + poll, 60s timeout, sequential image generation
- `src/lib/ai/prompts/copy-generation.ts` - System + user prompts with keigo register instructions and few-shot examples
- `src/lib/ai/prompts/image-generation.ts` - Image prompts in English with mood-to-visual mapping, no Japanese text
- `src/app/api/webhooks/n8n/route.ts` - HMAC-verified webhook handler, persists copy variants + assets

## Decisions Made

1. **Sequential Flux image generation**: Images generated one at a time to avoid BFL API rate limiting. Acceptable for Phase 1; can parallelize later if needed.

2. **Dynamic AI module imports**: The direct generation fallback uses `await import()` for Claude/Flux modules to avoid bundling them into the campaign route when n8n handles generation.

3. **Store Flux URLs directly**: In Phase 1, Flux image URLs are stored in the assets table without downloading to Supabase Storage. This simplifies the implementation; persistent storage upload will be added when image URLs expire.

4. **English image prompts**: All Flux prompts are written in English (Flux performs best with English). Japanese text rendering on images is handled by server-side compositing in Phase 2.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created AI module stubs for Task 1 build pass**
- **Found during:** Task 1 (brief form + campaigns API)
- **Issue:** campaigns/route.ts has dynamic imports to `@/lib/ai/claude` and `@/lib/ai/flux` which don't exist yet (Task 2)
- **Fix:** Created minimal stub files for claude.ts and flux.ts that export the correct function signatures but throw "not implemented" errors
- **Files modified:** src/lib/ai/claude.ts, src/lib/ai/flux.ts (stubs, replaced in Task 2)
- **Verification:** `pnpm build` passes with stubs
- **Committed in:** 3d41479 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Minimal - stubs were immediately replaced by full implementations in Task 2. No scope creep.

## Issues Encountered

None - both tasks compiled and passed verification without unexpected issues.

## User Setup Required

The following environment variables must be configured for AI generation to work:

- `ANTHROPIC_API_KEY` - Anthropic Console -> API Keys (required for copy generation)
- `BFL_API_KEY` - BFL API Dashboard -> API Keys (required for image generation)
- `N8N_WEBHOOK_URL` - n8n workflow webhook URL (optional - direct fallback available)
- `N8N_WEBHOOK_SECRET` - HMAC secret for webhook signing (create with `openssl rand -hex 32`)

These were already listed in `.env.local.example` from Plan 01.

## Next Phase Readiness

Ready for Plan 05 (Campaign Results UI):
- Campaign creation API returns `{ id }` for redirect to `/campaigns/[id]`
- Copy variants and assets tables populated by either n8n webhook or direct generation
- Campaign status tracking (pending/generating/complete/failed/partial)
- Brief form submits and triggers the full pipeline

Integration points for future phases:
- Phase 2: Base images from Flux ready for text compositing overlay
- Phase 3: Copy variants stored per-platform for platform-specific formatting
- Phase 5: n8n webhook handler ready for enhanced workflow callbacks

## Self-Check: PASSED

---
*Phase: 01-foundation-core-pipeline*
*Completed: 2026-02-07*
