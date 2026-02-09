---
phase: 05-workflow-intelligence
plan: 02
subsystem: ai, api, ui, templates
tags: [claude-api, structured-output, keigo, qa-validation, trend-analysis, campaign-templates, campaign-clone]

# Dependency graph
requires:
  - phase: 01-foundation-core-pipeline
    provides: "campaigns, copyVariants, assets tables, BriefForm, Claude API client"
  - phase: 05-workflow-intelligence
    plan: 01
    provides: "qaReports schema table, parentCampaignId/templateId on campaigns, regeneration patterns"
provides:
  - "4 typed JP campaign templates with brief form defaults (seasonal, flash sale, new product, brand awareness)"
  - "TemplatePicker component for template selection before brief form"
  - "POST /api/campaigns/[id]/clone endpoint for campaign re-run"
  - "Clone & Re-run button on campaign detail header"
  - "QA validation agent (runQAValidation) with structured tool output"
  - "Trend analysis agent (analyzeTrends) with structured tool output"
  - "POST /api/campaigns/[id]/qa for QA validation trigger"
  - "GET /api/campaigns/[id]/qa for trend analysis trigger"
  - "QAReportPanel sidebar component with score badge and issue breakdown"
  - "TrendInsightsCard sidebar component with trends, seasonal tags, hashtags"
affects: [05-workflow-intelligence, 06-analytics-billing]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Campaign templates as typed constants (not DB)", "Claude structured tool output for validation agents", "On-demand AI analysis triggered from sidebar"]

key-files:
  created:
    - "src/lib/templates/jp-campaign-templates.ts"
    - "src/components/brief/template-picker.tsx"
    - "src/app/api/campaigns/[id]/clone/route.ts"
    - "src/lib/ai/prompts/qa-validation.ts"
    - "src/lib/ai/prompts/trend-analysis.ts"
    - "src/lib/ai/qa-agent.ts"
    - "src/lib/ai/trend-agent.ts"
    - "src/app/api/campaigns/[id]/qa/route.ts"
    - "src/components/campaign/qa-report-panel.tsx"
    - "src/components/campaign/trend-insights-card.tsx"
  modified:
    - "src/app/(dashboard)/campaigns/new/page.tsx"
    - "src/components/brief/brief-form.tsx"
    - "src/app/(dashboard)/campaigns/[id]/campaign-detail-content.tsx"

key-decisions:
  - "Campaign templates stored as typed constants (not in DB) -- 4 templates sufficient for MVP, no CRUD overhead"
  - "BriefForm accepts initialValues prop for both template and clone pre-filling"
  - "Clone API returns brief data only (not full campaign) -- actual creation uses existing POST /api/campaigns"
  - "QA agent uses temperature 0 for deterministic validation; trend agent uses 0.3 for creative synthesis"
  - "Trend insights not persisted to DB (displayed on-demand, no storage overhead)"
  - "Both QA and trend endpoints bundled under /api/campaigns/[id]/qa (POST=QA, GET=trends)"

patterns-established:
  - "Template picker as pre-form step: select template -> form auto-fills -> user modifies -> submits"
  - "AI validation agent pattern: fetch context from DB, build prompt, call Claude with forced tool_choice, return structured result"
  - "Sidebar on-demand AI panel: button triggers analysis, loading state, display results inline"

# Metrics
duration: 6min
completed: 2026-02-09
---

# Phase 5 Plan 2: Templates, Campaign Clone, QA Agent & Trend Agent Summary

**4 JP campaign templates with picker UI, campaign clone API with re-run button, Claude-powered QA validation for keigo/brand compliance, and trend analysis agent with structured insights**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-09T06:39:18Z
- **Completed:** 2026-02-09T06:45:35Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments
- Created 4 typed Japanese campaign templates (seasonal, flash sale, new product, brand awareness) with pre-filled brief defaults
- Built template picker UI with card grid shown before the brief form on campaigns/new page
- Implemented campaign clone API returning parent brief data, with "Clone & Re-run" button on campaign detail
- Built QA validation agent using Claude with structured tool output to check keigo consistency and brand compliance
- Built trend analysis agent synthesizing JP market trends from Claude (no external API)
- Created QA report panel showing quality score, keigo issues, and brand compliance issues in the sidebar
- Created trend insights card showing trend recommendations, seasonal tags, and hashtag suggestions

## Task Commits

Each task was committed atomically:

1. **Task 1: Create brief templates and campaign clone/history** - `99fc62a` (feat)
2. **Task 2: Create QA validation agent and Trend analysis agent** - `e68b704` (feat)

## Files Created/Modified
- `src/lib/templates/jp-campaign-templates.ts` - 4 typed JP campaign templates with CampaignTemplate interface
- `src/components/brief/template-picker.tsx` - Template selection cards in 2x3 grid with blank option
- `src/app/(dashboard)/campaigns/new/page.tsx` - Template picker step before brief form, clone query param support
- `src/components/brief/brief-form.tsx` - Added initialValues prop and parentCampaignId tracking
- `src/app/api/campaigns/[id]/clone/route.ts` - POST endpoint returning parent campaign brief for cloning
- `src/app/(dashboard)/campaigns/[id]/campaign-detail-content.tsx` - Clone button, QA panel, trend card in sidebar
- `src/lib/ai/prompts/qa-validation.ts` - QA system/user prompts with keigo register definitions
- `src/lib/ai/prompts/trend-analysis.ts` - Trend system/user prompts with seasonal context
- `src/lib/ai/qa-agent.ts` - QA validation via Claude with deliver_qa_report tool, stores in qaReports table
- `src/lib/ai/trend-agent.ts` - Trend analysis via Claude with deliver_trend_insights tool
- `src/app/api/campaigns/[id]/qa/route.ts` - POST for QA validation, GET for trend analysis
- `src/components/campaign/qa-report-panel.tsx` - QA report display with score badge and issue lists
- `src/components/campaign/trend-insights-card.tsx` - Trend insights with tags and hashtags

## Decisions Made
- Campaign templates as typed constants (not DB-backed) -- simpler for MVP, no admin UI needed
- BriefForm initialValues prop enables both template pre-filling and clone pre-filling with same mechanism
- Clone API returns brief data only; actual campaign creation reuses existing POST /api/campaigns flow
- QA agent at temperature 0 for deterministic validation; trend agent at temperature 0.3 for creativity
- Trend insights are ephemeral (not persisted to DB) -- regenerated on-demand each time
- QA and trend endpoints share /api/campaigns/[id]/qa route (POST=QA, GET=trends) to minimize route proliferation

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. QA and trend agents use the existing ANTHROPIC_API_KEY.

## Next Phase Readiness
- All brief templates, clone, QA, and trend features are functional
- QA reports persist to qaReports table for audit trail
- Trend insights are on-demand (no persistence, no cost when unused)
- Ready for plan 03 (remaining workflow intelligence features)
- Build passes with zero errors

## Self-Check: PASSED

All 13 files verified on disk. Both commits (99fc62a, e68b704) confirmed in git log. Template exports (JP_CAMPAIGN_TEMPLATES, CampaignTemplate), agent exports (runQAValidation, analyzeTrends), API handlers (POST clone, POST/GET qa), and UI components (TemplatePicker, QAReportPanel, TrendInsightsCard) all verified present. `pnpm build` passes with zero errors.

---
*Phase: 05-workflow-intelligence*
*Completed: 2026-02-09*
