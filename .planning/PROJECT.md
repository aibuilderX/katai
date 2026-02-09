# AI Content Studio

## What This Is

A SaaS platform that takes a campaign brief and generates a complete, platform-ready advertising campaign kit for the Japanese market in under 5 minutes. The system orchestrates 6 AI models (Claude, Flux, Kling, ElevenLabs, HeyGen, Runway) via n8n to produce images, video, copy, and email sequences natively in Japanese — targeting platforms Western tools don't support (LINE, Yahoo! JAPAN, Rakuten). Includes agency workflow features (ringi approval, selective regeneration, templates), Stripe billing with credit metering, and advertising law compliance checking.

## Core Value

A non-technical user submits a brief and receives a complete, download-ready campaign kit with correct Japanese copy (keigo-aware, culturally appropriate) and platform-compliant assets — no design team required.

## Requirements

### Validated

- ✓ Campaign brief submission (structured form with brand, platforms, register control) — v1.0
- ✓ AI copy generation with keigo register control and tri-script mixing — v1.0
- ✓ AI image generation with hybrid JP text compositing (AI base + server-side typography) — v1.0
- ✓ AI video generation (15s/30s in 16:9, 9:16, 1:1 via Kling) — v1.0
- ✓ AI voice/TTS generation (natural Japanese intonation via ElevenLabs) — v1.0
- ✓ AI avatar/UGC generation (JP-presenting avatars via HeyGen with lip-sync) — v1.0
- ✓ AI cinematic video generation (premium 16:9 via Runway Gen-4) — v1.0
- ✓ Platform-specific asset formatting (LINE, Yahoo! JAPAN, Rakuten, Instagram, TikTok, X, Email) — v1.0
- ✓ Campaign kit delivery (ZIP download organized by platform) — v1.0
- ✓ Full Japanese web dashboard (Next.js, culturally adapted UI) — v1.0
- ✓ Brand profile management (logo, fonts, colors, tone, keigo defaults, product info) — v1.0
- ✓ Campaign review with grid view, platform-dimension preview, inline regeneration — v1.0
- ✓ Ringi-style approval workflow (creator → reviewer → approver) — v1.0
- ✓ Brief templates for common JP campaign types (4 templates) — v1.0
- ✓ Brief history and re-run with modifications — v1.0
- ✓ User authentication (email/password + Google SSO) — v1.0
- ✓ Hybrid billing (4 JPY subscription tiers + credit-based metering) via Stripe — v1.0
- ✓ Japanese language QA pipeline (automated keigo/brand compliance checks) — v1.0
- ✓ Advertising law compliance (Keihyouhou/Yakki Ho flagging) — v1.0
- ✓ Fallback routing (circuit-breaker auto-switch to backup AI provider) — v1.0

### Active

- [ ] RESTful API for headless campaign generation
- [ ] Additional platform formats (GDN, YouTube, DOOH, In-Store POP)
- [ ] Client presentation export (PDF/PPTX with mockup frames)
- [ ] Vertical text (tategaki) layouts as first-class layout option
- [ ] Performance prediction scoring
- [ ] Regional dialect support (Kansai casual option)

### Out of Scope

- White-label / multi-tenant resale — deferred until core SaaS proves PMF
- Direct ad platform publishing (LINE Ads Manager, Yahoo! JAPAN Ads push) — v2
- A/B testing and performance analytics — requires ad platform integration
- Real-time campaign optimization / bidding — requires performance data pipeline
- Languages other than Japanese — JP-specific features are the moat
- Mobile native app — web-first, PWA works on mobile browser
- CRM integration (Salesforce, HubSpot) — future
- Built-in image/video editor — Canva's domain, focus on generation
- Social media scheduling — Buffer/Hootsuite domain, export platform-ready instead

## Context

