# Technology Stack -- v1.1 Additions

**Project:** AI Content Studio v1.1 (Full Pipeline + Auto Mode)
**Researched:** 2026-02-16
**Research mode:** Ecosystem (Stack dimension, subsequent milestone)
**Overall confidence:** MEDIUM-HIGH

**Scope:** This document covers ONLY the new stack additions for v1.1. The existing validated stack (Next.js 16, Tailwind v4, Drizzle ORM 0.45, Supabase, Stripe, fal.ai, Kling, Runway, ElevenLabs, HeyGen, BudouX, Sharp, Zustand, TanStack Query) is NOT re-documented here.

---

## 1. n8n 7-Agent Pipeline Stack

### n8n Version Upgrade

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| n8n | 2.x stable (currently ~2.8) | Orchestration platform upgrade | n8n 2.0 released Dec 2025, now the only supported line (1.x EOL March 2026). Draft/Publish workflow management prevents accidental production changes during iterative agent development. Task Runners enabled by default for secure code execution. | HIGH |

**Action required:** Upgrade self-hosted n8n from 1.x to 2.x. This is a hardening release, not a feature release -- migration is straightforward. The existing webhook trigger and HTTP Request patterns are unchanged.

**Key 2.0 changes affecting this project:**
- Draft/Publish model: Save edits without affecting production workflows. Essential for iterating on 7 agent sub-workflows without breaking active campaigns.
- Task Runners: All JavaScript Code nodes now execute in isolated environments. Security improvement for running prompt assembly code.
- Credential API: New PATCH endpoint for updating credentials by ID -- useful for API key rotation.
- 1.x support ended March 2026. No security patches after that.

### n8n AI Agent Node Architecture

| Technology | Node Type | Purpose | Why | Confidence |
|------------|-----------|---------|-----|------------|
| AI Agent (Tools Agent) | Root node | Core agent reasoning loop per sub-workflow | LangChain-powered reasoning. The Tools Agent variant is correct for this use case because each specialized agent needs to call specific tools (HTTP requests, vector search, workflow calls). | HIGH |
| Anthropic Chat Model | Sub-node | LLM connection for agents | Connects the AI Agent node to Claude. Supports claude-sonnet-4-5, claude-opus-4-6. Configure model per agent: Opus for Strategic Insight + Localization (complex reasoning), Sonnet for Copywriter + Art Director (faster, sufficient quality). | HIGH |
| Call n8n Workflow Tool | Sub-node | Sub-workflow delegation | Allows the master orchestrator agent to call specialized agent sub-workflows as tools. Each sub-workflow has its own AI Agent node with a focused system prompt and tool set. Define input/output schemas in the Execute Sub-workflow trigger node. | HIGH |
| AI Agent Tool | Sub-node | Agent-as-tool nesting | Allows the orchestrator to call another AI Agent directly as a tool, without a separate sub-workflow. Use for lightweight agents (e.g., QA validation pass). For the 7 specialized agents, prefer sub-workflows for isolation and reusability. | HIGH |
| MCP Client Tool | Sub-node | NotebookLM knowledge access | Connects n8n AI Agent nodes to external MCP servers (NotebookLM) via SSE or streamable HTTP transport. Supports Bearer auth. This is how agents query the research knowledge base at runtime. | HIGH |
| HTTP Request | Standard node | API calls to AI providers | Used within sub-workflows for non-LLM calls: Flux image gen, Seedance video gen, ElevenLabs TTS, HeyGen avatar. Same pattern as v1.0. | HIGH |
| Execute Sub-workflow | Standard node | Deterministic sub-workflow calls | For non-agent sub-workflows (compositing, platform resize, asset packaging). Unlike AI Agent Tool/Call n8n Workflow Tool, this is direct invocation without LLM reasoning. | HIGH |

### Multi-Agent Orchestration Pattern

**Architecture: Orchestrator + 7 Sub-Workflow Agents**

The master workflow uses the **Orchestrator pattern** -- a primary AI Agent that delegates to specialized agents via Call n8n Workflow Tool nodes. Each specialized agent is a separate n8n workflow with its own AI Agent node, system prompt, and tools.

