# Project Research Summary

**Project:** AI Content Studio (Japanese Market)
**Domain:** AI-orchestrated ad campaign generation SaaS
**Researched:** 2026-02-06
**Confidence:** MEDIUM-HIGH

## Executive Summary

AI Content Studio is an AI-powered advertising campaign kit generation platform targeting the Japanese market. Research reveals this is a technically complex but strategically sound product that occupies a genuine market gap: no existing Western competitor (Canva, Jasper, AdCreative.ai) serves Japanese advertising requirements with native cultural intelligence. The core technical moat is Japanese typography compositing — AI models cannot reliably render Japanese text, so the platform uses a hybrid approach where AI generates base images and server-side code overlays Japanese text with proper kinsoku shori (line-breaking rules), keigo register control, and tri-script handling.

The recommended approach is a Next.js + Vercel dashboard in Tokyo with n8n orchestrating 6 AI providers (Claude for copy, Flux for images, Kling/Runway for video, ElevenLabs for voice, HeyGen for avatars). Supabase (Tokyo region) provides integrated auth + database + storage + real-time progress updates. The compositing pipeline using Sharp + node-canvas + opentype.js + budoux handles Japanese text rendering that AI cannot. Cloudflare R2 delivers assets with zero egress fees, preventing cost explosion at scale. Credit-based billing via Stripe with hybrid subscription + metered usage model.

The most critical risks are: (1) encoding corruption across the multi-service pipeline producing mojibake, (2) kinsoku shori violations making output look amateurish to Japanese eyes, (3) keigo register drift destroying brand voice consistency, (4) AI API cascading failures and cost explosions, and (5) platform format spec non-compliance causing rejection. All are preventable with proper architecture from day one. The technical foundation is well-understood; the execution challenge is in the details of Japanese language processing and multi-platform format compliance.

## Key Findings

### Recommended Stack

**Next.js 15 + Vercel (Tokyo edge) provides the foundation.** App Router with Server Components reduces client bundle for a dashboard-heavy app. Edge Runtime enables Tokyo-region server rendering. API Routes handle n8n webhooks and Stripe callbacks. Zero-config Vercel deployment with preview environments and built-in analytics.

**Core technologies:**
- **Next.js 15 + React 19 + TypeScript 5.6+**: Full-stack framework with App Router for dashboard, API Routes for webhooks, Edge Runtime for Tokyo SSR
- **Supabase (Tokyo, ap-northeast-1)**: Integrated platform providing PostgreSQL + Auth (email/Google) + Real-time subscriptions + Storage for temporary assets — eliminates need for separate services
- **Drizzle ORM**: Lightweight SQL-first ORM without Prisma's serverless cold-start penalty; Edge Runtime compatible
- **n8n (self-hosted US VPS)**: Visual workflow orchestrator for AI provider routing, parallel execution, fallback logic, and compositing pipeline — closer to AI APIs than Tokyo would be
- **Sharp + node-canvas + opentype.js + budoux**: Japanese text compositing stack — Sharp for image manipulation, node-canvas for CJK text rendering, opentype.js for font metrics, budoux for word segmentation
- **Cloudflare R2**: Zero egress fees for asset delivery (critical for media-heavy SaaS); S3-compatible API; Tokyo PoP
- **Stripe**: Hybrid billing model — subscriptions with metered credit usage; JPY support; Japanese payment methods (konbini, bank transfer)
- **6 AI Providers**: Claude (copy), Flux 1.1 Pro Ultra (images), Kling 3.0/Runway Gen-4 (video), ElevenLabs (voice), HeyGen (avatar)

**Key stack decisions:**
- Supabase over Neon: Auth + Storage + Real-time included, reducing service count
- Drizzle over Prisma: No query engine binary, lighter serverless footprint, Edge-compatible
- R2 over S3: Zero egress fees prevent cost explosion as user base grows
- n8n stays on US VPS: Closer to AI provider APIs (all US-based), never in user hot path
- Sharp + node-canvas hybrid: Sharp for speed, node-canvas for Japanese typography precision
- budoux for line breaking: Google's ML-based Japanese word segmenter handles edge cases manual rules miss

