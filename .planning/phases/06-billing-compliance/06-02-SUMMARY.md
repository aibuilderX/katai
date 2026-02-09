---
phase: 06-billing-compliance
plan: 02
subsystem: payments, api
tags: [stripe, webhooks, checkout, billing-portal, credits, jpn-currency, subscription-lifecycle]

# Dependency graph
requires:
  - phase: 06-billing-compliance
    plan: 01
    provides: "Billing schema (stripeCustomers, subscriptions, creditLedger), Stripe client singleton, tier definitions, credit operations, cost estimation"
  - phase: 01-foundation-core-pipeline
    provides: "Database schema (teams, profiles, teamMembers), drizzle-orm setup, Supabase auth pattern"
provides:
  - "Stripe webhook handler with signature verification and event dispatch"
  - "Subscription sync handlers (checkout complete, subscription change, invoice paid)"
  - "Checkout session creation API with Stripe customer lookup/creation"
  - "Customer portal session API for self-service subscription management"
  - "Credit balance and history API endpoint"
  - "Campaign cost estimation API with affordability check"
affects: [06-03, 06-04]

# Tech tracking
tech-stack:
  added: []
  patterns: [stripe-webhook-signature-verification, stripe-v20-subscription-item-period, invoice-parent-subscription-access]

key-files:
  created:
    - src/app/api/webhooks/stripe/route.ts
    - src/lib/stripe/sync.ts
    - src/app/api/billing/checkout/route.ts
    - src/app/api/billing/portal/route.ts
    - src/app/api/billing/credits/route.ts
    - src/app/api/billing/estimate/route.ts
  modified: []

key-decisions:
  - "Stripe v20 SDK adaptation: period dates from SubscriptionItem, invoice subscription from parent.subscription_details"
  - "Webhook returns 200 even on handler errors to prevent Stripe retry storms (errors logged for investigation)"
  - "Checkout route creates Stripe customer on-demand if not already mapped"

patterns-established:
  - "Stripe webhook pattern: request.text() for raw body, constructEvent for signature, switch dispatch to typed handlers"
  - "Stripe v20 period access: getSubscriptionPeriod() helper reads from items.data[0].current_period_start/end"
  - "Billing API auth pattern: createClient -> getUser -> find teamMembers -> business logic"

# Metrics
duration: 5min
completed: 2026-02-09
---

# Phase 6 Plan 02: Stripe API Routes Summary

**Stripe webhook handler with signature verification, subscription sync (checkout/change/invoice), and 4 billing API endpoints (checkout, portal, credits, estimate)**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-09T07:45:48Z
- **Completed:** 2026-02-09T07:51:11Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Created Stripe webhook endpoint with signature verification dispatching to checkout, subscription, and invoice handlers
- Built subscription sync logic handling full lifecycle: initial checkout, plan changes, cancellation, and monthly renewal credit grants
- Implemented 4 billing API routes: checkout session creation, customer portal redirect, credit balance/history, and cost estimation with affordability flag
- Adapted all Stripe types for v20 SDK (period dates on SubscriptionItem, subscription reference via invoice.parent)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Stripe webhook handler and sync logic** - `106eb71` (feat)
2. **Task 2: Create billing API routes (checkout, portal, credits, estimate)** - `0b2639e` (feat)

## Files Created/Modified
- `src/app/api/webhooks/stripe/route.ts` - Webhook endpoint with signature verification and event dispatch
- `src/lib/stripe/sync.ts` - Subscription sync handlers: handleCheckoutComplete, handleSubscriptionChange, handleInvoicePaid
- `src/app/api/billing/checkout/route.ts` - POST: create Stripe Checkout session with customer lookup/creation
- `src/app/api/billing/portal/route.ts` - POST: create Stripe Customer Portal session
- `src/app/api/billing/credits/route.ts` - GET: team credit balance and transaction history
- `src/app/api/billing/estimate/route.ts` - POST: campaign cost estimation with affordability check

## Decisions Made
- Adapted for Stripe v20 SDK: `current_period_start/end` moved from Subscription to SubscriptionItem; `invoice.subscription` replaced by `invoice.parent.subscription_details.subscription`
- Webhook handler returns 200 even on handler errors to prevent Stripe retry storms; errors are logged for investigation
- Checkout route creates a Stripe customer on first subscription attempt if no mapping exists yet

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Stripe v20 SDK type compatibility for period dates and invoice subscription**
- **Found during:** Task 1 (Stripe webhook sync logic)
- **Issue:** Plan specified `subscription.current_period_start` and `invoice.subscription` which no longer exist in Stripe SDK v20.3.1 -- these properties were moved/restructured
- **Fix:** Created `getSubscriptionPeriod()` helper reading from `items.data[0].current_period_start/end` and `getInvoiceSubscriptionId()` accessing `invoice.parent.subscription_details.subscription`
- **Files modified:** src/lib/stripe/sync.ts
- **Verification:** `npx tsc --noEmit` compiles clean with zero errors
- **Committed in:** 106eb71 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Essential adaptation for installed Stripe SDK version. No scope creep.

## Issues Encountered
None beyond the Stripe v20 type changes documented above.

## Next Phase Readiness
- Webhook handler ready to receive Stripe events (needs STRIPE_WEBHOOK_SECRET configured)
- Checkout/portal routes ready for frontend billing page integration
- Credits and estimate endpoints ready for campaign creation flow integration
- All routes compile clean and follow established auth patterns

## Self-Check: PASSED

All 6 files verified present. Both task commits (106eb71, 0b2639e) verified in git log.

---
*Phase: 06-billing-compliance*
*Completed: 2026-02-09*
