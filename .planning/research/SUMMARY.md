# Project Research Summary

**Project:** AI Content Studio v1.1 (Full Pipeline + Auto Mode)
**Domain:** n8n multi-agent orchestration, Japanese advertising compliance, conversational brief builder, brand memory, video generation
**Researched:** 2026-02-16
**Confidence:** MEDIUM-HIGH

---

## Executive Summary

AI Content Studio v1.1 is a substantial capability upgrade to an already-shipped product (21,573 LOC, v1.0 on Vercel). The core challenge is not building something new — it is threading new intelligence through an existing production system without breaking what works. The shift from flat parallel n8n branches to an Orchestrator + 7 Sub-Workflow Agent architecture is the structural heart of v1.1. Research confirms this pattern is well-documented, widely used in n8n, and the correct approach for a pipeline where agents critique and revise each other's outputs. The existing webhook/callback seams, Supabase Realtime progress, and Next.js API routes are all well-suited for this expansion — the work is additive, not reconstructive.

The recommended build sequence follows a strict dependency order: infrastructure hardening first (n8n 2.x upgrade, schema additions, error handling architecture), then the orchestrator and core agents (Strategic Insight through Localization), then user-facing modes (Auto mode conversational brief builder), then enhancement layers (Brand Memory, compliance auto-rewrite, Guided mode, Seedance). Three of the four CRITICAL pitfalls are integration risks that must be designed out from the start: token context exhaustion across 7 agents, sub-workflow error cascading, and cross-region latency accumulation. The fourth — compliance auto-rewrite legal liability — demands that v1.1 ships compliance as "flag + suggest with human confirmation," not as auto-certification.

Two features carry elevated external risk that justifies deferral or feature-flag isolation: Seedance 2.0 (4 days old at research time, active Hollywood and Japan IP litigation, no official API available) and NotebookLM MCP (browser-automation-based, 50-query/day cap, cookie expiry every 2-4 weeks). Both should be additive enhancements behind graceful degradation paths, not core dependencies. The pipeline must produce quality output without them. With those risks managed, v1.1 delivers a meaningfully differentiated product: a 7-agent strategic pipeline with JP Localization veto power, three experience modes (Auto/Guided/Pro) on a single engine, and a compliance engine upgraded from flagging to guided rewriting with legal-safe UX.

---

## Key Findings

### Recommended Stack

The v1.1 stack additions are minimal: two npm packages (`ai` and `@ai-sdk/anthropic` for the Auto mode chat UI), an n8n upgrade from 1.x to 2.x (EOL March 2026), and infrastructure additions on the n8n VPS (NotebookLM MCP server, Chrome/Chromium for auth, RAM increase from 4GB to 8GB recommended). Every other capability uses the existing stack: fal.ai for Seedance 2.0 (reusing `FAL_KEY`), Supabase JSONB for Brand Memory, Drizzle ORM for new schema tables, and the existing Anthropic SDK for compliance auto-rewrite.

**Core new technologies:**
- **n8n 2.x** (upgrade from 1.x): AI Agent nodes, Draft/Publish model, Task Runners for secure JS execution — required before any agent work begins; 1.x EOL March 2026
- **n8n AI Agent node (Tools Agent variant)**: LangChain-powered reasoning loop per sub-workflow — each of the 7 specialized agents uses this as its core
- **n8n Call n8n Workflow Tool**: Allows the Orchestrator agent to delegate to specialized agent sub-workflows as tools — the mechanism for the Orchestrator pattern
- **n8n MCP Client Tool**: Connects AI Agent nodes to the NotebookLM MCP server via SSE — how agents query the knowledge base at runtime
- **Vercel AI SDK `useChat` + `streamText`** (`ai` package v4.2+): Conversational brief builder for Auto mode — handles streaming, message state, and SSE natively in Next.js App Router
- **`@ai-sdk/anthropic`**: Claude provider for Vercel AI SDK — separate from the existing `@anthropic-ai/sdk` which stays for server-side structured generation
- **fal.ai queue API** (new `src/lib/ai/seedance.ts`): Seedance 2.0 via the same submit/poll/retrieve pattern as existing `kling.ts` — no new credentials or SDK needed
- **notebooklm-mcp** (npm on VPS, wrapped with Express HTTP layer): MCP server exposing NotebookLM to AI agents — knowledge base access without custom RAG pipeline
- **Supabase PostgreSQL JSONB** (new `brand_memory` table + Drizzle schema): Persistent brand knowledge across campaigns — no new services