**Confidence:** HIGH for core framework choices, MEDIUM for specific version pins (verify with npm before implementation).

### Expected Features

Research identified 20 universal table stakes, 8 Japan-specific table stakes, and 23 differentiators across 4 categories.

**Must have (table stakes):**
- **Universal**: Text copy generation, image generation from prompts, multi-format export (11+ platform sizes), brand kit/voice settings, template library, versioning, team accounts, basic analytics, mobile-friendly UI, copy length variants, A/B variant generation (3-5 options)
- **Japan-specific**: Full Japanese UI (native, not translated), Japanese typography (Noto Sans JP, kinsoku shori), tri-script handling (kanji/hiragana/katakana/romaji), LINE ad formats (Rich Message 1040x1040), Yahoo! JAPAN YDA formats, standard social (X/Twitter, Instagram prioritized), yen-based pricing (no decimals)

**Should have (competitive differentiators):**
- **Japan-specific moat**: Keigo register control (casual/polite/keigo with linguistic validation), seasonal/cultural calendar integration (24 sekki, major holidays), Rakuten listing format generation, platform-specific copy rules enforcement (Keihyouhou compliance), Japanese color palette intelligence, furigana support, vertical text (tategaki)
- **Workflow moat**: Campaign brief templates, approval workflow with ringi-style flow (multi-step sequential approval), selective regeneration (regenerate headline without touching approved image), campaign kit generation (atomic unit = campaign, not individual assets), client presentation export (PDF/PPTX with mockup frames), brief-to-campaign pipeline (end-to-end)
- **Multi-model orchestration**: Unified prompt-to-multi-asset (single brief generates copy + images + video + voice + avatar), cross-model consistency (visual/tonal themes maintained), smart model routing (best model per asset type), progressive generation with previews, cost estimation before generation, model fallback chains
- **AI intelligence**: Competitor ad analysis, Japanese voice model selection, hashtag generation (JP-aware), auto-localization (Kansai vs Kanto)

**Defer (v2+):**
- Built-in image/video editor (use simple adjustments, export to Canva/Premiere)
- Social media scheduling/publishing (focus on generation, integrate with existing schedulers later)
- Ad platform API auto-posting (complex, maintenance burden)
- Performance prediction scoring (requires training data not available at launch)
- Multi-language support beyond JP (dilutes moat)
- Real-time collaboration (Japanese workflows are sequential ringi, not simultaneous)
- Blockchain/NFT features (zero user value)

**Critical insight:** The Japan-specific features (keigo, kinsoku shori, seasonal calendar, platform formats) ARE the moat. No Western competitor can replicate these without deep Japanese market understanding. The multi-model orchestration is the technical differentiator that turns "6 separate AI tools" into "one campaign kit generator."

**Confidence:** HIGH for table stakes identification, MEDIUM for platform specs (LINE/YDA/Rakuten dimensions should be verified against current docs).

### Architecture Approach

The system decomposes into **5 zones with clear boundaries**: Dashboard (Vercel Tokyo), Orchestrator (n8n US VPS), Data (PostgreSQL Tokyo), Storage (S3-compatible Tokyo), and Billing (Stripe). The orchestrator uses a **master workflow + 9 sub-workflows pattern** to prevent complexity explosion: master receives brief and dispatches to copy-generation, image-generation, video-generation, voice-generation, avatar-generation, cinematic-generation, compositing-pipeline, platform-sizing, and kit-packaging sub-workflows. Sub-workflows execute in dependency-aware phases (Phase 1: copy [sequential], Phase 2: images/video/voice [parallel], Phase 3: avatar/cinematic [depends on Phase 2], Phase 4-6: compositing/sizing/packaging [sequential]).

**Major components:**

1. **Next.js Dashboard (Vercel Tokyo Edge)** — User interaction, brief submission, campaign review grid, approval workflow, billing UI. Owns session state and UI state. Delegates all AI generation to n8n. Reads assets via pre-signed S3 URLs.

2. **n8n Orchestrator (US VPS)** — Workflow execution, AI provider routing, parallel branch execution, fallback logic, compositing pipeline, progress callbacks. Owns workflow definitions and execution state. Writes results to PostgreSQL and S3. Runs compositing (Sharp + node-canvas) in Code nodes or separate microservice.

