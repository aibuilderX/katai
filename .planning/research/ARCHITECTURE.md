# Architecture Patterns: v1.1 Integration Architecture

**Domain:** n8n 7-agent pipeline + Auto mode + Brand Memory integration with existing AI Content Studio
**Researched:** 2026-02-16
**Overall confidence:** HIGH for n8n integration patterns, MEDIUM for NotebookLM MCP, HIGH for Supabase Realtime

---

## Executive Summary

This document answers seven specific integration questions for the v1.1 milestone. The core architectural challenge is bridging a self-hosted n8n instance on a US VPS with a Next.js app on Vercel Tokyo, with campaign state living in Supabase PostgreSQL (also Tokyo). The existing codebase already has the critical integration seams -- webhook trigger, HMAC-signed callback, Supabase Realtime progress, and a clear data flow through the campaigns table. The new work is about replacing the single-shot webhook/callback pattern with a richer multi-stage agent pipeline while keeping the same seams.

**Key finding:** The existing architecture is well-suited for this expansion. The campaigns API route already triggers n8n via webhook and the n8n callback route already handles multi-stage progress updates. The expansion is additive, not reconstructive.

---

## 1. n8n Webhook Triggers from Next.js API Routes

### Current State (v1.0)

The existing integration pattern in `src/app/api/campaigns/route.ts` (lines 199-271) is already production-viable:

```
Next.js POST /api/campaigns
  -> Creates campaign record (status: "pending")
  -> Deducts credits
  -> Builds HMAC-SHA256 signed payload
  -> POSTs to N8N_WEBHOOK_URL with X-Signature header
  -> Updates campaign to "generating"
```

**Payload sent to n8n (current):**
```json
{
  "campaignId": "uuid",
  "brief": { "objective", "targetAudience", "platforms", "registerOverride", "creativeMoodTags", "creativeDirection", "referenceImageUrl", "campaignProductInfo" },
  "brandProfile": { "id", "name", "colors", "fontPreference", "defaultRegister", "toneTags", "toneDescription", "productCatalog", "positioningStatement", "brandStory", "targetMarket", "brandValues" }
}
```

### v1.1 Changes Required

**Expand the payload, do not restructure the pattern.** The HMAC-signed webhook trigger pattern is correct. Expand it with:

```typescript
// Additional fields for v1.1
interface V11WebhookPayload {
  campaignId: string
  brief: CampaignBrief          // existing
  brandProfile: BrandProfile     // existing

  // NEW: Brand Memory context (accumulated from past campaigns)
  brandMemory: {
    voiceExamples: string[]      // successful copy from past campaigns
    visualStyle: string[]        // image prompt patterns that worked
    avoidPatterns: string[]      // copy/visual patterns flagged in QA
    complianceHistory: string[]  // past compliance issues to watch for
  } | null

  // NEW: Experience mode determines agent behavior
  mode: "auto" | "guided" | "pro"

  // NEW: Auto mode brief (replaces structured brief for auto mode)
  autoModeBrief?: {
    conversationTranscript: string  // the 5 Q&A exchanges
    extractedIntent: string         // structured intent from conversation
  }

  // NEW: Callback URL for multi-stage progress updates
  callbackUrl: string  // base URL for n8n to POST progress updates back
}
```

**Callback URL pattern:** Instead of a single completion callback, n8n sends progress updates per agent stage:

```
POST {callbackUrl}/progress   -> stage-by-stage updates (agent started, agent completed)
POST {callbackUrl}/result     -> final campaign results (copy, images, video, audio)
POST {callbackUrl}/error      -> agent-level error reporting
```

All three endpoints live under `/api/webhooks/n8n/` and share the same HMAC verification. The existing `/api/webhooks/n8n/route.ts` (504 lines) needs to be split into a route group:

```
src/app/api/webhooks/n8n/
  route.ts           -> existing completion handler (rename to result.ts logic)
  progress/route.ts  -> NEW: per-agent progress updates
  error/route.ts     -> NEW: granular error reporting
```

Or more practically, keep the single route.ts and use the `stage` field in the existing payload to differentiate -- the current code already has stage-specific handling (lines 428-447). **Recommendation: keep single endpoint, extend the stage enum.**

### Confidence: HIGH
The existing pattern is proven. The extension is additive. No structural changes needed to the trigger mechanism.

---

## 2. n8n 7-Agent Pipeline Architecture

### Recommended n8n Workflow Structure

**Use the Orchestrator pattern with Execute Sub-workflow nodes**, not the AI Agent Tool pattern. The reasons:

1. **AI Agent Tool nodes** delegate tool selection to the LLM, which adds unpredictability. Your 7-agent pipeline has a deterministic execution order with known parallel branches -- this is orchestration, not autonomous tool selection.
2. **Execute Sub-workflow nodes** give you explicit control over data passing, error handling, and parallel execution via n8n's built-in branching.
3. **Queue mode compatibility** -- sub-workflows dispatched via Execute Sub-workflow are properly queued and distributed to workers.

### Workflow Topology