**Model-to-agent mapping (critical for cost control):**
- Orchestrator, Strategic Insight, Creative Director, JP Localization: `claude-opus-4-6` (complex reasoning required)
- Copywriter, Art Director, Media Intelligence: `claude-sonnet-4-5` (sufficient quality, lower cost)
- Never use Opus as the default for all 7 agents — cost bloat to $2-10+ per campaign at Opus pricing

**New environment variables:** `N8N_AI_ENABLED=true`, `SEEDANCE_PROVIDER` (fal/wavespeed/byteplus), `NOTEBOOKLM_MCP_URL`, `EXECUTIONS_TIMEOUT=900`, `N8N_CONCURRENCY_PRODUCTION_LIMIT=3`

**New npm packages (the complete list):** `pnpm add ai @ai-sdk/anthropic` — that is the entire new npm footprint for v1.1.

### Expected Features

**Must have (table stakes — v1.1 is incomplete without these):**
- Agent-to-agent structured JSON state passing (accumulated `PipelineState` object)
- Per-agent system prompts with role boundaries (7 distinct sub-workflows, each with focused scope)
- JP Localization agent veto power with critique loop back to Copywriter (max 2 iterations, escalate to Orchestrator after)
- Progressive result streaming at agent level (not just stage level — users see "Strategic Insight Agent analyzing...")
- Quality gate between strategic and creative phases (Orchestrator validates completeness before passing forward)
- 5-question conversational brief builder for Auto mode (replaces structured form for solopreneurs)
- Automatic Schwartz/LF8/framework inference from plain-language Japanese input
- 3-5 ready-to-post assets as Auto mode default output (not the full 24-variant kit)
- Japanese conversational UI for brief builder (casual-polite, culturally appropriate question flow)
- Brand Memory accumulation from campaign signals (favorited variants, register selections, approval decisions)
- Brand Memory injection into generation prompts (voice examples, avoid patterns, compliance history)
- Human-readable brand voice summary for users
- Compliance auto-rewrite with original vs. rewritten diff and explicit human confirmation step

**Should have (competitive differentiators):**
- Strategic Insight agent: domain-agnostic Schwartz/LF8/SB7 classification for any product category
- Creative Director agent: quality evaluation and holistic review coordinating Copywriter + Art Director
- Media Intelligence agent: platform-specific timing, hashtag, and copy adjustment recommendations
- Agent scratchpad pattern (private reasoning, pass only structured output — 40-60% token savings)
- Orchestrator-managed state object flowing through entire pipeline
- Three modes (Auto/Guided/Pro) as adapter layers over the same 7-agent engine
- Invisible strategic reasoning in Auto mode (plain-language summaries, not framework names)
- Category-specific compliance rules (cosmetics trigger Yakki Ho, food triggers Shokuhin Hyoujihou)
- NG-to-OK expression database (deterministic rule matching before LLM-based analysis)
- Two-pass compliance: rule-based then LLM contextual (same pattern as production JP compliance SaaS tools)
- Shokuhin Hyoujihou (Food Labeling Act) coverage in addition to existing Yakki Ho + Keihin

**Defer to v1.2+:**
- Visual style memory (D-C03) — needs image metadata infrastructure, LOW confidence in automated extraction accuracy
- Media Intelligence agent (D-A03) — not on critical path; platform optimization can be rule-based initially
- Mode switching mid-flow (D-B05) — requires fully stable shared pipeline state first
- Guided mode progressive disclosure wizard (D-B03) — build after Auto mode is stable; UX complexity risk
- Full RAG vector search for Brand Memory — PostgreSQL JSONB handles data volume until 50+ campaigns per brand
- Seedance 2.0 as primary video provider — legal uncertainty; keep as feature-flagged third option

**Anti-features (explicitly do not build):**
- Fine-tuned per-brand LLM (use in-context Brand Memory instead — Jasper Brand IQ proves this works without fine-tuning)
- Peer-to-peer agent communication (orchestrator hierarchy only — prevents runaway token consumption)
- Real-time chat with creative agents mid-generation (structured revision requests only)
- Custom compliance rule editor UI (curated NG/OK database maintained by dev team)
- Agent marketplace or plugin system (fixed 7-agent pipeline, customization via brand profiles and modes)
- Separate mobile app for Auto mode (responsive PWA is sufficient for Japanese solopreneurs)

