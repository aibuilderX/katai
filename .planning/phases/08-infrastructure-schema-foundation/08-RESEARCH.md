# Phase 8: Infrastructure + Schema Foundation - Research

**Researched:** 2026-02-18
**Domain:** n8n 2.x upgrade, Drizzle ORM schema additions, Supabase Realtime progress architecture, Vercel production verification
**Confidence:** HIGH

## Summary

Phase 8 is foundational infrastructure work with well-understood technologies. The existing v1.0 codebase (Next.js 16, Drizzle ORM 0.45.x, Supabase, n8n) provides clear extension points for all Phase 8 deliverables. The primary tasks are: (1) upgrading n8n from 1.x to 2.x with AI Agent nodes enabled, (2) adding two new Drizzle schema tables (`brand_memory`, `campaign_costs`) plus expanding the webhook payload shape, (3) verifying v1.0 production deployment on Vercel, and (4) marking `runDirectGeneration` as deprecated.

The n8n 2.x upgrade has documented breaking changes (Start node removal, environment variable access restrictions in Code nodes, Draft/Publish workflow model) but these are manageable since the existing n8n instance runs simple webhook-triggered workflows. The Drizzle schema additions follow established patterns already in use across the codebase's 14 existing tables. The Supabase Realtime infrastructure is already configured (REPLICA IDENTITY FULL on campaigns table, realtime publication) and the progress hook (`useCampaignProgress`) is already implemented with both Realtime subscription and polling fallback.

**Primary recommendation:** Execute in three sequential plans: (1) n8n upgrade + env var configuration, (2) database schema + webhook payload expansion, (3) v1.0 verification + deprecation marking. All three use established patterns from the existing codebase.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Staged progress with 3-4 high-level milestones (not per-agent detail)
- Labels in Japanese, no agent internals exposed to users: 戦略分析中 → コンテンツ作成中 → アセット生成中 → パッケージング
- Elapsed time counter per stage (not estimated time)
- Checklist view: completed stages stay visible with checkmarks, active stage shows elapsed counter, pending stages shown as circles
- Progress data flows via Supabase Realtime
- Hybrid retry strategy: 1 silent auto-retry on provider failure, then deliver partial results with retry button
- Critical-stop agents: Strategic Insight and Creative Director (pipeline stops if these fail)
- Partial-delivery agents: Copywriter, Art Director, JP Localization (deliver what succeeded)
- Quality gate: Strategic Insight output must pass schema check with minimum required fields
- Friendly error messages in Japanese for critical-stop failures (only 2 messages needed)
- Video regeneration is async: campaign delivers copy+images immediately, video placeholder with "再生成" button
- Cost tracking: internal ops monitoring now, schema supports user-facing transparency later
- Per-agent token usage AND per-provider API cost logged separately per campaign
- Data captured per agent call: agent name, model used, input tokens, output tokens, cost in yen
- Data captured per provider call: provider name, operation type, cost in yen, duration
- Campaign total aggregated from agent + provider subtotals
- Configurable cost alert threshold: log warning when campaign cost exceeds operator-set limit
- Quality-first approach: all agents default to Opus initially
- Model assignment configurable via environment variables (per-agent): AGENT_STRATEGIC_INSIGHT_MODEL, AGENT_CREATIVE_DIRECTOR_MODEL, AGENT_COPYWRITER_MODEL, AGENT_ART_DIRECTOR_MODEL, AGENT_JP_LOCALIZATION_MODEL
- Default fallback: Opus if env var not set

### Claude's Discretion
- Exact milestone-to-agent mapping for progress stages (which agents roll up into which milestone label)
- Loading animation style (spinner, pulse, skeleton)
- Schema design for campaign_costs table (columns, indexes, constraints)
- brand_memory table schema design
- Expanded webhook payload shape
- n8n 2.x upgrade approach (in-place vs fresh)
- Quality gate schema validation rules for Strategic Insight output
- Cost alert notification mechanism (log, email, webhook)

