# Feature Landscape: AI Content Studio v1.1

**Domain:** n8n 7-agent orchestration, Auto/Guided/Pro modes, Brand Memory, compliance auto-rewrite
**Researched:** 2026-02-16
**Scope:** NEW features only -- v1.0 features (brief form, copy/image/video generation, platform formatting, billing, dashboard, compliance flagging) are already shipped and NOT re-documented here.

---

## Table Stakes

Features that are baseline expectations for the v1.1 capabilities. Without these, the new features feel incomplete or broken.

### TS-1: n8n 7-Agent Pipeline Table Stakes

| ID | Feature | Why Expected | Complexity | Dependencies on Existing | Confidence |
|----|---------|--------------|------------|--------------------------|------------|
| TS-A01 | **Agent-to-agent state passing via structured JSON** | Users of the 7-agent pipeline expect agents to build on each other's output. Strategic Insight's Schwartz classification must flow into Copywriter's register selection. Without explicit state, agents hallucinate or repeat work. | Medium | Extends existing `CampaignBrief` type and `campaigns.brief` JSONB column | HIGH |
| TS-A02 | **Per-agent system prompts with role boundaries** | Each of the 7 agents (Orchestrator, Strategic Insight, Creative Director, Copywriter, Art Director, JP Localization, Media Intelligence) needs a scoped system prompt constraining its domain. n8n's AI Agent node supports per-agent system prompts and separate LLM nodes. Without boundaries, agents bleed into each other's responsibilities. | Medium | New n8n sub-workflows; existing `prompts/` directory pattern for prompt files | HIGH |
| TS-A03 | **JP Localization agent veto power** | The Localization agent must be able to reject or rewrite any output that fails Japanese quality standards (keigo errors, kinsoku shori violations, cultural missteps). This is the only agent with override authority. Without veto, the Japanese quality moat collapses. | High | Existing `qa-agent.ts` and `compliance-agent.ts` provide the validation logic pattern | HIGH |
| TS-A04 | **Progressive result streaming to dashboard** | Campaign generation with 7 agents takes longer than v1.0's direct API calls. Users must see progress per-agent, not a blank screen. Existing `CampaignProgress` type already tracks per-stage status. | Medium | Extends existing `CampaignProgress` interface and SSE/Supabase Realtime pattern | HIGH |
| TS-A05 | **Partial failure tolerance** | If one agent fails (e.g., video generation), the pipeline must deliver whatever succeeded. v1.0 already supports `status: 'partial'`. The 7-agent pipeline must preserve this. | Medium | Existing `campaigns.status` supports 'partial'; existing error-handling pattern in each provider | HIGH |
| TS-A06 | **Quality gate between strategic and creative phases** | The Orchestrator must validate that Strategic Insight's output (Schwartz level, LF8 mapping, framework selection) is complete before passing to Creative Director. This prevents garbage-in-garbage-out cascading. | Medium | New validation checkpoint in n8n orchestrator workflow | HIGH |

### TS-2: Auto Mode Table Stakes

| ID | Feature | Why Expected | Complexity | Dependencies on Existing | Confidence |
|----|---------|--------------|------------|--------------------------|------------|
| TS-B01 | **5-question conversational brief builder** | Auto mode's core promise: solopreneurs answer 5 plain-language questions in under 3 minutes instead of filling out the structured brief form. Without this, Auto mode is just Pro mode with fewer options. | High | Replaces existing brief form UI for Auto users; must produce a valid `CampaignBrief` object | HIGH |
| TS-B02 | **Automatic Schwartz awareness-level inference** | The system must classify the user's audience awareness level (unaware/problem-aware/solution-aware/product-aware/most-aware) from conversational input without asking the user to self-classify. This drives copy strategy. | Medium | New -- feeds into Strategic Insight agent's classification; no existing equivalent | MEDIUM |
| TS-B03 | **Automatic LF8 desire mapping** | Map the user's product/service to one or more of the Life Force 8 desires (survival, enjoyment, freedom from fear, social approval, comfort, superiority, care for loved ones, sexual companionship) automatically from plain-language description. | Medium | New -- feeds into Copywriter agent's emotional angle selection | MEDIUM |
| TS-B04 | **Copywriting framework auto-selection** | Based on awareness level and product type, automatically select the appropriate framework (PAS, AIDA, Before/After/Bridge, SB7 StoryBrand). User never sees framework names. | Medium | New -- drives Copywriter agent's structural template | MEDIUM |
| TS-B05 | **3-5 ready-to-post assets as default output** | Auto mode must deliver a small, actionable set of assets (not the full campaign kit). A bakery owner wants 3 Instagram posts, not 24 cross-platform variants. | Low | Filters existing generation pipeline output; existing platform-sizing supports individual platforms | HIGH |
| TS-B06 | **Japanese conversational UI** | The brief builder conversation must be native Japanese -- casual-polite (desu/masu), not robotic. Culturally appropriate question flow: start with product, then audience, then goal. | Medium | Existing i18n infrastructure (next-intl); new conversation flow component | HIGH |

### TS-3: Brand Memory Table Stakes