### Architecture Approach

The architecture is explicitly additive over the existing v1.0 system. The existing webhook trigger, HMAC-signed callback, Supabase Realtime progress, and campaign state JSONB are all kept intact. The expansion replaces what happens inside n8n (flat parallel branches become Orchestrator + 7 Sub-Workflow Agents) and adds what the Next.js layer sends (expanded webhook payload with Brand Memory context and mode) and receives (agent-level progress updates). The core data flow remains unchanged: Next.js triggers n8n via webhook, n8n reports back via HTTP callbacks, Next.js writes to Supabase, Supabase pushes to browser via Realtime.

**Major components:**
1. **n8n Master Orchestrator Workflow** — receives webhook, dispatches to specialized sub-workflow agents via Call n8n Workflow Tool, accumulates PipelineState, sends progress callbacks; uses AI Agent node for LLM-based routing decisions
2. **7 Agent Sub-Workflows** — each a separate n8n workflow with AI Agent node, scoped system prompt, MCP Client Tool for NotebookLM queries, and HTTP Request nodes for Claude API calls; returns structured JSON output to parent; most agents use direct HTTP Request to Claude (not AI Agent node) for full prompt control
3. **Critique Loop Sub-Workflow** — QA validation + compliance check + conditional re-run (IF node + iteration counter, max 2 retries before Orchestrator escalation)
4. **NotebookLM MCP Server** — `notebooklm-mcp` package as persistent service on n8n VPS (localhost:3456) wrapped with Express HTTP layer for n8n HTTP Request node access; aggressive Supabase caching (7-day TTL) to manage 50-query/day limit; graceful fallback to system-prompt-only mode when unavailable
5. **Auto Mode Brief Builder** — new Next.js API route (`/api/brief-builder/chat`) using Vercel AI SDK `streamText`; new `AutoBriefChat` React component using `useChat` hook; brief extraction delegated to n8n Campaign Orchestrator as its first step
6. **Brand Memory System** — new `brand_memory` Supabase table (Drizzle schema); populated from campaign signals post-completion in n8n callback handler; queried and injected into webhook payload before triggering generation; Zustand persist middleware for client-side cache
7. **Compliance Auto-Rewrite Engine** — two-pass: regex/dictionary against known NG expressions, then LLM contextual analysis; rewrite loop in n8n compliance sub-workflow (check to rewrite to re-check, max 2 iterations); original vs. rewritten diff UI requiring explicit human confirmation
8. **`runDirectGeneration` fallback** — mark deprecated now, add log warning when it activates, keep as safety net; Phase 2: convert to retry-queuing adapter; Phase 3 (v1.2+): remove entirely

**Key architecture decisions from research:**
- Most agents use direct Claude API calls via HTTP Request nodes (not AI Agent node) — preserves full prompt control and the existing `tool_choice` pattern from the v1.0 codebase
- Exception: Orchestrator uses AI Agent node because it needs LLM-based branching decisions
- Supabase as intermediate state bridge between agents (not n8n in-memory data passing) — survives partial failures, auditable, visible to Next.js
- Progress reporting via Supabase Realtime (n8n writes to campaigns table, browser subscribes via existing hook) — eliminates fragile n8n-to-Vercel webhook leg for progress updates
- Final results still delivered via HMAC-signed callback (business logic for credit refunds, brand memory extraction, compliance audit logging lives in Next.js)

### Critical Pitfalls

1. **Token context exhaustion across 7 agents (CRITICAL)** — By agents 5-7, accumulated context can exceed Claude's context window causing silent quality degradation or 400 errors. Fix: tiered models (Opus only for Orchestrator/Strategic/Localization, Sonnet for others); each agent returns structured JSON summary (500-1000 tokens max), not full reasoning chains; implement explicit token budgets with logging from day one. This is not a polish item — it is a structural requirement that must be solved in Phase 1.

2. **Sub-workflow error cascading (CRITICAL)** — n8n's default behavior halts the entire workflow on any node error. With 12+ failure points per campaign, any single transient failure kills the full pipeline. Fix: respond to n8n webhook immediately with 202 Accepted; enable "Continue On Fail + Error Output" on every Execute Workflow node; each agent sub-workflow returns structured error object on failure; Supabase as state bridge so completed work survives partial failures; set per-node timeouts (Claude: 60s, image: 120s, video: 300s, global ceiling: 900s).