### Deferred Ideas (OUT OF SCOPE)
- User-facing credit system / usage display -- future phase after cost baseline established
- Pro mode toggle for detailed per-agent progress view -- future enhancement
- Cost-based model tier optimization (moving specific agents to Sonnet) -- after testing with real data
- Cost alerting via email/Slack notification -- start with log warnings
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ORCH-01 | n8n upgraded to 2.x with AI Agent nodes enabled and Draft/Publish workflow model | n8n 2.9.0 is current stable (Feb 2026). AI Agent nodes are built-in (no N8N_AI_ENABLED flag needed in 2.x -- they are standard nodes). Draft/Publish is default behavior in 2.x. Breaking changes documented and manageable. |
| ORCH-03 | Structured PipelineState JSON object accumulates each agent's output through the pipeline | Schema design for PipelineState type goes in expanded webhook payload and progress tracking. Drizzle JSONB `$type<>()` pattern established in codebase. |
| ORCH-10 | Each agent sub-workflow handles errors gracefully (Continue On Fail) without killing the full pipeline | Error handling architecture: campaign_costs tracks per-agent failures. CampaignProgress type needs expansion for agent-level status. n8n Continue On Fail is per-node setting. |
| ORCH-11 | Dashboard shows per-agent progress updates during campaign generation via Supabase Realtime | Existing `useCampaignProgress` hook + Supabase Realtime already configured. Need expanded CampaignProgress type with milestone-based stages (not per-agent detail per user decision). |
| ORCH-12 | Pipeline delivers partial results when individual agents fail (video failure does not block copy/image delivery) | Error handling schema: campaigns.status already supports 'partial'. ErrorEntry[] type exists. Need agent-specific failure tracking in campaign_costs. |
| ORCH-13 | Agent scratchpad pattern passes only structured JSON summaries between agents (not full reasoning chains) | PipelineState type design: each agent writes a structured summary section. Schema validation ensures minimum fields before pipeline continues. |
| ORCH-14 | Tiered model assignment (Opus for Orchestrator/Strategic/Localization, Sonnet for Copywriter/Art Director) | User overrode this: all default to Opus initially, configurable via per-agent env vars. Schema supports storing model_used per agent call in campaign_costs. |
| ORCH-15 | Per-campaign cost tracking logs token usage and API costs for every agent call | campaign_costs table design with per-agent and per-provider granularity. Numeric columns for cost in yen. |
| FIXV-01 | Dashboard, auth, and billing verified working on Vercel production deployment | Existing Vercel deployment at katai-w65t.vercel.app in hnd1 region. Verification is manual testing of existing routes. |
| FIXV-02 | Campaign ZIP download verified working end-to-end | Existing `/api/campaigns/[id]/download` route uses archiver + Supabase Storage. Verify with live assets. |
| FIXV-03 | All existing AI provider integrations verified with live API calls | Flux (fal.ai), Kling, Runway, ElevenLabs, HeyGen -- all have existing client modules in `src/lib/ai/`. Verification requires live API keys configured. |
| FIXV-04 | Direct generation fallback marked deprecated with log warning when activated | `runDirectGeneration` in `src/app/api/campaigns/route.ts` -- add `console.warn("[DEPRECATED]")` at entry point. |
</phase_requirements>

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | ^0.45.1 | PostgreSQL ORM for schema definition and queries | Already used for 14 tables in schema.ts |
| drizzle-kit | ^0.31.8 | Migration generation and push | Already configured in drizzle.config.ts |
| @supabase/supabase-js | ^2.95.3 | Supabase client for Realtime + Storage | Already used throughout the project |
| @supabase/ssr | ^0.8.0 | Server-side Supabase auth in Next.js | Already configured in server.ts and client.ts |
| postgres | ^3.4.8 | PostgreSQL driver for Drizzle | Already configured in db/index.ts |

### n8n (self-hosted, external to Next.js)
| Component | Version | Purpose | Status |
|-----------|---------|---------|--------|
| n8n | 2.9.0 | Workflow automation with AI Agent nodes | Upgrade target from 1.x |
| Anthropic Chat Model sub-node | Built-in | Claude integration for AI Agent nodes | Available in n8n 2.x |
| Execute Sub-Workflow node | Built-in | Agent sub-workflow dispatch | Available in n8n 2.x |

### No New Dependencies
Phase 8 requires **zero new npm packages**. All schema work uses existing Drizzle ORM. All webhook expansion uses existing Next.js API routes. n8n upgrade is an external Docker image change.

## Architecture Patterns