```
Master Orchestrator Workflow (Webhook Trigger)
  |
  v
AI Agent (Orchestrator) -- claude-opus-4-6
  |
  |-- Tool: "strategic_insight_agent" (Call n8n Workflow)
  |-- Tool: "creative_director_agent" (Call n8n Workflow)
  |-- Tool: "copywriter_agent" (Call n8n Workflow)
  |-- Tool: "localization_agent" (Call n8n Workflow)
  |-- Tool: "art_director_agent" (Call n8n Workflow)
  |-- Tool: "media_intelligence_agent" (Call n8n Workflow)
  |-- Tool: "notebooklm_knowledge_query" (MCP Client Tool)
  |-- Tool: "update_campaign_progress" (HTTP Request to Next.js)
  |
  v
Respond to Webhook (return execution ID)
```

Each sub-workflow agent:
```
Execute Sub-workflow Trigger (input schema defined)
  |
  v
AI Agent (Specialized) -- model varies per agent
  |-- Tool: MCP Client (NotebookLM knowledge access)
  |-- Tool: HTTP Request (provider API calls, if needed)
  |-- Tool: Code (data transformation, prompt assembly)
  |
  v
Return structured output to parent
```

**Agent-to-Model mapping:**

| Agent | Model | Temperature | Rationale |
|-------|-------|-------------|-----------|
| Orchestrator | claude-opus-4-6 | 0.1 | Routing decisions require highest reasoning |
| Strategic Insight | claude-opus-4-6 | 0.3 | Complex strategic analysis, persona creation |
| Creative Director | claude-opus-4-6 | 0.2 | Quality evaluation, holistic review |
| Copywriter | claude-sonnet-4-5 | 0.7 | Creative text generation, higher temp for variety |
| JP Localization | claude-opus-4-6 | 0.1 | Keigo accuracy requires precision, not creativity |
| Art Director | claude-sonnet-4-5 | 0.4 | Prompt engineering for image/video generation |
| Media Intelligence | claude-sonnet-4-5 | 0.2 | Platform specs are factual, low creativity needed |

**Why this pattern over alternatives:**
- **Not routing pattern (text classifier + switch):** The 7-agent pipeline has dynamic dependencies (Localization reviews Copywriter output and may request rewrites). An orchestrator agent can reason about the review loop. A static router cannot.
- **Not flat parallel branches:** v1.0 used flat parallel branches with Merge nodes. This works for independent API calls but cannot handle the inter-agent critique loops (Creative Director reviewing all outputs, Localization sending copy back to Copywriter).
- **Not single monolithic agent:** One agent with 7 roles would have a 30,000+ token system prompt and degrade in quality. Specialized sub-workflows keep each agent focused.

### n8n Streaming and Progress Updates

| Technology | Feature | Purpose | Confidence |
|------------|---------|---------|------------|
| n8n Webhook Streaming (SSE) | Response mode: Streaming | Stream real-time execution progress back to the Next.js app as the workflow runs. Agent tool-call-start/tool-call-end events, node-execute-before/after events. | MEDIUM |
| Respond to Webhook (Streaming) | Enable Streaming option | Alternative to SSE -- stream partial results back as nodes complete. Requires trigger configured with Response mode "Streaming". | MEDIUM |

**Recommendation:** For v1.1, continue using the existing webhook callback pattern (n8n fires HTTP POST to `/api/webhooks/n8n` after each stage) rather than adopting SSE streaming. Reasons:
1. The callback pattern is already built and proven in v1.0.
2. SSE streaming from n8n is a newer feature with community reports of edge cases.
3. The stage-based progress updates (copy done, images done, video done) provide sufficient granularity.
4. Supabase real-time subscriptions already push progress to the dashboard.

**Deferred to v1.2:** Evaluate SSE streaming for finer-grained agent progress (showing "Strategic Insight Agent is analyzing brief..." vs "Copywriter Agent is generating LINE variants...").

### n8n Environment Updates

| Setting | Value | Change from v1.0 | Reason |
|---------|-------|-------------------|--------|
| `N8N_AI_ENABLED` | true | New | Enable AI Agent nodes (disabled by default in n8n 2.0) |
| `EXECUTIONS_TIMEOUT` | 900 (15 min) | Up from 600 | 7-agent pipeline with critique loops takes longer than direct API calls |
| `EXECUTIONS_TIMEOUT_MAX` | 1200 (20 min) | Up from 900 | Hard ceiling for complex campaigns with video generation |
| `N8N_CONCURRENCY_PRODUCTION_LIMIT` | 3 | Down from 5 | Each 7-agent execution uses more memory than flat parallel branches |

---

## 2. Seedance 2.0 Video Generation

### Provider Strategy

Seedance 2.0 (ByteDance) launched February 2026. The official BytePlus API was expected around February 24, 2026. At time of research (Feb 16, 2026), the official API is not yet publicly available. Third-party aggregators provide access now.