| ID | Feature | Why Expected | Complexity | Dependencies on Existing | Confidence |
|----|---------|--------------|------------|--------------------------|------------|
| TS-C01 | **Accumulate style preferences across campaigns** | After 3-5 campaigns, the system should "know" the brand better. Track which copy variants the user favorited, which images were approved, which registers were selected. Progressive, not one-time setup. | Medium | Existing `copyVariants.isFavorite`, `approvalWorkflows`, and `brandProfiles` tables provide raw signals | HIGH |
| TS-C02 | **Inject learned preferences into generation prompts** | Accumulated brand memory must materially change generation quality. If a brand always picks formal register and blue tones, the 5th campaign should default to those without being told. | Medium | Extends existing brand profile data injected into `prompts/copy-generation.ts` and `prompts/image-generation.ts` | HIGH |
| TS-C03 | **Human-readable brand voice summary** | Users must see what the system has "learned" about their brand. A summary like "Your brand prefers formal keigo, blue/white color palette, and direct CTA style" builds trust and enables correction. | Low | New UI component; reads from brand memory data | HIGH |

### TS-4: Compliance Auto-Rewrite Table Stakes

| ID | Feature | Why Expected | Complexity | Dependencies on Existing | Confidence |
|----|---------|--------------|------------|--------------------------|------------|
| TS-D01 | **Auto-rewrite, not just flagging** | v1.0 flags compliance issues and suggests fixes. v1.1 must automatically rewrite non-compliant text with a compliant alternative. Solopreneurs have no compliance team to interpret flags. | High | Extends existing `compliance-agent.ts` which already returns `suggestion` per issue; needs a rewrite-and-replace loop | HIGH |
| TS-D02 | **Show original vs. rewritten with diff** | Users must see what changed and why. Side-by-side or inline diff of original vs. compliant version with legal basis annotation. | Medium | Extends existing compliance report UI; existing `ComplianceIssue` type includes `problematicText` and `suggestion` | HIGH |
| TS-D03 | **Cover all three laws** | Must check against 薬機法 (Pharmaceutical Affairs), 景品表示法 (Premiums and Representations), and 食品表示法 (Food Labeling). v1.0 covers the first two; 食品表示法 is new for v1.1. | Medium | Existing compliance prompt covers 薬機法 and 景品表示法; extend for 食品表示法 | MEDIUM |
| TS-D04 | **Preserve creative intent during rewrite** | Compliant rewrites must not strip the copy of its persuasive power. "Acne disappears" becoming "Cares for acne-prone skin" must still be compelling, not clinical. | High | New -- requires creative+compliance dual-objective prompting | MEDIUM |

---

## Differentiators

Features that create competitive advantage. These go beyond baseline expectations and define why AI Content Studio is different.

### D-1: n8n 7-Agent Pipeline Differentiators

| ID | Feature | Value Proposition | Complexity | Dependencies on Existing | Confidence |
|----|---------|-------------------|------------|--------------------------|------------|
| D-A01 | **Critique loop between Creative Director and JP Localization** | After the Copywriter and Art Director produce outputs, JP Localization reviews and can send copy back for revision with specific feedback. This mirror-review pattern (documented in n8n multi-agent templates) catches culturally inappropriate content before delivery. No Western competitor has a localization agent with veto power. | High | Extends existing QA agent pattern; new n8n loop workflow with IF node for pass/fail | HIGH |
| D-A02 | **Strategic Insight agent: domain-agnostic campaign intelligence** | Classifies any brief across Schwartz awareness levels, LF8 desires, and SB7 StoryBrand elements. A bakery and a SaaS company both get intelligent strategic recommendations from the same engine. This is the "democratize advertising judgment" thesis in action. | High | New agent; no existing equivalent; outputs feed all downstream agents | HIGH |
| D-A03 | **Media Intelligence agent: platform-specific optimization** | Recommends optimal posting times, hashtag strategies, and platform-specific copy adjustments per Japanese platform. Knows that LINE Rich Messages work best with single CTA, that X/Twitter JP favors 100-character posts, that Rakuten listings need dense product info. | Medium | Existing platform-specs in `lib/platforms/`; new agent wraps this knowledge with AI reasoning | MEDIUM |
| D-A04 | **Agent scratchpad pattern for token efficiency** | Each agent tracks intermediate reasoning in a private scratchpad and passes only the final structured output to the next agent. Reduces token consumption by 40-60% vs. passing full conversation history. Documented pattern in n8n multi-agent best practices. | Medium | New implementation pattern within n8n sub-workflows | HIGH |
| D-A05 | **Orchestrator-managed state object** | A single JSON state object flows through the entire pipeline, accumulating each agent's contributions. The Orchestrator builds and validates this object at each stage. More reliable than free-form message passing between agents. | Medium | New -- replaces ad-hoc data passing with structured campaign state | HIGH |

### D-2: Auto/Guided/Pro Mode Differentiators

