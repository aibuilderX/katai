# Domain Pitfalls: AI Content Studio v1.1

**Domain:** Adding n8n 7-agent pipeline, Seedance 2.0, NotebookLM MCP, Auto mode, compliance auto-rewrite, and Brand Memory to an existing Japanese-market AI advertising SaaS
**Researched:** 2026-02-16
**Overall confidence:** MEDIUM-HIGH (WebSearch-verified findings for most areas; Seedance 2.0 is brand-new with LIMITED data)

**Scope:** This document covers pitfalls specific to the v1.1 milestone additions. The v1.0 pitfalls document (2026-02-06) remains valid for foundational concerns (mojibake, kinsoku shori, keigo drift, platform format rejection, API cascading failures). This document focuses on NEW risks introduced by the v1.1 feature set.

---

## Critical Pitfalls

Mistakes that cause rewrites, pipeline failures, or fundamental system unreliability.

---

### CP-1: n8n 7-Agent Token Bloat and Context Window Exhaustion

**What goes wrong:** The v1.1 pipeline runs 7 specialized LLM agents (Orchestrator, Strategic Insight, Creative Director, Copywriter, Art Director, Localization, Media Intelligence) in sequence. Each agent receives the full campaign brief plus outputs from prior agents. By Agent 5-6, the accumulated context exceeds the LLM's context window (128K tokens for Claude Sonnet, 200K for Opus), causing truncation, 400 errors, or silently degraded output quality as early context gets pushed out of the window.

**Why it happens:**
- n8n agent nodes track intermediate steps in a "scratchpad" that grows with each tool call and sub-agent delegation
- Each agent returns a full reasoning chain plus structured output -- at 2,000-5,000 tokens per agent, 7 agents accumulate 14,000-35,000 tokens of agent output alone
- The campaign brief (brand profile + product info + platform specs + creative direction) can be 3,000-8,000 tokens
- n8n does not provide built-in token counting or context window monitoring -- you will not know you hit the limit until the API returns a 400 error or the model silently truncates
- Community reports confirm this is a real problem: "Context token limit exceeded in AI Agent chatbot workflow" is a recurring n8n community thread
- Using Opus for all 7 agents means 7x Opus-tier pricing per campaign

**Consequences:**
- Campaign generation fails mid-pipeline with cryptic API errors
- Earlier strategic decisions (from Strategic Insight agent) get silently dropped from context by the time the Copywriter agent runs, producing copy that ignores the strategy
- Token costs per campaign become unpredictable and potentially very high ($2-10+ per campaign at Opus pricing)
- Users experience intermittent failures that are hard to reproduce (depends on brief length and brand profile complexity)

**Warning signs:**
- Occasional 400 errors from Claude API during later agents in the pipeline
- Agent outputs that seem to "forget" earlier strategic decisions
- Inconsistent quality between short briefs (work fine) and detailed briefs (fail or degrade)
- Unexpectedly high Claude API bills

**Prevention:**
1. **Use tiered models across agents.** Not every agent needs Opus. Strategic Insight and Creative Director need strong reasoning (Sonnet). Copywriter needs quality output (Sonnet). Art Director and Media Intelligence can use Haiku for structured parameter extraction. This cuts cost by 60-80%.
2. **Pass summaries, not full outputs.** Each agent should return a structured JSON summary (500-1,000 tokens max), not its full reasoning chain. The next agent receives only the summary, not the scratchpad.
3. **Implement explicit token budgets.** Before each agent call, count the input tokens (brief + accumulated summaries). If approaching 80% of the model's context window, truncate or summarize the oldest context.
4. **Use n8n's LLM usage tracker template** (workflow template #7398) to log token counts per agent per campaign. Set alerts for campaigns exceeding cost thresholds.
5. **Design agent interfaces as narrow contracts.** The Orchestrator sends each agent only the data it needs -- the Art Director does not need the full compliance analysis; it needs the creative brief and brand visual specs.

**Detection:**
- Token count logging at every agent boundary
- Cost-per-campaign tracking with weekly trend analysis
- Alert on any single campaign exceeding $5 in LLM costs

**Phase:** Must be addressed in the n8n pipeline architecture phase (Phase 1-2 of v1.1). Token management is not a polish item -- it is a structural requirement.

**Severity:** CRITICAL

**Confidence:** HIGH -- multiple n8n community reports confirm token exhaustion issues; Claude API token pricing is well-documented.