**Phased integration approach:**

| Phase | Provider | Endpoint Pattern | When |
|-------|----------|-----------------|------|
| Phase A (now) | fal.ai | `queue.fal.run/fal-ai/bytedance/seedance/...` | fal.ai is already used for Kling; same auth pattern (FAL_KEY), same async queue API |
| Phase B (fallback) | WaveSpeedAI or Atlas Cloud | Unified REST API with Bearer token | If fal.ai does not carry Seedance 2.0, or for pricing advantage |
| Phase C (target) | BytePlus (official) | Volcengine ModelArk REST API | When official API stabilizes; switch via config flag |

**Recommendation: Start with fal.ai** because:
1. The project already has `FAL_KEY` configured and the Kling client (`src/lib/ai/kling.ts`) uses the exact same fal.ai queue pattern (submit -> poll -> retrieve).
2. fal.ai is positioned as an early Seedance 2.0 provider.
3. Zero new credentials needed. Zero new SDK dependencies.
4. The adapter can be switched to official BytePlus API later with a config flag.

### Seedance 2.0 Client Implementation

| Technology | What | Purpose | Confidence |
|------------|------|---------|------------|
| fal.ai Queue API | HTTP REST | Submit/poll/retrieve pattern identical to existing Kling client | HIGH |
| No new npm package | -- | fal.ai is called via raw fetch (same as kling.ts); no SDK needed | HIGH |

**New file: `src/lib/ai/seedance.ts`**

Follows the exact same pattern as `src/lib/ai/kling.ts`:

```typescript
// Anticipated fal.ai endpoint (verify when available)
const SEEDANCE_T2V_ENDPOINT = "fal-ai/bytedance/seedance/v2/pro/text-to-video"
const SEEDANCE_I2V_ENDPOINT = "fal-ai/bytedance/seedance/v2/pro/image-to-video"

interface SeedanceOptions {
  imageUrl?: string          // For image-to-video mode
  duration?: number          // 4-15 seconds
  aspectRatio?: "16:9" | "9:16" | "4:3" | "3:4" | "21:9" | "1:1"
  resolution?: "720p" | "1080p" | "2k"
  withAudio?: boolean        // Native audio co-generation
  audioReferences?: string[] // Up to 3 MP3 URLs for audio style
  videoReferences?: string[] // Up to 3 video URLs for motion style
}
```

**Seedance 2.0 capabilities relevant to this project:**

| Capability | Value for AI Content Studio | Confidence |
|------------|----------------------------|------------|
| Native audio co-generation | Single API call produces video + sound effects/music. Eliminates separate ElevenLabs call for ambient audio. | HIGH |
| Image-to-video (up to 9 images) | Feed composited campaign images to generate product videos. Better brand consistency than text-only prompts. | HIGH |
| 9:16 native aspect ratio | Direct TikTok/Instagram Reels output without post-crop. | HIGH |
| 4-15 second duration range | Matches ad format requirements (15s TikTok, 6s YouTube bumper). | HIGH |
| @mention reference system | Reference uploaded images/videos/audio in the prompt for precise control. | MEDIUM |
| 2K resolution output | High-quality for DOOH and premium placements. | MEDIUM |

**Seedance 2.0 pricing estimate (via third-party):**

| Resolution | Per-Minute Rate | Per 10-Second Clip |
|------------|----------------|-------------------|
| 720p (Basic) | ~$0.10/min | ~$0.017 |
| 1080p (Standard) | ~$0.40/min | ~$0.067 |
| 2K (Cinema) | ~$0.80/min | ~$0.133 |

At 1080p/10s, Seedance is cheaper than both Kling (~$0.70 via fal.ai for 10s) and Runway (~$0.50 for 10s). This makes it the preferred primary video provider.

### Video Pipeline Integration

Update `src/lib/ai/video-pipeline.ts` to add Seedance as the **primary** video provider with Kling and Runway as fallbacks:

```
New fallback chain:
  Seedance 2.0 (primary) -> Kling v2.6 (fallback) -> Runway Gen-4 (fallback)

For TikTok/Reels (9:16 native audio):
  Seedance 2.0 (preferred -- native audio matches TikTok aesthetic)

For cinematic (16:9):
  Runway Gen-4 (preferred -- strongest cinematic quality)
  Seedance 2.0 (fallback)

For product demo (1:1):
  Seedance 2.0 (preferred -- supports 1:1 natively)
  Kling (fallback)
```