3. **Seedance 2.0 legal and availability risk (CRITICAL)** — Disney, Paramount, and the MPA issued cease-and-desist letters within 3 days of Seedance 2.0 launch; Japan's government launched a copyright investigation. Official API not yet available. Fix: treat Seedance as a third video model behind Kling and Runway, never the sole new capability; build behind `SEEDANCE_PROVIDER` feature flag; do not use third-party aggregators (no SLA) for production; pipeline must work without Seedance.

4. **Compliance auto-rewrite legal liability (CRITICAL)** — Auto-rewriting non-compliant copy transforms the platform from a warning tool into an implicit compliance advisor. If the rewrite misses a violation or introduces a new one, the platform bears reputational and potentially legal liability under Japan's Civil Code Article 709. Fix: never label auto-rewritten copy as "compliant" or "approved"; use "suggested revision — verify with legal"; require explicit human confirmation via diff UI; log all compliance decisions; two-pass architecture (rule-based for known patterns, LLM for contextual). For v1.1: ship as "flag + human confirm," not fully autonomous rewrite.

5. **NotebookLM MCP fragility (HIGH)** — Browser automation using undocumented Google internal APIs; cookies expire every 2-4 weeks; 50-query/day cap limits throughput to ~7 campaigns/day; Google can change internal APIs without notice. Fix: design agents to function without knowledge base (system-prompt-only = degraded but functional); cache every response in Supabase (7-day TTL); bulk-query static knowledge at startup; health-check before each campaign run with graceful fallback; plan Gemini API grounding as production alternative from day one.

---

## Implications for Roadmap

Based on combined research, the dependency graph and risk profile suggest a 6-phase structure for v1.1:

### Phase 1: Infrastructure + Schema Foundation
**Rationale:** Nothing else can be built without n8n 2.x, database schema additions, and the expanded webhook payload. This is also where critical error-handling and cost-tracking infrastructure must be established — not as polish but as architecture. Cross-region communication patterns (Supabase Realtime for progress, batch callbacks for results) must be decided here.
**Delivers:** n8n 2.x running with `N8N_AI_ENABLED=true`; `brand_memory` table + `campaign_costs` table in Drizzle; expanded `CampaignProgress` type for agent-level granularity; expanded webhook payload (mode, brandMemory, autoModeBrief fields); HMAC callback endpoint extended for progress/result/error stages; token logging and cost tracking infrastructure ready for first campaign.
**Features addressed:** TS-A01 (state passing schema), TS-A04 (progressive streaming infrastructure), TS-A05 (partial failure architecture)
**Pitfalls avoided:** CP-1 (token tracking built in from day one), CP-2 (error handling architecture established upfront), HP-3 (cross-region communication pattern selected), HP-4 (cost tracking from first campaign)
**Research flag:** Standard patterns — no additional research phase needed. n8n 2.x migration is documented hardening release. Schema additions are straightforward Drizzle ORM.

### Phase 2: Campaign Orchestrator + Core Agent Pipeline
**Rationale:** The Orchestrator is the load-bearing structure for all agent work. Build the master workflow and Orchestrator sub-workflow first to prove the webhook/callback loop, then add agents incrementally (Strategic Insight, Copywriter, Art Director) to validate the sub-workflow data-flow pattern and parallel branch + merge behavior. JP Localization with veto power and critique loop comes at the end of this phase because it depends on having Copywriter output to critique.
**Delivers:** Functioning 7-agent pipeline (Orchestrator, Strategic Insight, Copywriter + Art Director in parallel, Localization with critique loop, placeholder for Media Intelligence). Campaign generation works end-to-end, replacing v1.0 flat parallel branches. Agent-level progress visible in dashboard. `runDirectGeneration` marked deprecated with log warning.
**Features addressed:** TS-A01 through TS-A06 (full pipeline table stakes), D-A02 (Strategic Insight with Schwartz/LF8/SB7), D-A01 (critique loop), D-A04 (scratchpad/summary-only passing pattern), D-A05 (orchestrator-managed state object)
**Pitfalls avoided:** CP-1 (tiered model assignments enforced, summary-only passing), CP-2 (Continue on Fail + error isolation per sub-workflow), MP-2 (Supabase as state bridge, clear large fields after writing), MP-4 (n8n workflow git export + staging instance from day one)
**Research flag:** Needs validation of Execute Sub-workflow data return behavior with Wait nodes (known n8n community issue). Test parallel branch + Merge node behavior with actual Claude API calls before building critique loop. Verify n8n queue mode dispatches Execute Sub-workflow nodes to separate workers (affects campaign time target).