| ID | Feature | Value Proposition | Complexity | Dependencies on Existing | Confidence |
|----|---------|-------------------|------------|--------------------------|------------|
| D-B01 | **Three modes, one engine (adapter pattern)** | All three modes call the same 7-agent pipeline. Mode determines: (a) how the brief is collected, (b) how much strategic reasoning is visible, and (c) how many output options are presented. This is a facade/adapter pattern over a shared backend, not three separate products. | High | Existing brief form becomes Pro mode input; new conversation UI for Auto; Guided is hybrid | HIGH |
| D-B02 | **Invisible strategic reasoning in Auto mode** | Auto mode users never see "Schwartz Level 3" or "PAS framework." They see "Here are 3 posts designed to show your bakery's unique value to people who already know they want fresh bread." The intelligence is hidden behind plain-language summaries. | Medium | New UI layer that translates agent outputs; Strategic Insight output needs a `plainLanguageSummary` field | HIGH |
| D-B03 | **Guided mode: progressive disclosure** | Guided mode shows the strategic reasoning step-by-step and lets users override at each stage. "We detected your audience is problem-aware. Would you like to adjust?" This teaches solopreneurs marketing concepts while generating campaigns. | Medium | Hybrid of Auto conversation and Pro structured form; new multi-step wizard UI | MEDIUM |
| D-B04 | **Mode-specific output formatting** | Auto: 3-5 ready-to-post assets with suggested captions. Guided: Full campaign with annotations explaining strategic choices. Pro: Raw campaign kit with all variants, no guardrails. | Medium | Existing campaign review UI serves Pro; new simplified views for Auto and Guided | HIGH |
| D-B05 | **Seamless mode switching** | A user who starts in Auto can switch to Guided mid-flow to adjust strategy, or to Pro to see all variants. The underlying campaign state is shared. | Medium | Requires all three modes to read/write the same campaign state object | MEDIUM |

### D-3: Brand Memory Differentiators

| ID | Feature | Value Proposition | Complexity | Dependencies on Existing | Confidence |
|----|---------|-------------------|------------|--------------------------|------------|
| D-C01 | **Progressive profile building from usage signals** | Unlike Jasper's Brand IQ which requires upfront configuration, Brand Memory learns passively. Every campaign generates signals: favorited copy variants, approved images, register selections, color choices. After 5 campaigns, the system knows the brand deeply. | High | Existing `copyVariants.isFavorite`, `assets` approval data, `brandProfiles` base data | MEDIUM |
| D-C02 | **Brand voice fingerprint extraction** | Analyze approved copy variants across campaigns to extract patterns: average sentence length, preferred keigo level, CTA style (direct vs. soft), emotional vs. rational tone, exclamation frequency. Store as a structured voice fingerprint. | High | New analysis pipeline; reads from `copyVariants` table across multiple campaigns | MEDIUM |
| D-C03 | **Visual style memory** | Track which image styles, color palettes, and composition patterns the brand favors based on approval/rejection patterns. Feed into Art Director agent for consistent visual identity. | High | Existing `assets` table with approval data; needs image metadata extraction | LOW |
| D-C04 | **Brand memory override and reset** | Users can view, edit, and reset any aspect of the accumulated brand memory. "The system learned I prefer formal keigo, but I want to try casual for this campaign." Prevents lock-in to historical patterns. | Low | Simple CRUD on brand memory data; extends brand profile edit UI | HIGH |

### D-4: Compliance Auto-Rewrite Differentiators

| ID | Feature | Value Proposition | Complexity | Dependencies on Existing | Confidence |
|----|---------|-------------------|------------|--------------------------|------------|
| D-D01 | **Category-specific compliance rules** | Different product categories trigger different regulatory checks. Cosmetics trigger 薬機法 56-approved-expressions check. Health foods trigger 食品表示法 functional claims check. General products only get 景品表示法. Rule activation is automatic based on brand profile product catalog. | High | Existing `brandProfiles.productCatalog` has `targetSegment`; extend to include product category for law selection | HIGH |
| D-D02 | **NG-to-OK expression database** | Maintain a structured database of prohibited expressions and their compliant alternatives, specific to Japanese advertising law. Examples: "治る" (cures) becomes "ケアする" (cares for); "痩せる" (lose weight) becomes "ダイエット中の栄養補給" (nutritional support during dieting); "シワが消える" (wrinkles disappear) becomes "肌をなめらかに整える" (smooth skin). This enables deterministic rewrites for known patterns before falling back to LLM-based rewriting. | Medium | New reference data table; used by compliance agent before LLM-based analysis | HIGH |
| D-D03 | **Two-pass compliance: rule-based then LLM** | First pass: regex/dictionary match against known NG expressions for fast, deterministic catches. Second pass: LLM-based contextual analysis for nuanced violations (e.g., implied medical claims, misleading comparisons). This is how the existing Japanese compliance SaaS tools work (confirmed by 広告チェックAI and similar tools). | High | Extends existing `compliance-agent.ts` with a pre-LLM rules engine | HIGH |
| D-D04 | **Compliance confidence scoring** | Not all compliance issues are equally clear. "治る" in cosmetics copy is definitely NG (severity: error). "Feels like a new you" is contextual (severity: warning). Confidence scores help users prioritize which rewrites to accept. | Low | Existing `ComplianceIssue.severity` field already supports error/warning; extend to include confidence percentage | HIGH |
| D-D05 | **食品表示法 (Food Labeling Act) coverage** | New law coverage for v1.1. Checks: functional food claims must match registered notification content; health foods cannot claim disease prevention; expressions must not imply government approval. Essential for food/beverage brand clients. | Medium | Extend existing compliance prompt; add food labeling rules to system prompt | MEDIUM |

---

## Anti-Features

Features to explicitly NOT build for v1.1. These are tempting but would waste resources or harm the product.