Update `src/lib/ai/provider-health.ts` to track "seedance" as a new provider ID in the circuit breaker.

### Environment Variables (New)

| Variable | Value | Notes |
|----------|-------|-------|
| `SEEDANCE_PROVIDER` | `fal` / `wavespeed` / `byteplus` | Config flag to switch provider without code change |
| `WAVESPEED_API_KEY` | -- | Only needed if using WaveSpeedAI as provider |
| `BYTEPLUS_API_KEY` | -- | Only needed when official BytePlus API is available |

No new env var needed for fal.ai -- reuses existing `FAL_KEY`.

---

## 3. NotebookLM MCP Server (Knowledge Base)

### Architecture Decision

NotebookLM (Google) provides a zero-hallucination knowledge base powered by Gemini 2.5. The PleasePrompto MCP server exposes NotebookLM as an MCP-compatible tool that AI agents can query at runtime. This replaces the need to build a custom RAG pipeline (no vector DB, no embeddings, no chunking).

**Why NotebookLM MCP over custom RAG:**
1. **Zero infrastructure:** No Qdrant/Pinecone, no embedding pipeline, no chunk optimization. Google handles all indexing.
2. **Citation-backed:** Answers include source citations from uploaded documents. Agents can verify claims.
3. **Refuses hallucination:** NotebookLM refuses to answer questions outside uploaded documents rather than inventing answers.
4. **Pre-indexed semantic understanding:** Upload the 9 research documents once. No iterative embedding tuning.
5. **MCP protocol:** n8n's MCP Client Tool node connects directly. Claude Code also connects for development-time queries.

### Setup Components

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| notebooklm-mcp | latest (npm) | MCP server exposing NotebookLM to AI agents | HIGH |
| n8n MCP Client Tool node | Built-in (n8n 2.x) | Connects AI Agent nodes to the MCP server | HIGH |
| Google NotebookLM | Service | Knowledge base hosting and semantic search | HIGH |

### NotebookLM MCP Server Setup

**Installation on n8n VPS:**

```bash
# Run as a persistent service alongside n8n
npx notebooklm-mcp@latest
```

**MCP Server exposes 16 tools across 3 profiles:**

| Profile | Tools | Use Case |
|---------|-------|----------|
| Minimal (5 tools) | ask_question, get_health, list_notebooks, select_notebook, get_notebook | Sufficient for n8n agent runtime queries |
| Standard (10 tools) | + setup_auth, list_sessions, add_notebook, update_notebook, search_notebooks | For library management |
| Full (16 tools) | + cleanup_data, re_auth, remove_notebook, reset_session, close_session, get_library_stats | For maintenance |

**Recommendation:** Use the **minimal profile** for n8n agent runtime. The agents only need `ask_question` and `select_notebook`. Library management is done manually during setup, not at runtime.

### Authentication Flow

NotebookLM MCP uses persistent browser automation (Playwright) with humanized interactions to maintain a Google session. Authentication is done once during setup:

1. Run `npx notebooklm-mcp@latest` on the n8n VPS.
2. Say "Log me in to NotebookLM" -- Chrome opens for Google login.
3. Session persists locally (cookies/tokens stored on disk).
4. The MCP server runs as a long-lived process, maintaining the session.

**Concern: Session persistence on a headless VPS.** The PleasePrompto MCP server requires a browser for initial auth. On the n8n VPS:
- Install Chrome/Chromium headless.
- Run initial auth with `--no-sandbox` flag if needed.
- Session tokens persist in `~/.notebooklm-mcp/` directory.
- Monitor for session expiry (Google sessions typically last 2-4 weeks).

### Knowledge Base Content

Upload these 9 research documents to a single NotebookLM notebook:

| Document | Content | Agent Use |
|----------|---------|-----------|
| SaaS Implementation Plan | Full technical architecture, agent pipeline design | Strategic Insight, Orchestrator |
| Campaign Kit Deliverables | Concrete example of complete campaign output | Creative Director, Art Director |
| Japanese Advertising Library | Cultural intelligence, seasonal calendar, sei-katsu-sha | Localization, Strategic Insight |
| Dual Audience Strategy | B2B/B2C positioning for Japanese market | Strategic Insight, Creative Director |
| Schwartz/LF8/StoryBrand frameworks | Advertising psychology frameworks | Strategic Insight, Copywriter |
| Platform specifications | LINE, Yahoo, Rakuten, IG, TikTok specs | Media Intelligence, Art Director |
| Keihyouhou/Yakkihou regulations | Japanese advertising law compliance rules | Localization (compliance review) |
| Prompt engineering guide | Fukatsu Method, anti-slop word list | Copywriter |
| Additional campaign scenarios | More example briefs and outputs | All agents (few-shot examples) |