```
[Webhook Trigger: campaign-start]
    |
    v
[1. Campaign Orchestrator Agent] (sub-workflow)
    |  Classifies brief: Schwartz value, LF8 drive, SB7 archetype, register
    |  Determines parallel branch requirements
    |  Sends progress callback: "orchestrator_started"
    |
    v
[2. Strategic Insight Agent] (sub-workflow)
    |  NotebookLM MCP query for domain intelligence
    |  Market positioning analysis
    |  Sends progress callback: "strategic_insight_complete"
    |
    +-----+-----+-----+
    |     |     |     |
    v     v     v     |
[3a]  [3b]  [3c]    |  <- PARALLEL BRANCH (via n8n Split In Batches or explicit branching)
Copy  Visual Audio   |
    |     |     |     |
    v     v     v     |
[Merge] <---------+  |
    |                 |
    v                 v
[4. Critique Loop] (conditional)
    |  QA validation + compliance check
    |  If issues found: loop back to relevant agent (max 2 iterations)
    |  Sends progress callback: "critique_complete"
    |
    v
[5. Localization Agent] (sub-workflow)
    |  Final keigo/register polish
    |  Kinsoku shori validation
    |
    v
[6. Media Intelligence Agent] (sub-workflow)
    |  Platform-specific optimization
    |  Final compliance auto-rewrite if needed
    |
    v
[HTTP Request: POST callback with final results]
```

### Sub-Workflow Design Pattern

Each agent sub-workflow follows this internal structure:

```
[Execute Sub-workflow Trigger]
    |  Receives: campaignId, brief, brandProfile, brandMemory, priorAgentOutputs
    |
    v
[Set Node: Build system prompt]
    |  Injects brand memory into system prompt
    |  Injects prior agent outputs as context
    |
    v
[AI Agent Node OR HTTP Request to Claude API]
    |  For simple agents: direct Claude API call via HTTP Request node
    |  For complex agents: AI Agent node with tool access
    |
    v
[HTTP Request: Send progress callback to Next.js]
    |  POST to callbackUrl with { stage, agentName, status }
    |
    v
[Return output to parent workflow]
```

**Recommendation: Use HTTP Request nodes to call Claude API directly** rather than the built-in AI Agent node for most agents. Reasons:
- Full control over the prompt structure (system prompt injection of brand memory)
- Structured tool output (the existing codebase pattern with `tool_choice: { type: "tool" }`)
- No LangChain abstraction overhead
- The existing `claude.ts` patterns can be directly translated to n8n HTTP Request JSON bodies

**Exception:** The Campaign Orchestrator agent benefits from the AI Agent node because it needs to make branching decisions based on brief analysis.

### Parallel Branch Execution

For the Copy + Visual + Audio parallel branch:

```
[Split In Batches or explicit IF branching]
    |
    +-> [Execute Sub-workflow: Copywriter Agent]
    |       Returns: copyVariants[]
    |
    +-> [Execute Sub-workflow: Art Director Agent]
    |       Returns: imagePrompts[], imageUrls[]
    |
    +-> [Execute Sub-workflow: Audio Agent]
    |       Returns: voiceoverUrl, videoUrls[]
    |
    v
[Merge Node: "Merge By Index" or "Wait for All"]
    Combines outputs from all three branches
```

**Critical n8n behavior:** n8n processes items sequentially within a single execution path. For true parallel execution:

1. **Option A (recommended):** Use three separate Execute Sub-workflow nodes connected to a Merge node. n8n dispatches sub-workflows to available workers in queue mode, achieving actual parallelism.
2. **Option B:** Use the Wait node with webhook callbacks. The parent workflow fires off three sub-workflows, each posts back to a Wait node's resume URL when done. This is the "asynchronous processing with webhooks" pattern.

**Recommendation: Option A** for simplicity. Option B is more robust for very long-running agents but adds complexity.

### State Passing Between Agents

State flows forward through the pipeline via the Execute Sub-workflow data passing mechanism:

```typescript
// Data passed to each sub-workflow
interface AgentInput {
  campaignId: string
  brief: CampaignBrief
  brandProfile: BrandProfile
  brandMemory: BrandMemory | null

  // Accumulated outputs from prior agents
  pipeline: {
    orchestratorClassification?: {
      schwartzValue: string
      lf8Drive: string
      sb7Archetype: string
      register: string
      strategicBrief: string
    }
    strategicInsight?: {
      marketContext: string
      competitorIntelligence: string
      trendRecommendations: string[]
    }
    copyOutput?: {
      variants: CopyVariant[]
      complianceNotes: string[]
    }
    visualOutput?: {
      imagePrompts: string[]
      imageUrls: string[]
    }
    audioOutput?: {
      voiceoverUrl: string
      videoUrls: string[]
    }
  }

  callbackUrl: string
}
```

Each agent reads from `pipeline` and adds its output to it. The parent workflow accumulates the pipeline state by merging sub-workflow outputs.

### Critique Loop Implementation

The critique loop is a conditional branch, not an infinite loop:

```
[QA + Compliance Check]
    |
    v
[IF: issues.length > 0 AND iterationCount < 2]
    |                                |
    [true]                          [false]
    |                                |
    v                                v
[Route to relevant agent]    [Continue to Localization]
    |
    v
[Re-run QA + Compliance]
    |
    v
[Increment iterationCount]
    |
    v
[Loop back to IF check]
```

Use n8n's built-in Loop Over Items or a simple IF + Set node pattern for iteration counting.

### Confidence: HIGH
n8n's sub-workflow and queue mode patterns are well-documented and widely used. The Execute Sub-workflow approach gives explicit control over the pipeline flow.

