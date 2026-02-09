# Phase 5: Workflow & Intelligence - Research

**Researched:** 2026-02-09
**Domain:** Selective asset regeneration, ringi approval workflow, campaign history/re-run, brief templates, QA agent (keigo/brand validation), Viral/Trend agent
**Confidence:** MEDIUM-HIGH

---

## Summary

Phase 5 transforms the campaign generator from a one-shot pipeline into an iterative agency workflow tool. It covers six requirements spanning three distinct sub-domains: (1) workflow features -- selective regeneration, approval workflows, campaign history, and brief templates; (2) AI intelligence agents -- QA validation and trend analysis; and (3) the database/schema extensions needed to support both.

The core architectural challenge is retrofitting individual-asset-level control onto a pipeline designed for whole-campaign generation. Currently, the `runDirectGeneration` function in the campaigns API route generates everything atomically -- copy, images, compositing, resizing, video, audio -- with no way to regenerate a single headline or image. Selective regeneration requires decomposing this into individually-callable generation functions with proper asset-level tracking. The ringi approval workflow requires new database tables (approval_workflows, approval_steps) and a state machine to track the sequential approval chain. The QA and trend agents are Claude-powered -- they use the existing `@anthropic-ai/sdk` with structured output (tool use or `output_config.format`) to validate generated content and fetch trending insights.

No new heavyweight dependencies are needed. The existing stack (Next.js 15, Drizzle ORM, Supabase, `@anthropic-ai/sdk`, Zustand) handles everything. The only potential new dependency is `serpapi` for Google Trends data if the trend agent needs real external trend data (alternatively, Claude can synthesize trends from its training data for MVP). The approval workflow state machine is simple enough to hand-code with a status enum -- XState would be overkill for a linear 3-step flow.

**Primary recommendation:** Decompose the monolithic `runDirectGeneration` into per-asset-type regeneration endpoints, add new database tables for approvals and campaign templates, and implement QA/Trend agents as Claude tool-use functions with structured output schemas. Keep the approval workflow as a simple database-driven state machine (no XState needed). Use campaign `brief` JSONB cloning for re-run with modifications.

---

## Standard Stack

### Core (existing, extended)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@anthropic-ai/sdk` | ^0.73.0 | QA agent, Trend agent -- Claude with structured outputs | Already used for copy generation; extend with new tool schemas for QA validation and trend analysis |
| `drizzle-orm` | ^0.45.1 | New tables: approval_workflows, approval_steps, campaign_templates, campaign_versions | Already the ORM for all database operations |
| `drizzle-kit` | ^0.31.8 | Schema migrations for new tables | Already the migration tool |
| `next` | 16.1.6 | API routes for regeneration endpoints, approval actions, template CRUD | Already the framework |
| `zustand` | ^5.0.11 | Client-side state for approval UI, regeneration progress | Already used for brand wizard and UI stores |
| `@supabase/supabase-js` | ^2.95.3 | Auth for approval user identity, RLS for team-scoped approval access | Already the auth layer |
| `zod` | (add) | Structured output schema validation for QA agent responses | Used by Anthropic SDK's `zodOutputFormat` helper for guaranteed JSON schema compliance |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `serpapi` | latest | Google Trends trending searches for Japan market | Only if trend agent needs real-time external trend data; defer if Claude synthesis is sufficient for MVP |
| `sonner` | ^2.0.7 | Toast notifications for approval actions, regeneration status | Already installed |
| `lucide-react` | ^0.563.0 | Icons for approval status, template categories | Already installed |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Simple status enum for approvals | XState v5 state machine | XState adds ~30KB and complexity for what is a linear 3-state flow (draft -> review -> approved). The approval states are sequential with no branching. Simple DB status column + transition validation functions are more maintainable. **Use XState only if approval flow gains complex branching later** |
| `serpapi` for trends | Claude synthesis from training data | SerpApi costs ~$50/mo for basic plan. For MVP, Claude can synthesize plausible JP market trends from its training data + current season. Real SerpApi integration adds latency and cost. **Start with Claude synthesis, add SerpApi when real-time accuracy matters** |
| Custom QA validation | Third-party text analysis API | No third-party API specializes in Japanese keigo validation. Claude is the best tool for this because it understands Japanese linguistic registers natively. **Claude is the right tool** |
| Per-asset regeneration API routes | n8n workflow per asset | n8n adds overhead for single-asset operations that complete in seconds. Direct API routes are simpler for regenerating one headline or one image. **Use API routes for selective regeneration, keep n8n for full pipeline only** |