### n8n MCP Client Tool Configuration

In each agent sub-workflow that needs knowledge access:

1. Add an **MCP Client Tool** sub-node to the AI Agent node.
2. Configure:
   - **Transport:** SSE (Server-Sent Events)
   - **URL:** `http://localhost:3456` (MCP server running on same VPS as n8n)
   - **Authentication:** None (local connection; MCP server handles Google auth internally)
3. The AI Agent can then call `ask_question` with questions like:
   - "What are the kinsoku shori rules for LINE ad text?"
   - "What is the Schwartz awareness level framework?"
   - "What platform dimensions does Yahoo! JAPAN Display require?"

### What NOT to Build

| Anti-Pattern | Why Avoid |
|-------------|-----------|
| Custom RAG with Qdrant/Pinecone | Unnecessary complexity. NotebookLM handles indexing, chunking, embedding, and retrieval. |
| Embedding pipeline for research docs | NotebookLM pre-indexes uploaded documents semantically. |
| Redis-cached knowledge lookups | MCP queries are fast enough for agent runtime (sub-second). |
| Duplicate knowledge in system prompts | Keep system prompts focused on agent role/instructions. Factual knowledge comes from NotebookLM at runtime. Reduces prompt token count. |

---

## 4. Auto Mode Conversational Brief Builder

### Architecture Decision

The Auto mode brief builder is a chat-based interface where a non-technical user (solopreneur) has a guided conversation with an AI that extracts campaign brief parameters through natural dialogue. This replaces the structured form for the Auto tier.

**Stack choice: Vercel AI SDK `useChat` hook + Next.js API route with `streamText`.**

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| ai (Vercel AI SDK) | ^4.2+ (install as new dependency) | Chat streaming and state management | useChat hook manages conversation state, streaming responses, tool calls. Already used by Next.js ecosystem. SSE streaming is the standard transport. | HIGH |
| @ai-sdk/anthropic | ^1.x (install as new dependency) | Claude provider for AI SDK | Connects Vercel AI SDK to Claude API. Supports tool calling for structured brief extraction. | HIGH |

**Why Vercel AI SDK over raw Anthropic SDK for the chat UI:**
- The existing `@anthropic-ai/sdk` (v0.73) is already installed for server-side structured generation (qa-agent, compliance-agent, copy generation). Keep it for those use cases.
- For the conversational chat UI, Vercel AI SDK provides `useChat()` React hook with built-in streaming, loading states, and message management. Building this from scratch with the raw Anthropic SDK would require reimplementing all of that.
- Vercel AI SDK `streamText` uses SSE natively -- works perfectly with Next.js App Router API routes.

### Implementation Pattern

**API Route: `/api/brief-builder/chat`**

```typescript
// Uses Vercel AI SDK streamText (NOT the existing claude.ts pattern)
import { streamText, tool } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'

export async function POST(req: Request) {
  const { messages } = await req.json()

  const result = streamText({
    model: anthropic('claude-sonnet-4-5-20250514'),
    system: BRIEF_BUILDER_SYSTEM_PROMPT, // Guides conversation to extract brief params
    messages,
    tools: {
      extract_brief: tool({
        description: 'Extract structured brief when enough info gathered',
        parameters: z.object({
          objective: z.string(),
          targetAudience: z.string(),
          platforms: z.array(z.string()),
          // ... all CampaignBrief fields
        }),
      }),
    },
  })

  return result.toDataStreamResponse()
}
```

**Client Component:**

```typescript
import { useChat } from '@ai-sdk/react'

function BriefBuilder() {
  const { messages, input, handleSubmit, isLoading } = useChat({
    api: '/api/brief-builder/chat',
  })
  // Render chat UI with messages
}
```

### Brief Builder UX Components (New)

| Component | Purpose | Built With |
|-----------|---------|------------|
| `BriefChat` | Full-screen chat interface for Auto mode | useChat hook + existing shadcn/ui components |
| `BriefPreview` | Side panel showing extracted brief fields as they're discovered | Zustand store synced from tool call results |
| `BriefConfirmation` | Modal showing complete brief before submission | Existing brief display components, repurposed |
| `ModeSelector` | Auto/Guided/Pro mode toggle on campaign creation page | shadcn/ui Tabs or SegmentedControl |

