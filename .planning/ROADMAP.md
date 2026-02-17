# Roadmap: AI Content Studio

## Milestones

- ✅ **v1.0 MVP** — Phases 1-7 (shipped 2026-02-10)
- 🚧 **v1.1 Full Pipeline + Auto Mode** — Phases 8-12 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-7) — SHIPPED 2026-02-10</summary>

- [x] Phase 1: Foundation & Core Pipeline (5/5 plans) — completed 2026-02-07
- [x] Phase 2: Japanese Text Compositing (4/4 plans) — completed 2026-02-08
- [x] Phase 3: Multi-Platform Formatting & Delivery (4/4 plans) — completed 2026-02-08
- [x] Phase 4: Video & Audio Pipeline (3/3 plans) — completed 2026-02-09
- [x] Phase 5: Workflow & Intelligence (3/3 plans) — completed 2026-02-09
- [x] Phase 6: Billing & Compliance (4/4 plans) — completed 2026-02-09
- [x] Phase 7: Infrastructure & Deployment (3/3 plans) — completed 2026-02-09

Full details: `.planning/milestones/v1.0-ROADMAP.md`

</details>

---

### 🚧 v1.1 Full Pipeline + Auto Mode (In Progress)

**Milestone Goal:** Transform AI Content Studio from a code-complete prototype into a working product with a real n8n 7-agent orchestration engine, intelligent AI routing, domain-agnostic campaign intelligence, and a solopreneur Auto mode front door.

- [ ] **Phase 8: Infrastructure + Schema Foundation** — n8n 2.x upgrade, database schema additions, error-handling architecture, and v1.0 production verification
- [ ] **Phase 9: Core Agent Pipeline + Generation Execution** — 7-agent n8n orchestration pipeline end-to-end with all AI provider sub-workflows
- [ ] **Phase 10: Auto Mode** — Conversational 5-question brief builder, mode selector, and invisible strategic reasoning
- [ ] **Phase 11: Brand Memory + Knowledge Base** — Brand signal accumulation, prompt injection, human-readable summary, and NotebookLM MCP
- [ ] **Phase 12: Compliance Auto-Rewrite + Seedance** — Two-pass compliance engine with diff UI, human confirmation, and Seedance 2.0 as third video model

---

## Phase Details

### Phase 8: Infrastructure + Schema Foundation

**Goal:** The deployment environment, database schema, and error-handling architecture are ready for agent pipeline work — n8n 2.x runs with AI Agent nodes enabled, production Vercel deployment is verified working, and all schema tables and webhook interfaces required by later phases are in place.

**Depends on:** v1.0 complete (Phase 7)

**Requirements:** ORCH-01, ORCH-03, ORCH-10, ORCH-11, ORCH-12, ORCH-13, ORCH-14, ORCH-15, FIXV-01, FIXV-02, FIXV-03, FIXV-04

**Success Criteria** (what must be TRUE):
1. Vercel production deployment serves the dashboard, auth, and billing pages without errors and campaign ZIP download completes successfully
2. n8n instance responds to a test webhook call with N8N_AI_ENABLED=true and an AI Agent node executes a Claude call in a test workflow
3. All existing AI provider integrations (Flux, Kling, Runway, ElevenLabs, HeyGen) succeed with live API calls
4. New database tables (brand_memory, campaign_costs) exist in Supabase with Drizzle schema applied and the expanded webhook payload shape is accepted by the n8n endpoint
5. Direct generation fallback logs a deprecation warning when it activates

**Plans:** TBD

Plans:
- [ ] 08-01: n8n 2.x upgrade, AI Agent node validation, and environment variable configuration
- [ ] 08-02: Database schema additions (brand_memory, campaign_costs tables) and expanded webhook payload
- [ ] 08-03: v1.0 production verification (dashboard, auth, billing, ZIP download, AI provider live calls) and deprecation marking of runDirectGeneration

---

### Phase 9: Core Agent Pipeline + Generation Execution

