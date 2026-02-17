# Requirements: AI Content Studio v1.1

**Defined:** 2026-02-17
**Core Value:** A non-technical user submits a brief and receives a complete, download-ready campaign kit with correct Japanese copy and platform-compliant assets in under 5 minutes.

## v1.1 Requirements

Requirements for milestone v1.1 (Full Pipeline + Auto Mode). Each maps to roadmap phases.

### Orchestration Pipeline

- [ ] **ORCH-01**: n8n upgraded to 2.x with AI Agent nodes enabled and Draft/Publish workflow model
- [ ] **ORCH-02**: Master Orchestrator workflow receives campaign brief via webhook and dispatches to agent sub-workflows
- [ ] **ORCH-03**: Structured PipelineState JSON object accumulates each agent's output through the pipeline
- [ ] **ORCH-04**: Strategic Insight agent classifies brief into Schwartz awareness level, LF8 desires, and copywriting framework
- [ ] **ORCH-05**: Creative Director agent generates creative concept, visual mood, and copy direction from strategy
- [ ] **ORCH-06**: Copywriter agent generates copy variants per platform using the selected framework and register
- [ ] **ORCH-07**: Art Director agent generates image prompts, visual direction, and composition guidance from creative concept
- [ ] **ORCH-08**: JP Localization agent reviews all copy/visual output with veto power and critique loop (max 2 retries)
- [ ] **ORCH-09**: Quality gate validates Strategic Insight output completeness before passing to Creative Director
- [ ] **ORCH-10**: Each agent sub-workflow handles errors gracefully (Continue On Fail) without killing the full pipeline
- [ ] **ORCH-11**: Dashboard shows per-agent progress updates during campaign generation via Supabase Realtime
- [ ] **ORCH-12**: Pipeline delivers partial results when individual agents fail (video failure does not block copy/image delivery)
- [ ] **ORCH-13**: Agent scratchpad pattern passes only structured JSON summaries between agents (not full reasoning chains)
- [ ] **ORCH-14**: Tiered model assignment (Opus for Orchestrator/Strategic/Localization, Sonnet for Copywriter/Art Director)
- [ ] **ORCH-15**: Per-campaign cost tracking logs token usage and API costs for every agent call

### Generation Execution

- [ ] **GENX-01**: n8n sub-workflow calls Flux 1.1 Pro Ultra via fal.ai to generate images from Art Director prompts
- [ ] **GENX-02**: n8n sub-workflow runs Japanese text compositing (Sharp + node-canvas + BudouX) on generated images
- [ ] **GENX-03**: n8n sub-workflow calls Kling/Runway for video generation from Art Director visual direction
- [ ] **GENX-04**: n8n sub-workflow calls ElevenLabs for Japanese voice generation from Copywriter audio scripts
- [ ] **GENX-05**: n8n sub-workflow calls HeyGen for avatar video from voice output + visual direction
- [ ] **GENX-06**: n8n sub-workflow resizes composited assets to platform-specific dimensions (LINE, Yahoo JAPAN, Rakuten, Instagram, TikTok, X, Email)
- [ ] **GENX-07**: n8n sub-workflow packages all assets into ZIP organized by platform for download
- [ ] **GENX-08**: Generation sub-workflows use circuit breakers with automatic fallback routing on provider failure
- [ ] **GENX-09**: Pipeline generates quality images without a brand profile by inferring defaults from brief content (product type, mood, audience)

### Auto Mode

- [ ] **AUTO-01**: User can start a campaign in Auto mode via a conversational 5-question brief builder
- [ ] **AUTO-02**: Brief builder conversation is natural Japanese (casual-polite desu/masu, not robotic)
- [ ] **AUTO-03**: System automatically infers Schwartz awareness level from user's audience description
- [ ] **AUTO-04**: System automatically maps product/service to LF8 desires from conversational input
- [ ] **AUTO-05**: System auto-selects copywriting framework (PAS/AIDA/BAB/SB7) based on awareness level
- [ ] **AUTO-06**: Auto mode delivers 3-5 ready-to-post assets (not full campaign kit) as default output
- [ ] **AUTO-07**: Strategic reasoning is invisible to Auto users (plain-language summaries, not framework names)
- [ ] **AUTO-08**: Mode selector (Auto/Pro) on campaign creation page routes to appropriate brief input
- [ ] **AUTO-09**: Both Auto and Pro modes produce the same CampaignBrief object and use the same pipeline
- [ ] **AUTO-10**: Brand profile is optional for Auto mode — user can generate campaigns immediately without brand setup
- [ ] **AUTO-11**: Auto mode conversation answers automatically seed an initial brand profile (business name, product type, tone)