### Installation

```bash
npm install zod
# Optional, only if implementing real-time trends:
npm install serpapi
```

Note: `zod` may already be present as a transitive dependency of `@anthropic-ai/sdk`. Check before adding.

---

## Architecture Patterns

### Recommended Project Structure (new files for Phase 5)

```
src/
├── app/
│   └── api/
│       ├── campaigns/
│       │   ├── [id]/
│       │   │   ├── regenerate/route.ts      # POST: selective regeneration
│       │   │   ├── approve/route.ts          # POST: approval workflow actions
│       │   │   ├── clone/route.ts            # POST: re-run with modifications
│       │   │   └── qa/route.ts               # POST: trigger QA validation
│       │   └── route.ts                      # (existing, extend with template support)
│       └── templates/
│           └── route.ts                      # GET: list templates, POST: create from campaign
│   └── (dashboard)/
│       └── campaigns/
│           ├── [id]/
│           │   ├── approval-panel.tsx         # Approval workflow UI
│           │   └── regenerate-dialog.tsx      # Selective regeneration UI
│           └── new/
│               └── template-picker.tsx        # Template selection before brief form
├── lib/
│   ├── ai/
│   │   ├── qa-agent.ts                       # QA validation agent (keigo, brand, visual)
│   │   ├── trend-agent.ts                    # Viral/Trend analysis agent
│   │   └── prompts/
│   │       ├── qa-validation.ts              # QA agent system/user prompts
│   │       └── trend-analysis.ts             # Trend agent prompts
│   ├── db/
│   │   └── schema.ts                         # Extended with new tables
│   ├── workflows/
│   │   └── approval.ts                       # Approval state machine functions
│   └── templates/
│       └── jp-campaign-templates.ts           # Pre-built brief templates data
├── components/
│   └── campaign/
│       ├── approval-status-badge.tsx          # Approval status display
│       ├── qa-report-panel.tsx               # QA validation results display
│       └── trend-insights-card.tsx           # Trend insights sidebar card
└── types/
    ├── approval.ts                            # Approval workflow types
    └── template.ts                            # Template types
```

### Pattern 1: Selective Regeneration via Per-Asset-Type Endpoints

**What:** Instead of regenerating the entire campaign, allow regeneration of individual assets (one headline, one image, one video) through a unified regeneration endpoint that accepts asset type and ID.

**When to use:** When user wants to iterate on specific assets while preserving approved ones.

**Example:**

```typescript
// POST /api/campaigns/[id]/regenerate
// Request body specifies what to regenerate

interface RegenerationRequest {
  type: "copy_variant" | "image" | "composited_image" | "platform_image" | "video" | "audio"
  assetId?: string           // Specific asset to replace (for images, videos)
  copyVariantId?: string     // Specific copy variant to regenerate
  platform?: string          // Platform for copy regeneration
  variantLabel?: string      // e.g., "A案" for specific variant
  options?: {
    preservePrompt?: boolean // Re-use same prompt with different seed
    customPrompt?: string    // Override the generation prompt
  }
}

// Server-side handler
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { type, assetId, copyVariantId, platform, variantLabel, options } = await request.json()

  switch (type) {
    case "copy_variant":
      // Re-call generatePlatformCopy for single platform + variant
      // Update only the specific copyVariant row
      break
    case "image":
      // Re-call generateCampaignImages for 1 image
      // Replace specific asset row, re-run compositing for that image
      break
    // ... other types
  }
}
```

### Pattern 2: Database-Driven Approval State Machine

**What:** A simple approval workflow using database status columns and validation functions, following the ringi pattern (bottom-up sequential approval: creator -> reviewer -> approver).

**When to use:** For the ringi-style approval flow. No external state machine library needed.

**Example:**