### Phase 3: Auto Mode Conversational Brief Builder
**Rationale:** Auto mode has no dependency on Brand Memory or Guided mode — it is a new front-door that feeds the same pipeline. Building it after the pipeline is proven means the brief builder can be tested with a working backend. The conversational UI is a pure frontend addition with a new API route; it does not require changes to pipeline internals.
**Delivers:** `ModeSelector` component (Auto/Guided/Pro toggle on `/campaigns/new`); `AutoBriefChat` React component using Vercel AI SDK `useChat`; `/api/brief-builder/chat` API route using `streamText`; brief extraction delegated to n8n Orchestrator (transcript included in webhook payload, Orchestrator does the structured extraction as its first step); invisible strategic reasoning in Auto output (plain-language summary, not framework names); Schwartz/LF8 confirmation step before generation begins.
**Features addressed:** TS-B01 through TS-B06 (Auto mode table stakes), D-B01 (three-mode adapter pattern), D-B02 (invisible strategic reasoning)
**Stack:** `pnpm add ai @ai-sdk/anthropic` (the only new npm packages for all of v1.1)
**Pitfalls avoided:** HP-2 (confirmation step prevents misclassified strategy from propagating silently), MP-3 (industry-category keigo priors + validation step before generation), MP-6 (mode as first-class parameter in PipelineState)
**Research flag:** Schwartz/LF8 classification accuracy from Japanese plain-language input needs empirical testing. ICLR 2025 research shows LLMs perform near-randomly for psychographic classification. Allocate time for testing 20-30 real Japanese brief inputs with a native marketing professional before launch. The confirmation step is a must-have mitigation regardless of accuracy.

### Phase 4: Brand Memory + NotebookLM Knowledge Base
**Rationale:** Brand Memory requires campaign signal data to populate — it needs the pipeline running (Phase 2) and ideally Auto mode generating campaigns (Phase 3) to accumulate meaningful signals. Schema is added in Phase 1 but accumulation logic and injection logic go here. NotebookLM MCP belongs in the same phase because it is similarly an enhancement layer with graceful degradation.
**Delivers:** Brand Memory accumulation from campaign signals in n8n callback handler (post-campaign extraction); Brand Memory injection into n8n webhook payload (top 10 voice examples, avoid patterns, compliance history); human-readable brand voice summary UI; cold-start pre-population from brand profile template defaults; NotebookLM MCP server deployed on VPS with Express HTTP wrapper; MCP Client Tool nodes added to Strategic Insight and Localization agents; aggressive Supabase response caching (7-day TTL); health-check before each pipeline run with graceful fallback to system-prompt-only mode.
**Features addressed:** TS-C01 through TS-C03, D-C01, D-C02 (partial), D-C04 (override/reset); Strategic Insight agent enhanced with NotebookLM domain knowledge
**Pitfalls avoided:** HP-1 (graceful degradation + cache-first architecture for NotebookLM), MP-1 (pre-population from brand profile + explicit first-campaign learning), MP-5 (bulk-query caching at startup for static knowledge), LP-2 (JSONB versioned schema for memory evolution)
**Research flag:** NotebookLM MCP session persistence on headless VPS needs hands-on validation before Phase 4 planning finalizes this approach. Test: initial auth flow, cookie persistence across VPS reboots, query rate under load, response quality vs. system-prompt-only baseline. Design the Gemini API grounding fallback path in parallel — it uses the same n8n HTTP Request node interface, just different URL and payload format.

