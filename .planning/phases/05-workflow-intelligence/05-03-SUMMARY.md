---
phase: 05-workflow-intelligence
plan: 03
subsystem: api, ui, workflow
tags: [approval, ringi, state-machine, optimistic-locking, role-based-access]

# Dependency graph
requires:
  - phase: 05-workflow-intelligence
    plan: 01
    provides: "approvalWorkflows, approvalHistory schema tables, campaigns.approvalStatus column"
provides:
  - "Approval state machine with 6 states and role-based transition validation"
  - "POST /api/campaigns/[id]/approve endpoint with optimistic locking"
  - "GET /api/campaigns/[id]/approve endpoint for workflow + history retrieval"
  - "ApprovalPanel component with action buttons, comment input, history timeline"
  - "ApprovalStatusBadge component for colored status pills"
  - "Approval status badges on campaign list page"
affects: [05-workflow-intelligence]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Ringi-style approval workflow (creator -> reviewer -> approver)", "Optimistic locking with version column for concurrent approval prevention", "DB-driven state machine without external library"]

key-files:
  created:
    - "src/lib/workflows/approval.ts"
    - "src/app/api/campaigns/[id]/approve/route.ts"
    - "src/components/campaign/approval-panel.tsx"
    - "src/components/campaign/approval-status-badge.tsx"
  modified:
    - "src/app/(dashboard)/campaigns/[id]/page.tsx"
    - "src/app/(dashboard)/campaigns/[id]/campaign-detail-content.tsx"
    - "src/app/(dashboard)/campaigns/page.tsx"
    - "src/components/dashboard/campaign-card.tsx"

key-decisions:
  - "Direct transition from revision_requested/rejected to pending_review on submit (skips intermediate draft step for UX simplicity)"
  - "Approval panel shown only for complete/partial campaigns (not during generation)"
  - "History timeline collapsible by default to save sidebar space"
  - "GET endpoint on approve route for workflow + history retrieval with actor display names"

patterns-established:
  - "ApprovalStatusBadge: reusable colored pill component for approval status across pages"
  - "Role-based UI: validateApprovalAction used both server-side (API) and client-side (button visibility)"
  - "Optimistic locking pattern: version column in WHERE clause, 409 on conflict"

# Metrics
duration: 5min
completed: 2026-02-09
---

# Phase 5 Plan 3: Ringi Approval Workflow Summary

**Ringi-style approval workflow with 6-state DB-driven state machine, role-based actions, optimistic locking API, and full UI integration**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-09T06:39:20Z
- **Completed:** 2026-02-09T06:44:29Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Built approval state machine with 6 states (draft, pending_review, pending_approval, approved, rejected, revision_requested) and role-based transition validation
- Created API endpoint with optimistic locking to prevent concurrent approval race conditions
- Implemented approval panel UI with role-appropriate action buttons (editor: submit, admin: approve/reject/request revision) and history timeline
- Added approval status badges to campaign list page and campaign detail header

## Task Commits

Each task was committed atomically:

1. **Task 1: Create approval state machine and API endpoint** - `4e7e869` (feat)
2. **Task 2: Create approval UI components and integrate into campaign pages** - `4de30b1` (feat)

## Files Created/Modified
- `src/lib/workflows/approval.ts` - Approval state machine with types, transitions, validation, and Japanese labels
- `src/app/api/campaigns/[id]/approve/route.ts` - GET/POST endpoints for workflow retrieval and action execution with optimistic locking
- `src/components/campaign/approval-panel.tsx` - Full approval workflow UI with status display, action buttons, comment input, collapsible history timeline
- `src/components/campaign/approval-status-badge.tsx` - Colored pill badge component for approval status display
- `src/app/(dashboard)/campaigns/[id]/page.tsx` - Extended membership query to include role, passes approvalStatus and userRole to client component
- `src/app/(dashboard)/campaigns/[id]/campaign-detail-content.tsx` - Added ApprovalPanel in sidebar, ApprovalStatusBadge in header
- `src/app/(dashboard)/campaigns/page.tsx` - Extended campaign query to include approvalStatus, passes to CampaignCard
- `src/components/dashboard/campaign-card.tsx` - Added optional approvalStatus prop and renders ApprovalStatusBadge

## Decisions Made
- Direct transition from revision_requested/rejected to pending_review on submit (skips intermediate draft step for UX simplicity)
- Approval panel shown only for complete/partial campaigns (not during generation)
- History timeline collapsible by default to save sidebar space
- GET endpoint on approve route for workflow + history retrieval with actor display names

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Full ringi approval chain operational: creator submits, reviewer approves, final approver approves
- Approval state visible across campaign list and detail pages
- Optimistic locking prevents concurrent approval conflicts
- All build checks pass with zero errors

## Self-Check: PASSED

All 4 created files verified on disk. Both commits (4e7e869, 4de30b1) confirmed in git log. All 6 exports from approval.ts verified (ApprovalStatus, ApprovalAction, VALID_TRANSITIONS, canTransition, validateApprovalAction, APPROVAL_STATUS_LABELS). GET/POST handlers and optimistic locking version check confirmed. `pnpm build` passes with zero errors.

---
*Phase: 05-workflow-intelligence*
*Completed: 2026-02-09*