### Existing Project Structure (relevant files)
```
src/
├── lib/
│   ├── db/
│   │   ├── schema.ts          # ADD: brand_memory, campaign_costs tables
│   │   ├── index.ts           # No changes needed
│   │   └── migrations/        # ADD: new migration for schema additions
│   ├── ai/
│   │   ├── claude.ts          # Model pinned to claude-sonnet-4-5, no changes this phase
│   │   ├── flux.ts            # Verify working with live API
│   │   ├── kling.ts           # Verify working with live API
│   │   ├── runway.ts          # Verify working with live API
│   │   ├── elevenlabs.ts      # Verify working with live API
│   │   ├── heygen.ts          # Verify working with live API
│   │   └── provider-health.ts # No changes needed
│   └── supabase/
│       ├── client.ts          # No changes needed
│       ├── server.ts          # No changes needed
│       └── admin.ts           # No changes needed
├── app/api/
│   ├── campaigns/
│   │   └── route.ts           # MODIFY: deprecation warning on runDirectGeneration
│   └── webhooks/
│       └── n8n/route.ts       # MODIFY: accept expanded webhook payload
├── hooks/
│   └── use-campaign-progress.ts  # Schema foundations for agent-level progress
├── types/
│   └── campaign.ts            # MODIFY: expand CampaignProgress type
└── .env.local.example         # ADD: new env vars for agent model assignment
```

### Pattern 1: Drizzle Schema Table Addition
**What:** Add new tables following the exact patterns used by the 14 existing tables
**When to use:** Adding brand_memory and campaign_costs tables
**Example:**
```typescript
// Source: existing schema.ts pattern (brandProfiles, campaigns, etc.)
import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  numeric,
  integer,
} from "drizzle-orm/pg-core"

// campaign_costs table -- per-agent and per-provider cost tracking
export const campaignCosts = pgTable("campaign_costs", {
  id: uuid("id").primaryKey().defaultRandom(),
  campaignId: uuid("campaign_id")
    .references(() => campaigns.id)
    .notNull(),
  // Agent-level cost entry
  entryType: text("entry_type").notNull(), // 'agent' | 'provider'
  // Agent fields (when entryType = 'agent')
  agentName: text("agent_name"),        // e.g. 'strategic_insight', 'creative_director'
  modelUsed: text("model_used"),        // e.g. 'claude-opus-4-6', 'claude-sonnet-4-5'
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  // Provider fields (when entryType = 'provider')
  providerName: text("provider_name"),  // e.g. 'flux', 'kling', 'elevenlabs'
  operationType: text("operation_type"), // e.g. 'image_generation', 'video_generation'
  durationMs: integer("duration_ms"),
  // Shared fields
  costYen: numeric("cost_yen", { precision: 10, scale: 4 }),
  metadata: jsonb("metadata"),          // Additional context
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
})
```

### Pattern 2: Drizzle Migration Generation
**What:** Generate SQL migration files from schema changes, then apply
**When to use:** After modifying schema.ts with new tables
**Example:**
```bash
# Generate migration SQL from schema diff
npx drizzle-kit generate --name add-brand-memory-campaign-costs

# Apply migration to Supabase database
npx drizzle-kit migrate

# OR for development: push directly (skips migration files)
npx drizzle-kit push
```

### Pattern 3: Expanded Webhook Payload
**What:** Extend the webhook payload sent from Next.js to n8n with additional fields
**When to use:** Adding mode, brandMemory, agentConfig to the n8n trigger payload
**Example:**
```typescript
// Source: existing pattern in src/app/api/campaigns/route.ts lines 204-221
const payload = JSON.stringify({
  campaignId: campaign.id,
  brief,
  brandProfile: { /* existing fields */ },
  // NEW: v1.1 expanded fields
  mode: "pro",                    // 'auto' | 'pro' (for future phases)
  brandMemory: null,              // BrandMemory object (populated in Phase 11)
  agentConfig: {
    strategicInsight: { model: process.env.AGENT_STRATEGIC_INSIGHT_MODEL || "claude-opus-4-6" },
    creativeDirector: { model: process.env.AGENT_CREATIVE_DIRECTOR_MODEL || "claude-opus-4-6" },
    copywriter: { model: process.env.AGENT_COPYWRITER_MODEL || "claude-opus-4-6" },
    artDirector: { model: process.env.AGENT_ART_DIRECTOR_MODEL || "claude-opus-4-6" },
    jpLocalization: { model: process.env.AGENT_JP_LOCALIZATION_MODEL || "claude-opus-4-6" },
  },
  pipelineVersion: "v1.1",       // Version marker for n8n routing
})
```