```typescript
// src/lib/workflows/approval.ts

type ApprovalStatus = "draft" | "pending_review" | "pending_approval" | "approved" | "rejected" | "revision_requested"

// Valid transitions map
const VALID_TRANSITIONS: Record<ApprovalStatus, ApprovalStatus[]> = {
  draft:              ["pending_review"],
  pending_review:     ["pending_approval", "revision_requested", "rejected"],
  pending_approval:   ["approved", "revision_requested", "rejected"],
  approved:           [],  // Terminal state
  rejected:           ["draft"],  // Can restart
  revision_requested: ["draft"],  // Creator revises, resubmits
}

export function canTransition(from: ApprovalStatus, to: ApprovalStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}

export function validateApprovalAction(
  currentStatus: ApprovalStatus,
  action: "submit" | "approve" | "reject" | "request_revision",
  userRole: "admin" | "editor" | "viewer"
): { allowed: boolean; nextStatus: ApprovalStatus; error?: string } {
  // Map action to target status based on current state and role
  // editor (creator) can submit
  // admin (reviewer/approver) can approve/reject/request revision
  // viewer cannot take any action
}
```

### Pattern 3: Campaign Clone for Re-Run with Modifications

**What:** Clone a campaign's brief JSONB, present it in the brief form for editing, then submit as a new campaign. Link to parent via `parentCampaignId`.

**When to use:** For FOUND-05 (campaign history and re-run).

**Example:**

```typescript
// POST /api/campaigns/[id]/clone
// Returns a new campaign brief pre-filled with parent's data

export async function POST(request: Request, { params }: { params: { id: string } }) {
  // 1. Fetch parent campaign
  const parent = await db.select().from(campaigns).where(eq(campaigns.id, params.id)).limit(1)

  // 2. Return brief data for client to pre-fill form
  // OR accept modifications in body and create new campaign directly
  const modifications = await request.json() // Optional overrides

  const newBrief = { ...parent[0].brief, ...modifications }

  // 3. Insert new campaign with parentCampaignId reference
  const [newCampaign] = await db.insert(campaigns).values({
    ...parent[0],
    id: undefined, // Auto-generate new ID
    parentCampaignId: parent[0].id,
    brief: newBrief,
    status: "pending",
    progress: null,
    createdAt: undefined,
    completedAt: null,
  }).returning()

  return NextResponse.json({ id: newCampaign.id })
}
```

### Pattern 4: Claude QA Agent with Structured Output

**What:** Use Claude with `output_config.format` (structured outputs GA) to validate generated content against keigo consistency, brand compliance, and visual coherence rules. Returns a structured QA report.

**When to use:** After campaign generation completes, before marking as "deliverable".

**Example:**

```typescript
// src/lib/ai/qa-agent.ts
import Anthropic from "@anthropic-ai/sdk"

interface QAReport {
  overallScore: number          // 0-100
  keigoConsistency: {
    passed: boolean
    issues: Array<{
      variantId: string
      field: "headline" | "body" | "cta"
      issue: string
      severity: "error" | "warning"
      suggestion: string
    }>
  }
  brandCompliance: {
    passed: boolean
    issues: Array<{
      type: "tone_mismatch" | "color_deviation" | "messaging_off_brand"
      description: string
      severity: "error" | "warning"
    }>
  }
  visualCoherence: {
    passed: boolean
    issues: Array<{
      assetId: string
      issue: string
      severity: "error" | "warning"
    }>
  }
}

const QA_VALIDATION_TOOL: Anthropic.Tool = {
  name: "deliver_qa_report",
  description: "生成されたキャンペーンアセットのQA検証結果を構造化形式で返します",
  strict: true,
  input_schema: {
    type: "object",
    properties: {
      overallScore: { type: "integer", description: "0-100の総合スコア" },
      keigoConsistency: { /* ... schema matching QAReport */ },
      brandCompliance: { /* ... */ },
      visualCoherence: { /* ... */ },
    },
    required: ["overallScore", "keigoConsistency", "brandCompliance", "visualCoherence"],
    additionalProperties: false,
  },
}
```

### Pattern 5: Pre-Built Brief Templates as Static Data

**What:** Define common JP campaign templates as a typed constant array. Each template pre-fills the brief form with sensible defaults for objective, target audience, creative direction, mood tags, and platform selection.

**When to use:** For WORK-09 (brief templates).

**Example:**

