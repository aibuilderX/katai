---
phase: 07-infrastructure-deployment-production-setup
plan: 02
subsystem: infra, api
tags: [vercel, nextjs, maxDuration, tokyo, hnd1, env-vars]

requires:
  - phase: 06-billing-compliance
    provides: All API routes that need timeout configuration
provides:
  - Vercel deployment configuration with Tokyo region
  - Function timeout exports on 4 long-running API routes
  - Complete environment variable reference
affects: [07-03, deployment]

tech-stack:
  added: []
  patterns: [Next.js route segment config for maxDuration, vercel.json regions]

key-files:
  created:
    - vercel.json
  modified:
    - src/app/api/campaigns/route.ts
    - src/app/api/webhooks/n8n/route.ts
    - src/app/api/webhooks/stripe/route.ts
    - src/app/api/campaigns/[id]/download/route.ts
    - .env.local.example

key-decisions:
  - "Route segment config exports (not vercel.json functions block) for maxDuration"
  - "DATABASE_URL default uses port 6543 (connection pooler) for production"
  - "22 env vars grouped by service with required/optional distinction"

patterns-established:
  - "maxDuration as route segment config export, not vercel.json"
  - ".env.local.example as single source of truth for all env vars"

duration: 3min
completed: 2026-02-09
---

# Plan 07-02: Vercel Config & Function Timeouts Summary

**vercel.json with Tokyo region, maxDuration on 4 API routes, and complete 22-variable env reference**

## Performance

- **Duration:** 3 min
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Created vercel.json with hnd1 (Tokyo) region for Japanese market latency
- Added maxDuration exports: campaigns 300s, n8n webhook 60s, Stripe webhook 30s, download 120s
- Expanded .env.local.example from 6 to 22 variables with clear service grouping
- Build passes with all changes

## Task Commits

1. **Task 1: vercel.json + maxDuration exports** - `15137fc` (feat)
2. **Task 2: .env.local.example update** - `15137fc` (feat)

## Files Created/Modified
- `vercel.json` - Vercel deployment config with Tokyo region
- `src/app/api/campaigns/route.ts` - maxDuration = 300 (5 min)
- `src/app/api/webhooks/n8n/route.ts` - maxDuration = 60 (1 min)
- `src/app/api/webhooks/stripe/route.ts` - maxDuration = 30
- `src/app/api/campaigns/[id]/download/route.ts` - maxDuration = 120 (2 min)
- `.env.local.example` - Complete 22-variable reference

## Decisions Made
- Used Next.js route segment config exports for maxDuration (not vercel.json functions block) to avoid App Router conflicts
- DATABASE_URL defaults to port 6543 (Supabase connection pooler) with comment about port 5432 for local dev
- n8n variables marked as optional with comment about direct generation fallback

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None.

## Next Phase Readiness
- Vercel config ready for deployment
- Env var reference complete for Plan 07-03 verification script

---
*Phase: 07-infrastructure-deployment-production-setup*
*Completed: 2026-02-09*