**Goal:** A complete n8n 7-agent pipeline executes a campaign brief end-to-end — from webhook receipt through Strategic Insight, Creative Director, Copywriter, Art Director, JP Localization (with veto/critique loop), to all generation sub-workflows (images, video, audio, avatar, resize, ZIP) — replacing v1.0 flat parallel branches.

**Depends on:** Phase 8

**Requirements:** ORCH-02, ORCH-04, ORCH-05, ORCH-06, ORCH-07, ORCH-08, ORCH-09, GENX-01, GENX-02, GENX-03, GENX-04, GENX-05, GENX-06, GENX-07, GENX-08, GENX-09

**Success Criteria** (what must be TRUE):
1. Submitting a campaign brief via the dashboard triggers the n8n pipeline and per-agent progress indicators (Strategic Insight analyzing, Creative Director working...) appear in the dashboard in real time
2. The JP Localization agent can reject Copywriter output and trigger a second-pass rewrite before approving — the loop completes without crashing the pipeline
3. A campaign with no brand profile set completes successfully, producing images with inferred defaults from the brief content
4. Any single AI provider failure (e.g. video generation timeout) results in partial campaign delivery — the copy and images are still returned
5. A completed campaign produces a downloadable ZIP with assets organized by platform

**Plans:** TBD

Plans:
- [ ] 09-01: Master Orchestrator workflow and sub-workflow architecture (webhook → PipelineState → agent dispatch)
- [ ] 09-02: Strategic Insight agent (Schwartz/LF8/SB7 classification) and Creative Director agent
- [ ] 09-03: Copywriter agent, Art Director agent, and JP Localization agent with critique loop (max 2 retries)
- [ ] 09-04: Generation sub-workflows — Flux image generation and JP text compositing
- [ ] 09-05: Generation sub-workflows — video (Kling/Runway), ElevenLabs voice, HeyGen avatar, platform resize, ZIP packaging, and circuit breaker fallback routing

---

### Phase 10: Auto Mode

**Goal:** A solopreneur can start a campaign through a 5-question Japanese conversational brief builder — without filling out a structured form or setting up a brand profile — and receive 3-5 ready-to-post assets as output, with strategic reasoning invisible to them.

**Depends on:** Phase 9

**Requirements:** AUTO-01, AUTO-02, AUTO-03, AUTO-04, AUTO-05, AUTO-06, AUTO-07, AUTO-08, AUTO-09, AUTO-10, AUTO-11

**Success Criteria** (what must be TRUE):
1. A user with no brand profile can open the campaign creation page, select Auto mode, answer 5 conversational questions in natural Japanese, and have a campaign generate — without touching any structured form
2. The Auto mode output shows 3-5 assets with plain-language descriptions of what the strategy is — no Schwartz awareness levels, LF8 codes, or framework names are visible
3. Both Auto mode and Pro mode campaigns produce the same CampaignBrief object and route through the identical n8n pipeline
4. The brief builder conversation seeds a brand profile entry (business name, product type, tone) that persists for the user's next session

**Plans:** TBD

Plans:
- [ ] 10-01: Mode selector (Auto/Pro toggle) on campaign creation page and routing logic
- [ ] 10-02: AutoBriefChat component, /api/brief-builder/chat API route using Vercel AI SDK streamText, and 5-question flow
- [ ] 10-03: Auto mode output adapter (3-5 assets, plain-language summaries, invisible strategic reasoning) and brand profile seeding from conversation

---

### Phase 11: Brand Memory + Knowledge Base

**Goal:** The system accumulates voice and style signals from past campaigns and injects them into new generation prompts — so users get noticeably better output the more they use the product — and agents can query a NotebookLM knowledge base for domain expertise at runtime.

**Depends on:** Phase 9 (pipeline running), Phase 10 (Auto mode generating campaigns)

**Requirements:** BRND-01, BRND-02, BRND-03, BRND-04, BRND-05, BRND-06, BRND-07, KBAS-01, KBAS-02, KBAS-03, KBAS-04