```typescript
// src/lib/templates/jp-campaign-templates.ts

export interface CampaignTemplate {
  id: string
  nameJa: string
  descriptionJa: string
  category: "seasonal" | "promotion" | "product_launch" | "brand_awareness"
  icon: string  // lucide icon name
  defaults: {
    objective: string
    targetAudience: string
    platforms: string[]
    creativeMoodTags: string[]
    creativeDirection: string
    registerOverride?: string
  }
}

export const JP_CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  {
    id: "seasonal_launch",
    nameJa: "季節キャンペーン",
    descriptionJa: "春夏秋冬の季節イベントに合わせたキャンペーン",
    category: "seasonal",
    icon: "Calendar",
    defaults: {
      objective: "awareness",
      targetAudience: "20-40代の一般消費者",
      platforms: ["instagram", "x", "line"],
      creativeMoodTags: ["季節感", "トレンド", "限定"],
      creativeDirection: "季節の雰囲気を活かした明るいビジュアル",
    },
  },
  {
    id: "flash_sale",
    nameJa: "タイムセール",
    descriptionJa: "期間限定の割引・特売キャンペーン",
    category: "promotion",
    icon: "Zap",
    defaults: {
      objective: "conversion",
      targetAudience: "価格に敏感な購買層",
      platforms: ["line", "x", "yahoo", "rakuten"],
      creativeMoodTags: ["緊急", "お得", "限定"],
      creativeDirection: "緊急感のある赤・オレンジ系ビジュアル、大きな割引率表示",
      registerOverride: "casual",
    },
  },
  // ... new_product, brand_awareness templates
]
```

### Anti-Patterns to Avoid

- **Monolithic regeneration:** Do NOT add "regenerate single asset" logic inside the existing `runDirectGeneration` function. It is already 700+ lines. Create separate, focused regeneration functions per asset type.

- **XState for linear workflows:** The ringi approval is a simple sequential flow (creator -> reviewer -> approver). Using XState for a 3-state linear machine adds unnecessary abstraction. Use a status column + transition validation function.

- **Storing templates in the database for MVP:** Pre-built templates are static data (seasonal, flash sale, etc.). Storing them in DB adds migration complexity with no benefit. Use a TypeScript constant. User-created templates (saving a campaign as template) can go to DB later.

- **Real-time trend API calls during generation:** Do NOT call external trend APIs (SerpApi, Google Trends) synchronously during campaign generation. This adds latency and failure points. Run trend analysis as a separate background operation or on-demand from the dashboard.

- **Overly granular approval permissions:** The existing `teamMembers.role` column has `admin | editor | viewer`. Map these directly to approval roles: editor = creator, admin = reviewer/approver, viewer = read-only. Do NOT create a separate permission system.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Keigo register validation | Custom regex-based keigo parser | Claude QA agent with structured output | Japanese keigo has complex grammatical rules (sonkeigo vs kenjougo direction, double-honorific errors, mixed register detection). Claude understands Japanese linguistics far better than regex. |
| JSON schema validation for QA results | Manual JSON.parse + field checking | Anthropic SDK `strict: true` tool use or `output_config.format` with Zod | Structured outputs are GA on Claude. Guarantees schema compliance at the API level -- no need for retry loops on malformed JSON. |
| Approval workflow state machine | Full XState integration | Simple status enum + transition map in TypeScript | 3-state linear flow. ~20 lines of validation code vs ~200 lines of XState setup + context + React integration. |
| Trend data aggregation | Custom web scraper for JP social media | SerpApi (or Claude synthesis for MVP) | SerpApi handles Google Trends scraping, rate limiting, and geo-targeting. Scraping directly violates ToS and breaks constantly. |
| Campaign brief cloning | Deep-clone utility with recursive merge | Spread operator on JSONB + `parentCampaignId` FK | Campaign `brief` is a flat JSONB object. `{ ...parentBrief, ...modifications }` handles merging perfectly. |

**Key insight:** Phase 5 is primarily about workflow orchestration and AI intelligence, not new infrastructure. The existing stack handles everything. The main work is decomposing the monolithic generation pipeline and adding database tables for new concepts (approvals, templates, versions).

---

## Common Pitfalls

### Pitfall 1: Regeneration Invalidates Downstream Assets

**What goes wrong:** User regenerates a base image, but the composited images and platform-resized images still reference the old base image. Visual inconsistency results.
**Why it happens:** The generation pipeline is sequential (image -> compositing -> resize). Regenerating an upstream asset requires cascading regeneration of downstream assets.
**How to avoid:** When regenerating a base image, automatically trigger re-compositing and re-resizing for that image. Track the asset dependency chain: `image -> composited_image (baseImageAssetId) -> platform_image (sourceAssetId)`. Delete old downstream assets before regenerating.
**Warning signs:** Composited images showing different base image than the one visible in the image tab.

### Pitfall 2: Approval Status Race Condition

