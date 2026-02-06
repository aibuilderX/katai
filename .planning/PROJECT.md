# AI Content Studio

## What This Is

A SaaS platform that takes a campaign brief and generates a complete, platform-ready advertising campaign kit for the Japanese market in under 5 minutes. The system orchestrates 6 AI models (Claude, Flux, Kling, ElevenLabs, HeyGen, Runway) via n8n to produce images, video, copy, and email sequences natively in Japanese — targeting platforms Western tools don't support (LINE, Yahoo! JAPAN, Rakuten).

## Core Value

A non-technical user submits a brief and receives a complete, download-ready campaign kit with correct Japanese copy (keigo-aware, culturally appropriate) and platform-compliant assets — no design team required.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Campaign brief submission (structured form with brand assets, platform selection, register control)
- [ ] AI copy generation with keigo register control (casual/standard/keigo) and tri-script mixing
- [ ] AI image generation with hybrid JP text compositing (AI base + server-side JP typography overlay)
- [ ] AI video generation (15s/30s in multiple aspect ratios with JP voiceover)
- [ ] AI voice/TTS generation (natural Japanese intonation, multiple personas)
- [ ] AI avatar/UGC generation (JP-presenting avatars with lip-sync audio)
- [ ] AI cinematic video generation (premium 16:9 pre-roll, luxury tier)
- [ ] Platform-specific asset formatting (LINE, Yahoo! JAPAN, Rakuten, Instagram, TikTok, Twitter/X, GDN, YouTube, DOOH, Email, In-Store POP)
- [ ] Campaign kit delivery (ZIP download organized by platform, individual asset download)
- [ ] Full Japanese web dashboard (Next.js, culturally adapted UI — not translated)
- [ ] Brand profile management (logo, fonts, colors, tone, product info per user)
- [ ] Campaign review with grid view, platform-dimension preview, inline regeneration
- [ ] Approval workflow (mark assets approved/needs revision)
- [ ] Brief templates for common JP campaign types
- [ ] Brief history and re-run with modifications
- [ ] RESTful API for headless campaign generation
- [ ] User authentication and account management
- [ ] Hybrid billing (subscription tiers + credit-based generation) via Stripe
- [ ] Japanese language QA pipeline (automated checks + human review step)
- [ ] Cultural compliance checks (seasonal awareness, advertising law flags)
- [ ] Fallback routing (auto-switch to backup AI provider if primary fails)

### Out of Scope

- White-label / multi-tenant resale — deferred to premium tier after core SaaS proves value
- Direct ad platform publishing (LINE Ads Manager API, Yahoo! JAPAN Ads API push) — v2
- A/B testing and performance analytics dashboard — v2
- Real-time campaign optimization / bidding integration — v2
- Languages other than Japanese — future
- Mobile native app — web-first
- CRM integration (Salesforce, HubSpot) — future
- Custom domain per tenant — white-label tier feature

## Context

- **Market gap:** Western ad tools (Canva, Jasper) don't support Japanese ad platforms (LINE Rich Message, Yahoo! JAPAN Display Ads, Rakuten product listings) and produce poor Japanese typography
- **Language moat:** Keigo register control, kinsoku shori line-break rules, tri-script mixing (hiragana/katakana/kanji) — this is the deepest competitive advantage
- **AI landscape (2026):** 6 specialized AI providers each best-in-class for their domain — orchestration via n8n allows model swapping without pipeline restructure
- **Target users:** JP agencies (5-50 staff), e-commerce merchants (Shopify JP, BASE, STORES.jp), in-house brand marketers
- **Native JP speaker available** on team for copy QA and cultural review
- **Existing infrastructure:** Self-hosted n8n on US VPS, additional VPS in Kuala Lumpur available
- **Reference scenarios (not product modes):** Beauty/sakura launch, Rakuten flash sale, F&B summer limited, luxury cinematic — the system is flexible across any industry/campaign type

## Constraints

- **Orchestration:** n8n (self-hosted on existing US VPS) — all AI pipeline workflows built in n8n
- **Frontend:** Next.js on Vercel with Tokyo edge CDN — Japanese-first UI
- **Database:** PostgreSQL in Tokyo region (Supabase or Neon) — JP data residency
- **Storage:** S3-compatible in Tokyo region — fast asset delivery for JP users
- **Image compositing:** Hybrid approach — AI generates base image, server-side compositing adds JP text with Noto Sans JP fonts and kinsoku shori rules
- **External API dependency:** All generation relies on 6 third-party AI APIs — must support model swapping without pipeline restructure
- **Font licensing:** Noto Sans JP, M PLUS Rounded (open source) — server-side bundled
- **Advertising law:** Must flag (not enforce) Pharmaceutical Affairs Act and misleading representation concerns
- **Billing:** Stripe with hybrid model (subscription tiers + metered credit usage)
- **Performance target:** Full campaign kit in <5 minutes, images-only in <90 seconds
- **Launch capacity:** 3 concurrent campaign generations without degradation

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| SaaS-first, white-label later | Core value is the generation engine; white-label adds massive complexity without proving product-market fit | — Pending |
| n8n for orchestration | Visual workflow composition, easy model swapping, parallel execution built-in, user experienced with n8n | — Pending |
| All 6 AI providers from v1 | Full campaign kit is the value prop; partial output doesn't differentiate from existing tools | — Pending |
| Hybrid image compositing | AI models still struggle with JP text rendering; overlay layer guarantees correct typography | — Pending |
| Vercel + Tokyo DB/storage | Fast JP page loads via edge CDN; data residency compliance; zero ops for frontend | — Pending |
| Hybrid billing (tiers + credits) | Aligns revenue with per-generation API costs; standard in AI SaaS (Midjourney, Runway pattern) | — Pending |
| Ship core fast, iterate quality | Get generation engine + basic dashboard working, launch to small group, refine with real feedback | — Pending |
| Flexible brief-driven pipeline | Scenarios are reference cases, not product modes; brief parameters control entire generation flow | — Pending |

---
*Last updated: 2026-02-06 after initialization*