---

## 3. NotebookLM MCP Server as HTTP Service

### Current Landscape Assessment

**This is the lowest-confidence area of the architecture.** The situation as of February 2026:

1. **NotebookLM Enterprise API** (Google Cloud): Provides notebook management (create, get, list, delete, share, add sources) but does NOT yet have a chat/query endpoint for asking questions and getting answers. The chat endpoint is "planned" but not shipped.

2. **notebooklm-mcp** (community package, PleasePrompto/notebooklm-mcp): An MCP server that uses browser automation to interact with NotebookLM's web UI. Supports query, library management, and citation-backed answers. Authentication is browser-based (Google OAuth via Chrome window), then persists locally.

3. **n8n MCP Client Tool node**: Currently supports SSE transport only. Streamable HTTP support exists for MCP Server Trigger but NOT for the MCP Client node. This creates a transport gap.

### Architecture Options

**Option A: Direct HTTP wrapper around notebooklm-mcp (Recommended)**

Deploy the notebooklm-mcp package as a long-running service on the US VPS (same machine as n8n or the KL VPS), wrapped with a thin HTTP/REST layer:

```
[n8n HTTP Request Node]
    |
    | POST /query { notebookId, question }
    |
    v
[Express/Fastify wrapper around notebooklm-mcp]
    |
    | MCP protocol (stdio)
    |
    v
[notebooklm-mcp process]
    |
    | Browser automation
    |
    v
[NotebookLM web UI]
```

**Implementation:**
```javascript
// wrapper-server.js -- thin HTTP layer
import express from 'express'
import { spawn } from 'child_process'

const app = express()
app.post('/query', async (req, res) => {
  const { notebookId, question } = req.body
  // Send MCP request to notebooklm-mcp process via stdio
  // Return response as JSON
})
```

**Pros:** Works today, no dependency on Google's API timeline, n8n calls it via standard HTTP Request node.
**Cons:** Browser automation is fragile, Google auth session expires, rate limits unknown.

**Option B: Wait for NotebookLM Enterprise chat API**

Google's Enterprise API will eventually ship a chat endpoint. When it does, n8n calls it directly via HTTP Request node with Google Cloud auth (service account bearer token).

**Pros:** Official, reliable, no browser automation.
**Cons:** Unclear timeline, Enterprise pricing, may not ship in time for v1.1.

**Option C: Replace NotebookLM with Gemini API + document grounding**

Use Google's Gemini API with document grounding (upload PDFs/docs as context). This achieves the same outcome -- grounded, citation-backed answers from your knowledge base -- without the NotebookLM abstraction.

```
[n8n HTTP Request Node]
    |
    | POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent
    | Body: { contents, systemInstruction, tools: [{ googleSearchRetrieval }] }
    |
    v
[Gemini API with grounding]
```

**Pros:** Official API, reliable, well-documented, no browser automation.
**Cons:** Different grounding mechanism (Google Search or uploaded files vs. curated notebooks), need to manage document uploads.

### Recommendation

**Use Option A (HTTP wrapper) for initial v1.1 implementation, with Option C as the production fallback.**

The 5 themed notebooks (Frameworks, JP Market, Platform Specs, Copywriting, Per-client brand) are fundamentally a knowledge retrieval problem. For v1.1:

1. **Prototype phase:** Deploy notebooklm-mcp with HTTP wrapper on VPS. Set up 5 notebooks. n8n queries them via HTTP Request nodes.
2. **Production phase:** If browser automation proves too fragile, migrate to Gemini API with uploaded source documents. The n8n integration point (HTTP Request node) remains identical -- only the URL and payload format change.

### Auth Persistence

For the notebooklm-mcp approach:
- Initial auth: Run `notebooklm-mcp` once interactively, complete Google OAuth in browser
- Credentials persist to `~/.config/notebooklm-mcp/`
- Session lifetime: Unclear, likely weeks. Monitor for auth failures and re-auth manually when needed.
- **Mitigation:** Add a health-check endpoint to the wrapper that queries a known notebook. n8n checks this before each pipeline run. If auth is dead, skip NotebookLM queries and fall back to Claude's training data (degraded but functional).

### Rate Limit Handling

No documented rate limits for NotebookLM (web UI automation) or for the Enterprise API (alpha, limits TBD). Defensive measures:
- Implement exponential backoff in the HTTP wrapper (3 retries, 2s/4s/8s)
- Cache responses by (notebookId + question hash) with 1-hour TTL in Redis (already available for n8n queue mode)
- Limit to 2-3 queries per campaign pipeline run (Strategic Insight agent only)

### Confidence: LOW-MEDIUM
The NotebookLM integration is the most fragile part of the architecture. Browser automation is inherently brittle. The fallback to Gemini API grounding is well-understood but changes the knowledge management workflow.

---

## 4. Auto Mode Brief Builder

### Current Brief Flow

```
/campaigns/new (page.tsx)
  -> TemplatePicker (4 JP campaign templates)
  -> BriefForm (structured form: brand, objective, audience, platforms, register, creative direction, product info)
  -> POST /api/campaigns (creates campaign, triggers n8n)
  -> Redirect to /campaigns/[id] (GenerationProgress component)
```