3. **Japanese Text Compositing Pipeline (inside n8n or microservice)** — The technical moat. 4-step process: (1) Text layout calculation with kinsoku shori rules using opentype.js + budoux, (2) SVG generation with embedded fonts, (3) SVG-to-raster via resvg-js or node-canvas, (4) Sharp composite onto AI base image. Handles vertical text (tategaki), furigana (ruby text), tri-script spacing rules.

4. **PostgreSQL (Supabase Tokyo)** — Persistent state: campaigns, assets, copy_variants, credit_transactions (append-only ledger), brand_profiles, users. JSONB for flexible campaign briefs and progress tracking. Real-time subscriptions push progress updates to dashboard.

5. **S3-Compatible Storage (Cloudflare R2 Tokyo)** — Generated assets organized by campaign: /base/ (raw AI output), /composited/ (text-overlaid), /sized/ (platform-specific), /kit/ (ZIP). Pre-signed URLs for direct browser downloads. Zero egress fees.

6. **Stripe Billing** — Hybrid model: subscription tiers (monthly credits + feature gates) + credit top-ups (one-time purchases). Webhooks handle subscription lifecycle. Usage records API reports credit consumption. Stripe Customer Portal for self-service. JPY-native with konbini/bank transfer support.

**Data flow:** Brief submission → Dashboard validates → n8n master workflow triggered → Phase 1 (copy via Claude) → Phase 2 (images via Flux, video via Kling, voice via ElevenLabs, parallel) → Phase 3 (avatar via HeyGen with audio, cinematic via Runway with images) → Phase 4 (compositing with JP text overlay) → Phase 5 (platform sizing to 11+ formats) → Phase 6 (ZIP packaging) → Completion callback → Dashboard shows results with approve/regenerate/download actions.

**Critical architectural decisions:**
- Sub-workflow decomposition from day one (not monolithic workflow)
- Compositing runs server-side (n8n VPS or microservice), not client-side or in AI
- Credit reservation pattern (pending/confirm/release) prevents failed-generation losses
- Database polling + SSE or Supabase Realtime for progress (not WebSocket, Vercel serverless limitation)
- Pre-signed S3 URLs for downloads (no proxying through Vercel, avoids function timeouts)
- Idempotent generation steps with intermediate caching (retries resume from failure point)
- Circuit breakers on all AI API calls (fail gracefully, deliver partial kits)

**Confidence:** HIGH for component boundaries and data flow patterns, MEDIUM for n8n sub-workflow concurrency specifics (verify Execute Sub-Workflow parallel execution in docs).

### Critical Pitfalls

Research identified 5 critical, 5 high-severity, 7 moderate, and 4 low-severity pitfalls. Top 5:

1. **Mojibake and Encoding Corruption (CP-1)** — Japanese text passes through 6+ services. Any hop defaulting to Latin-1/ASCII produces garbled output. **Prevention:** UTF-8 everywhere contract, encoding assertion tests at every boundary, PostgreSQL client_encoding=UTF8, Buffer.from(text, 'utf-8') explicit, archiver with UTF-8 flag, Content-Type charset=utf-8, canary string test `テスト漢字ABCabc123半角ｶﾀｶﾅ` through full pipeline. **Phase 1 blocker.**

2. **Kinsoku Shori Violations (CP-2)** — Japanese line-breaking rules (禁則処理) prohibit certain characters at line start/end. Image libraries don't implement this. Closing brackets at line start look amateur. **Prevention:** Dedicated text layout engine, implement JIS X 4051 rules (line-start prohibition for 、。」etc., line-end prohibition for 「（etc., hanging punctuation for 、。), use budoux for word segmentation, visual regression tests. **Phase 1-2, core moat.**

3. **Keigo Register Drift (CP-3)** — Campaign kit must maintain consistent politeness register across all copy. AI models drift between calls. Mixing casual `見てみて!` with keigo `ご確認いただけますと幸いです` destroys brand voice. **Prevention:** Explicit register profiles with linguistic constraints, few-shot examples, register validation post-processing, temperature=0, single Claude call for all copy or pass prior generations as context, regex checker for verb ending consistency. **Phase 1-2, language moat.**

