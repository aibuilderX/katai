---
phase: 01-foundation-core-pipeline
plan: 05
subsystem: campaign-results-ui
tags: [campaign-results, copy-variants, platform-preview, supabase-realtime, japanese-ui, shadcn-tabs]

dependency-graph:
  requires:
    - "01-01: Next.js scaffold, Supabase clients, Drizzle schema, constants, i18n"
    - "01-02: Auth, dashboard shell, sidebar navigation"
    - "01-03: Brand wizard, CRUD API, brand data model"
    - "01-04: Brief form, copy/image generation pipeline, campaigns API"
  provides:
    - "Campaign list page with grid layout and status filtering"
    - "Campaign detail page with copy + image tabs"
    - "Platform-adaptive variant cards with A/B comparison (A案~D案)"
    - "Copy-to-clipboard and favorite toggle on variant cards"
    - "Image grid with download and lightbox zoom"
    - "Campaign sidebar with brief summary and generation metadata"
    - "Real-time generation progress via Supabase Realtime"
    - "Campaign API: GET with full data, PATCH for favorites"
    - "Complete Phase 1 product loop: auth -> brand -> brief -> generate -> view results"
  affects:
    - "Phase 2: Text compositing (images displayed in image-tab.tsx)"
    - "Phase 3: Platform-specific formatting (variant cards adapt per platform)"
    - "Phase 5: Approval workflow (variant cards have favorite toggle, extensible to approval)"

tech-stack:
  added: []
  patterns:
    - "Supabase Realtime postgres_changes subscription for live progress"
    - "Server Component data fetching with Client Component interactive shell"
    - "Platform-adaptive card styling with gradient accents per platform"
    - "Optimistic UI for favorite toggle with API revert on failure"
    - "Fallback polling (5s) when Realtime not configured"

key-files:
  created:
    - "src/app/(dashboard)/campaigns/page.tsx"
    - "src/app/(dashboard)/campaigns/[id]/page.tsx"
    - "src/app/(dashboard)/campaigns/[id]/campaign-detail-content.tsx"
    - "src/app/api/campaigns/[id]/route.ts"
    - "src/components/campaign/copy-tab.tsx"
    - "src/components/campaign/image-tab.tsx"
    - "src/components/campaign/platform-selector.tsx"
    - "src/components/campaign/variant-card.tsx"
    - "src/components/campaign/campaign-sidebar.tsx"
    - "src/components/campaign/generation-progress.tsx"
    - "src/hooks/use-campaign-progress.ts"
  modified: []

decisions:
  - id: "server-then-client-pattern"
    decision: "Server Component fetches data, Client Component handles interactivity"
    rationale: "Campaign detail page uses Server Component for DB queries (auth, joins), passes serialized data to CampaignDetailContent client component for tabs and interactions"
  - id: "optimistic-favorite"
    decision: "Optimistic UI update for favorite toggle with revert on API failure"
    rationale: "Immediate feedback is critical for micro-interactions; reverts cleanly on error"
  - id: "fallback-polling"
    decision: "5-second polling fallback alongside Supabase Realtime"
    rationale: "Realtime requires REPLICA IDENTITY FULL on the table; polling ensures progress works even without this DB configuration"
  - id: "auto-refresh-on-complete"
    decision: "Auto-refresh page 1.5s after generation completes"
    rationale: "Shows brief success state then refreshes Server Component to re-fetch full results with copy variants and assets"

metrics:
  duration: "~8 minutes"
  completed: "2026-02-07"
---

# Phase 1 Plan 05: Campaign Results & Real-Time Progress Summary

**Campaign results pages with platform-adaptive A/B variant cards, copy-to-clipboard, image lightbox, real-time Supabase Realtime progress, and campaign sidebar -- completing the full Phase 1 product loop.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-02-07T16:29:36Z
- **Completed:** 2026-02-07T16:37:37Z
- **Tasks:** 2
- **Files created:** 11

## Accomplishments

- Complete campaign viewing experience: list page, detail page with copy + image tabs
- Platform-adaptive variant cards with A案~D案 warm-gold labels, copy-to-clipboard, favorite toggle
- Real-time generation progress via Supabase Realtime + fallback polling
- Full Phase 1 product loop functional: auth -> brand setup -> brief submission -> AI generation -> results viewing