**What goes wrong:** Two admins attempt to approve/reject simultaneously. One overwrites the other's action.
**Why it happens:** No optimistic locking or version check on the approval status column.
**How to avoid:** Use a `version` or `updatedAt` check in the UPDATE WHERE clause. Only update if the current status matches the expected pre-transition status: `WHERE id = ? AND status = ? AND updated_at = ?`.
**Warning signs:** Approval history shows inconsistent state transitions.

### Pitfall 3: QA Agent Hallucinating Issues

**What goes wrong:** Claude QA agent reports keigo inconsistencies or brand violations that don't actually exist in the generated copy.
**Why it happens:** Claude can be overly cautious or misinterpret keigo nuances. Without clear reference material, it may fabricate issues.
**How to avoid:** Always include the brand profile's `defaultRegister`, `toneTags`, and `toneDescription` in the QA agent's context. Include the actual keigo register definitions from `src/lib/constants/keigo.ts` in the system prompt. Set temperature to 0 for QA validation. Include explicit examples of valid vs invalid keigo for each register level.
**Warning signs:** QA reports flagging every campaign with keigo warnings, even when copy is correct.

### Pitfall 4: Template Defaults Overriding User Intent

**What goes wrong:** User selects a template, modifies some fields, but the template defaults for unmodified fields don't match their brand's settings (e.g., template sets `registerOverride: "casual"` but brand default is "formal").
**How to avoid:** Templates should merge with brand defaults, not override them. Only pre-fill fields that the template explicitly sets. The brand's `defaultRegister` should take precedence unless the template explicitly overrides it and the user confirms.
**Warning signs:** Users consistently changing the same fields after selecting a template.

### Pitfall 5: Campaign History Grows Unbounded

**What goes wrong:** Users clone and re-run campaigns repeatedly, creating long chains of parent-child campaigns that consume storage and slow queries.
**Why it happens:** No limit on clone depth or old campaign cleanup.
**How to avoid:** Track `parentCampaignId` for one level only (direct parent, not full ancestry). Paginate campaign history queries. Consider soft-delete for old campaigns after a retention period.
**Warning signs:** Campaign list page load time increasing as users accumulate campaigns.

---

## Code Examples

Verified patterns from official sources:

### Claude Structured Output for QA Validation (Anthropic SDK)

```typescript
// Source: https://platform.claude.com/docs/en/build-with-claude/structured-outputs
// Using strict tool use (GA on Claude Opus 4.6, Sonnet 4.5)

import Anthropic from "@anthropic-ai/sdk"

const anthropic = new Anthropic()

const response = await anthropic.messages.create({
  model: "claude-sonnet-4-5-20250514", // Same model as existing copy generation
  max_tokens: 4096,
  temperature: 0, // Deterministic for QA validation
  system: `あなたは日本語広告コピーのQA検証エージェントです。
敬語の一貫性、ブランドガイドライン準拠、視覚的整合性を検証します。`,
  messages: [{
    role: "user",
    content: `以下のキャンペーンアセットを検証してください:

ブランド設定:
- 敬語レベル: ${brand.defaultRegister}
- トーン: ${brand.toneTags?.join(", ")}
- ブランド価値: ${brand.brandValues?.join(", ")}

コピーバリエーション:
${copyVariants.map(v => `[${v.variantLabel}] ${v.headline} / ${v.bodyText} / ${v.ctaText}`).join("\n")}`,
  }],
  tools: [QA_VALIDATION_TOOL],
  tool_choice: { type: "tool", name: "deliver_qa_report" },
})
```

### Drizzle ORM Schema Extension for Approvals

```typescript
// Source: Drizzle ORM docs (https://orm.drizzle.team/docs/sql-schema-declaration)
// Pattern follows existing schema.ts conventions

export const approvalWorkflows = pgTable("approval_workflows", {
  id: uuid("id").primaryKey().defaultRandom(),
  campaignId: uuid("campaign_id")
    .references(() => campaigns.id)
    .notNull()
    .unique(), // One workflow per campaign
  status: text("status").notNull().default("draft"),
    // 'draft' | 'pending_review' | 'pending_approval' | 'approved' | 'rejected' | 'revision_requested'
  submittedBy: uuid("submitted_by")
    .references(() => profiles.id),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  reviewedBy: uuid("reviewed_by")
    .references(() => profiles.id),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewComment: text("review_comment"),
  approvedBy: uuid("approved_by")
    .references(() => profiles.id),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  approvalComment: text("approval_comment"),
  version: text("version").notNull().default("1"), // Optimistic locking
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
})

export const approvalHistory = pgTable("approval_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  workflowId: uuid("workflow_id")
    .references(() => approvalWorkflows.id)
    .notNull(),
  action: text("action").notNull(),
    // 'submitted' | 'reviewed' | 'approved' | 'rejected' | 'revision_requested'
  fromStatus: text("from_status").notNull(),
  toStatus: text("to_status").notNull(),
  actorId: uuid("actor_id")
    .references(() => profiles.id)
    .notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
})
```