### Pattern 4: Deprecation Warning
**What:** Add console.warn when deprecated code path activates
**When to use:** Marking runDirectGeneration as deprecated
**Example:**
```typescript
// In src/app/api/campaigns/route.ts, at the start of runDirectGeneration:
async function runDirectGeneration(/* params */) {
  console.warn(
    "[DEPRECATED] runDirectGeneration activated. " +
    "This fallback is deprecated in v1.1 and will be removed in v1.2. " +
    "Configure N8N_WEBHOOK_URL to use the n8n pipeline instead."
  )
  // ... existing logic
}
```

### Pattern 5: CampaignProgress Type Expansion
**What:** Expand the progress tracking type to support milestone-based stages
**When to use:** Supporting the 4-milestone progress display decided by user
**Example:**
```typescript
// In src/types/campaign.ts -- expand CampaignProgress
export interface CampaignProgress {
  // Existing fields (kept for backward compatibility)
  stage: string
  copyStatus: "pending" | "generating" | "complete" | "failed"
  imageStatus: "pending" | "generating" | "complete" | "failed"
  compositingStatus?: "pending" | "generating" | "complete" | "failed"
  platformResizeStatus?: "pending" | "generating" | "complete" | "failed"
  emailStatus?: "pending" | "generating" | "complete" | "failed"
  voiceoverStatus?: "pending" | "generating" | "complete" | "failed" | "skipped"
  videoStatus?: "pending" | "generating" | "complete" | "failed" | "skipped"
  avatarStatus?: "pending" | "generating" | "complete" | "failed" | "skipped"
  percentComplete: number
  currentStep: string

  // NEW: v1.1 milestone-based progress
  milestones?: PipelineMilestone[]
  pipelineVersion?: string  // 'v1.0' | 'v1.1'
}

export interface PipelineMilestone {
  id: string              // 'strategy' | 'content' | 'assets' | 'packaging'
  label: string           // Japanese label: '戦略分析中', 'コンテンツ作成中', etc.
  status: "pending" | "active" | "complete" | "failed"
  startedAt?: string      // ISO timestamp for elapsed time counter
  completedAt?: string
  error?: string          // Friendly Japanese error message
}
```

### Anti-Patterns to Avoid
- **Do not create separate progress tables:** The existing campaigns.progress JSONB column is the right place for progress data. Adding a separate table would require Supabase Realtime configuration for a new table and break the existing hook.
- **Do not change the HMAC signature scheme:** The existing X-Signature HMAC-SHA256 pattern works. The expanded payload just includes more fields; the signature covers the full body.
- **Do not store costs in the campaigns table:** Costs need per-agent granularity. A dedicated campaign_costs table with foreign key to campaigns is the correct normalization.
- **Do not remove runDirectGeneration yet:** The user decision is to mark it deprecated, not remove it. It remains as a safety net for this phase.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Database migrations | Raw SQL scripts | `drizzle-kit generate` + `drizzle-kit migrate` | Drizzle generates correct ALTER TABLE statements from schema diff |
| Supabase Realtime setup | Custom WebSocket | Existing `supabase.channel().on('postgres_changes')` | Already working in useCampaignProgress hook |
| HMAC signature verification | Custom crypto | Existing `verifySignature()` in n8n/route.ts | Already implemented with timing-safe comparison |
| Cost calculation in yen | Manual conversion | Store raw costs in yen from Anthropic/provider pricing tables | Anthropic API returns token counts; multiply by published per-token pricing |
| Schema validation (quality gate) | Custom validator | Zod schema validation (already in devDependencies via zod@4.3.6) | Zod is already a transitive dependency; use for PipelineState validation |

**Key insight:** Phase 8 is entirely additive to existing infrastructure. Every pattern used here (Drizzle tables, JSONB types, webhook payloads, Supabase Realtime) has working precedent in the v1.0 codebase.

## Common Pitfalls

### Pitfall 1: n8n 2.0 Breaking Changes
**What goes wrong:** Upgrading n8n Docker image from 1.x to 2.x without addressing breaking changes causes workflow failures
**Why it happens:** n8n 2.0 removed the Start node, changed environment variable access in Code nodes, and introduced the Draft/Publish model
**How to avoid:**
1. Back up all existing n8n workflows as JSON exports before upgrading
2. Replace any Start nodes with appropriate trigger nodes (Webhook Trigger)
3. Code nodes that access `process.env` must be updated -- n8n 2.x blocks env var access in Code nodes by default
4. After upgrade, all workflows are in "draft" state -- must explicitly publish each one
5. Test the upgrade on a staging instance first if possible
**Warning signs:** Workflows that worked in 1.x show "Start node not found" errors; Code node expressions fail silently