### Brand Memory

- [ ] **BRND-01**: System accumulates style preferences from campaign signals (favorited variants, approvals, register selections)
- [ ] **BRND-02**: Accumulated brand memory is injected into generation prompts, improving output quality over campaigns
- [ ] **BRND-03**: User can view a human-readable brand voice summary showing what the system has learned
- [ ] **BRND-04**: Brand memory progressively builds from usage signals without requiring manual configuration
- [ ] **BRND-05**: System extracts voice fingerprint patterns from approved copy (sentence length, keigo level, CTA style)
- [ ] **BRND-06**: User can override or reset any aspect of accumulated brand memory
- [ ] **BRND-07**: First-campaign cold start uses sensible defaults (infer register from product category, use neutral color palette)

### Compliance

- [ ] **COMP-01**: System rewrites non-compliant copy and presents original vs rewritten diff with legal basis annotation
- [ ] **COMP-02**: User must explicitly confirm compliance rewrites before they are applied (human-in-the-loop)
- [ ] **COMP-03**: Compliance checks cover all three laws: 薬機法, 景品表示法, and 食品表示法
- [ ] **COMP-04**: Compliant rewrites preserve persuasive intent (use sensory language, onomatopoeia, lifestyle imagery)
- [ ] **COMP-05**: Category-specific compliance rules activate based on product type (cosmetics triggers 薬機法, food triggers 食品表示法)
- [ ] **COMP-06**: NG/OK expression database provides deterministic rewrites for known violations before LLM analysis
- [ ] **COMP-07**: Two-pass compliance: rule-based regex matching first, then LLM contextual analysis
- [ ] **COMP-08**: Compliance confidence scoring (error vs warning) helps users prioritize which rewrites to review

### Video Models

- [ ] **VIDM-01**: Seedance 2.0 integrated as feature-flagged third video model via fal.ai queue API
- [ ] **VIDM-02**: Intelligent video routing: Seedance for social/audio content, Runway for cinematic, Kling for prototyping
- [ ] **VIDM-03**: Pipeline works correctly without Seedance (graceful degradation when feature flag is off)

### Knowledge Base

- [ ] **KBAS-01**: NotebookLM MCP server deployed on n8n VPS with research documents uploaded
- [ ] **KBAS-02**: Agent sub-workflows can query NotebookLM for domain knowledge at runtime
- [ ] **KBAS-03**: Knowledge base responses are cached in Supabase to manage rate limits (50 queries/day)
- [ ] **KBAS-04**: Pipeline functions without knowledge base (graceful fallback to system-prompt-only mode)

### v1.0 Verification

- [ ] **FIXV-01**: Dashboard, auth, and billing verified working on Vercel production deployment
- [ ] **FIXV-02**: Campaign ZIP download verified working end-to-end
- [ ] **FIXV-03**: All existing AI provider integrations verified with live API calls
- [ ] **FIXV-04**: Direct generation fallback marked deprecated with log warning when activated

## Future Requirements (v1.2+)

### Deferred Agents

- **DAGNT-01**: Media Intelligence agent provides platform-specific timing, hashtag sets, and posting guidance
- **DAGNT-02**: Media Intelligence agent recommends platform-specific copy adjustments per Japanese platform rules

### Deferred Modes

- **DMODE-01**: Guided mode progressive disclosure wizard shows strategic reasoning with per-stage override
- **DMODE-02**: Guided mode annotated output explains strategic choices to learning marketers
- **DMODE-03**: User can switch modes mid-flow while sharing underlying campaign state