| ID | Anti-Feature | Why Avoid | What to Do Instead |
|----|--------------|-----------|-------------------|
| AF-01 | **Fine-tuned per-brand LLM model** | Fine-tuning is expensive, slow (days), requires significant training data most brands don't have, and creates a maintenance burden (retrain on each model update). Jasper's Brand IQ achieves brand voice without fine-tuning. | In-context learning via Brand Memory: inject accumulated preferences, voice fingerprint, and example copy into system prompts. Claude handles few-shot adaptation without fine-tuning. |
| AF-02 | **Autonomous agent communication (peer-to-peer)** | Letting agents talk to each other without orchestrator supervision leads to runaway token consumption, unpredictable behavior, and impossible debugging. n8n best practices explicitly recommend hierarchical orchestration over peer-to-peer. | Orchestrator-managed pipeline: every agent reports to and receives instructions from the Campaign Orchestrator. Structured state object flows through a defined sequence. |
| AF-03 | **Real-time conversational chat with agents** | "Chat with the Creative Director" sounds exciting but produces unpredictable results, breaks the structured pipeline, and makes quality assurance impossible. Anti-feature AF-05 from v1.0 research still applies. | Structured revision requests: user selects what to change, system re-runs the relevant agent with updated parameters. Chat-like UX for brief building only (Auto mode), not for iterating on outputs. |
| AF-04 | **Custom compliance rule editor** | Building a visual rule editor for compliance regulations adds massive UI complexity. Users are not compliance lawyers. They want the system to handle it. | Curated NG/OK database maintained by the development team (with native JP speaker review). Users see results, not rules. |
| AF-05 | **Agent marketplace / plugin system** | Tempting to let users add custom agents, but it fragments the pipeline, breaks quality guarantees, and creates a support nightmare. | Fixed 7-agent pipeline. The agents are tuned to work together. Customization happens through brand profiles and mode selection, not agent composition. |
| AF-06 | **Separate mobile app for Auto mode** | Building a native iOS/Android app doubles the frontend surface area. Japanese solopreneurs are mobile-heavy, but PWA on mobile browser is sufficient for campaign generation. | Responsive web app optimized for mobile. Auto mode's conversational UI works naturally on mobile web. Add PWA manifest for home screen installation. |
| AF-07 | **Full RAG vector search for Brand Memory** | Building a Qdrant/Weaviate vector search pipeline for brand memory is over-engineering for the data volume involved. A brand with 50 campaigns has maybe 200 copy variants -- easily handled by PostgreSQL JSONB queries. | PostgreSQL-native queries on structured brand memory data. JSONB aggregation queries are sufficient for preference extraction. Migrate to RAG only when data volume justifies it (PROJECT.md already notes this as future). |
| AF-08 | **Multi-language compliance checking** | Compliance rules are deeply language-specific. Japanese advertising law has no 1:1 mapping to other jurisdictions. Attempting to generalize the compliance engine undermines accuracy. | Japanese-only compliance. The product's moat is JP-specific knowledge. If expanding to other markets, build separate compliance modules per jurisdiction. |

---

## Feature Dependencies

Understanding build order requires mapping what depends on what. All dependencies are relative to v1.0 (already shipped).

```
v1.1 FOUNDATION (must exist before other v1.1 features):
  n8n 7-Agent Pipeline (TS-A01 through TS-A06)
  ├── Campaign Orchestrator sub-workflow (master controller)
  ├── Structured state object definition (TS-A01, D-A05)
  └── Quality gate between strategic and creative phases (TS-A06)

STRATEGIC LAYER (depends on Orchestrator):
  Strategic Insight Agent (D-A02)
  ├── Schwartz awareness classification (TS-B02)
  ├── LF8 desire mapping (TS-B03)
  └── Copywriting framework selection (TS-B04)

CREATIVE LAYER (depends on Strategic Layer):
  Creative Director Agent (coordinates Copywriter + Art Director)
  ├── Copywriter Agent (uses framework from Strategic Insight)
  ├── Art Director Agent (uses visual direction from Creative Director)
  └── Brand Memory injection into prompts (TS-C02)

QUALITY LAYER (depends on Creative Layer):
  JP Localization Agent with veto power (TS-A03)
  ├── Critique loop back to Creative (D-A01)
  └── Compliance auto-rewrite (TS-D01 through TS-D04)

MEDIA LAYER (depends on Creative Layer):
  Media Intelligence Agent (D-A03)
  └── Platform-specific optimization recommendations

MODE ADAPTERS (depends on full pipeline):
  Auto Mode (TS-B01 through TS-B06)
  ├── Conversational brief builder (TS-B01)
  ├── Invisible strategic reasoning (D-B02)
  └── Simplified output (TS-B05)

  Guided Mode (D-B03)
  ├── Progressive disclosure wizard (D-B03)
  └── Annotated output (D-B04)

  Pro Mode = existing brief form + full output
  └── Mode switching (D-B05)

BRAND MEMORY (can be built in parallel with modes):
  Progressive profile building (TS-C01, D-C01)
  ├── Voice fingerprint extraction (D-C02)
  ├── Visual style memory (D-C03)
  ├── Human-readable summary (TS-C03)
  └── Override and reset (D-C04)

COMPLIANCE AUTO-REWRITE (depends on pipeline + NG/OK database):
  NG/OK expression database (D-D02)
  ├── Two-pass compliance: rules then LLM (D-D03)
  ├── Category-specific rule activation (D-D01)
  ├── 食品表示法 coverage (D-D05)
  └── Original vs. rewritten diff UI (TS-D02)
```