### Pitfall 2: Drizzle Numeric Type Returns Strings
**What goes wrong:** `numeric()` columns in Drizzle return strings in TypeScript, not numbers
**Why it happens:** PostgreSQL numeric type has arbitrary precision that JavaScript numbers cannot represent exactly
**How to avoid:** Use `numeric("cost_yen", { precision: 10, scale: 4 })` for monetary values. When reading, parse with `parseFloat()` or use `{ mode: 'number' }` if precision loss is acceptable for display. For aggregation queries, use SQL `SUM()` and cast the result.
**Warning signs:** TypeScript errors when comparing numeric column values with `>` or `<` operators

### Pitfall 3: Supabase Realtime Row Size Limits
**What goes wrong:** Realtime postgres_changes have a payload size limit (~1MB). If the campaigns.progress JSONB grows too large, Realtime stops delivering updates
**Why it happens:** Storing full agent reasoning chains or large PipelineState objects in the progress column
**How to avoid:** Keep progress JSONB lean -- milestone status + timestamps only. Agent output goes in separate tables (campaign_costs for costs, assets for generated content). The user decision to use 3-4 high-level milestones (not per-agent detail) naturally prevents this.
**Warning signs:** Realtime subscription stops receiving updates while polling fallback still works

### Pitfall 4: n8n Webhook Timeout on Complex Payloads
**What goes wrong:** Expanded webhook payload with brand memory and agent config increases payload size, potentially hitting n8n's default body parser limits
**Why it happens:** n8n has a default request body size limit
**How to avoid:** Keep the webhook payload under 1MB. Brand memory context should be summarized (top 10 voice examples, not full history). Agent config is just model name strings -- negligible size.
**Warning signs:** n8n returns 413 (Payload Too Large) on webhook trigger

### Pitfall 5: Migration Ordering with Foreign Keys
**What goes wrong:** Drizzle migration fails because new tables reference existing tables that Drizzle doesn't know about in the migration context
**Why it happens:** All tables are in a single schema.ts file, but the migration system generates ALTER TABLE statements incrementally
**How to avoid:** Run `drizzle-kit generate` after adding both new tables to schema.ts simultaneously. Drizzle handles foreign key ordering correctly when all tables are defined in the same generation pass.
**Warning signs:** Migration fails with "relation does not exist" error

## Code Examples

### brand_memory Table Schema
```typescript
// Source: designed following existing schema.ts patterns

/**
 * Brand memory signal entries.
 * Each row is one learned preference from a campaign signal.
 */
export interface BrandMemorySignal {
  source: string          // 'favorite' | 'approval' | 'register_selection' | 'campaign_feedback'
  campaignId: string
  signalType: string      // 'tone_preference' | 'cta_style' | 'keigo_level' | 'visual_preference'
  value: string           // The actual learned preference
  confidence: number      // 0.0 to 1.0
  extractedAt: string     // ISO timestamp
}

export interface BrandVoiceSummary {
  sentenceLength: string    // 'short' | 'medium' | 'long'
  keigoLevel: string        // 'casual' | 'standard' | 'formal'
  ctaStyle: string          // 'direct' | 'soft' | 'question'
  preferredExpressions: string[]
  avoidExpressions: string[]
  lastUpdated: string
}

export const brandMemory = pgTable("brand_memory", {
  id: uuid("id").primaryKey().defaultRandom(),
  brandProfileId: uuid("brand_profile_id")
    .references(() => brandProfiles.id)
    .notNull(),
  teamId: uuid("team_id")
    .references(() => teams.id)
    .notNull(),
  // Accumulated signals as JSONB array
  signals: jsonb("signals").$type<BrandMemorySignal[]>().default([]),
  // Computed voice summary (regenerated from signals)
  voiceSummary: jsonb("voice_summary").$type<BrandVoiceSummary>(),
  // Version for future schema evolution
  schemaVersion: integer("schema_version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
})
```

