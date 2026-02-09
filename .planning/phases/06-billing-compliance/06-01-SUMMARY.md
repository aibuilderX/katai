---
phase: 06-billing-compliance
plan: 01
subsystem: payments, database
tags: [stripe, drizzle, credits, billing, compliance, jpn-currency]

# Dependency graph
requires:
  - phase: 01-foundation-core-pipeline
    provides: "Database schema (teams, profiles, campaigns tables), drizzle-orm setup"
provides:
  - "Billing schema tables: stripeCustomers, subscriptions, creditLedger, complianceReports"
  - "teams.creditBalance column for atomic credit operations"
  - "Stripe client singleton and price ID config"
  - "Tier definitions (Free/Starter/Pro/Business) with JPY pricing"
  - "Credit ledger operations (check, deduct, grant, history)"
  - "Campaign cost estimation from brief parameters"
  - "ComplianceIssue TypeScript interface"
affects: [06-02, 06-03, 06-04]

# Tech tracking
tech-stack:
  added: [stripe@20.3.1]
  patterns: [atomic-credit-deduction, tier-config-constants, stripe-singleton]

key-files:
  created:
    - src/lib/stripe/client.ts
    - src/lib/stripe/config.ts
    - src/lib/billing/tiers.ts
    - src/lib/billing/credits.ts
    - src/lib/billing/estimate.ts
  modified:
    - src/lib/db/schema.ts

key-decisions:
  - "Atomic credit deduction using SQL WHERE credit_balance >= amount to prevent negative balances"
  - "Credit ledger records balanceAfter for audit trail without recomputation"
  - "Stripe singleton with descriptive error for missing env var"

patterns-established:
  - "Atomic credit deduction: UPDATE WHERE balance >= amount pattern prevents race conditions"
  - "Tier lookup: getTierById and getTierByPriceId for bi-directional tier resolution"
  - "Cost estimation: per-component credit breakdown for transparent pricing"

# Metrics
duration: 5min
completed: 2026-02-09
---

# Phase 6 Plan 01: Billing Foundation Summary

**Stripe billing schema with 4 tables, atomic credit ledger, 4-tier JPY pricing, and campaign cost estimation**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-09T07:27:06Z
- **Completed:** 2026-02-09T07:32:53Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Extended database schema with stripeCustomers, subscriptions, creditLedger, and complianceReports tables plus creditBalance on teams
- Created Stripe client singleton with env var validation and price ID config mapping
- Defined 4 subscription tiers (Free/Starter/Pro/Business) with JPY pricing, credit allocations, and feature gates
- Implemented atomic credit deduction preventing negative balances, plus grant, balance check, and history operations
- Built campaign cost estimation calculating per-component credit breakdown from brief parameters

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend database schema with billing tables and creditBalance** - `0a6db76` (feat)
2. **Task 2: Create Stripe client, config, tier definitions, credit operations, and cost estimation** - `eb88960` (feat)

## Files Created/Modified
- `src/lib/db/schema.ts` - Added creditBalance to teams, 4 new billing/compliance tables, ComplianceIssue interface
- `src/lib/stripe/client.ts` - Stripe server singleton with env var guard
- `src/lib/stripe/config.ts` - Price ID mapping, reverse tier lookup, APP_URL constant
- `src/lib/billing/tiers.ts` - 4-tier config with JPY pricing, feature arrays, lookup functions, formatJPY
- `src/lib/billing/credits.ts` - Atomic credit deduction, grant, balance check, transaction history
- `src/lib/billing/estimate.ts` - Campaign cost estimation from brief parameters

## Decisions Made
- Atomic credit deduction using SQL `WHERE credit_balance >= amount` to prevent negative balances in concurrent scenarios
- Credit ledger records `balanceAfter` for each transaction enabling audit trail without recomputation
- Stripe singleton throws descriptive error with setup instructions when STRIPE_SECRET_KEY is missing
- ComplianceIssue interface uses typed JSONB columns for keihyouhou, yakkiho, and platform rule results

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed missing stripe npm package**
- **Found during:** Pre-task setup
- **Issue:** `stripe` package not in package.json dependencies, required for client.ts
- **Fix:** Ran `pnpm add stripe` (project uses pnpm, not npm)
- **Files modified:** package.json, pnpm-lock.yaml
- **Verification:** Import succeeds, TypeScript compiles clean
- **Committed in:** eb88960 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Essential dependency installation. No scope creep.

## Issues Encountered
- npm install failed due to expired auth token and missing package-lock.json; resolved by using pnpm (the actual package manager for the project)

## User Setup Required

**External services require manual configuration.** The plan's `user_setup` section specifies Stripe configuration:
- `STRIPE_SECRET_KEY` - Stripe Dashboard -> Developers -> API keys
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe Dashboard -> Developers -> API keys
- `STRIPE_WEBHOOK_SECRET` - From `stripe listen` CLI command
- `STRIPE_STARTER_PRICE_ID`, `STRIPE_PRO_PRICE_ID`, `STRIPE_BUSINESS_PRICE_ID` - Create 3 products in Stripe Dashboard
- Enable Customer Portal in Stripe Dashboard

## Next Phase Readiness
- Schema foundation ready for Plans 02-04 (checkout, webhooks, compliance API)
- Stripe client singleton available for API route usage
- Tier and credit operations ready for subscription lifecycle management
- Cost estimation ready for pre-generation credit checks

## Self-Check: PASSED

All 6 files verified present. Both task commits (0a6db76, eb88960) verified in git log.

---
*Phase: 06-billing-compliance*
*Completed: 2026-02-09*