### Critical Path

The critical path for v1.1 is:

```
n8n Orchestrator Setup → State Object Schema → Strategic Insight Agent →
Creative Director + Copywriter + Art Director → JP Localization (with veto) →
Quality Gate Validation → Auto Mode Brief Builder → Compliance Auto-Rewrite
```

Brand Memory and Media Intelligence can proceed in parallel with the mode adapters.

---

## MVP Recommendation for v1.1

### Phase 1: Core Pipeline (must ship)

1. **n8n 7-Agent Pipeline** with structured state object (TS-A01 through TS-A06)
2. **Strategic Insight Agent** with Schwartz/LF8/framework classification (D-A02, TS-B02, TS-B03, TS-B04)
3. **JP Localization Agent** with veto power and critique loop (TS-A03, D-A01)
4. **Quality gates** between strategic and creative phases (TS-A06)

### Phase 2: Auto Mode + Compliance (high value, depends on Phase 1)

5. **Auto Mode conversational brief builder** (TS-B01, TS-B06)
6. **Invisible strategic reasoning** for Auto users (D-B02)
7. **Compliance auto-rewrite** with NG/OK database (TS-D01, D-D02, D-D03)
8. **食品表示法 coverage** added to compliance (D-D05)

### Phase 3: Brand Memory + Guided Mode (builds on Phase 1-2 usage data)

9. **Brand Memory progressive accumulation** (TS-C01, TS-C02, D-C01)
10. **Brand voice fingerprint** (D-C02)
11. **Guided Mode** progressive disclosure (D-B03, D-B04)
12. **Mode switching** (D-B05)

### Defer to later:

- **Visual style memory** (D-C03): Needs more image metadata infrastructure; LOW confidence in automated extraction quality
- **Media Intelligence agent** (D-A03): Valuable but not on critical path; platform optimization can be rule-based initially
- **Custom compliance rules** (AF-04): Anti-feature -- don't build

---

## Detailed Feature Specifications

### 1. n8n 7-Agent Pipeline

**How it works in production (based on n8n ecosystem research):**

The pipeline uses n8n's **Execute Sub-workflow** pattern. Each agent is a separate n8n workflow triggered by the Orchestrator. Data passes through a structured JSON state object that accumulates each agent's contributions.

**Agent roster and responsibilities:**

| Agent | n8n Pattern | System Prompt Focus | Input | Output | Quality Gate |
|-------|-------------|---------------------|-------|--------|-------------|
| Campaign Orchestrator | Master workflow with Execute Sub-workflow nodes | Sequence management, state validation, error routing | Campaign brief + brand profile | Orchestration control flow | Validates state completeness at each stage |
| Strategic Insight | AI Agent node in sub-workflow | Schwartz awareness, LF8, SB7, framework selection | Brief text, product info, target audience | `strategyState: {awarenessLevel, lf8Desires[], framework, positioningAngle}` | Orchestrator validates all fields populated |
| Creative Director | AI Agent node in sub-workflow | Creative concept, visual direction, copy direction | Strategy state + brief | `creativeState: {concept, visualMood, copyAngle, toneGuidance}` | Internal coherence check |
| Copywriter | AI Agent node in sub-workflow | Copy generation per framework/platform | Creative state + brand profile + register | `copyState: {variants[], register, framework}` | Character count, register validation |
| Art Director | AI Agent node in sub-workflow | Visual prompt engineering, composition direction | Creative state + brand profile + copy | `visualState: {imagePrompts[], colorPalette, composition}` | Brand color compliance |
| JP Localization | AI Agent node in sub-workflow (VETO POWER) | Keigo validation, cultural check, kinsoku shori, compliance pre-screen | Copy state + visual state | `localizationState: {approved: boolean, issues[], rewrites[]}` | If not approved: loop back to Copywriter/Art Director |
| Media Intelligence | AI Agent node in sub-workflow | Platform optimization, timing, hashtags | Final copy + platform list | `mediaState: {platformTips[], hashtagSets[], postingGuidance}` | Platform rule validation |

**State object structure:**

```typescript
interface PipelineState {
  brief: CampaignBrief
  brandProfile: BrandProfileData
  brandMemory?: BrandMemorySnapshot
  strategy?: StrategyState
  creative?: CreativeState
  copy?: CopyState
  visual?: VisualState
  localization?: LocalizationState
  media?: MediaState
  metadata: {
    mode: 'auto' | 'guided' | 'pro'
    startedAt: string
    agentsCompleted: string[]
    currentAgent: string
    retryCount: number
  }
}
```

**Critique loop implementation (n8n pattern):**

```
Copywriter output → JP Localization review → IF Node (approved?)
  YES → Continue to Media Intelligence
  NO  → Loop back to Copywriter with localization feedback (max 2 retries)
        → After 2 retries, escalate to Orchestrator for human flag
```

This uses n8n's IF Node + loop-back pattern. The n8n community template "Iterative content refinement with multi-agent feedback system" demonstrates this exact pattern with Critic/Refiner/Evaluator agents.