**Sources:**
- [n8n community: Context token limit exceeded](https://community.n8n.io/t/context-token-limit-exceeded-in-ai-agent-chatbot-workflow/74968)
- [n8n community: AI Agent token limitation](https://community.n8n.io/t/ai-agent-token-limitation-400-error-after-many-iterations-despite-wanting-to-pass-0-context/63179)
- [n8n LLM usage tracker template](https://n8n.io/workflows/7398-llm-usage-tracker-and-cost-monitor-with-node-level-analytics-v2/)

---

### CP-2: n8n Sub-Workflow Error Propagation and Timeout Cascades

**What goes wrong:** When one of the 7 agents fails (API timeout, rate limit, malformed output), the error either kills the entire campaign pipeline or gets swallowed silently. n8n's default behavior is to halt the entire workflow on any node error. With 7 agents plus image/video/voice generation sub-workflows, there are 12+ potential failure points per campaign. Any single failure cascades upward and kills the campaign.

**Why it happens:**
- n8n's default error behavior is "stop execution" -- any unhandled error in a sub-workflow aborts the parent workflow
- The Execute Workflow node that calls sub-workflows does not have built-in partial-failure handling
- Webhook timeout from Vercel to n8n: workflows triggered by webhook that take >60 seconds may receive 504 Gateway Timeout from the reverse proxy (nginx/Caddy) in front of n8n, even though the workflow continues running
- The parent workflow cannot distinguish between "sub-workflow failed" and "sub-workflow timed out"
- n8n community reports: "Workflows Stuck in 'Queued' Status After ~60 Seconds of Execution Time" and "Workflow timeout after 2h when set to 4h" are known issues
- When the n8n VPS (US) calls back to Vercel (Tokyo) with progress updates, cross-region latency (~120ms) plus Vercel cold starts (~500-2000ms) can cause callback failures

**Consequences:**
- A single API timeout in the Art Director agent kills a campaign that was 80% complete
- Users wait 3-4 minutes, then see a generic "generation failed" error with no recovery
- The Vercel webhook caller gets a 504 timeout but the n8n workflow keeps running in the background, creating orphaned executions that consume credits
- Progress updates fail silently when the Vercel callback endpoint cold-starts and times out

**Warning signs:**
- Campaign failures that cannot be reproduced because they depend on transient API issues
- n8n execution history showing "timed out" executions with no error details
- Vercel function logs showing 504 errors on n8n webhook calls
- Credits consumed for campaigns that appear to have "failed" (actually completed in background)

**Prevention:**
1. **Respond to webhooks immediately with 202 Accepted.** The n8n Webhook node should respond immediately with `{ campaignId, status: "queued" }` before starting any processing. The Vercel caller should not wait for the full pipeline.
2. **Enable Continue On Fail + Error Output on every Execute Workflow node.** This splits each sub-workflow call into success/error paths rather than halting the parent.
3. **Implement per-agent error isolation.** Each agent sub-workflow wraps its logic in a try/catch pattern. On failure, it returns a structured error object (`{ success: false, error: "...", fallbackData: {...} }`) rather than throwing.
4. **Use database as the state bridge.** After each agent completes, write its output to Supabase. The next agent reads from Supabase, not from n8n's in-memory data passing. This means a partial failure does not lose completed work.
5. **Set per-node timeouts.** HTTP Request nodes calling Claude: 60s. Image generation polling: 120s. Video generation polling: 300s. Global workflow timeout: 600s.
6. **Configure the reverse proxy (nginx/Caddy) timeout to match.** Set `proxy_read_timeout 600s` for the n8n webhook endpoint to prevent premature 504s.
7. **Implement a "stuck execution" cleanup cron.** A scheduled n8n workflow checks for campaigns stuck in "generating" for >10 minutes and marks them as failed with a human-readable error.

**Detection:**
- Execution status monitoring: alert on any execution in "running" state for >8 minutes
- Webhook response time monitoring
- Vercel function error rate monitoring on callback endpoints
- Campaign status audit: flag campaigns in "generating" status for >10 minutes

**Phase:** Must be solved in the n8n pipeline architecture phase. Error handling is not a post-launch fix -- it must be the architecture.

**Severity:** CRITICAL

**Confidence:** HIGH -- n8n timeout issues are extensively documented in community forums and official docs.

**Sources:**
- [n8n docs: Error handling](https://docs.n8n.io/flow-logic/error-handling/)
- [n8n community: Workflow timeout issues](https://community.n8n.io/t/how-to-handle-timeout-workflow-error/235704)
- [n8n community: Workflows stuck in Queued](https://community.n8n.io/t/workflows-stuck-in-queued-status-after-60-seconds-of-execution-time/82729)
- [Handle Partial Workflow Failures in n8n](https://flowgenius.in/n8n-partial-failure-handling/)

---

### CP-3: Seedance 2.0 Legal Risk -- Copyright Controversy and API Stability

**What goes wrong:** Seedance 2.0 launched on February 12, 2026. Within 3 days, Disney, Paramount, and the Motion Picture Association issued cease-and-desist letters to ByteDance over "massive" copyright infringement. Japan's government has launched its own investigation into copyright violations involving anime characters. ByteDance has pledged to add "safeguards" but the model's future availability, legal status, and API stability are fundamentally uncertain.

**Why it happens:**
- Seedance 2.0 is 4 days old as of this research (launched Feb 12, 2026)
- Hollywood studios and the Japanese government are actively pursuing legal action against ByteDance
- The official API is not yet publicly available -- slated for February 24, 2026 via Volcengine/BytePlus
- Third-party aggregators (seedance2api.ai, fal.ai) offer early access but with no SLA, no uptime guarantees, and unclear legal status
- ByteDance may add content filters or restrictions that break existing integrations at any time
- Japanese anime copyright investigations could specifically impact Japanese-market usage
- Enterprise verification and significant deposit thresholds are required for official access

**Consequences:**
- Building a core feature on an API that might be restricted, shut down, or fundamentally altered within weeks
- Third-party aggregator access could be revoked overnight with no notice
- Content generated by Seedance 2.0 could have undisclosed IP contamination, creating legal liability for commercial advertising use
- Japanese clients may be reluctant to use a tool associated with IP controversy, especially given Japan's strong IP protection culture
- The API may not actually be available by the time v1.1 ships

**Warning signs:**
- Official API launch date keeps slipping past February 24
- Third-party aggregator experiences frequent downtime or rate limiting
- ByteDance adds increasingly restrictive content filters
- Japanese media covers the IP controversy (already happening)
- Clients ask about the IP safety of generated video content

**Prevention:**
1. **Treat Seedance 2.0 as one of three video models, never the sole option.** The architecture already has Kling 3.0 and Runway Gen-4. Seedance should be an optional enhancement, not a dependency.
2. **Implement the video model routing layer FIRST, then add Seedance.** Build the abstraction (input brief, output video) with Kling and Runway proven and working. Add Seedance as a third option behind a feature flag.
3. **Do NOT launch v1.1 with Seedance 2.0 as the only new video capability.** If Seedance becomes unavailable, you need a fallback that provides similar value.
4. **Monitor the legal situation weekly.** Set up Google Alerts for "Seedance 2.0" + "API" and "Seedance 2.0" + "Japan".
5. **Do not use third-party aggregators for production traffic.** Wait for the official BytePlus API or confirmed fal.ai partnership. seedance2api.ai has no SLA.
6. **Add a disclaimer for Seedance-generated content** in the campaign kit delivery, noting the model used and recommending the client verify any character/brand depictions.

**Detection:**
- Monitor Seedance API uptime daily during development
- Track aggregator response times and error rates
- Monitor news for legal developments
- Test content filters: can you still generate the types of content needed for Japanese advertising?

**Phase:** Seedance integration should be a LATE phase, after core pipeline with Kling + Runway is proven. Feature-flagged and removable.

**Severity:** CRITICAL (due to legal/availability uncertainty)

**Confidence:** HIGH for the legal controversy (extensively covered by TechCrunch, Variety, CNBC, Deadline, Axios). MEDIUM for technical API details (model is 4 days old, limited developer experience reports).

**Sources:**
- [TechCrunch: Hollywood isn't happy about Seedance 2.0](https://techcrunch.com/2026/02/15/hollywood-isnt-happy-about-the-new-seedance-2-0-video-generator/)
- [Variety: Paramount cease-and-desist](https://variety.com/2026/film/news/paramount-disney-bytedance-cease-and-desist-seedance-ai-infringement-ip-1236663663/)
- [Variety: ByteDance pledges safeguards](https://variety.com/2026/film/news/bytedance-safeguards-seedance-disney-legal-threat-ip-violations-1236664395/)
- [CNBC: ByteDance safeguards](https://www.cnbc.com/2026/02/16/bytedance-safegaurds-seedance-ai-copyright-disney-mpa-netflix-paramount-sony-universal.html)
- [Nerdbot: Seedance 2.0 integration guide](https://nerdbot.com/2026/02/12/seedance-2-0-what-you-need-to-know-before-integrating-the-ai-video-api/)

---

### CP-4: Compliance Auto-Rewrite Creates Legal Liability

**What goes wrong:** v1.0 FLAGS compliance issues (Keihyouhou, Yakki Ho). v1.1 proposes AUTO-REWRITE -- the system automatically fixes non-compliant copy. This transforms the platform from a tool that warns ("this might violate Yakki Ho") into an advisor that asserts ("this rewrite IS compliant"). The legal liability difference is enormous. If the auto-rewrite misses a violation, or introduces a new one, the platform has implicitly certified the copy as compliant.

**Why it happens:**
- The boundary between "sensory description" (allowed) and "health claim" (prohibited under Yakki Ho) is extremely nuanced in Japanese. Example: "Makes skin feel smooth" (sensory, allowed) vs. "Makes skin smooth" (efficacy claim, prohibited under Yakki Ho Article 66). The difference is one word.
- LLMs hallucinate compliance. A 2026 study shows legal information suffers from a 6.4% hallucination rate, compared to 0.8% for general knowledge. For advertising law specifically, the model may confidently rewrite copy in a way that still violates the regulation but uses different words.
- The Yakki Ho has extremely specific categories: cosmetics can claim 56 specific efficacy items (like "moisturizes skin") but nothing else. The model does not have this exhaustive list in its training data.
- The Food Labeling Act (食品表示法) has separate rules for health claims, nutrient function claims, and functional food claims -- each with specific allowed/prohibited language.
- Auto-rewrite for solopreneurs (who have no compliance team) means the platform becomes their de facto compliance advisor. This is the highest liability posture possible.
- Japan's regulatory framework for AI is evolving: while the AI Promotion Act is soft-law, liability for AI-generated advertising could arise under Article 709 of the Civil Code if the platform's rewrite causes a violation.

**Consequences:**
- A solopreneur publishes auto-rewritten copy that still violates Yakki Ho. The Consumer Affairs Agency issues a warning or fine.
- The platform bears reputational (and possibly legal) liability for the false assurance.
- A beauty brand uses auto-rewritten copy claiming "moisturizing effect" when the product category only allows "keeps skin hydrated." The distinction matters legally but the LLM does not know the difference.
- False negatives (missed violations) are worse than false positives (over-flagging), but LLMs are biased toward producing confident, clean-sounding output.

**Warning signs:**
- Auto-rewrite producing copy that sounds "safe" but uses equivalent prohibited terms (synonym substitution does not fix compliance)
- No human-in-the-loop before publication
- Users treating auto-rewritten copy as "lawyer-approved"
- Compliance checking being applied uniformly without knowing the product category (cosmetics vs. food vs. supplements have different rules)

**Prevention:**
1. **NEVER call it "compliant" or "approved."** Use language like "suggested revision for review" or "rewrite proposal -- verify with legal." The UI must make clear that auto-rewrite is a draft, not a certification.
2. **Require human confirmation.** After auto-rewrite, show the user a diff (original vs. rewritten) with specific regulatory references. The user must explicitly accept the rewrite.
3. **Build category-specific rule databases.** The 56 allowed cosmetic efficacy claims should be an explicit lookup table, not LLM inference. The prohibited Yakki Ho terms should be regex-matched, not LLM-generated.
4. **Two-pass architecture:** First pass: regex/rule-based detection of specific prohibited patterns (HIGH confidence). Second pass: LLM-based contextual analysis for edge cases (MEDIUM confidence). Mark confidence level on each flag.
5. **Add a disclaimer banner to every campaign kit.** "This content has been screened for common compliance issues. It has NOT been reviewed by a legal professional. [Brand name] is responsible for ensuring all advertising complies with applicable Japanese law."
6. **Log all compliance decisions.** Every flag, every auto-rewrite, every user acceptance/override must be logged. This creates an audit trail if a violation is discovered.
7. **Consider offering compliance checking as "flag + suggest" for v1.1 and "auto-rewrite" only for a later version after the flag-only mode has been validated with real users.**

**Detection:**
- Track false negative rate: have a native speaker review auto-rewrites weekly for missed violations
- Monitor user behavior: are users always accepting rewrites without reading them? (Suggests they treat it as certification)
- A/B test: do users with auto-rewrite publish more non-compliant content than users with flag-only? (Paradoxical but possible due to complacency)

**Phase:** Compliance auto-rewrite should be a LATE phase, after flag-only mode has been deployed and validated. Do not ship auto-rewrite in the first v1.1 iteration.

**Severity:** CRITICAL (legal liability for the business)

**Confidence:** HIGH for the liability analysis. Japanese advertising law is well-documented. The AI Promotion Act's liability implications are covered by multiple legal analyses.

**Sources:**
- [International Bar Association: Japan's AI framework](https://www.ibanet.org/japan-emerging-framework-ai-legislation-guidelines)
- [Chambers: AI Japan 2025](https://practiceguides.chambers.com/practice-guides/artificial-intelligence-2025/japan)
- [YesChat: Yakki Ho checker](https://www.yeschat.ai/gpts-9t56N1XIed3-%E3%82%BB%E3%83%AB%E3%83%95%E8%96%AC%E6%A9%9F%E6%B3%95%E3%83%81%E3%82%A7%E3%83%83%E3%82%AF%EF%BC%86%E3%83%AA%E3%83%A9%E3%82%A4%E3%83%88)
- [Duke University: LLMs Still Hallucinating in 2026](https://blogs.library.duke.edu/blog/2026/01/05/its-2026-why-are-llms-still-hallucinating/)

---

## High-Severity Pitfalls

Mistakes that cause significant delays, degraded quality, or user distrust.

---

### HP-1: NotebookLM MCP Fragility -- A House of Cards for the Knowledge Base

**What goes wrong:** The entire v1.1 knowledge base (5 themed notebooks: Frameworks, JP Market, Platform Specs, Copywriting, Per-client brand) depends on NotebookLM MCP, which works by reverse-engineering Google's undocumented internal APIs using browser cookies for authentication. This is inherently fragile: cookies expire every 2-4 weeks, Google can change internal APIs at any time without notice, rate limits cap usage at ~50 queries/day, and browser automation detection can block access entirely.

**Why it happens:**
- NotebookLM has NO official API. The MCP server uses undocumented internal endpoints reverse-engineered from the web interface.
- Authentication requires extracting browser cookies via automated Chrome. These cookies expire every 2-4 weeks. When they expire, API calls return 401/403 errors.
- Even with the latest `notebooklm-mcp` v0.1.9+, automatic token refresh only works for CSRF tokens and session IDs -- when Google's main auth cookie expires, manual re-authentication is required.
- The `undetected-chromedriver` wrapper is explicitly described as "the most fragile part of the architecture" in the MCP server documentation.
- Google's rate limits: ~50 queries per day per account. With 7 agents potentially querying the knowledge base per campaign, 50 queries supports only ~7 campaigns per day.
- Google could detect automated usage patterns and lock the account, losing all notebook data or blocking access.
- Any change to Google's internal API endpoints (which have no versioning contract) breaks the MCP server immediately.

**Consequences:**
- Knowledge base goes offline every 2-4 weeks when cookies expire, requiring manual intervention to re-authenticate
- At 50 queries/day, the system cannot serve more than 7 full campaigns per day (assuming each campaign's 7 agents make 1 query each)
- Google changes internal APIs, breaking the MCP server. No notice, no migration path, no SLA.
- Google detects automation and locks the account. 5 notebooks of curated knowledge become inaccessible.
- The 7-agent pipeline degrades to "no knowledge base" mode, producing generic output that ignores domain expertise

**Warning signs:**
- Increasing 401/403 errors in MCP server logs
- Queries returning stale or empty results
- Authentication failures during off-hours when nobody is available to re-authenticate
- Google sending "unusual activity" notifications to the account

**Prevention:**
1. **Treat NotebookLM MCP as a prototype knowledge source, not production infrastructure.** Design the agent pipeline to work WITHOUT the knowledge base (degraded but functional). The knowledge base should enhance quality, not be required for operation.
2. **Implement graceful degradation.** When NotebookLM is unavailable (cookie expired, rate limited, API changed), agents fall back to their system prompts (which should contain the core domain knowledge). Flag campaigns generated without knowledge base as "standard quality."
3. **Cache aggressively.** Cache every NotebookLM response in Supabase with a TTL of 7 days. Most queries will be repeated (framework lookups, platform specs). Build a local cache that reduces actual NotebookLM queries to only novel or per-brand lookups.
4. **Budget queries strictly.** At 50/day: Reserve 5 for per-client brand lookups, 10 for framework/strategy queries (cached), 10 for platform spec queries (cached), 25 as buffer. With caching, the effective capacity is much higher.
5. **Set up automated cookie rotation.** Use the crontab approach: `0 0 1 * * notebooklm-mcp-auth --auto-rotate` for monthly rotation. But monitor for failures.
6. **Plan the migration path to production RAG NOW.** NotebookLM MCP is explicitly a prototype bridge. The production system should use Qdrant/Weaviate with Cohere embeddings. Start designing the embedding pipeline in parallel with v1.1.
7. **Use a dedicated Google account** (not a personal account). If Google locks it, there is no impact on personal data.

**Detection:**
- Health check: ping NotebookLM MCP at the start of every campaign and log success/failure
- Alert on 3+ consecutive failures (cookie likely expired)
- Daily query count monitoring (approaching 50 = danger)
- Weekly manual verification: query each notebook and verify responses are current

**Phase:** Knowledge base integration should be an enhancement layer, not a core dependency. Build the 7-agent pipeline first with system-prompt-only knowledge, then layer in NotebookLM as a cache-backed enhancement.

**Severity:** HIGH

**Confidence:** HIGH -- fragility is explicitly documented by MCP server authors. Cookie expiry timelines and rate limits confirmed via multiple sources.

**Sources:**
- [NotebookLM MCP Server](https://mcpservers.org/servers/roomi-fields/notebooklm-mcp)
- [jacob-bd/notebooklm-mcp Authentication docs](https://github.com/jacob-bd/notebooklm-mcp/blob/main/docs/AUTHENTICATION.md)
- [Pantheon-Security/notebooklm-mcp-secure](https://github.com/Pantheon-Security/notebooklm-mcp-secure)
- [Agent Native: NotebookLM MCP guide](https://agentnativedev.medium.com/automate-google-notebooklm-from-your-ai-agent-with-notebooklm-mcp-3c513a37396a)

---

### HP-2: Auto Mode Hallucinated Strategy -- Schwartz/LF8 Misclassification

**What goes wrong:** Auto mode must infer a full campaign strategy from a plain-language solopreneur input like "I want to promote my new matcha latte." The Strategic Insight agent must classify the product into a Schwartz value category, Life Force 8 drive, StoryBrand framework position, and keigo register. If any of these classifications is wrong, the ENTIRE downstream pipeline produces misaligned content: wrong emotional appeal, wrong tone, wrong platform strategy.

**Why it happens:**
- LLMs struggle with psychographic classification. An ICLR 2025 paper found that "across diverse prompts, all models achieved accuracy results close to random guessing" for personality trait inference from text.
- The Schwartz value theory has 19 values that share overlapping motivational bases. Mapping a product description to a value requires domain expertise that the LLM may or may not have.
- "Matcha latte" could be: Self-Direction (artisanal, craft), Hedonism (taste pleasure), Universalism (natural, health-conscious), Security (comfort, routine), or Tradition (Japanese tea culture). The correct classification depends on the brand positioning, target audience, and campaign goals -- context the solopreneur's brief does not provide.
- Auto mode explicitly aims for "invisible strategic reasoning" -- the user does NOT see or approve the Schwartz/LF8 classification before content generation. If the classification is wrong, there is no checkpoint to catch it.
- Japanese cultural context adds complexity: "achievement" manifests differently in Japanese vs. Western advertising. A Conformity-aligned campaign in Japan is not negative (it is about harmony/wa) while in Western markets it would be.
- The 5-question Auto mode brief provides much less context than the structured Pro mode brief. Less input = more inference = more hallucination.

**Consequences:**
- A luxury matcha brand gets classified as "Hedonism" when it should be "Tradition" -- the campaign uses pleasure-seeking language instead of heritage/craft language
- Keigo register is inferred as casual when the brand targets older, affluent consumers who expect formal language
- The campaign targets Instagram/TikTok when the actual audience is on LINE and Yahoo! JAPAN
- The solopreneur receives a complete campaign kit that "feels wrong" but cannot articulate why (because the strategy layer is invisible)
- The solopreneur blames the product and churns, never knowing the root cause was misclassification

**Warning signs:**
- Auto mode generates content that "feels generic" or "off-brand"
- Users frequently regenerate or switch to Guided mode after seeing Auto mode output
- The same product category generates wildly different strategies between runs (low consistency)
- No validation step between strategy inference and content generation

**Prevention:**
1. **Show the inferred strategy before generating content.** Even in Auto mode, display a brief "Here's what I understood" summary: "Your matcha latte campaign: Heritage/Tradition theme, formal tone, targeting health-conscious adults via LINE and Instagram. Does this look right?" One confirmation click before generation. This is NOT the same as Pro mode -- it is a single confirmation, not a multi-step form.
2. **Use few-shot examples extensively.** The Strategic Insight agent's prompt should include 10-20 Japanese product examples with correct classifications across Schwartz/LF8/SB7/register. These examples must cover the most common solopreneur categories: food/beverage, beauty/salon, retail/Rakuten, health/fitness, professional services.
3. **Add confidence scoring to classification.** If the agent's confidence in its Schwartz classification is below 70%, default to a "general" strategy template rather than committing to a potentially wrong classification.
4. **Constrain the classification space.** Instead of all 19 Schwartz values, map to 5-6 macro categories relevant to Japanese advertising: Heritage/Tradition, Innovation/Self-Direction, Pleasure/Hedonism, Care/Benevolence, Achievement/Power, Safety/Security. Fewer categories = lower misclassification rate.
5. **Log classifications and correlate with user satisfaction.** If matcha latte products are consistently classified as "Hedonism" and users consistently regenerate, that is signal to adjust the classification.
6. **Temperature 0 for strategy classification.** Zero temperature prevents the "random walk" effect where the same input produces different classifications.

**Detection:**
- Track classification consistency: same product description should produce same classification across runs
- Track regeneration rate by Auto mode vs. Guided/Pro mode -- high disparity suggests Auto mode quality issues
- Weekly review of 10 random Auto mode classifications by a native JP marketing professional

**Phase:** Auto mode strategy inference is the highest-risk new feature. Build with validation checkpoint from day one. Never ship "invisible" strategy without at least a confirmation step.

**Severity:** HIGH

**Confidence:** MEDIUM-HIGH. LLM classification accuracy research is well-documented (ICLR 2025). Schwartz-specific LLM classification has limited evidence. The mitigation of showing a confirmation step is high-confidence regardless of the underlying classification accuracy.

**Sources:**
- [ICLR 2025: Do LLMs Have Consistent Values?](https://proceedings.iclr.cc/paper_files/paper/2025/file/68fb4539dabb0e34ea42845776f42953-Paper-Conference.pdf)
- [AAAI: Measuring Human and AI Values](https://ojs.aaai.org/index.php/AAAI/article/view/34839/36994)
- [Duke University: LLMs Still Hallucinating in 2026](https://blogs.library.duke.edu/blog/2026/01/05/its-2026-why-are-llms-still-hallucinating/)

---

### HP-3: Cross-Region Integration Failures (US VPS <-> Vercel Tokyo <-> Supabase)

**What goes wrong:** The v1.1 system has three geographically distributed components (n8n on US VPS, Next.js on Vercel Tokyo, Supabase in Tokyo) connected by webhooks and HTTP callbacks. This creates a triangle of cross-region calls where any leg can fail, and failures are hard to distinguish from latency.

**Why it happens:**
- n8n US VPS to Supabase Tokyo: ~120ms per request. With 7 agents each writing progress updates, that is 840ms+ of cumulative cross-region latency just for progress reporting.
- n8n US VPS to Vercel Tokyo callbacks: ~120ms + Vercel cold start (500-2000ms for serverless functions). First callback after idle period can take 2+ seconds.
- Vercel Tokyo to n8n US VPS (campaign submission): ~120ms. Vercel serverless functions have a 10-second default timeout. If n8n is slow to acknowledge, the function times out.
- Webhooks between regions traverse the public internet. Packet loss, DNS issues, and TLS handshake failures are routine at scale.
- Supabase Realtime subscriptions from n8n (US) to Supabase (Tokyo) add persistent connection overhead.
- Asset uploads: n8n (US) generating assets and uploading to Supabase Storage (Tokyo) -- every asset upload incurs ~120ms of latency plus transfer time for large files (video: 50-200MB).

**Consequences:**
- Progress updates arrive late or not at all, making the user think generation is stuck
- Webhook callbacks fail silently, leaving campaigns in "generating" state indefinitely
- Asset uploads from n8n to Tokyo storage are slow, adding 30-120 seconds to total campaign time for video assets
- The <5 minute target is hard to meet when cross-region latency adds up across 20+ HTTP calls per campaign

**Warning signs:**
- Campaign generation consistently takes 5-7 minutes instead of <5 minutes
- Occasional "stuck" campaigns that eventually complete but the UI shows them as failed
- Vercel function timeout errors in logs
- Supabase Storage upload timeouts from n8n

**Prevention:**
1. **Minimize cross-region calls.** Batch progress updates: instead of 7 agent progress callbacks, batch them into 2-3 (after strategy phase, after content phase, after delivery phase).
2. **Use Supabase Realtime instead of webhook callbacks for progress.** n8n writes progress to Supabase (cross-region, ~120ms), Supabase pushes to the browser via Realtime (same region, <5ms). Eliminates the n8n-to-Vercel callback leg entirely.
3. **Upload assets to a US-region staging bucket first.** n8n uploads to S3/R2 in the US (fast, same region). A separate process (or CDN) serves them from Tokyo. This eliminates the cross-region upload bottleneck for large video files.
4. **Set Vercel function timeout to 30 seconds for webhook submission** (just needs to acknowledge and write to DB, not wait for generation).
5. **Implement retry with exponential backoff on all cross-region HTTP calls.** First retry at 1s, then 2s, then 4s, max 3 retries.
6. **Monitor cross-region latency continuously.** Set up a scheduled n8n workflow that pings Supabase and Vercel every 5 minutes and logs latency. Alert on p95 > 500ms.

**Detection:**
- End-to-end campaign timing breakdown: how much time is generation vs. cross-region overhead?
- Webhook delivery success rate
- Vercel function duration and timeout rate
- Asset upload duration from n8n to storage

**Phase:** Cross-region architecture must be designed in Phase 1 of v1.1. The decision about progress reporting mechanism (webhooks vs. Supabase Realtime) and asset upload strategy (direct vs. staging bucket) must be made upfront.

**Severity:** HIGH

**Confidence:** HIGH -- cross-region latency figures are well-established. Vercel cold start behavior is documented.

---

### HP-4: Cost Multiplication -- 7 LLM Calls + Generation APIs Per Campaign

**What goes wrong:** A single v1.1 campaign involves: 7 LLM agent calls (Claude) + 1+ image generation (Flux) + 1+ video generation (Seedance/Kling/Runway) + 1 voice generation (ElevenLabs) + possibly avatar generation (HeyGen) + NotebookLM queries. At full configuration, a single campaign could cost $5-15+ in API fees. The credit pricing model may not cover actual costs.

**Why it happens:**
- 7 Claude agent calls: If using Sonnet for all 7 with ~4K input / ~2K output tokens per agent: ~$0.60-1.00 total. If any agent uses Opus: add $0.30-0.75 per Opus call.
- Image generation (Flux 1.1 Pro Ultra): ~$0.05-0.10 per image, 3-5 images per campaign = $0.15-0.50
- Video generation: Seedance ~$0.10-0.80 per minute, Runway ~$0.50+ per 10s clip, Kling varies. A single 15s video clip: $0.50-2.00
- ElevenLabs voice: ~$0.30 per 1000 characters for Japanese text. A 30s script: ~$0.10-0.30
- HeyGen avatar: $0.10-0.50 per video minute
- NotebookLM: free queries, but limited to 50/day (opportunity cost)
- Total per campaign with video + avatar: $2-8 in API costs
- The v1.0 credit model has "Full campaign kit: ~15-25 credits." At Pro tier pricing (Y29,800/mo for 200 credits), each credit is worth Y149 (~$1). 20 credits = Y2,980 (~$20) per campaign. Margin looks fine at $5-8 API cost.
- BUT: retries, fallback provider costs, failed generations that still consume API credits, and Opus-tier agent calls can push actual costs to $15-20 per campaign. Margin disappears.

**Consequences:**
- Monthly API bills 2-5x higher than projected
- Certain campaign configurations (video + avatar + cinematic) are loss-leaders
- Free tier users consuming expensive generation without adequate credit limitations
- Cost-per-campaign variance is high (simple text campaigns: $1, full video campaigns: $15), making flat credit pricing unreliable

**Warning signs:**
- API bills growing faster than user revenue
- High-cost campaigns concentrated in free/starter tiers
- No per-campaign cost tracking
- Users discovering that requesting video + avatar + cinematic generates maximum value per credit

**Prevention:**
1. **Track actual API cost per campaign** in real-time. Log every API call with its cost (tokens * price for LLM, per-image for generation, per-second for video). Store in a `campaign_costs` table.
2. **Tier agent model selection by campaign complexity.** Simple campaigns (text + images only): Haiku for most agents, Sonnet for Copywriter only (~$0.20 total). Full campaigns (all media types): Sonnet for key agents, Haiku for extraction agents (~$0.60-1.00 total). Never use Opus in the default pipeline.
3. **Price credits based on actual cost, not flat rate.** Image credit: 1 credit ($1.50). Video credit: 5 credits ($7.50). Avatar credit: 5 credits ($7.50). This matches the actual cost structure better than "15-25 credits for any campaign."
4. **Implement cost ceiling per campaign.** If a campaign's API costs exceed $10, pause and notify the user rather than continuing to generate.
5. **Cache and reuse.** If the same brand profile is used across campaigns, cache the Strategic Insight and Creative Director outputs. The strategy for a matcha brand does not change between campaigns -- reuse it.
6. **Lazy generation for expensive assets.** Generate text + images immediately (cheap, fast). Generate video/voice/avatar only when the user clicks "Generate Video" after reviewing the images/copy (expensive, deferred). This prevents wasting $3+ on video for campaigns where the user rejects the initial copy.
7. **Use Claude Batch API (50% discount) for non-urgent agent calls.** If the pipeline can tolerate async processing (it can -- users wait anyway), batch the agent calls for 50% cost reduction.

**Detection:**
- Weekly cost reconciliation: sum(API costs) vs sum(credit revenue)
- Per-tier profitability analysis: which tier generates the most loss?
- Per-feature cost analysis: what percentage of total cost comes from video generation?
- Cost trend monitoring: is cost per campaign increasing over time?

**Phase:** Cost tracking must be built into Phase 1 of the pipeline. Credit pricing adjustments can come in a later phase, but the cost data must be collected from day one.

**Severity:** HIGH

**Confidence:** HIGH for cost estimation methodology. MEDIUM for specific API pricing (verify current prices for all providers before finalizing credit model).

---

### HP-5: Seedance 2.0 Technical Limitations vs. Expectations

**What goes wrong:** The PRD positions Seedance 2.0 as offering "native audio-visual co-generation and Japanese lip-sync." Reality check: output is limited to 4-15 second clips at 480p-720p equivalent via third-party APIs, audio layering is limited, and the official API is not yet available. The <5 minute campaign target is at risk because video generation alone takes 30-180+ seconds per clip.

**Why it happens:**
- Third-party aggregators (fal.ai, seedance2api.ai) offer limited resolution and duration compared to what the Jimeng web interface provides
- Audio co-generation is a headline feature but "advanced audio layering, voice modulation, or multi-track synchronization remains limited" -- fine for ambient sound but not for commercial voiceover
- Maximum audio input: 15 seconds combined. For a 30-second Japanese ad script, external audio generation (ElevenLabs) is still required
- File size limits: 30MB images, 50MB video, 15MB audio per request. Japanese advertising assets at 1080p can exceed these limits.
- Generation time: 30-120 seconds per clip at 720p. At 1080p: 60-180+ seconds. Adding this to the pipeline easily pushes total campaign time past 5 minutes.
- Character consistency in multi-shot sequences is a known limitation -- if the campaign needs multiple video clips with the same character/product, they may look different.
- Cold start latency on first request after idle period adds additional time.

**Consequences:**
- Campaign generation exceeds 5-minute target whenever video is included
- Video quality does not match user expectations set by the Jimeng web interface demos
- Audio co-generation is insufficient for commercial Japanese voiceover, requiring separate ElevenLabs calls anyway
- Multi-clip campaigns have inconsistent character/product appearance

**Warning signs:**
- Video generation consistently adding 2-4 minutes to campaign time
- Users complaining about video resolution or quality
- Audio from co-generation sounding robotic or mismatched for Japanese speech
- Inconsistent appearance across video variants

**Prevention:**
1. **Set realistic expectations in the UI.** Video generation takes 1-3 minutes. Show this clearly in the progress UI. Do not promise "<5 minute full kit" when video is included.
2. **Use Seedance for specific strengths only.** Seedance excels at: TikTok-style social video with ambient audio, product motion/reveal shots, quick social clips. Use Runway for cinematic quality, Kling for fast prototyping.
3. **Generate video asynchronously AFTER the core kit is ready.** Deliver images + copy + voice first (fast), then generate video in the background and notify the user when ready. Do not block the kit on video completion.
4. **Test Japanese lip-sync quality before committing.** Seedance claims "phoneme level lip sync in 8+ languages including Japanese." Verify this with actual Japanese voiceover before building the pipeline around it.
5. **Pre-process inputs to fit within limits.** Resize images to under 30MB, trim audio to under 15 seconds. Build these preprocessing steps into the pipeline.

**Detection:**
- Track video generation time by model and configuration
- Compare Seedance output quality against Kling and Runway for the same prompts
- A/B test: users receiving Seedance video vs. Runway video -- which has higher approval rate?
- Monitor Japanese lip-sync quality with native speaker review

**Phase:** Seedance integration should come AFTER Kling and Runway are proven in the pipeline. Add as a third option, not a replacement.

**Severity:** HIGH

**Confidence:** MEDIUM -- model is 4 days old, limited real-world developer experience. Technical specs verified from multiple sources but not tested firsthand.

**Sources:**
- [Nerdbot: Seedance 2.0 integration guide](https://nerdbot.com/2026/02/12/seedance-2-0-what-you-need-to-know-before-integrating-the-ai-video-api/)
- [Seedance 2.0 API guide](https://seedancevideo.com/api/)
- [Lanta AI: Seedance 2.0 review](https://www.lantaai.com/ai-video-models/seedance-2-0)

---

## Moderate-Severity Pitfalls

Mistakes that cause degraded quality, user frustration, or scaling friction.

---

### MP-1: Brand Memory Cold Start Problem

**What goes wrong:** Brand Memory is designed to "accumulate voice, visual style, preferences over campaigns." On Day 1, Brand Memory is empty. The first 5-10 campaigns for a new brand produce output without memory-enhanced quality. This creates a paradox: the platform is worst for new users (who have no memory) and best for established users (who have extensive memory). The onboarding experience -- the critical first impression -- is the worst experience.

**Prevention:**
1. **Pre-populate Brand Memory from the brand profile.** When a user creates a brand profile (logo, colors, tone, register, positioning), automatically generate an initial memory document with inferred preferences.
2. **Use brief templates as implicit memory.** If a user selects the "beauty salon" template, inject domain-appropriate defaults (common visual styles, typical platform mix, standard keigo level) as initial memory.
3. **Learn from the first campaign explicitly.** After the first campaign is reviewed/approved, extract explicit preferences: "You approved the formal tone variant. Saving preference: formal register." Show this to the user.
4. **Design the data model for evolution from day one.** Brand Memory will accumulate heterogeneous data: text preferences, visual style vectors, platform selections, register preferences, rejected content patterns. Use a flexible schema (JSONB with typed entries + vector embeddings for semantic search) rather than rigid columns.
5. **Set memory retention policy.** Not all memory is equally valuable. Recent campaign outcomes > old campaign outcomes. Explicit user preferences > inferred preferences. Build a decay mechanism that prioritizes recent, explicit data.

**Phase:** Brand Memory data model in early phase. Accumulation logic as an enhancement layer.
**Severity:** MEDIUM
**Confidence:** HIGH -- cold start is a well-known pattern in recommendation systems.

---

### MP-2: n8n Data Passing Between 7 Agents -- Serialization Overhead

**What goes wrong:** n8n passes data between nodes and sub-workflows as serialized JSON. When Agent 1's output (potentially thousands of tokens of structured data) is passed to Agent 2, then Agent 1 + Agent 2's output to Agent 3, etc., the serialized payload grows with each hop. By Agent 7, the n8n internal data object can be several MB of JSON, consuming VPS RAM and slowing execution.

**Prevention:**
1. **Each agent returns a structured summary, not its full output.** Define explicit output schemas: `{ classification: string, reasoning_summary: string, key_decisions: object, confidence: number }`. Max 500-1000 tokens per agent output.
2. **Use Supabase as intermediate storage.** After each agent, write output to a campaign-scoped row. The next agent reads only what it needs from Supabase, not the accumulated n8n data object.
3. **Clear intermediate data in n8n.** After writing to Supabase, use a Set node to clear the large data fields before passing to the next agent. Keep only the campaign_id and a summary.
4. **Monitor n8n memory usage.** Track RSS/heap memory on the VPS. Alert if memory exceeds 80% during campaign generation.

**Phase:** Pipeline architecture phase. Data passing strategy must be decided upfront.
**Severity:** MEDIUM
**Confidence:** HIGH -- n8n serialization overhead is documented in community discussions.

**Sources:**
- [n8n blog: Multi-agent systems](https://blog.n8n.io/multi-agent-systems/)

---

### MP-3: Auto Mode Keigo Register Inference for Unknown Domains

**What goes wrong:** Auto mode must infer the appropriate keigo register from a brief like "promote my ramen shop" or "announce my consulting services." Ramen shop = casual. Consulting = formal. Funeral services = extremely formal (with specific ceremonial language). But what about edge cases? A trendy boutique funeral service? A luxury ramen brand? A casual consulting service? The register inference is binary when reality is a spectrum.

**Prevention:**
1. **Default to "standard polite" (desu/masu) as the safest default.** In Japanese business context, standard polite is never wrong -- it may be too formal for casual brands or too informal for luxury, but it is never offensive. Casual or keigo should require explicit signal.
2. **Use industry category as a strong prior.** Maintain a mapping: beauty/salon = casual-polite, B2B/consulting = formal, luxury/jewelry = keigo, food/retail = casual-polite, medical/legal = formal-keigo. Let the user override but start with the prior.
3. **Validate with example output.** Show the user a sample line in the inferred register before generating the full campaign. "Is this the right tone for your brand?"
4. **Never infer keigo (formal honorific) unless explicitly requested or industry strongly signals it.** Incorrect keigo (using humble form where respectful form is needed) is worse than no keigo. Over-formality is recoverable; keigo errors are embarrassing.

**Phase:** Auto mode implementation phase.
**Severity:** MEDIUM
**Confidence:** HIGH -- keigo register system is well-documented.

---

### MP-4: n8n Workflow Version Control and Rollback

**What goes wrong:** The v1.1 n8n instance will have 10+ workflows (master orchestrator + 7 agent sub-workflows + generation sub-workflows + error handling). n8n has no built-in git integration. A broken workflow update can take down the entire campaign pipeline with no easy rollback.

**Prevention:**
1. **Export all workflows as JSON and commit to git after every change.** Write an n8n workflow that exports all workflows via the n8n API and commits them to the repo nightly.
2. **Tag workflow versions.** Before major changes, export and tag the current working state. If the update breaks, re-import the tagged version.
3. **Use a staging n8n instance.** Test workflow changes on a separate n8n instance before deploying to production. This requires a second VPS or Docker instance.
4. **Never edit production workflows directly.** Always edit in staging, test, export, import to production.

**Phase:** Infrastructure setup phase.
**Severity:** MEDIUM
**Confidence:** HIGH -- n8n lacks built-in version control; this is documented.

---

### MP-5: NotebookLM 50 Query/Day Limit Constraining Scale

**What goes wrong:** At 50 queries/day with 7 agents per campaign, the theoretical maximum throughput is ~7 campaigns/day. Even with aggressive caching (70% cache hit rate), actual throughput is ~20 campaigns/day. For a SaaS product aiming for 50+ users, this is a hard ceiling.

**Prevention:**
1. **Cache every response with compound keys** (notebook_id + query_hash). Most queries will repeat across campaigns in the same domain.
2. **Use NotebookLM for bootstrapping, not runtime queries.** At startup / daily, bulk-query each notebook for common framework lookups and cache locally. During campaign generation, hit the local cache exclusively.
3. **Implement tiered knowledge access.** Agents that need current data (per-client brand) query NotebookLM. Agents that need static data (frameworks, platform specs) read from local cache populated at the start of each day.
4. **Plan the migration to self-hosted RAG early.** The 50/day limit is a fundamental constraint that cannot be worked around. The NotebookLM approach is viable for 10-20 users; beyond that, you need Qdrant/Weaviate with your own embeddings.

**Phase:** Knowledge base implementation phase.
**Severity:** MEDIUM
**Confidence:** HIGH -- rate limit is documented.

---

### MP-6: Three Experience Modes Sharing One Engine -- Mode Leakage

**What goes wrong:** Auto, Guided, and Pro modes are designed to share the same 7-agent engine with different interface layers. In practice, the mode boundaries leak: Auto mode users see Pro-level complexity in error messages, Guided mode users encounter agent output formatted for Pro mode, or Pro mode users get oversimplified output because the pipeline defaults to Auto mode prompts.

**Prevention:**
1. **Mode is a first-class parameter in the pipeline.** The campaign brief includes `mode: "auto" | "guided" | "pro"`. Every agent's system prompt includes mode-specific instructions: Auto = "produce ready-to-use output with no technical details." Pro = "include all reasoning, alternatives, and technical parameters."
2. **Output formatting is mode-aware.** Auto mode returns 3-5 ready-to-post assets with minimal metadata. Pro mode returns the same assets plus strategy reasoning, A/B variants, and regeneration parameters.
3. **Error messages are mode-aware.** Auto mode: "Video generation is taking longer than usual. We'll email you when it's ready." Pro mode: "Kling API returned 429 (rate limit). Falling back to Runway Gen-4. ETA: 90 seconds."
4. **Test each mode end-to-end as a separate test suite.** The same brief should produce mode-appropriate output at every stage.

**Phase:** Mode implementation phase (likely late in v1.1).
**Severity:** MEDIUM
**Confidence:** HIGH -- mode leakage is a common UX anti-pattern in multi-mode products.

---

## Minor Pitfalls

Mistakes that cause annoyance or minor rework but are fixable.

---

### LP-1: Seedance 2.0 Audio Quality Insufficient for Commercial Japanese Ads

**What goes wrong:** Seedance 2.0's native audio co-generation produces ambient sound and basic dialogue but lacks the quality control needed for commercial Japanese advertising. Japanese ads require specific intonation patterns (natural pitch accent), precise timing, and culturally appropriate vocal qualities that ambient audio co-generation cannot deliver.

**Prevention:** Use Seedance audio only for ambient/SFX. Always generate voiceover separately via ElevenLabs for any dialogue or narration. Composite the ElevenLabs audio onto Seedance video in the post-processing step.

**Phase:** Video pipeline implementation.
**Severity:** LOW (easy workaround exists)
**Confidence:** MEDIUM -- limited real-world testing with Japanese audio.

---

### LP-2: Brand Memory Data Model Evolution Without Migrations

**What goes wrong:** Brand Memory starts simple (key-value preferences) but needs to evolve to include: visual style vectors, platform performance history, register preferences, rejected content patterns, seasonal adjustments, and competitive positioning. If the data model is not designed for evolution, every schema change requires migrating existing brand memories.

**Prevention:** Use JSONB with a versioned schema pattern. Every memory entry includes `{ version: 1, type: "register_preference", data: {...} }`. New entry types are additive, never breaking. Queries filter by type, not by assuming structure. Add vector columns later for semantic search without breaking existing data.

**Phase:** Brand Memory data model design phase.
**Severity:** LOW
**Confidence:** HIGH -- JSONB evolution patterns are well-established.

---

### LP-3: n8n VPS Single Point of Failure

**What goes wrong:** The n8n US VPS is the sole execution engine for all campaign generation. If it goes down (disk full, OOM, network issue, OS update), ALL campaign generation stops. There is no failover.

**Prevention:** For v1.1, monitor the VPS aggressively (uptime monitoring, disk space, memory, CPU). For v1.2+, consider n8n queue mode with Redis + a second worker node for redundancy. For now, ensure the VPS has automatic restart (systemd) and daily backups.

**Phase:** Infrastructure phase.
**Severity:** LOW for v1.1 (acceptable risk for 3 concurrent campaigns). Becomes HIGH at scale.
**Confidence:** HIGH.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation | Ref |
|-------------|---------------|------------|-----|
| n8n 7-Agent Pipeline Architecture | Token bloat exhausting context windows | Tiered models + summary-only passing + token budgets | CP-1 |
| n8n 7-Agent Pipeline Architecture | Sub-workflow error cascading | Continue On Fail + error output + DB state bridge | CP-2 |
| n8n 7-Agent Pipeline Architecture | Data serialization overhead | Supabase as intermediate storage + clear large fields | MP-2 |
| n8n 7-Agent Pipeline Architecture | No version control or rollback | Git export + staging instance | MP-4 |
| Seedance 2.0 Integration | Legal/availability uncertainty | Feature-flagged, third model behind Kling/Runway | CP-3 |
| Seedance 2.0 Integration | Output quality below expectations | Async video generation, set realistic expectations | HP-5 |
| Seedance 2.0 Integration | Audio co-gen insufficient for JP ads | ElevenLabs for voiceover, Seedance for ambient only | LP-1 |
| NotebookLM MCP Knowledge Base | Cookie expiry breaks knowledge access | Graceful degradation + aggressive caching | HP-1 |
| NotebookLM MCP Knowledge Base | 50 query/day limit constrains scale | Bulk-cache strategy + local-first architecture | MP-5 |
| Auto Mode | Hallucinated Schwartz/LF8 classification | Confirmation step + few-shot examples + temp=0 | HP-2 |
| Auto Mode | Wrong keigo register inference | Default to standard polite + industry priors | MP-3 |
| Auto Mode / Guided / Pro | Mode boundary leakage | Mode as first-class pipeline parameter | MP-6 |
| Compliance Auto-Rewrite | Legal liability from false assurance | Flag + suggest (not auto-certify) + human confirmation | CP-4 |
| Cross-Region Integration | Latency adding up across 20+ HTTP calls | Batch callbacks + Supabase Realtime + staging bucket | HP-3 |
| Cost Management | 7 LLM + generation APIs per campaign | Cost tracking + tiered models + lazy generation | HP-4 |
| Brand Memory | Cold start for new users | Pre-populate from brand profile + template defaults | MP-1 |
| Brand Memory | Data model needs evolution over time | JSONB versioned schema pattern | LP-2 |

---

## Risk Heat Map

| Pitfall | Probability | Impact | Detectability | Risk Score |
|---------|-------------|--------|---------------|------------|
| CP-1: Token bloat / context exhaustion | Very High | High | Medium (API errors) | **CRITICAL** |
| CP-2: Sub-workflow error cascades | Very High | Critical | Low (intermittent) | **CRITICAL** |
| CP-3: Seedance legal/availability risk | High | Critical | High (news coverage) | **CRITICAL** |
| CP-4: Compliance auto-rewrite liability | Medium | Very High | Low (false negatives) | **CRITICAL** |
| HP-1: NotebookLM MCP fragility | Very High | High | High (auth errors) | **HIGH** |
| HP-2: Auto mode misclassification | High | High | Low (invisible strategy) | **HIGH** |
| HP-3: Cross-region integration failures | High | Medium | Medium (latency) | **HIGH** |
| HP-4: Cost multiplication per campaign | High | High | High (measurable) | **HIGH** |
| HP-5: Seedance technical limitations | High | Medium | Medium | **HIGH** |
| MP-1: Brand Memory cold start | High | Medium | Low (gradual) | **MEDIUM** |
| MP-2: n8n serialization overhead | Medium | Medium | Low | **MEDIUM** |
| MP-3: Keigo register inference | Medium | Medium | Medium | **MEDIUM** |
| MP-4: Workflow version control | Medium | High | Low (until it happens) | **MEDIUM** |
| MP-5: 50 query/day limit | High | Medium | High | **MEDIUM** |
| MP-6: Mode boundary leakage | Medium | Medium | Medium | **MEDIUM** |

---

## Integration Pitfall Matrix

The v1.1 features do not exist in isolation. The most dangerous pitfalls emerge at INTEGRATION boundaries.

| Integration Boundary | Pitfall | Why Dangerous |
|---------------------|---------|---------------|
| Auto mode -> 7-Agent Pipeline | Misclassified strategy propagates through all 7 agents | One wrong decision at Agent 1 produces a coherently wrong campaign |
| 7-Agent Pipeline -> Seedance | Agent 5 (Art Director) specifies video parameters that Seedance cannot execute | Seedance limits (4-15s, 720p, 15s audio) may not match Art Director's creative vision |
| NotebookLM -> 7-Agent Pipeline | Knowledge base unavailable, all 7 agents run without domain knowledge | Quality drops across entire campaign with no single visible failure |
| Compliance Agent -> Auto-Rewrite | Auto-rewrite changes copy meaning while fixing compliance | "Effective moisturizer" -> "A moisturizer" (compliant but useless as ad copy) |
| Brand Memory -> Auto mode | Empty Brand Memory + vague brief = maximum inference with minimum data | First campaign for new user is the worst quality, highest hallucination risk |
| n8n US -> Supabase Tokyo | 7 agents each writing progress = 7 cross-region DB writes in series | Cumulative latency of 840ms+ just for progress updates |
| Seedance -> n8n asset pipeline | Seedance output at 480-720p needs upscaling for platform specs | LINE requires exact 1040x1040; Seedance output may not match required dimensions |

---

## Recommended Risk Mitigation Ordering

Based on the research, the safest order to address these risks:

1. **FIRST: n8n pipeline architecture with error handling and token management** (addresses CP-1, CP-2, MP-2)
2. **SECOND: Cross-region communication pattern (Supabase Realtime, batch callbacks)** (addresses HP-3)
3. **THIRD: Cost tracking infrastructure** (addresses HP-4)
4. **FOURTH: Auto mode with confirmation checkpoint** (addresses HP-2, MP-3)
5. **FIFTH: NotebookLM with cache-first architecture and graceful degradation** (addresses HP-1, MP-5)
6. **SIXTH: Compliance as flag-only first, auto-rewrite deferred** (addresses CP-4)
7. **SEVENTH: Seedance 2.0 behind feature flag, after Kling + Runway proven** (addresses CP-3, HP-5, LP-1)
8. **EIGHTH: Brand Memory with pre-population** (addresses MP-1, LP-2)
9. **NINTH: Three-mode UI layer** (addresses MP-6)

---

## Sources and Confidence Notes

| Topic | Source | Confidence | Verification Status |
|-------|--------|------------|---------------------|
| n8n token exhaustion | n8n community forums, official docs | HIGH | WebSearch-verified, multiple sources |
| n8n error handling patterns | n8n docs, community guides | HIGH | WebSearch-verified |
| n8n timeout behavior | n8n community, official docs | HIGH | WebSearch-verified |
| Seedance 2.0 legal controversy | TechCrunch, Variety, CNBC, Deadline, Axios | HIGH | Multiple mainstream sources, Feb 2026 |
| Seedance 2.0 technical specs | Nerdbot, Lanta AI, seedancevideo.com | MEDIUM | Limited developer reports (model is 4 days old) |
| Seedance 2.0 API availability | Multiple sources | MEDIUM | Official API launch Feb 24 not yet confirmed |
| NotebookLM MCP fragility | GitHub repos, MCP server docs | HIGH | Multiple MCP implementations confirm limitations |
| NotebookLM rate limits | MCP server docs, Medium articles | HIGH | 50 queries/day confirmed across sources |
| LLM hallucination rates | ICLR 2025, Duke University, Lakera | HIGH | Peer-reviewed research + industry reports |
| Schwartz value LLM classification | ICLR 2025, AAAI | MEDIUM | Research shows limitations but not specific to advertising |
| Japanese advertising law liability | IBA, Chambers, White & Case | HIGH | Legal firm analyses, current (2025-2026) |
| Cross-region latency estimates | Training data + architecture analysis | MEDIUM | Estimates based on standard US-Tokyo latency; test empirically |
| Claude API pricing | Multiple sources | HIGH | Verified for 2026 pricing tiers |
| n8n multi-agent architecture | n8n blog, community examples | HIGH | Official and community sources agree |

---

*Last updated: 2026-02-16*
*Supersedes: v1.0 pitfalls document (2026-02-06) which remains valid for foundational concerns*