### Campaigns Table Extension

```typescript
// Add to existing campaigns table
export const campaigns = pgTable("campaigns", {
  // ... existing fields ...
  parentCampaignId: uuid("parent_campaign_id")
    .references(() => campaigns.id), // Self-reference for campaign re-run
  templateId: text("template_id"),    // Template used to create this campaign (string ID, not FK)
})
```

### Selective Copy Regeneration

```typescript
// Pattern: Regenerate a single copy variant for one platform

async function regenerateCopyVariant(
  campaignId: string,
  platform: string,
  variantLabel: string,
  brief: CampaignBrief,
  brandProfile: BrandProfileForGeneration,
): Promise<void> {
  // 1. Generate new copy for single platform
  const { generatePlatformCopy } = await import("@/lib/ai/claude")
  const result = await generatePlatformCopy(brief, brandProfile, [platform])

  // 2. Find the specific variant (A/B/C/D)
  const variantIndex = ["A案", "B案", "C案", "D案"].indexOf(variantLabel)
  const newVariant = result.platforms[0]?.variants[variantIndex]

  if (!newVariant) throw new Error(`Variant ${variantLabel} not found in generation result`)

  // 3. Update the specific copy variant row
  await db
    .update(copyVariants)
    .set({
      headline: newVariant.headline,
      bodyText: newVariant.body,
      ctaText: newVariant.cta,
      hashtags: newVariant.hashtags,
      createdAt: new Date(), // Reset timestamp
    })
    .where(
      and(
        eq(copyVariants.campaignId, campaignId),
        eq(copyVariants.platform, platform),
        eq(copyVariants.variantLabel, variantLabel),
      )
    )
}
```

---

## Database Schema Design

### New Tables Summary

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `approval_workflows` | One-to-one with campaigns, tracks approval status | `campaignId`, `status`, `submittedBy`, `reviewedBy`, `approvedBy`, `version` |
| `approval_history` | Audit trail of all approval actions | `workflowId`, `action`, `fromStatus`, `toStatus`, `actorId`, `comment` |
| `qa_reports` | Stores QA agent validation results per campaign | `campaignId`, `overallScore`, `keigoResult`, `brandResult`, `visualResult` |

### Modified Tables Summary

| Table | Changes | Purpose |
|-------|---------|---------|
| `campaigns` | Add `parentCampaignId` (self-ref FK), `templateId` (text) | Campaign re-run tracking, template association |
| `campaigns` | Add `approvalStatus` (text, denormalized from approval_workflows) | Quick access to approval state without join |

### Existing Role Mapping for Approvals

The existing `teamMembers.role` column supports `admin | editor | viewer`. Map directly to approval roles:

| Team Role | Approval Role | Allowed Actions |
|-----------|--------------|-----------------|
| `editor` | Creator (tantousha) | Submit for review, revise after rejection |
| `admin` | Reviewer + Approver (kakarichou/buchou) | Review, approve, reject, request revision |
| `viewer` | Observer | View-only, no approval actions |

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tool-based structured output (forced tool use) | `output_config.format` with JSON schema + `strict: true` tools | Nov 2025 (GA Feb 2026) | QA agent can use either approach. `output_config.format` is cleaner for pure data extraction. `strict: true` tools better when Claude also needs reasoning text. Existing code uses tool-based approach -- keep for consistency |
| XState v4 for state machines | XState v5 (actor-based) | Dec 2023 | If state machine is needed, use v5. But for linear approval flow, skip XState entirely |
| Manual JSON validation | Anthropic SDK `zodOutputFormat` helper | Nov 2025 | Use Zod schemas with Anthropic SDK for automatic JSON schema generation and validation |