### Packages to Install

```bash
pnpm add ai @ai-sdk/anthropic
```

**These are the ONLY new npm packages for the brief builder.** The chat UI uses existing shadcn/ui components (Input, ScrollArea, Avatar, Card).

### What NOT to Add

| Anti-Pattern | Why Avoid |
|-------------|-----------|
| assistant-ui library | Over-engineered for this use case. useChat + shadcn/ui components are sufficient. |
| Socket.IO for chat streaming | Vercel AI SDK uses SSE natively. No WebSocket needed for chat. |
| Separate chat microservice | The brief builder is a single API route. No need for a separate service. |
| OpenAI for brief builder | Claude is better at Japanese conversation. The project is already Anthropic-native. |

---

## 5. Brand Memory Persistent Storage

### Architecture Decision

Brand Memory stores per-brand contextual knowledge that agents reference across campaigns: past campaign performance, style preferences learned from approvals/rejections, banned phrases, preferred expressions, and accumulated creative direction.

**Storage: Supabase PostgreSQL JSONB + Zustand persist middleware.**

No new services needed. Brand Memory is a database feature, not an infrastructure addition.

### Database Schema Addition

New table in `src/lib/db/schema.ts`:

```typescript
export const brandMemory = pgTable("brand_memory", {
  id: uuid("id").primaryKey().defaultRandom(),
  brandProfileId: uuid("brand_profile_id")
    .references(() => brandProfiles.id)
    .notNull(),
  category: text("category").notNull(),
    // 'style_preference' | 'banned_phrase' | 'preferred_expression' |
    // 'performance_insight' | 'creative_direction' | 'compliance_note'
  key: text("key").notNull(),
  value: jsonb("value").notNull(),
  source: text("source").notNull(),
    // 'user_explicit' | 'learned_approval' | 'learned_rejection' |
    // 'compliance_flag' | 'performance_data'
  confidence: integer("confidence").notNull().default(50), // 0-100
  campaignId: uuid("campaign_id").references(() => campaigns.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
})
```

### Client-Side Brand Memory Cache

Zustand persist middleware caches frequently-accessed brand memory on the client to avoid repeated DB queries during the brief builder conversation:

```typescript
// Uses existing zustand (v5.0.11) + persist middleware (built-in)
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface BrandMemoryStore {
  memories: Record<string, BrandMemoryEntry[]> // keyed by brandProfileId
  lastFetched: Record<string, number>
  // ...
}

const useBrandMemory = create<BrandMemoryStore>()(
  persist(
    (set, get) => ({ /* ... */ }),
    {
      name: 'brand-memory-cache',
      partialize: (state) => ({
        memories: state.memories, // persist memories
        lastFetched: state.lastFetched,
      }),
      version: 1, // for schema migration
    }
  )
)
```

**Why Zustand persist over IndexedDB/custom cache:**
- Zustand is already installed (v5.0.11).
- persist middleware is built-in (no additional package).
- Supports partialize (only cache specific keys, not full store).
- Supports version migrations for schema evolution.
- localStorage is sufficient for brand memory cache (small JSON data, not media).

### n8n Agent Access to Brand Memory

Agents access Brand Memory via the existing Supabase connection in n8n:
1. Orchestrator queries `brand_memory` table for the campaign's brand at pipeline start.
2. Relevant memories are included in each agent's context (appended to the user prompt, not the system prompt).
3. After campaign completion, the Creative Director agent writes new memories based on the campaign output.

No new n8n nodes needed. Uses existing Supabase node + HTTP Request to Next.js API.

### What NOT to Build

| Anti-Pattern | Why Avoid |
|-------------|-----------|
| Separate Brand Memory service | It is a database table + API routes. Not complex enough for a service. |
| Vector embeddings for brand memories | Overkill. Brand memories are structured key-value pairs, not unstructured documents. |
| Real-time sync with Supabase Realtime | Brand memory changes are infrequent (per-campaign, not per-second). Standard API fetch is sufficient. |

---

## 6. Compliance Auto-Rewrite Pipeline

### Architecture Decision

v1.0 has a compliance check agent (`src/lib/ai/compliance-agent.ts`) that identifies issues and suggests rewrites. v1.1 upgrades this to **auto-rewrite**: when compliance issues are detected, the system automatically rewrites the problematic copy and presents the fixed version alongside the original.