**Success Criteria** (what must be TRUE):
1. Approving or favoriting a campaign variant causes the system to update the user's brand memory — verifiable via the brand voice summary page showing new patterns extracted
2. A second campaign run for the same user produces copy noticeably aligned with signals from the first campaign (matching tone, keigo register, CTA style) without any manual configuration
3. A user can view a human-readable brand voice summary page showing what the system has learned — and can reset or override individual elements
4. The pipeline runs to completion (with correct output) even when the NotebookLM MCP server is unreachable

**Plans:** TBD

Plans:
- [ ] 11-01: Brand Memory schema activation (brand_memory table population), signal extraction in n8n callback handler, and cold-start defaults
- [ ] 11-02: Brand Memory injection into webhook payload and generation prompts, and human-readable brand voice summary UI
- [ ] 11-03: NotebookLM MCP server deployment on VPS, agent query integration, Supabase response caching, and graceful fallback

---

### Phase 12: Compliance Auto-Rewrite + Seedance

**Goal:** Non-compliant copy is caught by a two-pass engine (rule-based then LLM contextual), a suggested rewrite is shown alongside the original with the legal basis annotated, the user explicitly confirms before any rewrite is applied, and Seedance 2.0 is available as a feature-flagged third video model.

**Depends on:** Phase 9 (pipeline running), Phase 11 (knowledge base for rule lookups)

**Requirements:** COMP-01, COMP-02, COMP-03, COMP-04, COMP-05, COMP-06, COMP-07, COMP-08, VIDM-01, VIDM-02, VIDM-03

**Success Criteria** (what must be TRUE):
1. Submitting copy containing a known 薬機法 or 景品表示法 violation produces a diff view showing original vs. suggested rewrite with the specific legal basis cited — and the rewrite is not applied until the user clicks confirm
2. Cosmetics product copy triggers 薬機法 rules and food product copy triggers 食品表示法 rules automatically, without user selecting a compliance mode
3. A known NG expression (e.g. "肌荒れを治す") is caught and rewritten without an LLM call, via the rule-based pass
4. The pipeline generates complete campaigns when the SEEDANCE_PROVIDER feature flag is disabled — Seedance being off does not degrade output

**Plans:** TBD

Plans:
- [ ] 12-01: NG/OK expression database, two-pass compliance architecture (regex then LLM), and category-specific rule activation
- [ ] 12-02: Compliance rewrite loop in n8n, original vs. rewritten diff UI with human confirmation, confidence scoring, and audit logging
- [ ] 12-03: Seedance 2.0 integration (seedance.ts, fal.ai queue API), intelligent video routing layer, and SEEDANCE_PROVIDER feature flag with circuit breaker

---

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation & Core Pipeline | v1.0 | 5/5 | Complete | 2026-02-07 |
| 2. Japanese Text Compositing | v1.0 | 4/4 | Complete | 2026-02-08 |
| 3. Multi-Platform Formatting & Delivery | v1.0 | 4/4 | Complete | 2026-02-08 |
| 4. Video & Audio Pipeline | v1.0 | 3/3 | Complete | 2026-02-09 |
| 5. Workflow & Intelligence | v1.0 | 3/3 | Complete | 2026-02-09 |
| 6. Billing & Compliance | v1.0 | 4/4 | Complete | 2026-02-09 |
| 7. Infrastructure & Deployment | v1.0 | 3/3 | Complete | 2026-02-09 |
| 8. Infrastructure + Schema Foundation | v1.1 | 0/3 | Not started | - |
| 9. Core Agent Pipeline + Generation Execution | v1.1 | 0/5 | Not started | - |
| 10. Auto Mode | v1.1 | 0/3 | Not started | - |
| 11. Brand Memory + Knowledge Base | v1.1 | 0/3 | Not started | - |
| 12. Compliance Auto-Rewrite + Seedance | v1.1 | 0/3 | Not started | - |

---
*Roadmap created: 2026-02-06*
*Last updated: 2026-02-17 after v1.1 milestone roadmap definition*