### campaign_costs Table Schema
```typescript
// Source: designed per user decisions on cost tracking granularity

/**
 * Per-campaign cost tracking.
 * Each row is one agent call or one provider call within a campaign.
 * Campaign total = SUM of all rows for that campaign.
 */
export const campaignCosts = pgTable("campaign_costs", {
  id: uuid("id").primaryKey().defaultRandom(),
  campaignId: uuid("campaign_id")
    .references(() => campaigns.id)
    .notNull(),
  // Entry classification
  entryType: text("entry_type").notNull(),  // 'agent' | 'provider'
  // Agent-specific fields (populated when entryType = 'agent')
  agentName: text("agent_name"),            // 'strategic_insight' | 'creative_director' | 'copywriter' | 'art_director' | 'jp_localization'
  modelUsed: text("model_used"),            // 'claude-opus-4-6' | 'claude-sonnet-4-5'
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  // Provider-specific fields (populated when entryType = 'provider')
  providerName: text("provider_name"),      // 'flux' | 'kling' | 'runway' | 'elevenlabs' | 'heygen'
  operationType: text("operation_type"),    // 'image_generation' | 'video_generation' | 'voice_synthesis' | 'avatar_generation'
  durationMs: integer("duration_ms"),
  // Cost (shared)
  costYen: numeric("cost_yen", { precision: 10, scale: 4 }),
  // Metadata for debugging and analysis
  metadata: jsonb("metadata"),
  // Status
  success: boolean("success").notNull().default(true),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
})
```

### Expanded Webhook Payload TypeScript Interface
```typescript
// Source: designed to extend existing payload in campaigns/route.ts

export interface N8nWebhookPayload {
  // Existing fields (v1.0)
  campaignId: string
  brief: CampaignBrief
  brandProfile: {
    id: string
    name: string
    colors: BrandColors | null
    fontPreference: string | null
    defaultRegister: string
    toneTags: string[] | null
    toneDescription: string | null
    productCatalog: ProductCatalogEntry[] | null
    positioningStatement: string | null
    brandStory: string | null
    targetMarket: string | null
    brandValues: string[] | null
  }
  // NEW: v1.1 fields
  mode: "auto" | "pro"
  brandMemory: BrandVoiceSummary | null   // null until Phase 11 populates
  agentConfig: {
    strategicInsight: { model: string }
    creativeDirector: { model: string }
    copywriter: { model: string }
    artDirector: { model: string }
    jpLocalization: { model: string }
  }
  pipelineVersion: "v1.0" | "v1.1"
}
```

### Milestone-to-Agent Mapping (Claude's Discretion)
```typescript
// Recommended mapping based on pipeline flow and user's 4-milestone decision

export const PIPELINE_MILESTONES = [
  {
    id: "strategy",
    label: "戦略分析中",
    agents: ["strategic_insight"],
    // Strategic Insight is the sole agent in this milestone
    // Critical-stop: if this fails, pipeline stops
  },
  {
    id: "content",
    label: "コンテンツ作成中",
    agents: ["creative_director", "copywriter", "jp_localization"],
    // Creative Director is critical-stop
    // Copywriter and JP Localization are partial-delivery
  },
  {
    id: "assets",
    label: "アセット生成中",
    agents: ["art_director"],
    // Art Director is partial-delivery
    // This milestone also covers image generation, video, etc.
  },
  {
    id: "packaging",
    label: "パッケージング",
    agents: [],
    // No agent -- this is compositing, resize, ZIP packaging
  },
] as const
```

### Cost Alert Threshold Check (Claude's Discretion)
```typescript
// Recommended: simple console.warn for now (per deferred decision)

const COST_ALERT_THRESHOLD_YEN = parseInt(
  process.env.CAMPAIGN_COST_ALERT_THRESHOLD_YEN || "5000",
  10
)

async function checkCostAlert(campaignId: string): Promise<void> {
  const result = await db
    .select({
      totalCost: sql<string>`SUM(${campaignCosts.costYen})`,
    })
    .from(campaignCosts)
    .where(eq(campaignCosts.campaignId, campaignId))

  const total = parseFloat(result[0]?.totalCost || "0")

  if (total > COST_ALERT_THRESHOLD_YEN) {
    console.warn(
      `[COST ALERT] Campaign ${campaignId} cost ¥${total.toFixed(2)} ` +
      `exceeds threshold ¥${COST_ALERT_THRESHOLD_YEN}`
    )
  }
}
```