4. **Platform Format Rejection (CP-4)** — Each platform has strict specs (dimensions, file size, text ratio, safe zones). LINE Rich Message exactly 1040x1040 max 1MB, Yahoo! JAPAN 20% text overlay rule, Rakuten safe zones. Assets visually correct but rejected by validation. **Prevention:** Platform spec registry as configuration (JSON/DB), post-generation validation before delivery, file size binary-search compression, text-to-image ratio calculation, platform preview with safe zones, quarterly spec audit, LINE image map coordinate validation. **Phase 2-3, multi-platform layer.**

5. **AI API Cascading Failures and Cost Explosions (CP-5)** — 6 AI APIs with variable latency, rate limits, retry storms multiply costs exponentially. $50+ for single campaign if not controlled. **Prevention:** Circuit breakers (after 3 failures, gracefully degrade), cost tracking per generation with $5 ceiling, idempotent steps with intermediate caching, parallel-where-possible pipeline, explicit timeouts (copy 30s, image 90s, video 180s), billing alerts, model version pinning, graceful degradation (deliver partial kit if video fails). **Phase 1 architecture.**

**Additional high-severity pitfalls:**
- **n8n workflow complexity explosion (HP-1)**: Decompose into sub-workflows from day one, standardize interface, use queue mode with Redis, version control workflows as JSON in git
- **Japanese font rendering failures (HP-2)**: Bundle Noto Sans JP all weights, configure fontconfig, use node-canvas for text (not Sharp), implement vertical text manually, test with JIS Level 2 kanji
- **Stripe billing edge cases (HP-3)**: Credit reservation pattern, atomic operations with SELECT FOR UPDATE, async usage reporting, JPY integer-only math, JP credit card 3DS2 testing
- **Advertising law violations (HP-4)**: Compliance flag system for prohibited terms (日本一/効く/治る), industry-aware prompts, disclaimers injection, Keihyouhou (景品表示法) and Yakki Ho (薬機法) keyword database
- **Small format text illegibility (HP-5)**: Generate copy variants per size class, minimum font size enforcement (24px display, 16px social, 14px absolute), text budget per format, preview at actual pixel size

**Confidence:** HIGH for pitfall identification and prevention strategies (based on JIS standards, advertising law, encoding fundamentals, AI API patterns). MEDIUM for platform specs (verify current LINE/YDA/Rakuten documentation).

## Implications for Roadmap

Based on combined research, the optimal build order follows dependency chains from architecture, avoids pitfalls from risk analysis, and delivers table stakes incrementally while building toward the full multi-model orchestration differentiator.

### Phase 1: Foundation & Core Pipeline

**Rationale:** Everything depends on auth, data layer, and basic AI generation pipeline. Must establish encoding contract, cost controls, and n8n architecture from day one. Start with simplest AI calls (copy + images) to prove pipeline before adding complexity.

**Delivers:**
- User auth (Supabase Auth), team accounts, brand profile CRUD
- PostgreSQL schema (campaigns, assets, copy_variants, brand_profiles, credit_transactions)
- Next.js dashboard shell with brief form
- n8n master workflow + copy-generation sub-workflow (Claude) + image-generation sub-workflow (Flux)
- Basic webhook integration (Dashboard → n8n → callback)
- UTF-8 encoding contract + canary string test
- Circuit breakers on AI API calls
- Cost tracking per generation

**Addresses features:**
- TS-U01 (text copy generation), TS-U02 (image generation), TS-U08 (auth/teams), TS-U04 (brand kit storage), TS-J01 (Japanese UI)

**Avoids pitfalls:**
- CP-1 (mojibake via encoding contract)
- CP-5 (API cost explosion via circuit breakers + cost ceiling)
- HP-1 (n8n complexity via sub-workflow decomposition)

**Research needs:** Standard patterns, no additional research.

---

### Phase 2: Japanese Text Compositing Pipeline

**Rationale:** This is the core technical moat — AI cannot render Japanese text reliably. Must be solved before multi-platform formatting. Depends on Phase 1 image generation producing base images.