- **Market gap:** Western ad tools (Canva, Jasper) don't support Japanese ad platforms (LINE Rich Message, Yahoo! JAPAN Display Ads, Rakuten product listings) and produce poor Japanese typography
- **Language moat:** Keigo register control, kinsoku shori line-break rules, tri-script mixing (hiragana/katakana/kanji) — this is the deepest competitive advantage
- **AI landscape (2026):** 6 specialized AI providers each best-in-class for their domain — orchestration via n8n allows model swapping without pipeline restructure
- **Target users:** JP agencies (5-50 staff), e-commerce merchants (Shopify JP, BASE, STORES.jp), in-house brand marketers
- **Native JP speaker available** on team for copy QA and cultural review
- **Existing infrastructure:** Self-hosted n8n on US VPS, additional VPS in Kuala Lumpur available
- **v1.0 shipped:** 21,573 LOC TypeScript across 253 files. Next.js 16 + Tailwind v4 + Drizzle ORM + Supabase. Deployed at katai-w65t.vercel.app (Vercel Tokyo edge). 7 phases, 26 plans, 4 days (2026-02-06 → 2026-02-10).
- **Tech debt (MVP-acceptable):** Credit rollback not implemented on generation failure. Provider health tracker is in-memory only. External API keys (Stripe, Runway, ElevenLabs, fal.ai, HeyGen) need production configuration.

## Constraints

- **Orchestration:** n8n (self-hosted on existing US VPS) — all AI pipeline workflows built in n8n
- **Frontend:** Next.js 16 on Vercel (hnd1 Tokyo region) — Japanese-first UI
- **Database:** PostgreSQL via Supabase — 14 tables, Drizzle ORM
- **Storage:** Supabase Storage — 4 buckets (composited-images, platform-images, campaign-videos, campaign-audio)
- **Image compositing:** Hybrid approach — AI generates base image, server-side compositing adds JP text with Noto Sans JP fonts, BudouX line-breaking, kinsoku shori rules
- **External API dependency:** 6 third-party AI APIs — circuit-breaker fallback routing supports model swapping
- **Font licensing:** Noto Sans JP, M PLUS Rounded (open source) — server-side bundled
- **Advertising law:** Flags (not enforces) Keihyouhou and Yakki Ho concerns with specific article references
- **Billing:** Stripe with 4 JPY tiers (Free/Starter/Pro/Business) + atomic credit ledger
- **Performance target:** Full campaign kit in <5 minutes, images-only in <90 seconds
- **Launch capacity:** 3 concurrent campaign generations without degradation

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| SaaS-first, white-label later | Core value is the generation engine; white-label adds massive complexity without proving PMF | ✓ Good — shipped full SaaS in 4 days |
| n8n for orchestration | Visual workflow composition, easy model swapping, parallel execution built-in | ✓ Good — direct generation fallback also works without n8n |
| All 6 AI providers from v1 | Full campaign kit is the value prop; partial output doesn't differentiate | ✓ Good — complete pipeline built |
| Hybrid image compositing | AI models still struggle with JP text rendering; overlay layer guarantees correct typography | ✓ Good — BudouX + kinsoku shori + WCAG contrast proven |
| Vercel + Supabase (Tokyo) | Fast JP page loads via edge CDN; data residency; zero ops for frontend | ✓ Good — deployed to hnd1, Supabase infra applied |
| Hybrid billing (tiers + credits) | Aligns revenue with per-generation API costs; standard in AI SaaS | ✓ Good — atomic credit ledger prevents negative balances |
| Ship core fast, iterate quality | Get generation engine + dashboard working, launch to small group | ✓ Good — v1.0 code-complete in 4 days |
| Flexible brief-driven pipeline | Scenarios are reference cases, not product modes; brief parameters control flow | ✓ Good — single pipeline handles all campaign types |
| Lazy Proxy init for external clients | Stripe and Supabase admin clients crash at build time without env vars | ✓ Good — Vercel builds succeed without secrets |
| Non-fatal downstream stages | Compositing/resize/video failures don't block campaign delivery | ✓ Good — campaigns complete with partial results |

---
*Last updated: 2026-02-10 after v1.0 milestone*