### Phase 5: Compliance Auto-Rewrite + Seedance 2.0
**Rationale:** Compliance auto-rewrite extends the already-running pipeline (Phase 2) and benefits from the NotebookLM knowledge base (Phase 4) for Yakki Ho and Keihin rule lookups. Seedance 2.0 is in the same phase because both are feature-flagged enhancements to existing capabilities, and the video model routing layer should be built before Seedance is added as the third option.
**Delivers:** NG/OK expression database (rule-based regex/dictionary for known violations); two-pass compliance architecture (rule-based then LLM contextual analysis); compliance rewrite loop in n8n sub-workflow (check to rewrite to re-check, max 2 iterations); original vs. rewritten diff UI with explicit human confirmation required; Shokuhin Hyoujihou (Food Labeling Act) coverage; compliance decision audit log; `src/lib/ai/seedance.ts` using fal.ai queue pattern (same as kling.ts); Seedance added as third option in `video-pipeline.ts` routing behind `SEEDANCE_PROVIDER` feature flag; Seedance circuit breaker in `provider-health.ts`.
**Features addressed:** TS-D01 through TS-D04, D-D01 through D-D05 (compliance); Seedance as video provider alternative
**Pitfalls avoided:** CP-4 (flag + human confirmation, never auto-certification), CP-3 (Seedance behind feature flag, pipeline works without it), HP-5 (async video generation after core kit delivered — do not block on video), LP-1 (ElevenLabs for voiceover, Seedance for ambient SFX only)
**Research flag:** Compliance auto-rewrite needs native Japanese legal reviewer before shipping. Rewrite quality (preserving persuasive intent while achieving compliance — TS-D04) requires extensive testing with real ad copy. Consider shipping compliance as "flag + suggest" only in Phase 5 v1, making "auto-accept" an explicit user opt-in rather than default behavior. Seedance 2.0 fal.ai endpoint naming needs verification — anticipated endpoint is inferred from Seedance 1.5 pattern.

### Phase 6: Guided Mode + Media Intelligence + v1.0 Verification
**Rationale:** Guided mode is the most complex UX piece (progressive disclosure wizard that sits between Auto and Pro in complexity) and depends on the full pipeline being stable. Media Intelligence is the final missing agent. v1.0 verification on Vercel — systematically addressing any issues surfaced during v1.1 development — belongs at the end when all features are integrated and the full system can be audited.
**Delivers:** Guided mode multi-step wizard UI with strategic reasoning visible and overridable per stage; annotated campaign output (explains strategic choices to learning marketers); Media Intelligence agent (platform-specific timing, hashtag sets, posting guidance); v1.0 Vercel health check and fixes; comprehensive end-to-end test coverage for all three modes.
**Features addressed:** D-B03, D-B04, D-B05, D-A03 (Media Intelligence)
**Pitfalls avoided:** MP-6 (separate test suite per mode end-to-end), HP-3 (end-to-end latency audit for all three modes)
**Research flag:** Guided mode UX has a structural risk of feeling worse than both Auto (less simple) and Pro (less powerful). Prototype and test with 5 target users before full implementation. The risk is UX design quality, not technical uncertainty.

### Phase Ordering Rationale

- **Infrastructure before agents:** n8n 2.x, schema, and error handling must exist before any agent work can be tested or validated.
- **Core pipeline before user-facing modes:** Auto mode is meaningless if the pipeline it feeds is not working. Building in this order enables integration testing of Auto mode against a real pipeline.
- **Enhancement layers after core is stable:** Brand Memory and NotebookLM are additive. Compliance auto-rewrite and Seedance extend existing capabilities. All have graceful degradation paths and should not block the core value proposition.
- **Guided mode last:** Has no unique technical dependencies except pipeline stability. Highest UX design risk. Sequencing it last preserves focus on higher-impact features first and allows Guided mode UX to learn from Auto mode real-world usage.
- **Feature flags for high-risk items:** Seedance 2.0 (legal risk), compliance auto-rewrite autonomous mode (liability risk), and NotebookLM MCP (availability risk) all ship behind feature flags enabling instant disabling without a code deploy.

### Research Flags