**Deprecated/outdated:**
- `output_format` parameter: Moved to `output_config.format`. Old parameter still works but is deprecated. Use `output_config.format` for new code.
- Anthropic beta header `structured-outputs-2025-11-13`: No longer needed. Structured outputs are GA.

---

## Open Questions

1. **Trend Agent Data Source**
   - What we know: SerpApi ($50/mo) provides Google Trends Japan data via npm package. Claude can synthesize trends from training data. Google launched an official Trends API in 2025 (alpha, limited).
   - What's unclear: How fresh must trend data be? Is Claude's synthesis (training cutoff) sufficient for "trending insights", or do users need real-time data?
   - Recommendation: Start with Claude synthesis (zero cost, no external dependency). Add SerpApi integration as an optional enhancement in a future iteration. The trend agent's primary value is in creative direction influence, not real-time data accuracy.

2. **QA Agent Scope for Visual Coherence**
   - What we know: Claude's vision capability can analyze images. The existing pipeline generates composited images with text overlay.
   - What's unclear: Should the QA agent analyze actual image files (requiring vision API calls, which are more expensive) or just validate copy/metadata? How do you define "visual coherence" in a structured, automatable way?
   - Recommendation: Phase 5 MVP should focus on text-based QA (keigo, brand copy). Add visual coherence checking (using Claude vision on generated images) as an enhancement. Image analysis adds ~$0.05-0.10 per image in API cost.

3. **Approval Workflow Notifications**
   - What we know: The app has no notification system (no email, no push, no in-app notifications). Approval workflows typically need notifications ("Your campaign is ready for review").
   - What's unclear: Should Phase 5 build a notification system, or can approvers check the dashboard manually?
   - Recommendation: Skip real-time notifications for Phase 5. Add a "pending approvals" count badge on the dashboard sidebar and a dedicated "My Approvals" page. Email notifications are a Phase 6+ concern.

4. **Selective Regeneration Granularity**
   - What we know: Requirements say "individual assets (single headline, single image)". The current pipeline generates 4 copy variants (A/B/C/D) per platform.
   - What's unclear: Should regeneration be at variant level (regenerate just A-案 for Instagram) or field level (regenerate just the headline of A-案)?
   - Recommendation: Implement at variant level first (regenerate all fields of a single variant for one platform). Field-level regeneration (just the headline) is technically possible but adds UI complexity. Start coarser, refine later.

---

## Sources

### Primary (HIGH confidence)
- Existing codebase analysis: `src/lib/db/schema.ts`, `src/app/api/campaigns/route.ts`, `src/lib/ai/claude.ts` -- verified current architecture and data model
- [Anthropic Structured Outputs docs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) -- verified GA availability, `output_config.format` syntax, `strict: true` tool use, Zod integration
- [Drizzle ORM docs](https://orm.drizzle.team/docs/sql-schema-declaration) -- verified pgTable API, self-referencing FK support

### Secondary (MEDIUM confidence)
- [Ringi workflow patterns](https://www.inventurejapan.com/culture/business/ringi) -- verified sequential approval chain (tantousha -> kakarichou -> buchou)
- [XState v5 npm](https://www.npmjs.com/package/xstate) -- verified v5.26.0 latest, but determined unnecessary for this use case
- [SerpApi Google Trends](https://serpapi.com/integrations/node) -- verified Node.js integration exists with `serpapi` npm package

### Tertiary (LOW confidence)
- Google Trends official API (alpha 2025) -- mentioned in multiple sources but limited documentation available. Status may have changed.
- Claude training-based trend synthesis accuracy for JP market -- no benchmark data available. Recommended as MVP approach based on cost/complexity tradeoff, not verified accuracy.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all core libraries already in use, only adding `zod` (well-established)
- Architecture: HIGH -- patterns follow existing codebase conventions, no new paradigms
- Selective regeneration: MEDIUM-HIGH -- clear decomposition strategy, but cascading downstream invalidation needs careful implementation
- Approval workflow: HIGH -- simple linear state machine, maps directly to existing team roles
- QA agent: MEDIUM -- Claude is the right tool for keigo validation, but prompt engineering for low false-positive rate needs iteration
- Trend agent: MEDIUM-LOW -- data source decision deferred, Claude synthesis accuracy unverified
- Pitfalls: HIGH -- identified from direct codebase analysis of existing generation pipeline

**Research date:** 2026-02-09
**Valid until:** 2026-03-09 (30 days -- stable domain, no fast-moving dependencies)