The BriefForm component (`src/components/brief/brief-form.tsx`, 334 lines) is a traditional structured form with 8 sections.

### Auto Mode Design

**Auto mode replaces the TemplatePicker + BriefForm with a conversational interface** that asks 5 questions and builds the brief invisibly:

```
/campaigns/new (page.tsx) -- MODIFIED
  -> NEW: ModeSelector (Auto / Guided / Pro toggle)
  |
  +-> [Auto mode selected]
  |     -> NEW: AutoBriefChat component (conversational 5-question flow)
  |     -> Internally builds CampaignBrief from conversation
  |     -> POST /api/campaigns with { mode: "auto", autoModeBrief: {...} }
  |
  +-> [Guided mode selected]
  |     -> Existing BriefForm with additional guidance tooltips
  |
  +-> [Pro mode selected]
        -> Existing BriefForm (unchanged)
```

### AutoBriefChat Component Architecture

```typescript
// src/components/brief/auto-brief-chat.tsx -- NEW

interface AutoBriefChatProps {
  brands: BrandOption[]
  onComplete: (brief: CampaignBrief, transcript: string) => void
}

// 5-question flow:
const AUTO_QUESTIONS = [
  { id: "brand", question: "どのブランドのキャンペーンですか？", type: "brand-select" },
  { id: "goal", question: "何を達成したいですか？（例：新商品の認知、セール告知、フォロワー増加）", type: "free-text" },
  { id: "audience", question: "誰に届けたいですか？", type: "free-text" },
  { id: "platforms", question: "どこに投稿しますか？", type: "platform-select" },
  { id: "context", question: "他に伝えたいことはありますか？（商品情報、季節、予算感など）", type: "free-text" },
]
```

**The conversational interface is NOT a chatbot.** It is a guided multi-step form with natural language presentation. The key insight from the PRD is "invisible strategic reasoning" -- the system converts casual answers into a proper CampaignBrief without the user understanding the underlying structure.

### Brief Translation Layer

The Auto mode needs a server-side function that converts the conversational transcript into a structured CampaignBrief:

```typescript
// src/lib/ai/brief-builder.ts -- NEW

export async function buildBriefFromConversation(
  transcript: string,
  brandProfile: BrandProfile
): Promise<CampaignBrief> {
  // Call Claude to extract structured brief from natural language
  // Uses tool_choice pattern from existing codebase
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250514",
    tools: [EXTRACT_BRIEF_TOOL],
    tool_choice: { type: "tool", name: "extract_brief" },
    messages: [{ role: "user", content: transcript }],
  })
  // Extract and return structured brief
}
```

**OR** this can happen in the first agent (Campaign Orchestrator) in n8n. The transcript goes to n8n, and the orchestrator agent does the extraction as its first step.

**Recommendation:** Do the extraction in n8n's Campaign Orchestrator agent. Reasons:
1. Keeps the Next.js layer thin (just pass the transcript)
2. The orchestrator already needs to classify the brief (Schwartz/LF8/SB7)
3. One fewer Claude API call from Vercel (saves on serverless duration)

### Page Routing

The `/campaigns/new` page needs to be modified, NOT replaced:

```typescript
// src/app/(dashboard)/campaigns/new/page.tsx -- MODIFIED

export default function NewCampaignPage() {
  const [mode, setMode] = useState<"auto" | "guided" | "pro">("auto") // default to auto

  return (
    <div>
      <ModeSelector value={mode} onChange={setMode} />

      {mode === "auto" && <AutoBriefChat brands={brands} onComplete={handleAutoSubmit} />}
      {mode === "guided" && <BriefForm initialValues={initialValues} showGuidance />}
      {mode === "pro" && <BriefForm initialValues={initialValues} />}
    </div>
  )
}
```

### Data Flow Change

The `POST /api/campaigns` endpoint needs a minor extension:

```typescript
// Add to request body handling in campaigns/route.ts
const { mode = "pro", autoModeBrief, ...existingFields } = body

// If auto mode, the brief fields may be sparse
// The n8n orchestrator will fill in the gaps
const brief = mode === "auto"
  ? { ...minimalBrief, autoModeBrief }  // transcript + extracted intent
  : existingBrief                        // full structured brief (existing behavior)
```

### Confidence: HIGH
This is a pure frontend addition with a minor API extension. The existing BriefForm remains unchanged for Guided/Pro modes. The conversational interface is a new component, not a rewrite.

---

## 5. Brand Memory as New Supabase Tables

### Schema Design

Brand Memory accumulates learnings from past campaigns. It feeds into agent system prompts via the webhook payload.

```sql
-- NEW TABLE: brand_memory
CREATE TABLE brand_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_profile_id UUID NOT NULL REFERENCES brand_profiles(id),
  team_id UUID NOT NULL REFERENCES teams(id),
  memory_type TEXT NOT NULL,  -- 'voice_example' | 'visual_style' | 'avoid_pattern' | 'compliance_note' | 'audience_insight' | 'performance_hint'
  content TEXT NOT NULL,
  source_campaign_id UUID REFERENCES campaigns(id),  -- which campaign generated this memory
  source_type TEXT NOT NULL,  -- 'auto_extracted' | 'user_feedback' | 'qa_result' | 'compliance_result'
  confidence REAL DEFAULT 0.8,  -- 0.0-1.0, decays over time or with contradicting signals
  metadata JSONB,  -- flexible: { platform, register, variant_label, issue_type, ... }
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX idx_brand_memory_brand ON brand_memory(brand_profile_id) WHERE is_active = true;
CREATE INDEX idx_brand_memory_type ON brand_memory(brand_profile_id, memory_type) WHERE is_active = true;
```