Phases likely needing `/gsd:research-phase` during planning:
- **Phase 2 (n8n Agent Pipeline):** Verify Execute Sub-workflow data return behavior with Wait nodes (documented community edge case). Test parallel branch + Merge node with actual Claude API calls before building critique loop. Confirm n8n queue mode dispatches sub-workflows to separate workers — this affects whether the <5-minute campaign target is achievable.
- **Phase 3 (Auto Mode):** Schwartz/LF8 inference accuracy from Japanese plain-language input. ICLR 2025 research shows LLMs perform near-randomly for psychographic classification. Needs empirical testing with Japanese input before committing to the invisible strategy approach. The confirmation step is required regardless.
- **Phase 4 (NotebookLM MCP):** Browser automation session persistence on headless VPS is unverified. Gemini API grounding fallback path needs API design work before it is urgently needed. The 50-query/day limit needs caching strategy validated against projected campaign volume at target user count.
- **Phase 5 (Compliance Auto-Rewrite):** Native Japanese legal reviewer required for NG/OK database accuracy. "Preserve persuasive intent while achieving compliance" rewrite quality has no confident solution in research literature — needs iterative testing.

Phases with well-documented patterns (can skip research phase):
- **Phase 1 (Infrastructure):** n8n 2.x migration is a documented hardening release. Schema additions are standard Drizzle ORM. Supabase Realtime progress infrastructure is already running in v1.0.
- **Phase 6 (Guided Mode + Media Intelligence):** Adapter pattern (mode-specific input/output formatters) is established. Progressive disclosure wizard UX patterns are documented. Risk is UX design quality, not technical uncertainty.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM-HIGH | n8n 2.x, Vercel AI SDK, Supabase JSONB patterns are HIGH. Seedance 2.0 fal.ai endpoint naming is MEDIUM (inferred from 1.5, unverified for 2.0). NotebookLM MCP is MEDIUM (community package, session fragility documented by authors). |
| Features | HIGH | Table stakes features well-defined from v1.0 patterns. Differentiators confirmed by n8n multi-agent community examples and official docs. Anti-features clearly justified by v1.0 learnings and expert community guidance. |
| Architecture | HIGH | Integration architecture is additive over proven v1.0 system. Sub-workflow patterns confirmed by official n8n docs and community templates. Supabase state-bridging and Realtime patterns are well-established. NotebookLM MCP transport gap (n8n MCP Client is SSE-only) confirmed by community discussion. |
| Pitfalls | MEDIUM-HIGH | Critical pitfalls (token exhaustion, error cascading, cross-region latency, cost multiplication) are HIGH confidence with extensive community documentation. Seedance legal risk is HIGH confidence (mainstream news, Feb 2026). Compliance liability analysis is HIGH confidence (legal firm publications). Schwartz/LF8 misclassification risk is MEDIUM-HIGH (academic research, not advertising-domain-specific). |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **Seedance 2.0 fal.ai endpoint naming:** The anticipated endpoint `fal-ai/bytedance/seedance/v2/pro/text-to-video` is inferred from the Seedance 1.5 pattern. Verify actual endpoint availability and naming before building `seedance.ts`. Handle during Phase 5 as an implementation spike.
- **NotebookLM MCP VPS validation:** Browser automation on headless VPS (Chrome `--no-sandbox`, cookie persistence across reboots) needs hands-on testing before Phase 4 planning finalizes this approach. Build the Gemini API grounding fallback design in parallel as the production-ready alternative.
- **Schwartz/LF8 classification accuracy:** ICLR 2025 finding that LLMs perform near-randomly for personality trait inference is a real risk for Auto mode. The confirmation step (show inferred strategy before generating) is a required mitigation, but classification quality should be empirically measured during Phase 3 development with real Japanese input.
- **n8n queue mode parallelism behavior:** Confirm that n8n queue mode actually dispatches Execute Sub-workflow nodes to separate workers vs. queuing sequentially. This affects whether the campaign time target is achievable for the parallel Copy + Visual + Audio branch.
- **Cost model validation:** HP-4 analysis estimates $2-8 per full campaign with video. The v1.0 credit pricing appears sustainable on paper, but v1.1's 7 LLM calls plus compliance loop plus potential Opus calls need measurement with real campaigns. The `campaign_costs` table (Phase 1) provides the data; validate with 10 real campaigns before adjusting credit pricing for v1.1.
- **Compliance rewrite quality for edge cases:** The "preserve persuasive intent while achieving compliance" objective (TS-D04) is the hardest requirement in the compliance feature. Sensory language substitution (using onomatopoeia like つるつる and ふわふわ) as a technique is promising but needs testing with a native Japanese speaker and a compliance professional before shipping.

---

## Sources