### Deferred Enhancements

- **DENH-01**: Visual style memory extracts color/composition preferences from image approval patterns
- **DENH-02**: Full RAG vector search for Brand Memory (migrate from PostgreSQL JSONB to Qdrant when data volume justifies)
- **DENH-03**: Seedance 2.0 promoted to primary video provider (pending IP litigation resolution and official API stability)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Fine-tuned per-brand LLM | In-context learning via Brand Memory is sufficient; Jasper Brand IQ proves this |
| Peer-to-peer agent communication | Orchestrator hierarchy prevents runaway token consumption |
| Real-time chat with agents mid-generation | Structured revision requests instead; chat for brief building only |
| Custom compliance rule editor UI | Curated NG/OK database maintained by dev team with native JP speaker |
| Agent marketplace / plugin system | Fixed 6-agent pipeline; customization via brand profiles and modes |
| Separate mobile app for Auto mode | Responsive PWA on mobile browser is sufficient |
| Multi-language compliance checking | JP-only compliance is the moat; other jurisdictions need separate modules |
| Full auto-certification of compliance | Legal liability risk under Japan Civil Code Art. 709; human confirmation required |
| Built-in image/video editor | Canva's domain; focus on generation, not editing |
| Social media scheduling/publishing | Buffer/Hootsuite domain; export platform-ready assets instead |
| Physical outputs (CMYK POP, DOOH) | Digital platforms only for v1.1 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| ORCH-01 | — | Pending |
| ORCH-02 | — | Pending |
| ORCH-03 | — | Pending |
| ORCH-04 | — | Pending |
| ORCH-05 | — | Pending |
| ORCH-06 | — | Pending |
| ORCH-07 | — | Pending |
| ORCH-08 | — | Pending |
| ORCH-09 | — | Pending |
| ORCH-10 | — | Pending |
| ORCH-11 | — | Pending |
| ORCH-12 | — | Pending |
| ORCH-13 | — | Pending |
| ORCH-14 | — | Pending |
| ORCH-15 | — | Pending |
| GENX-01 | — | Pending |
| GENX-02 | — | Pending |
| GENX-03 | — | Pending |
| GENX-04 | — | Pending |
| GENX-05 | — | Pending |
| GENX-06 | — | Pending |
| GENX-07 | — | Pending |
| GENX-08 | — | Pending |
| GENX-09 | — | Pending |
| AUTO-01 | — | Pending |
| AUTO-02 | — | Pending |
| AUTO-03 | — | Pending |
| AUTO-04 | — | Pending |
| AUTO-05 | — | Pending |
| AUTO-06 | — | Pending |
| AUTO-07 | — | Pending |
| AUTO-08 | — | Pending |
| AUTO-09 | — | Pending |
| AUTO-10 | — | Pending |
| AUTO-11 | — | Pending |
| BRND-01 | — | Pending |
| BRND-02 | — | Pending |
| BRND-03 | — | Pending |
| BRND-04 | — | Pending |
| BRND-05 | — | Pending |
| BRND-06 | — | Pending |
| BRND-07 | — | Pending |
| COMP-01 | — | Pending |
| COMP-02 | — | Pending |
| COMP-03 | — | Pending |
| COMP-04 | — | Pending |
| COMP-05 | — | Pending |
| COMP-06 | — | Pending |
| COMP-07 | — | Pending |
| COMP-08 | — | Pending |
| VIDM-01 | — | Pending |
| VIDM-02 | — | Pending |
| VIDM-03 | — | Pending |
| KBAS-01 | — | Pending |
| KBAS-02 | — | Pending |
| KBAS-03 | — | Pending |
| KBAS-04 | — | Pending |
| FIXV-01 | — | Pending |
| FIXV-02 | — | Pending |
| FIXV-03 | — | Pending |
| FIXV-04 | — | Pending |

**Coverage:**
- v1.1 requirements: 56 total
- Mapped to phases: 0
- Unmapped: 56 (pending roadmap creation)

---
*Requirements defined: 2026-02-17*
*Last updated: 2026-02-17 after initial definition*