## State of the Art

| Old Approach (v1.0) | Current Approach (v1.1) | When Changed | Impact |
|----------------------|-------------------------|--------------|--------|
| n8n 1.x with simple webhook workflows | n8n 2.9.0 with AI Agent nodes + Draft/Publish | n8n 2.0 released late 2025 | Enables LangChain-powered agent reasoning in n8n |
| Flat progress tracking (copyStatus, imageStatus) | Milestone-based progress with elapsed timers | Phase 8 | Users see meaningful stage progression during 2-5 min generation |
| No cost tracking | Per-agent + per-provider cost logging | Phase 8 | Enables cost optimization decisions with real data |
| No brand memory | brand_memory table (empty, populated in Phase 11) | Phase 8 schema, Phase 11 population | Schema foundation for progressive brand learning |
| Direct generation as primary path | n8n pipeline as primary, direct as deprecated fallback | Phase 8 | Clear architectural direction toward agent pipeline |

**Deprecated/outdated:**
- `runDirectGeneration()`: Marked deprecated in this phase. Still functional as fallback. Removal planned for v1.2.
- n8n 1.x: End of life. Must upgrade to 2.x.

## n8n 2.x Upgrade Details

### Current State
- n8n is self-hosted on a US VPS via Docker
- Current version: 1.x (exact version not determined from codebase)
- Used for webhook-triggered campaign generation workflows

### Target State
- n8n 2.9.0 (latest stable as of Feb 17, 2026)
- AI Agent nodes available (built-in, no special flag needed)
- Draft/Publish workflow model active

### Breaking Changes Requiring Action
1. **Start node removal:** Replace with Webhook Trigger node in existing workflows
2. **Environment variable access in Code nodes:** `N8N_BLOCK_ENV_ACCESS_IN_NODE=true` by default. If any Code nodes read env vars, update them to use n8n credentials instead.
3. **Draft/Publish model:** After upgrade, existing workflows will be in draft state. Must publish each one to make them active for production execution.
4. **Task Runners:** Enabled by default in 2.x. Docker image `n8nio/n8n` no longer includes task runner -- use `n8nio/n8n` with separate task runner container or switch to `n8nio/n8n:2.9.0` which bundles it.
5. **Database:** n8n 2.0 dropped MySQL/MariaDB support. If n8n uses SQLite or PostgreSQL (typical for self-hosted), no action needed.

### Upgrade Approach (Claude's Discretion: in-place recommended)
**Recommendation: In-place upgrade via Docker image tag change.**

Rationale: The existing n8n instance has configured workflows and credentials. A fresh install would require re-creating all configurations. The in-place upgrade preserves everything.

```bash
# 1. Export all workflows as backup
# 2. Update docker-compose.yml image tag
image: n8nio/n8n:2.9.0
# 3. Pull new image and restart
docker compose pull && docker compose down && docker compose up -d
# 4. Verify n8n starts without errors
# 5. Publish all existing workflows
# 6. Test webhook endpoint responds
```

### Required n8n Environment Variables
```bash
# Essential for v1.1 agent pipeline
N8N_ENCRYPTION_KEY=<existing-key>     # Keep existing
EXECUTIONS_TIMEOUT=900                # 15 min global timeout for agent pipelines
N8N_CONCURRENCY_PRODUCTION_LIMIT=3    # Max concurrent campaign generations

# Agent model configuration (read by Next.js, passed in webhook payload)
AGENT_STRATEGIC_INSIGHT_MODEL=claude-opus-4-6
AGENT_CREATIVE_DIRECTOR_MODEL=claude-opus-4-6
AGENT_COPYWRITER_MODEL=claude-opus-4-6
AGENT_ART_DIRECTOR_MODEL=claude-opus-4-6
AGENT_JP_LOCALIZATION_MODEL=claude-opus-4-6

# Cost alert threshold (yen)
CAMPAIGN_COST_ALERT_THRESHOLD_YEN=5000
```

## Quality Gate Schema Validation (Claude's Discretion)

The Strategic Insight output must pass schema validation before the pipeline continues. Recommended validation using Zod (already a transitive dependency):

