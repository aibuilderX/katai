# Phase 9: Core Agent Pipeline + Generation Execution - Context

**Gathered:** 2026-02-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the complete n8n 7-agent pipeline that executes a campaign brief end-to-end — from webhook receipt through Strategic Insight, Creative Director, Copywriter, Art Director, JP Localization (with veto/critique loop), to all generation sub-workflows (images, video, audio, avatar, resize, ZIP) — replacing v1.0's flat parallel branches. Real-time progress reporting to the dashboard via Supabase Realtime.

</domain>

<decisions>
## Implementation Decisions

### Pipeline progress reporting
- Per-agent step visibility — each agent appears as a named step in the progress UI (refinement from Phase 8's milestone-based approach)
- All labels in Japanese, zero English on user-facing screens: 戦略分析中, クリエイティブ設計中, コピーライティング中, アート設計中, JP品質確認中, アセット生成中
- Brief summary per agent — when an agent completes, a 1-2 line Japanese summary of its output appears next to the checkmark (e.g., "戦略分析 → 感情訴求×安心感")
- Each agent prompt must include a "summarize your decision in ~10 words in Japanese" instruction to produce the summary line
- Long-running steps (video generation): Claude's discretion on elapsed timer vs spinner

### Quality gate — JP Localization
- Single quality gate: only JP Localization agent has veto/critique loop power
- No other agents have quality gates (Creative Director, etc. pass output forward unconditionally)
- Rejection criteria — full scope: unnatural Japanese, wrong register/keigo for the brand, AND cultural fit (idioms, directness level, seasonal references, JP marketing conventions)
- Max 2 retries (Copywriter gets 3 total attempts)
- When max retries exhausted: deliver the best of the 3 attempts, flag it as 要確認 (needs review) in the campaign output — user can edit later
- Never block delivery — a flagged-but-complete campaign is more useful than one with gaps

### Failure & partial delivery
- Already decided in Phase 8 context — no changes:
  - Hybrid retry: 1 silent auto-retry, then partial delivery with retry button
  - Critical-stop agents: Strategic Insight, Creative Director (pipeline stops if they fail)
  - Partial-delivery agents: Copywriter, Art Director, JP Localization (deliver what succeeded)
  - Video async: campaign delivers copy+images immediately, video arrives later via Realtime
  - Friendly Japanese error messages for critical-stop failures

### Strategy visibility in campaign output
- Show strategic reasoning as plain-language Japanese conclusions — never expose framework names (Schwartz, LF8, SB7), codes, or classification labels
- Protects proprietary methodology while building user trust
- Example output: "このキャンペーンは、お客様の安心感への欲求に訴えかけるアプローチを採用。温かみのあるトーンで家族の絆を強調。" — NOT "Schwartz Level 2 × LF8-3"
- Placement: collapsible accordion section between campaign header and tab bar (Option A from SuperDesign mockup)
- Collapsed by default, steel-blue accent, expands to show 2-3 lines of strategy summary
- SuperDesign reference: draft `fec4e0bf-302f-4b8e-ac60-bfd1caff9bb9`

### Claude's Discretion
- Exact agent prompt design and structure
- Sub-workflow architecture in n8n (how agents chain)
- PipelineState schema and inter-agent data format
- Progress callback mechanism (webhook frequency, payload shape)
- Which agent summary lines are most useful to surface
- Loading animation for long-running steps
- Accordion expand/collapse animation style
- Circuit breaker thresholds for provider failures

</decisions>

<specifics>
## Specific Ideas

- Per-agent summaries should feel like watching a creative team work — each step reveals a decision that builds on the last
- "All user-facing text must be in Japanese — no English agent names, labels, or technical terms on any screen" (explicit user requirement)
- Strategy conclusions serve dual purpose: build trust in AI reasoning + give users language to explain campaign decisions to stakeholders (上司への説明)
- The 要確認 flag system teaches users what the AI struggled with — they can improve briefs over time
- Strategy accordion design approved via SuperDesign: https://p.superdesign.dev/draft/fec4e0bf-302f-4b8e-ac60-bfd1caff9bb9

</specifics>

<deferred>
## Deferred Ideas

- Creative Director quality gate (ability to reject Strategic Insight output) — add if strategy quality proves problematic in practice
- Pro mode toggle showing more detailed per-agent progress — noted in Phase 8 deferred ideas
- User-facing cost display per campaign — future phase after cost baseline established

</deferred>

---

*Phase: 09-core-agent-pipeline-generation-execution*
*Context gathered: 2026-02-18*