**Delivers:**
- Compositing sub-workflow (Sharp + node-canvas setup on n8n VPS)
- Kinsoku shori text layout engine (opentype.js + budoux)
- Font bundling (Noto Sans JP all weights, M PLUS Rounded)
- Japanese text overlay with correct line breaks
- Tri-script spacing rules (kanji/hiragana/katakana/romaji)
- Keigo register validation post-processing
- Visual regression test suite for typography

**Addresses features:**
- TS-J02 (Japanese typography), TS-J03 (kinsoku shori), TS-J04 (tri-script handling), D-J01 (keigo control), D-J06 (furigana), D-M02 (cross-model consistency)

**Avoids pitfalls:**
- CP-2 (kinsoku shori violations via dedicated layout engine)
- CP-3 (keigo drift via register validation)
- HP-2 (font rendering failures via bundled fonts + node-canvas)

**Research needs:** **Phase-specific research required** — Verify budoux API, test node-canvas CJK font loading on target Linux environment, validate kinsoku shori character tables against W3C JLREQ.

---

### Phase 3: Multi-Platform Formatting & Delivery

**Rationale:** Depends on compositing pipeline (Phase 2) to produce text-overlaid base images. Adds platform-specific sizing, validation, and packaging. This completes the image+copy pipeline end-to-end.

**Delivers:**
- Platform-sizing sub-workflow (Sharp resize to 11+ format specs)
- Kit-packaging sub-workflow (archiver with UTF-8, ZIP generation)
- Platform spec registry (JSON config for LINE/YDA/Rakuten/Instagram/TikTok/GDN/etc.)
- Post-generation validation against platform specs
- File size optimization (binary-search compression)
- S3 upload pipeline (Cloudflare R2)
- Campaign review UI (grid previews by platform, approve/reject/regenerate)
- ZIP download with pre-signed URLs

**Addresses features:**
- TS-U03 (multiple format sizes), TS-J05 (LINE formats), TS-J06 (YDA formats), TS-U06 (export PNG/JPG/PDF), TS-U05 (template library), D-J03 (Rakuten formats), D-J08 (marketplace rules), D-W04 (campaign kit atomic unit)

**Avoids pitfalls:**
- CP-4 (platform rejection via spec validation)
- HP-5 (small format text illegibility via size-class copy variants)
- MP-4 (storage costs via compression + retention policy)

**Research needs:** **Phase-specific research required** — Verify current LINE Rich Message specs, Yahoo! JAPAN YDA dimensions/text rules, Rakuten product listing requirements against live documentation. Specs may have changed since training data cutoff.

---

### Phase 4: Video & Audio Pipeline

**Rationale:** Video/voice/avatar are independent optional features layered on top of the working image+copy pipeline. Each can be added incrementally. These are premium features that differentiate from image-only platforms.

**Delivers:**
- Video-generation sub-workflow (Kling, polling for async completion)
- Voice-generation sub-workflow (ElevenLabs with Japanese voices)
- Avatar-generation sub-workflow (HeyGen, depends on voice output)
- Cinematic-generation sub-workflow (Runway Gen-4)
- FFmpeg pipeline for aspect ratio conversion, audio mixing, format encoding
- Fallback routing (Kling ↔ Runway, ElevenLabs → OpenAI TTS)
- Progressive generation UI (show copy/images first, video later)

**Addresses features:**
- D-M01 (unified multi-asset generation), D-M03 (smart model routing), D-M04 (progressive previews), D-M06 (fallback chains), D-M07 (Japanese voice selection)

**Avoids pitfalls:**
- MP-2 (webhook reliability via polling fallback)
- MP-6 (JP lip-sync quality via testing HeyGen with Japanese audio samples before committing)
- MP-7 (rate limiting via global rate limiter, priority queuing)

**Research needs:** **Phase-specific research required** — Test HeyGen Japanese lip-sync quality, verify Kling/Runway API differences, confirm ElevenLabs Japanese voice catalog, check FFmpeg subtitle overlay for Japanese text.

---

### Phase 5: Approval Workflow & Iteration

**Rationale:** With generation pipeline complete, add the workflow features that make it agency-friendly: selective regeneration, ringi-style approval, revision annotations. These require the full pipeline to exist first.