**Confidence:** HIGH for agent architecture pattern (confirmed by n8n docs and community templates). MEDIUM for specific n8n node configuration (verify Execute Sub-workflow data return behavior -- known issue where sub-workflows return data from the wrong node if Wait nodes are involved).

### 2. Conversational Brief Builder (Auto Mode)

**How it works:**

A 5-question conversational flow that replaces the structured brief form for solopreneurs. The conversation is powered by Claude (via API route, not n8n -- low latency required for chat UX) and produces a valid `CampaignBrief` object.

**Question flow (progressive, each question builds on previous answers):**

| Step | Question (JP) | What It Extracts | Maps To |
|------|---------------|------------------|---------|
| 1 | "What do you sell or offer? Tell me about it in your own words." / 何を売っていますか？自分の言葉で教えてください。 | Product/service description, industry | `campaignProductInfo`, product category for compliance |
| 2 | "Who is your ideal customer?" / 理想のお客様はどんな人ですか？ | Target audience demographics and psychographics | `targetAudience`, Schwartz awareness inference |
| 3 | "What do you want this campaign to achieve?" / このキャンペーンで何を達成したいですか？ | Campaign objective, desired outcome | `objective`, LF8 desire mapping |
| 4 | "Where do you want to reach them?" / どこでお客様に届けたいですか？ | Platform selection (with suggestions) | `platforms[]` |
| 5 | "What feeling should people get from your brand?" / あなたのブランドからどんな印象を受けてほしいですか？ | Tone, mood, register hints | `creativeMoodTags[]`, `registerOverride` |

**Strategic inference layer (invisible to user):**

After collecting answers, a Claude call performs simultaneous classification:

```
Input: 5 answers + product category
Output: {
  schwartzLevel: 'problem_aware',  // inferred from audience description
  lf8Desires: ['comfort', 'social_approval'],  // inferred from product + audience
  framework: 'PAS',  // selected based on awareness level
  suggestedRegister: 'standard',  // inferred from brand feeling
  sb7Elements: { hero: '...', problem: '...', guide: '...' }  // mapped from brief
}
```

**UX pattern:** Conversational interface with message bubbles. System messages appear as assistant (not chatbot). User can type freely or tap suggested responses. Each question has 2-3 example answers shown as chips. Validates in real-time -- if answer is too vague, follows up before moving to next question.

**Confidence:** HIGH for UX pattern (well-established conversational design). MEDIUM for classification accuracy (Schwartz/LF8 inference from plain language needs testing with real Japanese input).

### 3. Brand Memory System

**How it works:**

Brand Memory is a **progressive profiling** system. It starts with the explicit brand profile (v1.0) and accumulates implicit preferences from campaign usage over time.

**Signal sources (all already exist in v1.0 database):**

| Signal | Source Table | What It Reveals |
|--------|-------------|-----------------|
| Favorited copy variants | `copyVariants.isFavorite` | Preferred headline style, CTA approach, tone |
| Approval workflow decisions | `approvalWorkflows` + `approvalHistory` | What passes review, what gets rejected |
| Register selections | `campaigns.brief.registerOverride` | Preferred keigo level patterns |
| Platform selections | `campaigns.brief.platforms` | Preferred channels |
| Creative mood tags | `campaigns.brief.creativeMoodTags` | Visual/tonal preferences |
| Campaign frequency | `campaigns.createdAt` | Seasonal patterns, campaign cadence |

**Storage pattern: JSONB on brand profile, not separate table**

```typescript
interface BrandMemory {
  version: number
  lastUpdated: string
  campaignCount: number  // how many campaigns contributed

  voice: {
    preferredRegister: 'casual' | 'standard' | 'formal'
    registerConfidence: number  // 0-1, increases with more data
    averageHeadlineLength: number
    preferredCtaStyle: 'direct' | 'soft' | 'question'
    exclamationFrequency: 'high' | 'medium' | 'low'
    emojiUsage: boolean
    toneTrends: string[]  // extracted from favorited variants
  }

  visual: {
    preferredColorPalette: string[]  // hex codes from approved images
    preferredComposition: string[]  // tags like 'minimal', 'text-heavy', 'lifestyle'
    avoidedElements: string[]  // from rejected variants
  }

  strategy: {
    commonAwarenessLevels: string[]  // most frequent Schwartz levels
    commonLf8Desires: string[]  // most frequent LF8 mappings
    preferredFrameworks: string[]  // most successful frameworks
  }

  platforms: {
    mostUsed: string[]  // ranked by frequency
    neverUsed: string[]  // available but never selected
  }

  overrides: {  // manual user corrections
    [key: string]: unknown
  }
}
```

**Why JSONB, not vector search:** With 50 campaigns and 200 copy variants, we're dealing with structured preference data, not semantic similarity search. PostgreSQL JSONB aggregation queries (`jsonb_agg`, `jsonb_object_agg`) handle this efficiently. Vector search (Qdrant/Weaviate) is overkill until we need semantic retrieval across thousands of documents. The PROJECT.md already flags RAG migration as a future item.

**Accumulation trigger:** After each campaign reaches `status: 'complete'`, a background job analyzes new signals and updates the brand memory. Not real-time -- batch update is sufficient and avoids complexity.

**Confidence:** HIGH for storage pattern. MEDIUM for voice fingerprint extraction accuracy (needs testing with real campaign data).