**No new packages needed.** The compliance auto-rewrite is a prompt engineering + workflow change, not a stack change.

### Implementation Approach

| Component | Change | Stack Impact |
|-----------|--------|-------------|
| `compliance-agent.ts` | Add `autoRewrite: true` mode that generates compliant alternatives | None (same Anthropic SDK, same tool-use pattern) |
| n8n compliance sub-workflow | Add rewrite loop: check -> rewrite -> re-check (max 2 iterations) | Uses existing AI Agent + Code nodes |
| `complianceReports` table | Add `rewrittenVariants` JSONB column for auto-fixed copy | Drizzle schema migration |
| Compliance review UI | Show original vs. rewritten side-by-side with diff highlighting | Existing React components |

### Compliance Knowledge Source

The compliance agent queries NotebookLM MCP for:
- Keihyouhou (景品表示法) prohibited claims
- Yakkihou (薬機法) 56 permitted cosmetics efficacy expressions
- Platform-specific advertising policies
- JARO guidelines

This replaces hardcoded compliance rules in the system prompt with runtime knowledge queries -- more maintainable and updatable without code deploys.

---

## Complete New Dependencies Summary

### npm Packages to Add

```bash
# Auto Mode Brief Builder (conversational UI)
pnpm add ai @ai-sdk/anthropic
```

That's it. Two packages. Everything else uses existing dependencies or is configured at the n8n/infrastructure level.

### npm Packages NOT to Add

| Package | Why Not |
|---------|---------|
| `@wavespeed/sdk` | Raw HTTP fetch is sufficient; WaveSpeedAI is a secondary provider that may not be used |
| `@langchain/core` | n8n handles LangChain internally in AI Agent nodes; do not add to Next.js |
| `qdrant-client` or `@pinecone-database/pinecone` | NotebookLM MCP replaces custom RAG |
| `socket.io` | Not needed; Vercel AI SDK uses SSE; Supabase Realtime handles progress |
| `openai` | Not needed; Claude handles all agent reasoning; no GPT-4o in v1.1 pipeline |
| `assistant-ui` | Over-engineered; useChat + shadcn/ui is sufficient |
| `@modelcontextprotocol/sdk` | n8n's built-in MCP Client Tool node handles MCP. Next.js does not need MCP. |

### Environment Variables (New)

| Variable | Where | Purpose |
|----------|-------|---------|
| `SEEDANCE_PROVIDER` | Next.js + n8n | `fal` / `wavespeed` / `byteplus` -- provider routing flag |
| `WAVESPEED_API_KEY` | n8n | Only if using WaveSpeedAI for Seedance |
| `BYTEPLUS_API_KEY` | n8n | Only when official BytePlus API available |
| `NOTEBOOKLM_MCP_URL` | n8n | URL of the NotebookLM MCP server (e.g., `http://localhost:3456`) |
| `N8N_AI_ENABLED` | n8n | `true` -- required to enable AI Agent nodes in n8n 2.x |

### Infrastructure Changes

| Change | What | Why |
|--------|------|-----|
| Upgrade n8n to 2.x | Docker image tag update | 1.x EOL March 2026; AI Agent nodes |
| Install NotebookLM MCP server | `npx notebooklm-mcp@latest` on VPS | Knowledge base for agent runtime |
| Install Chrome/Chromium on VPS | System package | Required for NotebookLM MCP auth flow |
| Increase VPS memory | 4GB -> 8GB recommended | 7-agent pipeline + NotebookLM MCP server running concurrently |

---

## Database Schema Changes Summary

| Table | Change | Purpose |
|-------|--------|---------|
| `brand_memory` | **New table** | Persistent brand knowledge across campaigns |
| `compliance_reports` | Add `rewritten_variants` JSONB column | Store auto-rewritten compliant copy |
| `campaigns` | Add `mode` text column (`auto` / `guided` / `pro`) | Track which mode created the campaign |
| `campaigns` | Add `brief_conversation` JSONB column | Store Auto mode chat transcript |
| `agent_outputs` | **New table** | Store intermediate agent outputs for audit/review |

---

## Integration Points Map

