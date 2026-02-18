# Phase 9: Core Agent Pipeline + Generation Execution - Research

**Phase:** 09-core-agent-pipeline-generation-execution
**Researcher output for:** Planning
**Date:** 2026-02-18

---

## Table of Contents

1. [What Exists Today](#1-what-exists-today)
2. [n8n Architecture: Sub-Workflows and AI Agent Nodes](#2-n8n-architecture)
3. [Per-Plan Breakdown](#3-per-plan-breakdown)
   - [09-01: Master Orchestrator Workflow](#plan-09-01)
   - [09-02: Strategic Insight + Creative Director Agents](#plan-09-02)
   - [09-03: Copywriter + Art Director + JP Localization (Critique Loop)](#plan-09-03)
   - [09-04: Image Generation + JP Text Compositing Sub-Workflows](#plan-09-04)
   - [09-05: Video/Audio/Avatar/Resize/ZIP + Circuit Breaker](#plan-09-05)
4. [Progress Reporting Architecture](#4-progress-reporting)
5. [PipelineState Schema and Inter-Agent Data Flow](#5-pipelinestate-schema)
6. [Quality Gate: JP Localization Critique Loop](#6-jp-localization-critique-loop)
7. [Failure Modes and Partial Delivery](#7-failure-modes)
8. [Strategy Visibility in Campaign Output](#8-strategy-visibility)
9. [Model Availability in n8n's Anthropic Chat Model Node](#9-model-availability)
10. [Risk Register](#10-risk-register)
11. [Requirement Coverage Map](#11-requirement-coverage)
12. [Key Decisions Needed During Planning](#12-decisions-needed)

---

## 1. What Exists Today

### 1.1 Next.js Campaign Submission Flow (COMPLETE)

**File:** `src/app/api/campaigns/route.ts`

The POST handler already:
- Validates the brief, deducts credits, inserts a `campaigns` row with status `"pending"`
- Checks for `N8N_WEBHOOK_URL` env var
- If set: sends a v1.1 `N8nWebhookPayload` (with `agentConfig`, `mode`, `brandMemory`, `pipelineVersion`) to n8n via HMAC-signed POST, initializes milestone progress array
- If not set: falls back to `runDirectGeneration()` (DEPRECATED as of Phase 8, still functional)
- The webhook payload already includes per-agent model assignments from `AGENT_*_MODEL` env vars

**Key insight:** The dashboard-to-n8n trigger path is 100% wired. Phase 9 must build the n8n workflows that receive this payload and execute the pipeline.

### 1.2 n8n Callback Handler (COMPLETE)

**File:** `src/app/api/webhooks/n8n/route.ts`

The callback handler already supports:
- HMAC signature verification
- v1.0 payload: `copyVariants[]`, `imageUrls[]`, `videoAssets[]`, `audioAssets[]`, stage-based progress
- v1.1 payload: `milestone` updates, `costEntries[]`, `agentError`, `pipelineState`
- Compositing after image receipt (calls `compositeCampaignImages`)
- Video/audio asset download to Supabase Storage
- Cost entry persistence with alert threshold check
- Merging progress fields to avoid race conditions

**Key insight:** The callback handler is already v1.1-ready. n8n workflows just need to send correctly shaped payloads.

### 1.3 Pipeline Types (COMPLETE)

**File:** `src/types/pipeline.ts`

All v1.1 types are defined:
- `PipelineState` with sections: `strategicInsight`, `creativeDirector`, `copywriter`, `artDirector`, `jpLocalization`
- `StrategicInsightOutput`: awarenessLevel, lf8Desires, copywritingFramework, targetInsight, creativeDirection, keyMessages, tonalGuidance
- `CreativeDirectorOutput`: visualConcept, colorGuidance, compositionNotes, moodKeywords, platformAdaptations
- `CopywriterOutput`: variants array with platform/variantLabel/headline/body/cta/hashtags/register
- `ArtDirectorOutput`: imagePrompts array with platform/prompt/negativePrompt/style/aspectRatio
- `JpLocalizationOutput`: approved, revisionsApplied, localizationNotes, qualityScore
- `AgentError`: agentName, timestamp, message, retryAttempted, retrySucceeded, isCriticalStop
- `PipelineMilestone`: 4 milestones (strategy/content/assets/packaging) with Japanese labels
- `N8nWebhookPayload` and `N8nCallbackPayload` with all v1.1 fields
- `CostEntry` for per-agent/provider cost tracking

### 1.4 Database Schema (COMPLETE)

**File:** `src/lib/db/schema.ts`

Tables ready for Phase 9:
- `campaigns`: brief JSONB, progress JSONB (supports milestones), status, errorLog, thumbnailUrl, completedAt
- `copy_variants`: campaignId, platform, variantLabel, register, headline, bodyText, ctaText, hashtags
- `assets`: campaignId, type (image/composited_image/platform_image/video/audio/email_html), storageKey, metadata JSONB
- `campaign_costs`: campaignId, entryType, agentName, modelUsed, inputTokens, outputTokens, providerName, costYen, success
- `brand_memory`: brandProfileId, signalType, source, value, confidence (for Phase 11, but schema ready)
- `brand_profiles`: full brand data including colors, fonts, register, tone, product catalog, positioning

### 1.5 Existing AI Modules (COMPLETE - to be called from n8n)

| Module | File | Purpose | API |
|--------|------|---------|-----|
| Claude copy gen | `src/lib/ai/claude.ts` | Platform-specific copy via tool-use structured output | `generatePlatformCopy()` |
| Flux image gen | `src/lib/ai/flux.ts` | Image generation via fal.ai (Flux 1.1 Pro Ultra) | `generateCampaignImages()` |
| Compositing | `src/lib/compositing/index.ts` | JP text overlay (Sharp + node-canvas + BudouX) | `compositeCampaignImages()` |
| Image resize | `src/lib/platforms/image-resizer.ts` | Platform-specific dimension resizing | `resizeForPlatforms()` |
| Kling video | `src/lib/ai/kling.ts` | Video via fal.ai/Kling | `generateKlingVideo()` |
| Runway video | `src/lib/ai/runway.ts` | Cinematic video via Runway Gen-4 | `generateCinematicVideo()` |
| ElevenLabs TTS | `src/lib/ai/elevenlabs.ts` | Japanese voiceover | `generateJapaneseVoiceover()` |
| HeyGen avatar | `src/lib/ai/heygen.ts` | Avatar presenter video | `generateAvatarVideo()` |
| Video pipeline | `src/lib/ai/video-pipeline.ts` | Orchestrates voiceover->video->cinematic->avatar | `runVideoPipeline()` |
| ZIP packager | `src/lib/platforms/zip-packager.ts` | Builds downloadable ZIP organized by platform | `buildCampaignZip()` |
| Provider health | `src/lib/ai/provider-health.ts` | Circuit breaker (3 fails -> 5min cooldown) | `providerHealth` singleton |
| Copy prompts | `src/lib/ai/prompts/copy-generation.ts` | System/user prompt builders with keigo register | `buildSystemPrompt()`, `buildPlatformCopyPrompt()` |
| Image prompts | `src/lib/ai/prompts/image-generation.ts` | Flux prompt builder | `buildImagePrompt()`, `buildImagePromptVariations()` |

### 1.6 Dashboard Progress UI (COMPLETE)

**File:** `src/components/campaign/generation-progress.tsx`

Current component shows:
- Progress bar with percentage
- Step indicators for copy/image/voiceover/video/avatar
- Realtime updates via `useCampaignProgress` hook (Supabase Realtime subscription)
- Auto-redirect on completion

**Phase 9 gap:** Current UI shows flat step indicators (copy/image/video). The Phase 9 decision requires per-agent named steps with Japanese labels and 1-2 line summaries. This component needs to be upgraded to display agent-level progress.

### 1.7 n8n Instance State

The VPS has n8n 2.x running with:
- Anthropic Chat Model sub-node available
- AI Agent node available
- Execute Sub-workflow node (v1.3) available
- Structured Output Parser node available
- 71 existing workflows (none related to AI Content Studio campaign pipeline yet)
- Anthropic API credentials configured

### 1.8 Env Vars Ready

```
AGENT_STRATEGIC_INSIGHT_MODEL=claude-opus-4-6
AGENT_CREATIVE_DIRECTOR_MODEL=claude-opus-4-6
AGENT_COPYWRITER_MODEL=claude-opus-4-6
AGENT_ART_DIRECTOR_MODEL=claude-opus-4-6
AGENT_JP_LOCALIZATION_MODEL=claude-opus-4-6
CAMPAIGN_COST_ALERT_THRESHOLD_YEN=5000
N8N_WEBHOOK_URL=<to be set>
N8N_WEBHOOK_SECRET=<to be set>
```

---

## 2. n8n Architecture: Sub-Workflows and AI Agent Nodes

### 2.1 Architecture Decision: AI Agent Node vs. HTTP Request to Claude API

**Option A: n8n AI Agent Node + Anthropic Chat Model sub-node**
- Uses n8n's built-in LangChain-based AI Agent node
- Connects Anthropic Chat Model as the LLM sub-node
- Can attach tools (HTTP Request Tool, Call n8n Sub-Workflow Tool)
- Structured Output Parser sub-node for JSON extraction
- **Limitation discovered:** The Anthropic Chat Model node's dropdown (version <= 1.2) only lists up to Claude 3.5 Sonnet. Version 1.3+ uses a `resourceLocator` with `searchModels` method that can list newer models. Must verify the n8n instance has v1.3 of this sub-node, or use the "ID" mode to manually enter `claude-opus-4-6`.

**Option B: HTTP Request node calling Anthropic API directly**
- Full control over API parameters (model, temperature, system prompt, tools, tool_choice)
- Can use any model string including `claude-opus-4-6`
- Must manually handle request/response formatting
- No LangChain overhead
- More predictable behavior for structured prompts

**Recommendation:** Use a **hybrid approach**. For the 5 creative agents (Strategic Insight through JP Localization), use **HTTP Request nodes calling the Anthropic Messages API directly**. This gives full control over model selection, temperature, tool-use structured output, and prompt engineering. Each agent is an Execute Sub-workflow that:
1. Receives PipelineState JSON from the orchestrator
2. Builds the system/user prompt
3. Calls Anthropic API via HTTP Request with tool-use for structured output
4. Parses the response and updates PipelineState
5. Sends a progress callback to the Next.js webhook
6. Returns updated PipelineState

For generation sub-workflows (Flux, Kling, Runway, ElevenLabs, HeyGen), also use **HTTP Request nodes** since these are REST API calls, not conversational AI.

### 2.2 Execute Sub-workflow Pattern

n8n's `Execute Sub-workflow` node (v1.3):
- Source: "Database" -- reference sub-workflow by ID
- Mode: "Run once with all items" -- pass full PipelineState
- Wait for completion: true (sequential agents) or false (parallel generation)
- Sub-workflow starts with `Execute Workflow Trigger` node
- Input/output: JSON data passes through automatically

**Master orchestrator structure:**
```
Webhook Trigger
  -> Validate & Initialize PipelineState (Code node)
  -> [Progress callback: strategy milestone active]
  -> Execute Sub-workflow: Strategic Insight Agent
  -> Quality Gate: Validate StrategicInsightOutput (Code node)
  -> [Progress callback: strategy milestone complete, content milestone active]
  -> Execute Sub-workflow: Creative Director Agent
  -> [Progress callback]
  -> Execute Sub-workflow: Copywriter Agent
  -> Execute Sub-workflow: Art Director Agent  (can run in parallel with Copywriter after Creative Director)
  -> Execute Sub-workflow: JP Localization Agent (critique loop inside sub-workflow)
  -> [Progress callback: content milestone complete, assets milestone active]
  -> Execute Sub-workflow: Flux Image Generation
  -> Execute Sub-workflow: JP Text Compositing
  -> Execute Sub-workflow: Platform Resize
  -> [Parallel fork for video pipeline if video platforms selected]
  -> Execute Sub-workflow: Video/Audio/Avatar Pipeline
  -> [Progress callback: assets milestone complete, packaging milestone active]
  -> Execute Sub-workflow: ZIP Packaging
  -> Final callback to Next.js (complete status)
```

### 2.3 Progress Callback Mechanism

Each agent sub-workflow should POST to the Next.js callback URL at these points:
1. When the agent starts (milestone status: "active", startedAt timestamp)
2. When the agent completes (milestone status: "complete", agent summary line)
3. On failure (milestone status: "failed", error message)
4. Cost entry after each API call

**Callback frequency:** Per-agent (5 creative agents + generation steps = ~10-12 callbacks per pipeline run). This is well within Vercel serverless function limits.

**Payload shape for per-agent progress (Phase 9 extension):**

The Phase 9 CONTEXT.md specifies per-agent step visibility with Japanese labels and summaries. The existing `PipelineMilestone` type groups agents into 4 milestones. For per-agent granularity, the progress callback should include a new `agentStep` field:

```typescript
interface AgentStepUpdate {
  agentName: string           // "strategic_insight" | "creative_director" | etc.
  labelJa: string            // "戦略分析中" | "クリエイティブ設計中" | etc.
  status: "active" | "complete" | "failed"
  summaryJa?: string         // "戦略分析 → 感情訴求×安心感" (1-2 line JP summary)
  startedAt?: string
  completedAt?: string
}
```

This would be added to the `CampaignProgress` type and the callback handler.

---

## 3. Per-Plan Breakdown

### Plan 09-01: Master Orchestrator Workflow {#plan-09-01}

**Scope:** ORCH-02 (Master Orchestrator receives brief via webhook, dispatches to agent sub-workflows)

**What to build in n8n:**
1. **Master Orchestrator Workflow** - the main workflow triggered by webhook
   - Webhook node receiving the `N8nWebhookPayload` from Next.js
   - HMAC signature verification (Code node)
   - PipelineState initialization (Code node): creates the `PipelineState` object with version, campaignId, mode, status, startedAt
   - Sequential dispatch to agent sub-workflows via Execute Sub-workflow nodes
   - Error handling: try/catch via n8n's "On Error" settings per node
   - Progress callback HTTP Request nodes between each agent

2. **PipelineState initialization from webhook payload:**
```json
{
  "version": "v1.1",
  "campaignId": "{{$json.campaignId}}",
  "mode": "{{$json.mode}}",
  "status": "running",
  "brief": "{{$json.brief}}",
  "brandProfile": "{{$json.brandProfile}}",
  "agentConfig": "{{$json.agentConfig}}",
  "agentErrors": [],
  "startedAt": "{{$now.toISO()}}"
}
```

3. **Progress callback helper:** A reusable Code node or sub-workflow that:
   - Takes (campaignId, milestoneUpdate, agentStepUpdate, costEntries)
   - Signs payload with HMAC
   - POSTs to the Next.js callback URL

**Files to modify in Next.js:**
- `src/types/pipeline.ts` -- add `AgentStepUpdate` interface and `agentSteps` to progress
- `src/lib/db/schema.ts` -- extend `CampaignProgress` with `agentSteps` array
- `src/app/api/webhooks/n8n/route.ts` -- handle `agentStep` in callback payload
- `src/hooks/use-campaign-progress.ts` -- no changes needed (already subscribes to progress column)
- `src/components/campaign/generation-progress.tsx` -- redesign for per-agent steps

**Dependencies:**
- n8n webhook URL must be set in Next.js env
- n8n must have Anthropic API credential configured
- Sub-workflow IDs must be known (created in plans 09-02 through 09-05)

**Risks:**
- n8n webhook node URL path must match what Next.js sends to
- Vercel function timeout (300s max with `maxDuration = 300`) is sufficient for callback receipt but the n8n pipeline itself runs independently (minutes to hours for video)

### Plan 09-02: Strategic Insight + Creative Director Agents {#plan-09-02}

**Scope:** ORCH-04 (Strategic Insight classifies Schwartz/LF8/framework), ORCH-05 (Creative Director generates concept), ORCH-09 (Quality gate validates Strategic Insight)

#### Strategic Insight Agent

**Input:** PipelineState with brief + brandProfile
**Output:** `StrategicInsightOutput` written to `pipelineState.strategicInsight`

**Prompt design requirements:**
- Classify the brief into Schwartz awareness level (Unaware -> Most Aware scale)
- Identify LF8 desires (Life Force 8: survival, food enjoyment, freedom from fear/danger/pain, sexual companionship, comfortable living conditions, superiority, care/protection of loved ones, social approval)
- Select copywriting framework: PAS (Problem-Agitate-Solve), AIDA (Attention-Interest-Desire-Action), BAB (Before-After-Bridge), or SB7 (StoryBrand 7)
- Generate target insight, creative direction, key messages, tonal guidance
- **Must include:** "Summarize your decision in ~10 words in Japanese" instruction to produce the summary line
- **Must NOT expose:** framework names, codes, or classification labels in any user-facing output (Phase 9 Context decision)

**Structured output via tool-use:**
```json
{
  "name": "deliver_strategic_insight",
  "input_schema": {
    "type": "object",
    "properties": {
      "awarenessLevel": { "type": "string" },
      "lf8Desires": { "type": "array", "items": { "type": "string" }, "minItems": 1 },
      "copywritingFramework": { "type": "string", "enum": ["PAS", "AIDA", "BAB", "SB7"] },
      "targetInsight": { "type": "string", "minLength": 10 },
      "creativeDirection": { "type": "string", "minLength": 10 },
      "keyMessages": { "type": "array", "items": { "type": "string" } },
      "tonalGuidance": { "type": "string" },
      "summaryJa": { "type": "string", "description": "10-word Japanese summary of the decision" }
    },
    "required": ["awarenessLevel", "lf8Desires", "copywritingFramework", "targetInsight", "creativeDirection", "keyMessages", "tonalGuidance", "summaryJa"]
  }
}
```

**Quality gate (ORCH-09):**
After Strategic Insight completes, a Code node validates:
- `awarenessLevel` is non-empty
- `lf8Desires` has at least 1 entry
- `copywritingFramework` is one of PAS/AIDA/BAB/SB7
- `targetInsight` length >= 10 chars
- `creativeDirection` length >= 10 chars
- If validation fails: this is a **critical-stop** agent -- pipeline halts with Japanese error message: "戦略分析を完了できませんでした。お手数ですが、もう一度お試しください。"

**Failure handling:**
- 1 silent auto-retry on failure (ORCH-10)
- If retry also fails: send failure callback, halt pipeline (critical-stop)

#### Creative Director Agent

**Input:** PipelineState with strategicInsight populated
**Output:** `CreativeDirectorOutput` written to `pipelineState.creativeDirector`

**Prompt design:**
- Receives strategic insight (awareness level, LF8 desires, framework, creative direction)
- Generates visual concept, color guidance, composition notes, mood keywords
- Per-platform visual adaptations (e.g., "Instagram story: vertical composition, bold text overlay area at bottom third")
- Summary line in Japanese (~10 words)

**Failure handling:**
- 1 silent auto-retry
- If retry fails: critical-stop (pipeline halts with "クリエイティブの方向性を生成できませんでした。お手数ですが、もう一度お試しください。")

### Plan 09-03: Copywriter + Art Director + JP Localization (Critique Loop) {#plan-09-03}

**Scope:** ORCH-06 (Copywriter), ORCH-07 (Art Director), ORCH-08 (JP Localization with veto/critique loop)

#### Copywriter Agent

**Input:** PipelineState with strategicInsight + creativeDirector populated
**Output:** `CopywriterOutput` with per-platform copy variants

**Prompt design:**
- Receives framework selection (PAS/AIDA/BAB/SB7) from Strategic Insight
- Receives tonal guidance, register, brand profile with keigo instructions
- Generates 4 variants (A-D) per platform with headline/body/cta/hashtags
- Must respect platform-specific character limits (from `src/lib/platforms/copy-constraints.ts`)
- Uses tool-use structured output matching the existing `deliver_platform_copy` schema
- Summary line: e.g., "コピーライティング → PASフレームワークで4案×3プラットフォーム"

**Failure handling:**
- 1 silent auto-retry
- If retry fails: partial delivery (mark as failed, other agents continue)

#### Art Director Agent

**Input:** PipelineState with strategicInsight + creativeDirector populated
**Output:** `ArtDirectorOutput` with image prompts per platform

**Prompt design:**
- Receives visual concept, color guidance, composition notes from Creative Director
- Generates Flux-compatible image prompts (English, no Japanese text in prompts)
- Each prompt includes: style, aspect ratio, negative prompt
- Per-platform prompts tailored to platform dimensions
- Summary line: e.g., "アート設計 → 温かみのあるファミリーシーン"

**GENX-09 (No brand profile inference):**
The Art Director must handle the case where brand profile has minimal/no data:
- If `brandProfile.colors` is null: infer color palette from brief content (product type, mood tags)
- If `brandProfile.toneTags` is empty: infer visual tone from brief objective and audience
- The prompt should include a fallback instruction: "If no brand colors are specified, infer an appropriate color palette from the product type and campaign mood."

**Parallelization opportunity:**
Copywriter and Art Director both depend on Strategic Insight + Creative Director but NOT on each other. They can run in parallel after Creative Director completes. Use two Execute Sub-workflow nodes in parallel (n8n supports branching).

#### JP Localization Agent (Critique Loop)

**Input:** PipelineState with copywriter output (all copy variants)
**Output:** `JpLocalizationOutput` + potentially revised copy variants

**This is the most complex agent due to the veto/critique loop.**

**Critique loop design (from Context decisions):**
1. JP Localization receives all copy variants
2. Reviews for: unnatural Japanese, wrong register/keigo, cultural fit (idioms, directness, seasonal references, JP marketing conventions)
3. If approved: sets `approved: true`, `revisionsApplied: 0`, pipeline continues
4. If rejected: sends critique back to Copywriter agent for revision
5. Copywriter gets **3 total attempts** (original + max 2 retries)
6. After max retries exhausted: deliver best of 3 attempts, flag as "要確認" (needs review)
7. Never blocks delivery

**Implementation in n8n:**
The critique loop lives inside the JP Localization sub-workflow:
```
Execute Workflow Trigger
  -> JP Review (HTTP Request to Claude)
  -> If approved -> return updated PipelineState
  -> If rejected (attempt < 3):
     -> Send critique to Copywriter revision sub-call
     -> Copywriter revision (HTTP Request to Claude with critique context)
     -> JP Review again (loop back)
  -> If rejected (attempt >= 3):
     -> Select best attempt, flag as 要確認
     -> Return PipelineState with flag
```

**n8n loop implementation:** Use an n8n Loop/If node to check revision count. The loop runs inside the sub-workflow, not in the orchestrator.

**JP Localization prompt must include:**
- All copy variants from Copywriter
- Brand profile (register, tone, target market)
- Explicit rejection criteria:
  - Unnatural Japanese (grammar, word choice, particle usage)
  - Wrong register/keigo level (mismatched to brand's default)
  - Cultural fit issues (inappropriate idioms, wrong directness level, missing seasonal references)
  - JP marketing convention violations (overly direct CTAs, missing honorifics where expected)
- When rejecting: must provide specific critique in Japanese explaining what to fix
- Summary line: e.g., "JP品質確認 → 敬語レベル修正1回、承認済み"

### Plan 09-04: Image Generation + JP Text Compositing Sub-Workflows {#plan-09-04}

**Scope:** GENX-01 (Flux image gen), GENX-02 (JP text compositing), GENX-09 (no brand profile inference)

#### Flux Image Generation Sub-Workflow

**Input:** PipelineState with artDirector.imagePrompts populated
**Process:**
1. For each image prompt from Art Director:
   - Call fal.ai Flux 1.1 Pro Ultra endpoint via HTTP Request
   - fal.ai uses async queue pattern: submit -> poll -> retrieve
   - Wait for each image to complete (polling with Wait node)
2. Collect generated image URLs
3. Send progress callback with image URLs

**fal.ai API pattern:**
```
POST https://queue.fal.run/fal-ai/flux-pro/v1.1-ultra
Authorization: Key ${FAL_KEY}
Body: { prompt, num_images: 1, enable_safety_checker: true, image_size: "landscape_16_9" }

Response: { request_id: "..." }

Poll: GET https://queue.fal.run/fal-ai/flux-pro/v1.1-ultra/requests/{request_id}/status

Result: GET https://queue.fal.run/fal-ai/flux-pro/v1.1-ultra/requests/{request_id}
-> { images: [{ url, content_type }] }
```

**GENX-09 handling:** Already handled at the Art Director level -- prompts will include inferred defaults when brand profile is minimal.

#### JP Text Compositing Sub-Workflow

**Decision:** This is complex server-side processing (Sharp + node-canvas + BudouX). Two options:

**Option A: Call Next.js API endpoint**
Create a new `/api/internal/composite` endpoint that runs the existing `compositeCampaignImages()` function. n8n calls this endpoint with image URLs and copy variant data. The endpoint returns composited image URLs.

**Option B: Run compositing inside n8n Code node**
n8n Code nodes can run Node.js but the canvas/Sharp dependencies may not be available in n8n's Docker environment.

**Recommendation: Option A** -- expose compositing as an internal API endpoint. The existing code in `src/lib/compositing/index.ts` is well-tested and depends on Sharp + node-canvas + BudouX which are already installed in the Next.js project.

Same pattern for **platform resize** -- expose `resizeForPlatforms()` via an internal API endpoint.

**Security:** Internal endpoints should verify the same HMAC signature or use a separate internal API key.

### Plan 09-05: Video/Audio/Avatar/Resize/ZIP + Circuit Breaker {#plan-09-05}

**Scope:** GENX-03 (Kling/Runway video), GENX-04 (ElevenLabs voice), GENX-05 (HeyGen avatar), GENX-06 (platform resize), GENX-07 (ZIP packaging), GENX-08 (circuit breaker)

#### Video Pipeline Sub-Workflow

The existing `runVideoPipeline()` in `src/lib/ai/video-pipeline.ts` orchestrates the complete video pipeline. Two approaches:

**Option A: Call Next.js API endpoint that runs `runVideoPipeline()`**
- Simplest: n8n POSTs to `/api/internal/video-pipeline` with campaign data
- Next.js runs the existing pipeline code
- Progress callbacks come from within the video pipeline function

**Option B: Replicate the pipeline in n8n sub-workflows**
- More granular n8n control
- Each provider call is a separate HTTP Request node
- Circuit breaker logic replicated in n8n Code nodes

**Recommendation: Option A for MVP, Option B as future optimization.** The existing video pipeline code is battle-tested with fallback routing, circuit breakers, and progress callbacks. Wrapping it in an API endpoint is lowest-risk.

#### Video as Async Delivery (Context Decision)

From Phase 8 context: "Video async: campaign delivers copy+images immediately, video arrives later via Realtime."

This means the Master Orchestrator should:
1. Complete the core pipeline (agents -> images -> compositing -> resize)
2. Send "complete" callback to Next.js (copy + images ready)
3. Fork: trigger video pipeline asynchronously (Execute Sub-workflow with `waitForSubWorkflow: false`)
4. Video pipeline sends its own callbacks as video/audio assets complete
5. Dashboard receives video assets via Supabase Realtime subscription

#### ZIP Packaging (GENX-07)

The ZIP packager already exists at `src/lib/platforms/zip-packager.ts`. It queries the database for all assets and builds the ZIP.

**No n8n workflow needed for ZIP generation.** ZIP is generated on-demand when the user clicks "Download" in the dashboard. The existing `/api/campaigns/[id]/download` endpoint (or equivalent) calls `buildCampaignZip()`.

However, Phase 9 may need to ensure the ZIP endpoint exists. Check if it does.

#### Circuit Breaker (GENX-08)

The existing `ProviderHealthTracker` in `src/lib/ai/provider-health.ts` implements:
- 3 consecutive failures -> circuit opens
- 5-minute cooldown -> half-open retry
- In-memory (resets on restart)

**For n8n-based pipeline:** The circuit breaker is in-memory in the Next.js server. If generation sub-workflows call Next.js API endpoints (Option A above), the circuit breaker works automatically. If n8n calls provider APIs directly, circuit breaker logic must be replicated in n8n Code nodes.

**Recommendation:** Since we recommend calling Next.js endpoints for generation (Option A), the existing circuit breaker is automatically used.

---

## 4. Progress Reporting Architecture

### 4.1 Current System (Phase 8)

The current system uses 4 high-level milestones:
1. 戦略分析中 (strategy) -- Strategic Insight agent
2. コンテンツ作成中 (content) -- Creative Director, Copywriter, JP Localization
3. アセット生成中 (assets) -- Art Director, image/video generation
4. パッケージング (packaging) -- compositing, resize, ZIP

### 4.2 Phase 9 Enhancement: Per-Agent Steps

The Phase 9 Context decision requires per-agent named steps. This is **additive** to milestones:

```typescript
// New type added to CampaignProgress
interface AgentStep {
  agentName: string
  labelJa: string      // Japanese display label
  status: "pending" | "active" | "complete" | "failed" | "flagged"
  summaryJa?: string   // 1-2 line Japanese summary on completion
  startedAt?: string
  completedAt?: string
}
```

**Agent step definitions:**

| Agent | labelJa | Example summaryJa |
|-------|---------|------------------|
| strategic_insight | 戦略分析中 | 戦略分析 → 感情訴求×安心感 |
| creative_director | クリエイティブ設計中 | クリエイティブ → 温かみのあるファミリーシーン |
| copywriter | コピーライティング中 | コピー → PAS構成で4案×3媒体 |
| art_director | アート設計中 | アート → 明るいスタジオライティング |
| jp_localization | JP品質確認中 | JP確認 → 修正1回、全文承認 |
| asset_generation | アセット生成中 | 画像4枚+合成+リサイズ完了 |

**Callback flow:**
```
n8n agent sub-workflow START -> POST callback: { agentStep: { agentName, labelJa, status: "active", startedAt } }
n8n agent sub-workflow END   -> POST callback: { agentStep: { agentName, labelJa, status: "complete", summaryJa, completedAt } }
```

### 4.3 Long-Running Step Handling (Claude's Discretion)

For long-running steps like video generation (2-5 minutes per video):
- Use a **spinner with elapsed time counter** (not a static spinner)
- The elapsed timer starts when `startedAt` is set and counts up until `completedAt` is set
- Example display: "動画生成中... 1:23" (with incrementing seconds)
- Implementation: `Date.now() - new Date(startedAt).getTime()` in the React component, updated every second via `setInterval`

---

## 5. PipelineState Schema and Inter-Agent Data Flow

### 5.1 Data Flow Through the Pipeline

```
Webhook Payload (brief + brandProfile + agentConfig)
  |
  v
PipelineState.init (version, campaignId, mode, status, brief, brandProfile)
  |
  v
[Strategic Insight Agent]
  reads: brief, brandProfile
  writes: pipelineState.strategicInsight
  |
  v
[Quality Gate: validate strategicInsight]
  |
  v
[Creative Director Agent]
  reads: brief, brandProfile, strategicInsight
  writes: pipelineState.creativeDirector
  |
  v  (parallel fork)
  +--> [Copywriter Agent]
  |      reads: brief, brandProfile, strategicInsight, creativeDirector
  |      writes: pipelineState.copywriter
  |      |
  |      v
  |    [JP Localization Agent]
  |      reads: copywriter output, brandProfile
  |      writes: pipelineState.jpLocalization, may revise copywriter output
  |
  +--> [Art Director Agent]
         reads: brief, brandProfile, strategicInsight, creativeDirector
         writes: pipelineState.artDirector
  |
  v  (merge: both branches complete)
  |
  v
[Image Generation] reads: artDirector.imagePrompts
[Compositing] reads: images + copywriter.variants[0] (A案) + brandProfile
[Platform Resize] reads: composited images + brief.platforms
  |
  v
[Callback: campaign complete with copy + images]
  |
  v  (async fork)
[Video Pipeline] reads: composited images + copywriter text + brief.platforms
  |
  v
[Callback: video assets available]
```

### 5.2 PipelineState JSON Size Estimate

Each agent section is ~200-500 bytes of structured JSON. The full PipelineState after all agents complete is estimated at ~2-5KB. This is well within n8n's item data limits and Supabase JSONB column limits.

### 5.3 Inter-Agent Data: Scratchpad Pattern

Per ORCH-03/ORCH-13: agents pass **structured JSON summaries, not full reasoning chains**. Each agent reads upstream sections and writes to its designated section. The PipelineState is the single source of truth passed between sub-workflows.

---

## 6. Quality Gate: JP Localization Critique Loop

### 6.1 Loop Mechanics

```
Attempt 1: Copywriter generates copy
  -> JP Localization reviews
  -> If approved: done (revisionsApplied: 0)
  -> If rejected: send critique

Attempt 2: Copywriter revises based on critique
  -> JP Localization reviews revision
  -> If approved: done (revisionsApplied: 1)
  -> If rejected: send second critique

Attempt 3: Copywriter revises based on second critique
  -> JP Localization reviews final revision
  -> If approved: done (revisionsApplied: 2)
  -> If rejected: select best of 3 attempts, flag as 要確認
```

### 6.2 Critique Format

JP Localization sends structured critique to Copywriter:

```json
{
  "approved": false,
  "issues": [
    {
      "platform": "instagram",
      "variant": "B案",
      "field": "headline",
      "issue": "敬語レベルが統一されていません。「です」と「だよ」が混在しています。",
      "suggestion": "全体を「です/ます」形に統一してください。"
    }
  ],
  "overallNote": "全体的にカジュアルすぎます。ターゲット層（30-40代女性）に合わせた丁寧語を使ってください。"
}
```

### 6.3 Best-of-3 Selection

When max retries exhausted:
- JP Localization scores each attempt (qualityScore 0-100)
- Select the attempt with the highest score
- Flag as 要確認 in the campaign output
- The flag appears in the campaign detail page (user can edit later)
- Never block delivery

### 6.4 Implementation Detail

The critique loop runs entirely within the JP Localization sub-workflow in n8n. The orchestrator calls "Execute Sub-workflow: JP Localization" once, and that sub-workflow handles the internal loop (up to 3 iterations of review + revision).

---

## 7. Failure Modes and Partial Delivery

### 7.1 Agent Failure Categories (from Phase 8 Context)

| Agent | Category | Behavior |
|-------|----------|----------|
| Strategic Insight | critical-stop | 1 silent retry -> halt pipeline on failure |
| Creative Director | critical-stop | 1 silent retry -> halt pipeline on failure |
| Copywriter | partial-delivery | 1 silent retry -> deliver what succeeded |
| Art Director | partial-delivery | 1 silent retry -> deliver what succeeded |
| JP Localization | partial-delivery | critique loop (max 3 attempts) -> deliver best |

### 7.2 Generation Sub-Workflow Failures

| Sub-workflow | Behavior |
|-------------|----------|
| Flux image gen | Non-fatal: campaign completes with whatever images succeeded |
| Compositing | Non-fatal: base images still available without text overlay |
| Platform resize | Non-fatal: composited images available without platform sizes |
| Video (Kling/Runway) | Non-fatal: copy + images delivered, video skipped |
| Voiceover (ElevenLabs) | Non-fatal: video still generated without voice, avatar skipped |
| Avatar (HeyGen) | Non-fatal: everything else delivered |

### 7.3 Error Message Format

Critical-stop failures display friendly Japanese error:
- Strategic Insight: "戦略分析を完了できませんでした。お手数ですが、もう一度お試しください。"
- Creative Director: "クリエイティブの方向性を生成できませんでした。お手数ですが、もう一度お試しください。"

These are already defined in `CRITICAL_STOP_ERRORS` in `src/types/pipeline.ts`.

---

## 8. Strategy Visibility in Campaign Output

### 8.1 Accordion Component (Context Decision)

From Context decisions:
- **Placement:** Collapsible accordion section between campaign header and tab bar
- **Collapsed by default**, steel-blue accent (`#6B8FA3`)
- Expands to show 2-3 lines of strategy summary
- **Content:** Plain-language Japanese conclusions -- never expose framework names, codes, or labels
- **SuperDesign reference:** `fec4e0bf-302f-4b8e-ac60-bfd1caff9bb9`

### 8.2 Implementation

A new React component `StrategyAccordion` that:
- Takes `strategicInsight` from campaign's pipelineState (stored in DB after pipeline completion)
- Transforms internal classification into user-friendly Japanese text
- Example: "このキャンペーンは、お客様の安心感への欲求に訴えかけるアプローチを採用。温かみのあるトーンで家族の絆を強調。"
- Must **not** display: "Schwartz Level 2", "LF8-3", "PAS Framework", etc.

### 8.3 Data Storage

The `pipelineState` is sent in the final callback payload and should be stored on the campaign record. Need to add a `pipelineState` JSONB column to the campaigns table, or store it within the existing `progress` JSONB field.

**Recommendation:** Store `pipelineState` as a separate JSONB column on `campaigns` for clean separation. The `progress` field is for real-time UI updates; `pipelineState` is the permanent record of agent outputs.

---

## 9. Model Availability in n8n's Anthropic Chat Model Node

### 9.1 Current State

The n8n Anthropic Chat Model sub-node (version 1.3) uses a `resourceLocator` with a `searchModels` method. In versions <= 1.2, the dropdown hardcoded model options up to Claude 3.5 Sonnet. Version 1.3+ should be able to list `claude-opus-4-6` via the API search, or you can use the "ID" mode to manually enter the model string.

**Important:** If using HTTP Request nodes to call the Anthropic API directly (our recommendation), model availability in the n8n sub-node is irrelevant -- we control the model string in the request body.

### 9.2 Model String Format

The webhook payload sends model config as:
```json
"agentConfig": {
  "strategicInsight": { "model": "claude-opus-4-6" },
  ...
}
```

In n8n HTTP Request nodes, this maps to the Anthropic API `model` parameter:
```json
{
  "model": "claude-opus-4-6",
  "max_tokens": 4096,
  "temperature": 0.2,
  "system": "...",
  "messages": [...],
  "tools": [...],
  "tool_choice": { "type": "tool", "name": "deliver_strategic_insight" }
}
```

---

## 10. Risk Register

### R1: n8n Sub-Workflow Data Size Limits
- **Risk:** PipelineState grows too large as it accumulates agent outputs
- **Mitigation:** Each agent writes ~200-500 bytes. Total ~5KB is well within limits.
- **Severity:** Low

### R2: Anthropic API Timeout in n8n
- **Risk:** Claude API calls for complex agents (Strategic Insight, JP Localization) may take 30-60 seconds
- **Mitigation:** n8n HTTP Request timeout defaults to 300s. Set explicit timeout per node. Use n8n's retry-on-failure settings.
- **Severity:** Medium

### R3: Callback Race Conditions
- **Risk:** Multiple rapid callbacks could cause progress field overwrites
- **Mitigation:** The existing callback handler uses read-merge-write pattern. Add per-field granular updates instead of full replacement.
- **Severity:** Medium

### R4: JP Localization Critique Loop Infinite Loop
- **Risk:** Bug in loop counter could cause infinite revisions
- **Mitigation:** Hard cap at 3 attempts in both the n8n loop logic AND the prompt instructions. n8n workflow timeout as additional safety.
- **Severity:** Low (explicit counter + timeout)

### R5: Video Pipeline Blocking Campaign Delivery
- **Risk:** Long-running video generation could delay campaign being marked "complete"
- **Mitigation:** Context decision already addresses this -- campaign delivers copy+images immediately, video arrives later via Realtime. Implementation: send "complete" callback before starting video pipeline.
- **Severity:** Low (already decided)

### R6: Model Cost with claude-opus-4-6 for All Agents
- **Risk:** Running 5 agents all on claude-opus-4-6 could be expensive per campaign
- **Mitigation:** Per-agent model assignment via AGENT_*_MODEL env vars allows downgrading specific agents to Sonnet. Cost tracking via campaign_costs table enables data-driven optimization. Defer optimization until real cost data is available (Phase 8 decision).
- **Severity:** Medium (cost, not functionality)

### R7: Compositing/Resize Internal API Endpoint Security
- **Risk:** Exposing compositing/resize as API endpoints could be exploited
- **Mitigation:** HMAC signature verification on internal endpoints (same pattern as webhook). Or use a separate internal API key stored as n8n credential.
- **Severity:** Medium

---

## 11. Requirement Coverage Map

| Requirement | Plan | Approach |
|------------|------|----------|
| **ORCH-02** | 09-01 | Master Orchestrator workflow: webhook -> PipelineState -> dispatch |
| **ORCH-04** | 09-02 | Strategic Insight sub-workflow with Schwartz/LF8/framework classification |
| **ORCH-05** | 09-02 | Creative Director sub-workflow generating concept/visual/copy direction |
| **ORCH-06** | 09-03 | Copywriter sub-workflow with platform-specific structured output |
| **ORCH-07** | 09-03 | Art Director sub-workflow generating Flux image prompts |
| **ORCH-08** | 09-03 | JP Localization sub-workflow with critique loop (max 2 retries) |
| **ORCH-09** | 09-02 | Quality gate Code node validating StrategicInsightOutput completeness |
| **GENX-01** | 09-04 | Flux 1.1 Pro Ultra sub-workflow via fal.ai HTTP Request |
| **GENX-02** | 09-04 | JP text compositing via internal Next.js API endpoint |
| **GENX-03** | 09-05 | Kling/Runway video via internal Next.js API endpoint (video-pipeline) |
| **GENX-04** | 09-05 | ElevenLabs voice via internal Next.js API endpoint (video-pipeline) |
| **GENX-05** | 09-05 | HeyGen avatar via internal Next.js API endpoint (video-pipeline) |
| **GENX-06** | 09-04/05 | Platform resize via internal Next.js API endpoint |
| **GENX-07** | 09-05 | ZIP packaging -- already exists, on-demand at download time |
| **GENX-08** | 09-05 | Circuit breaker -- existing ProviderHealthTracker used via internal APIs |
| **GENX-09** | 09-03/04 | Art Director prompt includes inference fallback when brand profile minimal |

---

## 12. Key Decisions Needed During Planning

### D1: Internal API vs. Direct n8n Provider Calls

Should n8n call external APIs (fal.ai, Kling, Runway, ElevenLabs, HeyGen) directly via HTTP Request nodes, or should n8n call internal Next.js API endpoints that wrap the existing TypeScript modules?

- **Internal API approach:** Lower risk, reuses tested code, circuit breaker works automatically, but adds Vercel function invocations and latency
- **Direct n8n approach:** More control in n8n, eliminates round-trip to Vercel, but duplicates logic and loses circuit breaker

**Research recommendation:** Internal API for generation sub-workflows (Flux, video pipeline, compositing, resize). Direct HTTP Request for creative agent API calls (Anthropic) since those are simple POST requests with structured prompts.

### D2: Per-Agent Progress UI Component Design

The current `GenerationProgress` component shows flat steps. Phase 9 needs a vertical timeline with:
- Agent name (Japanese)
- Status icon (spinner/check/alert)
- Summary line appearing on completion
- Elapsed timer for long-running steps

Need to design the component structure and animation during planning.

### D3: PipelineState Storage on Campaign Record

Should `pipelineState` be stored as:
- A new dedicated column on `campaigns` table
- Embedded within the existing `progress` JSONB column
- A separate `pipeline_states` table

**Research recommendation:** New `pipelineState` JSONB column on `campaigns`. Small migration, clean separation of concerns.

### D4: Copwriter-Art Director Parallelization

The Context gives Claude's discretion on sub-workflow architecture. Copywriter and Art Director can run in parallel after Creative Director. This saves ~15-30 seconds per pipeline run but adds merge complexity.

**Research recommendation:** Implement parallel execution. n8n natively supports branching and merging. The benefit (time savings on every campaign) outweighs the marginal complexity.

### D5: Strategy Accordion Rendering

The Context specifies a collapsible accordion with steel-blue accent between header and tab bar. Need to decide:
- Whether to build as a new component or extend the campaign header component
- Animation style (expand/collapse) -- smooth height transition recommended
- Whether to pre-render strategy text or compute from pipelineState on render

**Research recommendation:** Build as a standalone `StrategyAccordion` component. Compute user-friendly text from `strategicInsight` data on render (map internal codes to Japanese descriptions). Use CSS `max-height` transition for smooth expand/collapse.

---

## Summary: What the Planner Needs to Know

1. **The trigger path is complete.** Next.js already sends v1.1 webhook payloads to n8n. The callback handler already accepts v1.1 payloads including milestones, cost entries, and agent errors. Phase 9 builds the n8n workflows that sit between these two endpoints.

2. **Use HTTP Request nodes for Claude agent calls.** The n8n AI Agent node adds LangChain overhead without benefit for our structured prompt pattern. Direct Anthropic API calls via HTTP Request give full control over model, temperature, and tool-use structured output.

3. **Use internal Next.js API endpoints for generation.** The existing TypeScript modules for Flux, compositing, resize, video pipeline, and ZIP are battle-tested. Wrapping them in internal API endpoints is lower risk than reimplementing in n8n.

4. **The progress UI needs upgrading.** The current flat step display must be replaced with per-agent timeline showing Japanese labels and summary lines. This is a frontend component change driven by the new callback shape.

5. **The JP Localization critique loop is the hardest part.** It involves a revision loop within a sub-workflow, passing critique context between two AI calls, tracking attempt count, and selecting the best-of-3 on exhaustion. This needs careful n8n workflow design.

6. **Video is async.** Campaign marks "complete" after copy + images. Video arrives later via Realtime. This simplifies the orchestrator's critical path significantly.

7. **Strategy visibility is a new UI feature.** The accordion component reads from the stored `pipelineState.strategicInsight` and transforms internal codes into user-friendly Japanese prose. Requires a new JSONB column on campaigns and a new React component.

8. **Database changes needed:** (a) `pipelineState` JSONB column on campaigns, (b) `agentSteps` array in CampaignProgress type, (c) migration SQL.

9. **n8n workflows to create:** 1 master orchestrator + 5 agent sub-workflows + 3-4 generation sub-workflows = 9-10 workflows total, all created via the n8n MCP tools or n8n UI.

10. **Cost tracking is automatic.** Each n8n sub-workflow includes cost entry callbacks after each API call. The existing callback handler persists to `campaign_costs` table.