**Delivers:**
- Selective regeneration (regenerate headline only, image only, etc.)
- Ringi-style approval workflow (creator → reviewer → approver sequence)
- Revision annotations (text-based feedback per asset)
- Campaign history and re-run
- Brief templates (5-10 common JP campaign types)
- Seasonal calendar integration (static data: 24 sekki, major holidays, auto-suggestions)

**Addresses features:**
- TS-U07 (versioning), D-W02 (approval workflow), D-W03 (selective regeneration), D-W01 (brief templates), D-J02 (seasonal calendar)

**Avoids pitfalls:**
- MP-3 (brief ambiguity via templates + quality score)
- MP-5 (cultural context failures via seasonal injection)

**Research needs:** Standard workflow patterns, no additional research.

---

### Phase 6: Billing & Production Hardening

**Rationale:** Billing gates revenue but should not block development. Add once pipeline is proven. Hardening (error handling, monitoring, rate limiting) prepares for real users.

**Delivers:**
- Stripe integration (subscriptions + metered billing)
- Credit ledger with reservation pattern (pending/confirm/release)
- Subscription tiers (Starter/Professional/Agency)
- Credit top-up purchases
- JPY-safe billing (integer math, Stripe Customer Portal, konbini/bank transfer)
- Stripe webhook handling (subscription lifecycle, invoice.paid)
- Usage metering to Stripe (async, retriable)
- Error handling with partial results (deliver kit even if video fails)
- n8n queue mode with Redis (for 3+ concurrent campaigns)
- Monitoring (Sentry for errors, cost-per-generation dashboard, circuit breaker state)
- Advertising law compliance flagging (Keihyouhou keyword database)

**Addresses features:**
- TS-U09 (analytics), D-M05 (cost estimation), D-J04 (platform copy rules enforcement)

**Avoids pitfalls:**
- HP-3 (billing edge cases via reservation pattern + atomic operations)
- HP-4 (advertising law violations via compliance flag system)
- MP-1 (tri-script rendering via inter-character spacing rules)

**Research needs:** **Phase-specific research required** — Verify Stripe JP entity requirements for JCB cards, test 3DS2 flows, confirm current Keihyouhou prohibited term list.

---

### Phase 7: Polish & Advanced Features

**Rationale:** Post-MVP enhancements based on user feedback. These are differentiators but not launch-blockers.

**Delivers:**
- Vertical text (tategaki) layouts
- Client presentation export (PDF/PPTX with mockup frames)
- Competitor ad analysis (Claude vision)
- Performance prediction scoring (heuristic initially)
- Revision visual annotation
- Regional dialect support (Kansai casual option)
- API access for Agency tier

**Addresses features:**
- D-J07 (vertical text), D-W05 (presentation export), D-W06 (visual annotation), D-A01 (competitor analysis), D-A02 (performance prediction), D-A03 (regional localization)

**Avoids pitfalls:**
- LP-1 through LP-4 (minor polish issues: half-width normalization, date formatting, brand term glossary, email conventions)

**Research needs:** Low priority, research as needed during implementation.

---

### Phase Ordering Rationale

**Dependency-driven:**
- Compositing (Phase 2) depends on image generation (Phase 1)
- Platform sizing (Phase 3) depends on compositing (Phase 2)
- Avatar (Phase 4) depends on voice (also Phase 4) — order within phase matters
- Approval workflow (Phase 5) depends on full generation pipeline (Phases 1-4)
- Billing (Phase 6) can happen anytime but gates revenue

**Risk-driven:**
- Encoding contract (Phase 1) must be established first — CP-1 is a critical blocker
- Kinsoku shori (Phase 2) is the core moat — must be proven before adding platforms
- Platform validation (Phase 3) prevents rejection issues before adding video complexity
- Billing edge cases (Phase 6) are safer to address once generation is stable

**Feature-driven:**
- Phase 1-3 deliver complete image+copy campaign kit (MVP for soft launch)
- Phase 4 adds video/voice/avatar (premium tier differentiator)
- Phase 5 adds agency workflow features (ringi approval, selective regen)
- Phase 6 enables monetization (subscription + credit billing)
- Phase 7 polishes for competitive positioning