## Task Commits

Each task was committed atomically:

1. **Task 1: Build campaign list and results page with copy/image tabs** - `3d0937a` (feat)
2. **Task 2: Add real-time generation progress with Supabase Realtime** - `2387c38` (feat)

## Files Created/Modified

- `src/app/(dashboard)/campaigns/page.tsx` - Campaign list with grid, status pills, empty state
- `src/app/(dashboard)/campaigns/[id]/page.tsx` - Server Component: fetches campaign data with auth
- `src/app/(dashboard)/campaigns/[id]/campaign-detail-content.tsx` - Client Component: tabs, progress, results layout
- `src/app/api/campaigns/[id]/route.ts` - GET (full campaign data), PATCH (favorite toggle)
- `src/components/campaign/copy-tab.tsx` - Platform selector + view toggle + variant grid
- `src/components/campaign/image-tab.tsx` - Image grid with download + lightbox zoom
- `src/components/campaign/platform-selector.tsx` - Horizontal icon pill row with warm-gold active state
- `src/components/campaign/variant-card.tsx` - Preview/text modes, copy-to-clipboard, favorite star
- `src/components/campaign/campaign-sidebar.tsx` - Brief summary, generation metadata, re-edit link
- `src/components/campaign/generation-progress.tsx` - Animated progress bar, step indicators, auto-refresh
- `src/hooks/use-campaign-progress.ts` - Supabase Realtime subscription + fallback polling

## Decisions Made

1. **Server-then-Client pattern**: Campaign detail page uses a Server Component for authenticated DB queries (campaign + brand + variants + assets joins), serializes data, and passes to a client component for interactive tabs, progress, and actions. This gives both fast server-side data access and rich client interactivity.

2. **Optimistic favorite toggle**: Favorite toggle updates UI immediately, sends PATCH to API, and reverts on error. This provides instant feedback for micro-interactions.

3. **Fallback polling alongside Realtime**: The useCampaignProgress hook subscribes to Supabase Realtime postgres_changes AND polls every 5 seconds. This ensures progress works even if REPLICA IDENTITY FULL is not set on the campaigns table.

4. **Auto-refresh on completion**: When generation completes, the page shows a brief "success" state for 1.5s then calls `router.refresh()` to re-run the Server Component and fetch the complete results data.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created campaign-detail-content.tsx client wrapper**
- **Found during:** Task 1
- **Issue:** Campaign detail page needs both Server Component data fetching and Client Component interactivity (tabs, progress, actions). Can't mix in a single component.
- **Fix:** Split into page.tsx (Server Component, fetches data) and campaign-detail-content.tsx (Client Component, renders interactive UI)
- **Files modified:** src/app/(dashboard)/campaigns/[id]/page.tsx, campaign-detail-content.tsx
- **Verification:** pnpm build passes, both server and client functionality work
- **Committed in:** 3d0937a

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Standard Next.js 16 pattern for mixing server data fetching with client interactivity. No scope creep.

## Issues Encountered

None - both tasks compiled and passed verification without unexpected issues.

## User Setup Required

For Supabase Realtime to deliver live progress updates (optional -- fallback polling works without this):

```sql
ALTER TABLE campaigns REPLICA IDENTITY FULL;
```

This is needed for Supabase Realtime to include updated column values in postgres_changes events.

## Next Phase Readiness

**Phase 1 is now complete.** The full product loop is functional:
1. User logs in (email/password or Google SSO)
2. User creates a brand profile (7-step wizard)
3. User submits a campaign brief (structured form with 8 fields)
4. AI generates copy (Claude) and images (Flux)
5. User views results: copy variants by platform, image grid, generation progress

Integration points for Phase 2+:
- Image tab displays base Flux images ready for text compositing (Phase 2)
- Copy variants stored per-platform for platform-specific formatting (Phase 3)
- Variant cards have favorite toggle, extensible to approval workflow (Phase 5)
- Campaign sidebar has "re-edit and regenerate" link ready for selective regeneration (Phase 5)

## Self-Check: PASSED

---
*Phase: 01-foundation-core-pipeline*
*Completed: 2026-02-07*