### 4. Compliance Auto-Rewrite

**How it works in production:**

The existing compliance agent (v1.0) flags issues. v1.1 adds a **rewrite loop** that produces compliant alternatives.

**Two-pass architecture:**

**Pass 1: Deterministic rule matching (fast, reliable)**

A dictionary of known NG expressions and their OK alternatives. This catches the most common violations instantly without LLM cost.

```typescript
interface ComplianceRule {
  id: string
  law: 'yakukiho' | 'keihyouhou' | 'shokuhinhyoujihou'
  category: string  // 'medical_claim' | 'safety_claim' | 'superlative' | etc.
  pattern: RegExp  // matches the NG expression
  ngExpression: string  // human-readable NG
  okAlternative: string  // compliant replacement
  severity: 'error' | 'warning'
  legalBasis: string  // specific article reference
  productCategories: string[]  // which product types this applies to
}
```

Example rules (from Japanese compliance research):

| Law | NG Expression | OK Alternative | Category |
|-----|--------------|----------------|----------|
| 薬機法 | 治る / 治った | ケアする / ケアできる | medical_claim |
| 薬機法 | 痩せる / 痩身 | ダイエット中の栄養補給 / スタイルサポート | medical_claim |
| 薬機法 | シワが消える | 肌をなめらかに整える | prohibited_expression |
| 薬機法 | シミを消す | 肌のトーンを明るく見せる | prohibited_expression |
| 薬機法 | 美白効果 | 日やけによるしみ・そばかすを防ぐ | prohibited_expression |
| 薬機法 | 安心・安全 | 敏感肌にもお使いいただけます | safety_claim |
| 薬機法 | 副作用なし | やさしい使い心地 | safety_claim |
| 薬機法 | アンチエイジング | 年齢に応じたケア / エイジングケア* | prohibited_expression |
| 景品表示法 | 業界No.1 / 日本一 (without basis) | [require factual basis or remove] | superlative |
| 景品表示法 | 通常価格X円→今だけY円 (without basis) | [require factual basis for original price] | advantageous_misrep |
| 景品表示法 | 残りわずか / 限定 (without basis) | [require factual basis or soften to 数量に限りがあります] | urgency_misrep |
| 食品表示法 | 糖尿病に効く | 健やかな毎日をサポート | disease_prevention |
| 食品表示法 | 消費者庁認定 | 届出表示に基づく (for functional foods) | government_approval |
| 食品表示法 | 高血圧の方に | 健康維持を心がける方に | disease_targeting |

*Note: エイジングケア is technically allowed if defined as "age-appropriate care" (年齢に応じたケア), but アンチエイジング (anti-aging) implies reversal and is NG.

**Pass 2: LLM-based contextual analysis**

After rule-based catches, the remaining copy goes to Claude for nuanced analysis. This catches:
- Implied medical claims that don't use explicit NG words
- Context-dependent violations (a word is fine in one context but NG in another)
- Misleading comparisons or testimonials
- Stealth marketing concerns

**Rewrite loop:**

```
Original copy → Pass 1 (rule-based) → Apply deterministic substitutions →
Partially-rewritten copy → Pass 2 (LLM analysis) → Identify remaining issues →
LLM rewrite with dual objective: compliance + persuasive quality →
Final compliant copy → Diff generation → Present to user
```

**Key constraint:** The LLM rewrite prompt must explicitly instruct: "Maintain the persuasive intent and emotional appeal of the original. The rewritten version must be equally compelling -- just legally compliant. Use techniques like onomatopoeia (つるつる, ふわふわ, さらさら), sensory language, and lifestyle imagery to maintain impact."

**Confidence:** HIGH for rule-based detection (well-documented NG/OK lists). MEDIUM for LLM-based rewrite quality (needs extensive testing with native JP speaker). LOW for 食品表示法 rule completeness (less documented than 薬機法 and 景品表示法).

### 5. Three-Mode Experience (Auto/Guided/Pro)

**How it works:**

The three modes are **adapter layers** over the same 7-agent pipeline. This is the Backend-for-Frontend (BFF) pattern applied to AI workflow output.

**Architecture:**

```
                    ┌─────────────┐
                    │  Auto Mode  │ (Conversational brief → simplified output)
                    └──────┬──────┘
                           │
                    ┌──────┴──────┐
                    │ Brief       │
                    │ Adapter     │ → Produces CampaignBrief object
                    └──────┬──────┘
                           │
┌─────────────┐    ┌──────┴──────┐    ┌─────────────┐
│ Guided Mode │────│  7-Agent    │────│  Pro Mode   │
│ (Wizard UI) │    │  Pipeline   │    │ (Full form) │
└──────┬──────┘    └──────┬──────┘    └──────┬──────┘
       │                  │                   │
┌──────┴──────┐    ┌──────┴──────┐    ┌──────┴──────┐
│  Output     │    │  Pipeline   │    │  Output     │
│  Adapter    │    │  State      │    │  Adapter    │
│ (annotated) │    │  (shared)   │    │  (full kit) │
└─────────────┘    └─────────────┘    └─────────────┘
```

**Mode differences (same engine, different wrappers):**