```typescript
import { z } from "zod"

export const StrategicInsightOutputSchema = z.object({
  awarenessLevel: z.string().min(1),          // Schwartz awareness classification
  lf8Desires: z.array(z.string()).min(1),     // At least one LF8 desire identified
  copywritingFramework: z.string().min(1),    // PAS | AIDA | BAB | SB7
  targetInsight: z.string().min(10),          // Substantive audience insight
  creativeDirection: z.string().min(10),      // Direction for Creative Director
})

export type StrategicInsightOutput = z.infer<typeof StrategicInsightOutputSchema>
```

This validates minimum required fields without enforcing specific values -- the agents choose the values, the gate just ensures they are present and non-empty.

## Open Questions

1. **n8n current version and workflow inventory**
   - What we know: n8n is self-hosted on US VPS via Docker, version is 1.x
   - What's unclear: Exact current version number, number and complexity of existing workflows, whether any Code nodes access environment variables
   - Recommendation: During Plan 08-01 execution, first task should be `docker exec n8n n8n --version` and export all workflow JSONs before upgrade

2. **Supabase Realtime connection limits**
   - What we know: Supabase free tier has 200 concurrent Realtime connections. Paid tiers have higher limits.
   - What's unclear: Current Supabase plan tier and connection limit
   - Recommendation: Verify during Plan 08-03. Not a blocker for Phase 8 since the existing hook already works, but important for Phase 9+ when multiple users may have campaigns generating simultaneously.

3. **AI provider API key status**
   - What we know: .env.local.example lists all required keys (Anthropic, BFL/fal.ai, Runway, ElevenLabs, HeyGen)
   - What's unclear: Whether production API keys are configured on Vercel and which have valid credits/quotas
   - Recommendation: Systematic verification in Plan 08-03. Each provider needs a live test call.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `src/lib/db/schema.ts` -- 14-table schema with established Drizzle patterns
- Existing codebase: `src/app/api/campaigns/route.ts` -- webhook trigger + runDirectGeneration fallback pattern
- Existing codebase: `src/app/api/webhooks/n8n/route.ts` -- HMAC-signed callback handler
- Existing codebase: `src/hooks/use-campaign-progress.ts` -- Supabase Realtime + polling fallback
- Existing codebase: `drizzle.config.ts` -- migration configuration
- [n8n v2.0 Breaking Changes](https://docs.n8n.io/2-0-breaking-changes/) -- migration requirements
- [n8n Release Notes](https://releasebot.io/updates/n8n) -- n8n 2.9.0 is current stable (Feb 17, 2026)
- [Drizzle ORM PostgreSQL Column Types](https://orm.drizzle.team/docs/column-types/pg) -- numeric, jsonb, uuid patterns
- [Drizzle ORM Push/Migrate](https://orm.drizzle.team/docs/drizzle-kit-push) -- migration workflow
- [n8n AI Agent Node](https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent/) -- agent configuration
- [n8n Sub-workflows](https://docs.n8n.io/flow-logic/subworkflows/) -- data passing patterns
- [Supabase Realtime Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes) -- subscription patterns
- `.planning/research/SUMMARY.md` -- v1.1 research summary with architecture decisions

### Secondary (MEDIUM confidence)
- [n8n Save and Publish](https://docs.n8n.io/workflows/publish/) -- Draft/Publish workflow model
- [n8n Error Handling Patterns](https://wotai.co/blog/error-handling-patterns-production-workflows) -- Continue On Fail patterns
- [n8n Anthropic Chat Model](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.lmchatanthropic/) -- Claude integration in n8n
- [n8n Docker Setup](https://docs.n8n.io/hosting/installation/docker/) -- Docker Compose configuration
- [Supabase Realtime Broadcast](https://supabase.com/docs/guides/realtime/broadcast) -- alternative progress update mechanism

### Tertiary (LOW confidence)
- N8N_AI_ENABLED environment variable: referenced in v1.1 research summary but NOT found in official n8n 2.x documentation. AI Agent nodes appear to be built-in in 2.x without requiring a flag. Verify during n8n upgrade.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- zero new dependencies, all patterns from existing codebase
- Architecture: HIGH -- additive changes to established patterns (Drizzle tables, webhook payloads, Supabase Realtime)
- n8n upgrade: HIGH -- breaking changes are documented, migration path is clear
- Pitfalls: HIGH -- documented community issues with known workarounds
- Schema design: MEDIUM-HIGH -- follows established patterns but specific column choices are design decisions

**Research date:** 2026-02-18
**Valid until:** 2026-03-18 (30 days -- stable technologies, no fast-moving dependencies)
