# Phase 8: Infrastructure + Schema Foundation - Context

**Gathered:** 2026-02-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Ready the deployment environment, database schema, and error-handling architecture for the 7-agent pipeline. n8n 2.x with AI Agent nodes enabled, production Vercel deployment verified working, all schema tables (brand_memory, campaign_costs) and webhook interfaces required by later phases in place. Direct generation fallback marked deprecated.

</domain>

<decisions>
## Implementation Decisions

### Progress indicators
- Staged progress with 3-4 high-level milestones (not per-agent detail)
- Labels in Japanese, no agent internals exposed to users: 戦略分析中 → コンテンツ作成中 → アセット生成中 → パッケージング
- Elapsed time counter per stage (not estimated time) — honest, no promises about duration
- Checklist view: completed stages stay visible with checkmarks, active stage shows elapsed counter, pending stages shown as circles — gives sense of momentum during 2-5 min generation
- Progress data flows via Supabase Realtime (needed for error handling too)

### Failure & partial delivery
- Hybrid retry strategy: 1 silent auto-retry on provider failure, then deliver partial results with retry button if still failing
- Agent-specific failure handling:
  - **Critical-stop agents:** Strategic Insight and Creative Director — if these fail, pipeline stops. Their output IS the product's value proposition. Continuing with defaults produces generic output that undermines the product.
  - **Partial-delivery agents:** Copywriter, Art Director, JP Localization — if these fail, deliver what succeeded. User gets partial campaign with clear indication of what's missing.
- Quality gate: Strategic Insight output must pass schema check with minimum required fields before pipeline continues
- Friendly error messages in Japanese for critical-stop failures (only 2 messages needed):
  - Strategic Insight failure: explains analysis couldn't complete, suggests retry
  - Creative Director failure: explains creative direction couldn't be generated, suggests retry
- Video regeneration is async: campaign delivers copy+images immediately, video placeholder with "再生成" button, video arrives via Supabase Realtime when ready, ZIP updates to include video

### Cost tracking scope
- Purpose: internal ops monitoring now, schema supports user-facing transparency later
- Granularity: per-agent token usage AND per-provider API cost logged separately per campaign
- Data captured per agent call: agent name, model used, input tokens, output tokens, cost in yen
- Data captured per provider call: provider name, operation type, cost in yen, duration
- Campaign total aggregated from agent + provider subtotals
- Configurable cost alert threshold: log warning when campaign cost exceeds operator-set limit (e.g., ¥5,000) — operator-only, not user-facing
- No user-facing credit system or usage display in this phase — future concern

### Agent model assignment
- Quality-first approach: all agents default to Opus initially
- Model assignment configurable via environment variables (per-agent):
  - AGENT_STRATEGIC_INSIGHT_MODEL, AGENT_CREATIVE_DIRECTOR_MODEL, AGENT_COPYWRITER_MODEL, AGENT_ART_DIRECTOR_MODEL, AGENT_JP_LOCALIZATION_MODEL
  - Default fallback: Opus if env var not set
- Optimization to Sonnet for specific agents deferred to after testing with real cost data from per-agent tracking
- Env var approach enables A/B testing: run campaigns with different model tiers, compare output quality against per-agent costs

### Claude's Discretion
- Exact milestone-to-agent mapping for progress stages (which agents roll up into which milestone label)
- Loading animation style (spinner, pulse, skeleton)
- Schema design for campaign_costs table (columns, indexes, constraints)
- brand_memory table schema design
- Expanded webhook payload shape
- n8n 2.x upgrade approach (in-place vs fresh)
- Quality gate schema validation rules for Strategic Insight output
- Cost alert notification mechanism (log, email, webhook)

</decisions>

<specifics>
## Specific Ideas

- Progress should feel like momentum — each checkmark landing gives confidence the system is working
- Video regeneration must not block the user — they can download copy+images ZIP immediately while video catches up
- Cost tracking example cited: JP Localization critique loop (max 2 retries) can 3x that agent's cost — per-agent tracking catches this
- Error messages should be friendly Japanese, not technical — only 2 critical-stop messages needed (Strategic Insight and Creative Director)

</specifics>

<deferred>
## Deferred Ideas

- User-facing credit system / usage display — future phase after cost baseline established
- Pro mode toggle for detailed per-agent progress view — future enhancement
- Cost-based model tier optimization (moving specific agents to Sonnet) — after testing with real data
- Cost alerting via email/Slack notification — start with log warnings

</deferred>

---

*Phase: 08-infrastructure-schema-foundation*
*Context gathered: 2026-02-18*