```
Next.js App (Vercel Tokyo)
  |
  |-- [NEW] /api/brief-builder/chat  (Vercel AI SDK streamText -> Claude)
  |         Uses: ai, @ai-sdk/anthropic
  |         Returns: SSE stream to useChat() client hook
  |
  |-- [EXISTING] /api/campaigns       (POST -> triggers n8n webhook)
  |         Sends: brief JSON + brand profile
  |         New: includes brandMemory context
  |
  |-- [EXISTING] /api/webhooks/n8n    (receives results from n8n)
  |         New: receives agent_outputs for audit trail
  |         New: receives compliance rewrite results
  |
  v
n8n 2.x (Self-hosted VPS)
  |
  |-- [NEW] Master Orchestrator Workflow (AI Agent, Orchestrator pattern)
  |     |-- [NEW] 7 Sub-Workflow Agents (AI Agent per workflow)
  |     |-- [NEW] MCP Client Tool -> NotebookLM MCP Server (localhost)
  |     |-- [EXISTING] HTTP Request -> AI Provider APIs
  |     |-- [NEW] Seedance 2.0 via fal.ai (same FAL_KEY as Kling)
  |
  |-- [EXISTING] HTTP Request callbacks to Next.js /api/webhooks/n8n
  |
  v
NotebookLM MCP Server (same VPS, localhost:3456)
  |
  |-- [NEW] Persistent Google auth session
  |-- [NEW] 9 research documents uploaded to NotebookLM
  |-- Exposes: ask_question, select_notebook tools via MCP
```

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| n8n 2.x upgrade + AI Agent nodes | HIGH | n8n 2.0 is released and stable; AI Agent nodes are documented and widely used |
| Multi-agent orchestrator pattern in n8n | HIGH | Multiple community examples and official docs confirm the pattern |
| Seedance 2.0 via fal.ai | MEDIUM | fal.ai currently has Seedance 1.0/1.5; 2.0 endpoint naming is anticipated but unverified |
| Seedance 2.0 API parameters | MEDIUM | Based on multiple third-party guides; official API spec not published yet |
| NotebookLM MCP server | MEDIUM | PleasePrompto implementation is active and documented; session persistence on headless VPS needs validation |
| n8n MCP Client Tool node | HIGH | Official n8n documentation confirms SSE transport support |
| Vercel AI SDK useChat for brief builder | HIGH | Mature, well-documented; v4.2 confirmed with message parts support |
| Brand Memory in PostgreSQL JSONB | HIGH | Standard database pattern; no new technology |
| Compliance auto-rewrite | HIGH | Extension of existing compliance-agent.ts; same Claude tool-use pattern |
| Zustand persist for brand memory cache | HIGH | Built-in middleware; already using Zustand v5 |

---

## Sources

- [n8n AI Agent Tool node docs](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolaiagent/)
- [n8n Call n8n Workflow Tool docs](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolworkflow/)
- [n8n MCP Client Tool docs](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolmcp/)
- [n8n Tools Agent docs](https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent/tools-agent/)
- [n8n Anthropic Chat Model docs](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.lmchatanthropic/)
- [n8n 2.0 release blog](https://blog.n8n.io/introducing-n8n-2-0/)
- [n8n multi-agent orchestration patterns](https://hatchworks.com/blog/ai-agents/multi-agent-solutions-in-n8n/)
- [n8n sub-workflows docs](https://docs.n8n.io/flow-logic/subworkflows/)
- [n8n streaming responses docs](https://docs.n8n.io/workflows/streaming/)
- [PleasePrompto NotebookLM MCP GitHub](https://github.com/PleasePrompto/notebooklm-mcp)
- [Seedance 2.0 complete guide (NxCode)](https://www.nxcode.io/resources/news/seedance-2-0-complete-guide-ai-video-generation-2026)
- [Seedance 2.0 API guide (WaveSpeedAI)](https://wavespeed.ai/blog/posts/seedance-2-0-complete-guide-multimodal-video-creation/)
- [Atlas Cloud Seedance 2.0 collection](https://www.atlascloud.ai/collections/seedance2)
- [Seedance 2.0 pricing (WaveSpeedAI)](https://wavespeed.ai/blog/posts/blog-seedance-2-0-pricing-credits/)
- [fal.ai Seedance 1.5 user guide](https://fal.ai/learn/devs/seedance-1-5-user-guide)
- [Vercel AI SDK 4.2 release](https://vercel.com/blog/ai-sdk-4-2)
- [Vercel AI SDK docs](https://ai-sdk.dev/docs/introduction)
- [Zustand persist middleware docs](https://zustand.docs.pmnd.rs/middlewares/persist)
- [n8n credentials environment variables](https://docs.n8n.io/hosting/configuration/environment-variables/credentials/)
- [n8n best practices for AI agents](https://blog.n8n.io/best-practices-for-deploying-ai-agents-in-production/)