### Drizzle Schema Addition

```typescript
// Add to src/lib/db/schema.ts

export const brandMemory = pgTable("brand_memory", {
  id: uuid("id").primaryKey().defaultRandom(),
  brandProfileId: uuid("brand_profile_id")
    .references(() => brandProfiles.id)
    .notNull(),
  teamId: uuid("team_id")
    .references(() => teams.id)
    .notNull(),
  memoryType: text("memory_type").notNull(),
  content: text("content").notNull(),
  sourceCampaignId: uuid("source_campaign_id").references(() => campaigns.id),
  sourceType: text("source_type").notNull(),
  confidence: real("confidence").default(0.8),
  metadata: jsonb("metadata"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
})
```

### Memory Population (Three Sources)

**Source 1: Post-campaign auto-extraction (n8n callback)**

When n8n returns campaign results, the callback handler extracts memories:

```typescript
// In /api/webhooks/n8n/route.ts -- after successful campaign completion

async function extractBrandMemories(campaignId: string, brandProfileId: string) {
  // Get the successful copy variants
  const variants = await db.select().from(copyVariants).where(eq(copyVariants.campaignId, campaignId))

  // Store the highest-performing copy patterns as voice examples
  for (const variant of variants) {
    if (variant.variantLabel === "A案") {
      await db.insert(brandMemory).values({
        brandProfileId,
        teamId,
        memoryType: "voice_example",
        content: `${variant.headline} | ${variant.bodyText}`,
        sourceCampaignId: campaignId,
        sourceType: "auto_extracted",
        metadata: { platform: variant.platform, register: variant.register },
      })
    }
  }
}
```

**Source 2: QA/Compliance results**

When QA or compliance checks flag issues, those become "avoid_pattern" memories:

```typescript
// After compliance check runs
for (const issue of complianceReport.keihyouhouIssues) {
  await db.insert(brandMemory).values({
    brandProfileId,
    teamId,
    memoryType: "avoid_pattern",
    content: `COMPLIANCE: ${issue.problematicText} -- ${issue.issue} (${issue.legalBasis})`,
    sourceCampaignId: campaignId,
    sourceType: "compliance_result",
    metadata: { category: issue.category, severity: issue.severity },
  })
}
```

**Source 3: User explicit feedback (future)**

A UI component where users mark copy variants as "good" or "bad", feeding into brand memory. This is lower priority for v1.1.

### Feeding Memory into Agent Prompts

The webhook payload builder in `campaigns/route.ts` queries brand memory before triggering n8n:

```typescript
// Before triggering n8n webhook
const memories = await db
  .select()
  .from(brandMemory)
  .where(
    and(
      eq(brandMemory.brandProfileId, brandProfileId),
      eq(brandMemory.isActive, true),
    )
  )
  .orderBy(desc(brandMemory.confidence))
  .limit(50)  // cap to avoid prompt bloat

const brandMemoryContext = {
  voiceExamples: memories.filter(m => m.memoryType === "voice_example").map(m => m.content).slice(0, 10),
  visualStyle: memories.filter(m => m.memoryType === "visual_style").map(m => m.content).slice(0, 5),
  avoidPatterns: memories.filter(m => m.memoryType === "avoid_pattern").map(m => m.content).slice(0, 10),
  complianceHistory: memories.filter(m => m.memoryType === "compliance_note").map(m => m.content).slice(0, 5),
}
```

In n8n, each agent's system prompt gets a Brand Memory section:

```
## Brand Memory (learned from past campaigns)

### Voice Examples (copy that worked well for this brand):
${voiceExamples.join('\n')}

### Patterns to Avoid:
${avoidPatterns.join('\n')}

### Compliance History (past issues to watch for):
${complianceHistory.join('\n')}
```

### Memory Decay

Memories should decay over time. A cron job (n8n scheduled workflow or Supabase pg_cron) runs weekly:

```sql
-- Reduce confidence of old memories
UPDATE brand_memory
SET confidence = confidence * 0.95, updated_at = now()
WHERE is_active = true AND created_at < now() - interval '30 days';

-- Deactivate very low confidence memories
UPDATE brand_memory
SET is_active = false, updated_at = now()
WHERE confidence < 0.3;
```

### Confidence: HIGH
Standard Supabase table additions with Drizzle ORM. The population and querying patterns are straightforward. Memory decay is a simple scheduled job.

---

## 6. Real-Time Campaign Progress

### Current State (v1.0)

The existing system already has real-time progress working:

1. **Supabase Realtime** via `postgres_changes` on the campaigns table (configured in `useCampaignProgress` hook, `src/hooks/use-campaign-progress.ts`)
2. **Fallback polling** every 5 seconds via `GET /api/campaigns/[id]`
3. **Progress data model** in the `CampaignProgress` JSONB column on campaigns table

The `GenerationProgress` component (`src/components/campaign/generation-progress.tsx`) renders step-by-step progress with animated progress bar.

### v1.1 Changes Required