**Pitfall-driven:**
- CP-1, CP-5, HP-1 addressed in Phase 1 (foundation critical)
- CP-2, CP-3, HP-2 addressed in Phase 2 (language moat critical)
- CP-4, HP-5 addressed in Phase 3 (platform compliance critical)
- HP-3 addressed in Phase 6 (billing edge cases)
- All others addressed incrementally as features are built

### Research Flags

**Phases needing deeper research during planning:**

- **Phase 2 (Compositing):** Verify budoux API usage patterns, test node-canvas CJK font loading in target Docker environment, validate kinsoku shori character tables against W3C JLREQ specification, confirm resvg-js font embedding behavior

- **Phase 3 (Multi-Platform):** Verify current LINE Rich Message specifications (dimensions, file size, image map format) against LINE for Business docs, verify Yahoo! JAPAN YDA ad format specs and text overlay rules, verify Rakuten RMS listing image requirements and prohibited text zones

- **Phase 4 (Video/Audio):** Test HeyGen Japanese lip-sync quality with sample Japanese audio, verify Kling vs Runway API contract differences and async callback patterns, confirm ElevenLabs Japanese voice catalog and quality, check FFmpeg Japanese subtitle overlay support

- **Phase 6 (Billing):** Verify Stripe JP entity requirements for optimal JCB card acceptance rates, test 3DS2 authentication flows for Japanese cards, confirm current Keihyouhou (景品表示法) and Yakki Ho (薬機法) prohibited term lists from Consumer Affairs Agency

**Phases with standard patterns (skip research-phase):**

- **Phase 1 (Foundation):** Next.js + Supabase + n8n are well-documented; authentication, database schema, and basic workflow patterns are standard
- **Phase 5 (Approval Workflow):** CRUD operations and multi-step workflow approval are standard web patterns
- **Phase 7 (Polish):** Feature-specific implementation details can be researched as needed during execution

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| **Stack** | HIGH | Core framework choices (Next.js, Supabase, n8n, Sharp) are well-established with clear documentation. Specific version pins are MEDIUM (verify with npm). n8n queue mode configuration needs verification. |
| **Features** | MEDIUM-HIGH | Table stakes and differentiators well-identified. Platform-specific format specs (LINE, YDA, Rakuten) carry MEDIUM confidence — must verify against current docs (may have changed since training cutoff). Feature dependency mapping is HIGH confidence. |
| **Architecture** | HIGH | Component boundaries, data flow, and sub-workflow decomposition are sound patterns. Compositing pipeline approach (Sharp + node-canvas hybrid) is well-reasoned. n8n sub-workflow concurrency specifics need verification. Supabase Realtime vs polling decision needs testing. |
| **Pitfalls** | HIGH | Encoding issues (CP-1), kinsoku shori (CP-2), keigo drift (CP-3), and AI API patterns (CP-5) are well-documented risks. Platform specs (CP-4) need verification. Advertising law requirements (HP-4) are stable but prohibited term lists should be refreshed. |

**Overall confidence:** MEDIUM-HIGH

The core technical approach is sound and well-researched. The primary uncertainty is in external dependencies: platform ad specifications may have changed since training data cutoff (May 2025), AI provider API capabilities and pricing should be verified, and Japanese advertising law prohibited term lists should be refreshed. The architectural patterns, language processing requirements (kinsoku shori, keigo), and risk mitigation strategies are stable knowledge with HIGH confidence.

### Gaps to Address

**Platform specifications (verify during Phase 3 planning):**
- LINE Rich Message current specs: dimensions, file size limits, image map format, multi-area layouts
- Yahoo! JAPAN YDA current specs: responsive ad dimensions, text overlay percentage rules, character limits
- Rakuten RMS current specs: product image dimensions, safe zones, prohibited text overlays, category-specific requirements
- Instagram/TikTok/X current specs: verify aspect ratios, file sizes, video length limits