| Aspect | Auto | Guided | Pro |
|--------|------|--------|-----|
| Brief input | Conversational (5 questions) | Multi-step wizard with overrides | Full structured form |
| Strategic reasoning | Invisible (plain-language summary) | Visible with edit options | Full agent outputs visible |
| Creative control | None (system decides) | Per-stage approval | Full variant access |
| Output format | 3-5 ready-to-post assets | Full kit with annotations | Full kit, raw data, all variants |
| Compliance | Auto-rewrite (no user action) | Auto-rewrite with diff review | Flag + suggestion (user decides) |
| Brand Memory | Fully automatic | Automatic with override prompts | Manual + automatic |
| Target user | Solopreneur, SMB owner | Growing business, learning marketer | Agency, experienced marketer |

**Implementation pattern:**

```typescript
// Mode adapter interface
interface ModeAdapter {
  mode: 'auto' | 'guided' | 'pro'

  // Brief collection
  collectBrief(input: ModeSpecificInput): Promise<CampaignBrief>

  // Pipeline configuration
  getPipelineConfig(): PipelineConfig  // e.g., max variants, quality thresholds

  // Output formatting
  formatOutput(pipelineState: PipelineState): ModeSpecificOutput

  // Compliance behavior
  getComplianceBehavior(): 'auto_rewrite' | 'review_diff' | 'flag_only'
}
```

Each mode implements this interface. The pipeline doesn't know or care which mode called it -- it receives a `CampaignBrief` and returns a `PipelineState`.

**Confidence:** HIGH for adapter pattern. MEDIUM for Guided mode UX (progressive disclosure wizard needs careful design to not feel like a worse version of both Auto and Pro).

---

## Sources

### n8n Agent Orchestration
- [n8n Multi-Agent Systems Tutorial](https://blog.n8n.io/multi-agent-systems/) -- HIGH confidence, official n8n blog
- [Multi Agent Solutions in n8n](https://hatchworks.com/blog/ai-agents/multi-agent-solutions-in-n8n/) -- MEDIUM confidence, third-party guide with good n8n-specific detail
- [n8n AI Agent Tool Node Docs](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolaiagent/) -- HIGH confidence, official docs
- [n8n Sub-workflows Docs](https://docs.n8n.io/flow-logic/subworkflows/) -- HIGH confidence, official docs
- [n8n Execute Sub-workflow Trigger Docs](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.executeworkflowtrigger/) -- HIGH confidence, official docs
- [n8n Iterative Content Refinement Template](https://n8n.io/workflows/5597-iterative-content-refinement-with-gpt-4-multi-agent-feedback-system/) -- MEDIUM confidence, community template
- [5 Common n8n Multi-Agent Problems](https://hussamkazim.com/n8n-multi-agent-problems-and-solutions/) -- MEDIUM confidence, practitioner experience
- [n8n Best Practices for AI Agents in Production](https://blog.n8n.io/best-practices-for-deploying-ai-agents-in-production/) -- HIGH confidence, official n8n blog

### Copywriting Frameworks
- [Schwartz 5 Levels of Awareness](https://swipefile.com/the-5-levels-of-awareness/) -- HIGH confidence, well-established framework
- [LF8 Life Force 8 - Ca$hvertising](https://www.phoneburner.com/blog/how-to-apply-the-life-force-8-for-better-selling) -- HIGH confidence, published framework
- [SB7 StoryBrand Framework](https://www.roionline.com/post/storybrand-sb7-framework-principles) -- HIGH confidence, published framework

### Brand Memory
- [Jasper Brand IQ](https://www.jasper.ai/brand-iq) -- MEDIUM confidence, competitor product (architecture inferred)
- [Progressive Profiling](https://www.descope.com/learn/post/progressive-profiling) -- HIGH confidence, established UX pattern
- [Jasper Brand Voice & Memory Features](https://theauthenticmarketer.com/b2b-marketing/jasper-brand-voice/) -- MEDIUM confidence, third-party review

### Japanese Compliance
- [薬機法 NG Words - 薬事法広告研究所](https://www.89ji.com/guide/pharmaceutical_device_law_ng.html) -- HIGH confidence, specialist JP compliance resource
- [薬機法 OK/NG Expressions Check](https://www.yakujihou.com/knowledge/yakkihou-check/) -- HIGH confidence, specialist compliance resource
- [広告チェックAI - AI-powered Compliance](https://archaic.co.jp/koukokuai/) -- MEDIUM confidence, competitor product
- [景品表示法 - 不当表示解説](https://www.89ji.com/keihyou-guide/unjust-labeling.html) -- HIGH confidence, specialist resource
- [機能性表示食品 NG Expressions](https://www.yakujihou.com/kinousei/adpoint/) -- HIGH confidence, specialist resource
- [化粧品 OK/NG Expressions](https://digitalidentity.co.jp/blog/pmd-act/expression-paraphrase-cosmetics.html) -- MEDIUM confidence, digital marketing practitioner resource

### UX Patterns
- [Conversational Design Institute](https://www.conversationdesigninstitute.com/) -- HIGH confidence, established discipline
- [GenAI UX Patterns](https://uxdesign.cc/20-genai-ux-patterns-examples-and-implementation-tactics-5b1868b7d4a1) -- MEDIUM confidence, UX practitioner article
- [Backend for Frontend Pattern](https://goteleport.com/learn/backend-for-frontend-bff-pattern/) -- HIGH confidence, established architecture pattern