**The existing Supabase Realtime pattern works.** The changes are to the progress data model, not the transport.

**Expand CampaignProgress for 7-agent granularity:**

```typescript
export interface CampaignProgress {
  // Existing fields (keep for backward compat)
  stage: string
  copyStatus: ProgressStatus
  imageStatus: ProgressStatus
  compositingStatus?: ProgressStatus
  platformResizeStatus?: ProgressStatus
  emailStatus?: ProgressStatus
  voiceoverStatus?: ProgressStatus
  videoStatus?: ProgressStatus
  avatarStatus?: ProgressStatus
  percentComplete: number
  currentStep: string

  // NEW: Agent-level progress for v1.1
  agents?: {
    orchestrator?: AgentProgress
    strategicInsight?: AgentProgress
    creativeDirector?: AgentProgress
    copywriter?: AgentProgress
    artDirector?: AgentProgress
    localization?: AgentProgress
    mediaIntelligence?: AgentProgress
  }
  critiqueLoop?: {
    iteration: number
    maxIterations: number
    issuesFound: number
    autoRewrites: number
  }
}

interface AgentProgress {
  status: "pending" | "running" | "complete" | "failed" | "skipped"
  startedAt?: string
  completedAt?: string
  summary?: string  // brief description of what the agent produced
}
```

**n8n sends progress updates by POSTing to the existing callback endpoint.** Each agent sub-workflow sends a progress callback at start and completion:

```json
{
  "campaignId": "uuid",
  "status": "success",
  "stage": "agent_progress",
  "agentProgress": {
    "agentName": "strategic_insight",
    "status": "complete",
    "summary": "市場分析完了：美容業界の2026年春トレンドを特定"
  }
}
```

The n8n callback handler merges this into the existing progress JSONB (the merge pattern already exists in lines 428-447 of the current route.ts).

### Why NOT WebSocket

The question asks about WebSocket vs Supabase Realtime. **Use Supabase Realtime (postgres_changes), not raw WebSocket.** Reasons:

1. **Already working.** The hook and subscription are built and deployed.
2. **Vercel edge compatibility.** Vercel serverless functions cannot maintain WebSocket connections. Supabase Realtime runs outside of Vercel -- the client connects directly to Supabase's Realtime server.
3. **Supabase Realtime IS WebSocket** under the hood. The client SDK opens a persistent WebSocket to Supabase's multiplexer. You get WebSocket performance without managing WebSocket infrastructure.
4. **The campaigns table already has REPLICA IDENTITY configured** (mentioned in the codebase comments).

### Performance Assessment

For this use case (progress updates during campaign generation):
- **Concurrent connections per campaign:** 1-3 (the user who created the campaign, maybe team members)
- **Update frequency:** Every 5-30 seconds (per agent completion)
- **Total concurrent campaigns:** Target is 3

This is well within Supabase Realtime's documented limits (10,000+ concurrent connections, <100ms latency). No performance concerns.

### UI Changes

The `GenerationProgress` component needs expansion to show agent-level progress:

```typescript
// Enhanced progress display
function renderAgentProgress(agents: Record<string, AgentProgress>) {
  return Object.entries(agents).map(([name, progress]) => (
    <div key={name}>
      {getStepIcon(progress.status)}
      <span>{AGENT_LABELS[name]}</span>
      {progress.summary && <span className="text-xs text-text-muted">{progress.summary}</span>}
    </div>
  ))
}
```

### Confidence: HIGH
The existing infrastructure handles this perfectly. The changes are data model expansion and UI updates.

---

## 7. Existing Direct Generation Fallback Code

### Current State

The `runDirectGeneration` function in `src/app/api/campaigns/route.ts` (lines 308-1020) is a 712-line function that replicates the entire generation pipeline in-process:

1. Copy generation (Claude API)
2. Image generation (Flux API)
3. Japanese text compositing
4. Platform resize
5. Email HTML generation
6. Video/audio pipeline (ElevenLabs, Kling, Runway, HeyGen)

It runs when `N8N_WEBHOOK_URL` is not configured (the `else` branch at line 271).

### Assessment

**This code was essential for v1.0 development** (allowed testing without n8n) but is problematic for v1.1:

1. **Vercel serverless limits:** `maxDuration = 300` (5 minutes). The full pipeline with video can exceed this.
2. **No agent intelligence:** Direct generation skips all the 7-agent orchestration -- no strategic insight, no critique loop, no compliance auto-rewrite.
3. **Maintenance burden:** Any pipeline change needs to be mirrored in both n8n workflows AND the direct generation function.
4. **Memory pressure:** Running Claude + Flux + Kling + Runway + HeyGen sequentially in a single serverless function is resource-intensive.

### Recommendation: ADAPTER-WRAP, Then Deprecate

**Phase 1 (v1.1 build phase): Keep as-is with a deprecation marker.**

```typescript
/**
 * @deprecated v1.1 -- Direct generation fallback. Will be removed once n8n pipeline is
 * verified in production. All new features (brand memory, critique loop, compliance
 * auto-rewrite) are NOT available in this path.
 */
async function runDirectGeneration(...) { /* existing code */ }
```

**Phase 2 (after n8n pipeline is stable): Convert to a thin adapter that calls n8n.**

If the n8n webhook is temporarily down, instead of running the full pipeline locally, queue the campaign and retry the webhook trigger:

```typescript
// Replace direct generation with retry logic
async function fallbackGeneration(campaignId: string) {
  // Mark campaign as "queued" instead of running locally
  await db.update(campaigns).set({
    status: "queued",
    progress: {
      stage: "queued",
      copyStatus: "pending",
      imageStatus: "pending",
      percentComplete: 0,
      currentStep: "パイプライン接続待ち...",
    }
  }).where(eq(campaigns.id, campaignId))

  // Schedule a retry in 30 seconds (via n8n scheduled workflow or Vercel cron)
  // When n8n comes back online, it picks up queued campaigns
}
```

**Phase 3 (v1.2+): Remove direct generation entirely.** n8n is the sole orchestration path.

### What to Do NOW

1. **Do NOT gut it.** It is a functional safety net during v1.1 development.
2. **Do NOT update it** with v1.1 features (brand memory, critique loop, etc.). That defeats the purpose of moving to n8n.
3. **Mark it as deprecated** in code comments and add a log warning when it activates.
4. **Add a dashboard alert** if direct generation activates in production (means n8n is unreachable).

### Confidence: HIGH
The adapter-wrap strategy is the standard pattern for deprecating fallback paths. The existing code is stable and well-structured; it just should not grow any further.

---

## Integration Summary

### New Files to Create

| File | Purpose | Depends On |
|------|---------|------------|
| `src/components/brief/auto-brief-chat.tsx` | Conversational brief builder (Auto mode) | Brand data, existing UI components |
| `src/components/brief/mode-selector.tsx` | Auto/Guided/Pro toggle | None |
| `src/lib/db/schema.ts` (modified) | Add `brandMemory` table | Drizzle, existing schema |
| `src/lib/brand-memory/query.ts` | Query brand memories for webhook payload | brandMemory table |
| `src/lib/brand-memory/extract.ts` | Extract memories from campaign results | QA/compliance data |

### Existing Files to Modify

| File | Change | Risk |
|------|--------|------|
| `src/app/api/campaigns/route.ts` | Expand webhook payload (brandMemory, mode, autoModeBrief) | LOW -- additive |
| `src/app/api/webhooks/n8n/route.ts` | Handle agent progress updates, extract brand memories | MEDIUM -- refactor progress handling |
| `src/app/(dashboard)/campaigns/new/page.tsx` | Add mode selector, route to Auto/Guided/Pro | LOW -- additive |
| `src/components/campaign/generation-progress.tsx` | Render agent-level progress | LOW -- additive UI |
| `src/hooks/use-campaign-progress.ts` | Handle expanded CampaignProgress type | LOW -- backward compat |
| `src/lib/db/schema.ts` | Add brandMemory table, expand CampaignProgress type | LOW -- additive |
| `src/types/campaign.ts` | Expand CampaignBrief for auto mode | LOW -- additive |

### n8n Workflows to Build (All New)

| Workflow | Type | Purpose |
|----------|------|---------|
| `campaign-orchestrator-main` | Parent workflow | Receives webhook, dispatches to sub-workflows, sends callbacks |
| `agent-campaign-orchestrator` | Sub-workflow | Brief classification (Schwartz/LF8/SB7), pipeline routing |
| `agent-strategic-insight` | Sub-workflow | NotebookLM queries, market analysis |
| `agent-copywriter` | Sub-workflow | Platform-specific copy generation with brand memory |
| `agent-art-director` | Sub-workflow | Image prompt engineering, Flux generation |
| `agent-audio-video` | Sub-workflow | ElevenLabs, Kling/Runway/HeyGen orchestration |
| `agent-localization` | Sub-workflow | Keigo polish, kinsoku shori validation |
| `agent-media-intelligence` | Sub-workflow | Platform optimization, final compliance auto-rewrite |
| `critique-loop` | Sub-workflow | QA validation + compliance check + conditional re-generation |

### Data Flow Diagram (v1.1)

```
[Browser] ----HTTPS----> [Next.js Vercel Tokyo]
   ^                          |
   |                          | POST /api/campaigns
   |                          |   (HMAC-signed, expanded payload)
   |                          v
   |                     [n8n US VPS (queue mode + Redis)]
   |                          |
   |                          +-> [Campaign Orchestrator Agent]
   |                          |      |
   |                          |      +-> [Strategic Insight Agent]
   |                          |      |      +-> NotebookLM MCP (VPS)
   |                          |      |
   |                          |      +-> [Copywriter] -+
   |                          |      +-> [Art Director] +-> [Merge] -> [Critique Loop]
   |                          |      +-> [Audio/Video] -+       |
   |                          |                                 v
   |                          |                        [Localization Agent]
   |                          |                                 |
   |                          |                        [Media Intelligence]
   |                          |                                 |
   |                          +<--- POST callbacks (progress) --+
   |                          |     POST callback (results) ----+
   |                          v
   |  Supabase Realtime  [Supabase PostgreSQL Tokyo]
   |  (postgres_changes)      |
   +<-------------------------+
        campaigns.progress updated in real-time
```

### Build Order (Dependency-Respecting)