**AI provider capabilities (verify during Phase 1-4 planning):**
- Flux 1.1 Pro Ultra current pricing and rate limits (via BFL or Replicate)
- Kling 3.0 API availability, async callback pattern, pricing
- Runway Gen-4 API availability vs Gen-3, pricing comparison
- ElevenLabs Japanese voice catalog and per-character pricing
- HeyGen Japanese lip-sync quality (test with sample audio before committing)
- Claude API current pricing for Japanese text generation (token counts higher for JP)

**Regulatory compliance (verify during Phase 6 planning):**
- Current Keihyouhou (景品表示法) prohibited terms and required disclaimers from Consumer Affairs Agency
- Current Yakki Ho (薬機法) boundary terms for beauty/health/food products
- Stripe JP entity requirements for JCB card acceptance and konbini payment support

**Technical verification (test during Phase 2 implementation):**
- budoux library current API and Japanese parser performance
- node-canvas CJK font loading in Docker Linux environment (Cairo/Pango dependencies)
- Sharp text rendering capabilities vs node-canvas for Japanese (confirm node-canvas needed)
- n8n Execute Sub-Workflow concurrency behavior in default mode vs queue mode

**Mitigation strategy:** Treat these as "research checkpoints" during phase planning. Use `/gsd:research-phase` for Phases 2, 3, 4, and 6 to verify external dependencies before implementation. Phases 1, 5, and 7 use standard patterns and can proceed without additional research.

## Sources

### Primary (HIGH confidence)

**Technology documentation (training data, May 2025 cutoff):**
- Next.js App Router patterns, Vercel Edge Runtime, API Routes
- Supabase Auth, PostgreSQL, Real-time subscriptions, Storage
- Drizzle ORM vs Prisma comparison, Edge Runtime compatibility
- Sharp image processing API (libvips-based)
- node-canvas font rendering (Cairo/Pango)
- n8n workflow patterns, sub-workflow execution, queue mode
- Stripe billing API, metered usage, JPY currency handling

**Japanese language standards (stable, not time-sensitive):**
- JIS X 4051: Japanese line composition rules (kinsoku shori)
- W3C JLREQ: Requirements for Japanese Text Layout
- Keigo linguistic system (casual/teineigo/sonkeigo/kenjogo)
- Japanese advertising law: Keihyouhou (景品表示法), Yakki Ho (薬機法)

**Domain research (training data):**
- Competitor feature analysis (Canva, Jasper, AdCreative.ai, Pencil, Copy.ai)
- AI model capabilities (Claude, Flux, DALL-E, Kling, Runway, ElevenLabs, HeyGen)
- Japanese market advertising patterns and commercial calendar

### Secondary (MEDIUM confidence)

**Platform specifications (may have changed since training cutoff):**
- LINE Rich Message format specs (1040x1040, 1MB limit)
- Yahoo! JAPAN YDA ad format dimensions and text overlay rules
- Rakuten Ichiba product listing requirements (700x700 min, white background)
- Instagram/TikTok/X ad format dimensions

**AI provider details (verify current status):**
- Flux 1.1 Pro Ultra availability and pricing (via BFL or Replicate)
- Kling 3.0 API availability (may still be in limited access)
- Runway Gen-4 vs Gen-3 availability and pricing
- ElevenLabs Japanese voice quality and catalog
- HeyGen Japanese lip-sync quality

### Tertiary (LOW confidence, needs validation)

**Emerging technologies (test before committing):**
- budoux Japanese word segmentation library current API
- Tailwind CSS v4 stable release status (was in development at cutoff)
- Satori JSX-to-SVG for Japanese text rendering
- Specific npm package versions (stated versions are approximate)

**Implementation details (research during phase planning):**
- n8n queue mode exact configuration variable names
- Supabase Realtime channel subscription limits from Vercel Edge
- Stripe JP-specific features for konbini/bank transfer
- FFmpeg Japanese subtitle overlay capabilities

---

**Research completed:** 2026-02-06
**Ready for roadmap:** Yes

**Next steps:**
1. Orchestrator loads this SUMMARY.md as context for roadmap creation
2. Suggested 7-phase structure serves as starting point
3. Research flags inform which phases need `/gsd:research-phase` before execution
4. Platform specs, AI provider details, and regulatory compliance verified during phase-specific research checkpoints