### Primary (HIGH confidence)
- [n8n official docs: AI Agent, Sub-workflows, Queue Mode, MCP Client Tool](https://docs.n8n.io) — agent architecture, sub-workflow patterns, error handling
- [n8n official blog: Multi-agent systems, AI agent production best practices](https://blog.n8n.io) — orchestrator pattern, token management, production deployment
- [Vercel AI SDK 4.2 docs and release](https://ai-sdk.dev/docs/introduction) — `useChat`, `streamText`, SSE transport, tool calling
- [Supabase Realtime docs: Postgres Changes, connection limits](https://supabase.com/docs/guides/realtime) — progress update architecture
- [TechCrunch, Variety, CNBC, Axios: Seedance 2.0 legal controversy, Feb 2026](https://techcrunch.com/2026/02/15/hollywood-isnt-happy-about-the-new-seedance-2-0-video-generator/) — CP-3 risk assessment
- [薬機法 NG Words: 薬事法広告研究所](https://www.89ji.com/guide/pharmaceutical_device_law_ng.html) — compliance rule database for NG/OK expressions
- [景品表示法 guidance: 薬事法広告研究所](https://www.89ji.com/keihyou-guide/unjust-labeling.html) — superlative and misrepresentation rules
- [ICLR 2025: Do LLMs Have Consistent Values?](https://proceedings.iclr.cc/paper_files/paper/2025/file/68fb4539dabb0e34ea42845776f42953-Paper-Conference.pdf) — HP-2 Schwartz/LF8 misclassification risk evidence
- [International Bar Association: Japan's AI legal framework](https://www.ibanet.org/japan-emerging-framework-ai-legislation-guidelines) — CP-4 liability analysis
- [Chambers: AI Japan 2025](https://practiceguides.chambers.com/practice-guides/artificial-intelligence-2025/japan) — compliance liability confirmation
- [n8n community forums: token exhaustion, timeout, sub-workflow edge cases](https://community.n8n.io) — CP-1 and CP-2 evidence base

### Secondary (MEDIUM confidence)
- [PleasePrompto/notebooklm-mcp GitHub](https://github.com/PleasePrompto/notebooklm-mcp) — MCP server capabilities, 50-query/day limit, session fragility acknowledgment
- [Nerdbot: Seedance 2.0 integration guide (Feb 12, 2026)](https://nerdbot.com/2026/02/12/seedance-2-0-what-you-need-to-know-before-integrating-the-ai-video-api/) — technical specs (model is 4 days old, limited developer data)
- [WaveSpeedAI: Seedance 2.0 API guide and pricing](https://wavespeed.ai/blog/posts/seedance-2-0-complete-guide-multimodal-video-creation/) — pricing estimates per resolution/duration
- [Hatchworks: Multi-agent solutions in n8n](https://hatchworks.com/blog/ai-agents/multi-agent-solutions-in-n8n/) — orchestrator pattern implementation details
- [n8n Iterative Content Refinement Template](https://n8n.io/workflows/5597-iterative-content-refinement-with-gpt-4-multi-agent-feedback-system/) — critique loop implementation reference
- [Jasper Brand IQ product page](https://www.jasper.ai/brand-iq) — Brand Memory competitive context (architecture inferred)
- [fal.ai Seedance 1.5 user guide](https://fal.ai/learn/devs/seedance-1-5-user-guide) — fal.ai integration pattern basis for Seedance 2.0 anticipation
- [NotebookLM Enterprise API docs](https://docs.cloud.google.com/gemini/enterprise/notebooklm-enterprise/docs/api-notebooks) — confirms no chat/query endpoint yet (management API only)
- [机能性表示食品 NG Expressions](https://www.yakujihou.com/kinousei/adpoint/) — Shokuhin Hyoujihou compliance rules

### Tertiary (LOW confidence, needs validation)
- Seedance 2.0 fal.ai endpoint naming — inferred from 1.5 pattern, unverified for 2.0; verify during Phase 5 spike
- NotebookLM MCP headless VPS session persistence — fragility documented by MCP authors but no definitive test data for specific VPS configurations
- Schwartz/LF8 LLM classification accuracy for Japanese advertising input — ICLR 2025 research is general personality inference, not advertising-domain-specific

---

*Research completed: 2026-02-16*
*Synthesized: 2026-02-17 (STACK.md + FEATURES.md + ARCHITECTURE.md + PITFALLS.md)*
*Ready for roadmap: yes*