1. **Schema first:** Brand Memory table + CampaignProgress type expansion
2. **n8n main workflow + first agent** (Campaign Orchestrator) -- proves the webhook/callback loop
3. **Copywriter agent** -- validates the sub-workflow → parent data flow
4. **Progress UI expansion** -- visualize what's happening in the pipeline
5. **Parallel agents** (Art Director + Audio/Video) -- proves parallel branch + merge
6. **Critique loop** -- proves conditional re-execution
7. **Auto mode UI** -- conversational brief builder (independent of agent work)
8. **Brand Memory population + querying** -- feeds into agent prompts
9. **Strategic Insight + NotebookLM** -- lowest confidence, build last
10. **Localization + Media Intelligence** -- final polish agents

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Building Agent Intelligence in Next.js

**What:** Putting the 7-agent orchestration logic in Next.js API routes.
**Why bad:** Vercel serverless has 5-minute max execution. The full pipeline can take 3-8 minutes. Also couples orchestration to deployment platform.
**Instead:** All agent logic lives in n8n. Next.js is a thin trigger/callback layer.

### Anti-Pattern 2: Polling for Progress from n8n

**What:** n8n polling Supabase for "when is this campaign ready?"
**Why bad:** Unnecessary load, wasted n8n executions, latency.
**Instead:** Next.js pushes to n8n (webhook trigger), n8n pushes back (HTTP callback). No polling.

### Anti-Pattern 3: Storing Agent State in n8n Variables

**What:** Using n8n's built-in variables or workflow static data for pipeline state.
**Why bad:** Lost on workflow restart. Not visible to the Next.js app. Not auditable.
**Instead:** All state flows through the Supabase campaigns table (progress JSONB) and through sub-workflow input/output data passing.

### Anti-Pattern 4: Direct Supabase Writes from n8n

**What:** n8n writing directly to Supabase PostgreSQL to update campaign progress.
**Why bad:** Requires Supabase connection string in n8n (secret management across systems). Bypasses the application layer where business logic lives (credit refunds, error handling, brand memory extraction).
**Instead:** n8n sends all results back to Next.js via HMAC-signed HTTP callbacks. Next.js writes to Supabase. Single source of database access.

### Anti-Pattern 5: Cramming All Agents into One n8n Workflow

**What:** One massive workflow with all 7 agents as nodes.
**Why bad:** Unreadable, hard to debug, can't test agents independently, workflow editor performance degrades.
**Instead:** One parent orchestration workflow + 7+ sub-workflows. Each testable independently.

---

## Scalability Considerations

| Concern | At 3 concurrent campaigns | At 30 concurrent campaigns | At 300 concurrent campaigns |
|---------|---------------------------|----------------------------|-----------------------------|
| n8n queue | 1 worker handles all | 3-5 workers (add Redis concurrency) | Dedicated worker VPS |
| Supabase Realtime | Trivial (3-9 connections) | Fine (30-90 connections) | May need connection pooling |
| NotebookLM MCP | Rate limits unknown | Likely rate-limited | Need Gemini API migration |
| Claude API | Standard rate limits sufficient | May need tier upgrade | Batching or Enterprise plan |
| Vercel serverless | No issues | No issues | No issues (callbacks are fast) |
| US-Tokyo latency | ~120ms per callback | Same | Same |

---

## Sources

### Official Documentation
- [n8n Sub-workflows](https://docs.n8n.io/flow-logic/subworkflows/)
- [n8n Execute Sub-workflow](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.executeworkflow/)
- [n8n Wait Node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.wait/)
- [n8n Queue Mode](https://docs.n8n.io/hosting/scaling/queue-mode/)
- [n8n AI Agent Tool](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolaiagent/)
- [n8n MCP Server Trigger](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-langchain.mcptrigger/)
- [Supabase Realtime Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes)
- [Supabase Realtime Limits](https://supabase.com/docs/guides/realtime/limits)
- [NotebookLM Enterprise API](https://docs.cloud.google.com/gemini/enterprise/notebooklm-enterprise/docs/api-notebooks)

### Community / Third-Party
- [notebooklm-mcp (PleasePrompto)](https://github.com/PleasePrompto/notebooklm-mcp)
- [n8n Multi-Agent Systems Blog](https://blog.n8n.io/multi-agent-systems/)
- [n8n Parallel Async Processing Template](https://n8n.io/workflows/8578-run-multiple-tasks-in-parallel-with-asynchronous-processing-and-webhooks/)
- [n8n State Management for Long-Running Workflows](https://n8n.io/workflows/6269-state-management-system-for-long-running-workflows-with-wait-nodes/)
- [n8n MCP StreamableHTTP Community Discussion](https://community.n8n.io/t/support-mcp-streamablehttp-transport-for-mcp-clients-and-mcp-servers/111815)

### Codebase References
- `src/app/api/campaigns/route.ts` -- Campaign creation + n8n trigger + direct generation fallback
- `src/app/api/webhooks/n8n/route.ts` -- n8n callback handler (504 lines)
- `src/hooks/use-campaign-progress.ts` -- Supabase Realtime subscription
- `src/components/campaign/generation-progress.tsx` -- Progress UI
- `src/components/brief/brief-form.tsx` -- Existing structured brief form
- `src/lib/db/schema.ts` -- 14 tables, CampaignProgress type
- `src/lib/ai/compliance-agent.ts` -- Compliance check pattern
- `src/lib/ai/qa-agent.ts` -- QA validation pattern
- `src/lib/ai/video-pipeline.ts` -- Video orchestration pattern
