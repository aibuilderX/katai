# Roadmap: AI Content Studio

## Overview

AI Content Studio delivers a complete Japanese-market campaign kit generator in 6 phases. The build order follows dependency chains: foundation and basic AI generation first (Phase 1), then the Japanese text compositing moat (Phase 2), multi-platform formatting and end-to-end delivery (Phase 3), video/audio/avatar pipeline (Phase 4), agency workflow and AI intelligence features (Phase 5), and finally billing and compliance (Phase 6). Phases 1-3 produce a shippable image+copy campaign kit. Phase 4 adds premium video capabilities. Phases 5-6 make it agency-ready and monetizable.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation & Core Pipeline** - Auth, dashboard, brand profiles, brief submission, Claude copy generation, Flux image generation, AI intelligence foundation
- [x] **Phase 2: Japanese Text Compositing** - Server-side JP text overlay with kinsoku shori, keigo register control, brand kit compositing
- [ ] **Phase 3: Multi-Platform Formatting & Delivery** - 7 platform formats, platform-specific copy/sizing, campaign kit packaging, review grid, end-to-end orchestration
- [ ] **Phase 4: Video & Audio Pipeline** - Kling video, Runway cinematic, ElevenLabs voiceover, HeyGen avatar, fallback routing, progressive generation UI
- [ ] **Phase 5: Workflow & Intelligence** - Selective regeneration, ringi approval, campaign history, brief templates, QA agent, Viral/Trend agent
- [ ] **Phase 6: Billing & Compliance** - Stripe subscriptions, credit metering, usage dashboard, cost estimation, advertising law compliance

## Phase Details

### Phase 1: Foundation & Core Pipeline
**Goal**: A user can log in, set up their brand, submit a campaign brief, and receive AI-generated Japanese ad copy and base images
**Depends on**: Nothing (first phase)
**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-06, COPY-01, COPY-04, COPY-06, IMG-01, INTEL-01, INTEL-02, WORK-01
**Success Criteria** (what must be TRUE):
  1. User can create an account, log in, and see a fully Japanese-native dashboard
  2. User can create a brand profile with logo, colors, fonts, tone, and keigo defaults
  3. User can submit a structured campaign brief specifying brand, objective, audience, platforms, and register
  4. System generates Japanese ad copy (headlines, CTAs, body) with correct tri-script mixing and 3-5 A/B variants via Claude
  5. System generates base images via Flux matching the creative direction from the brief
**Plans**: 5 plans

Plans:
- [x] 01-01-PLAN.md — Project scaffolding, Tailwind v4 design system, Drizzle schema, Supabase clients, i18n, constants
- [x] 01-02-PLAN.md — Supabase Auth (email/password + Google SSO), proxy.ts, dashboard shell with sidebar, hero CTA, settings
- [x] 01-03-PLAN.md — Brand profile wizard (7 steps), brand CRUD API, brand list/edit pages
- [x] 01-04-PLAN.md — Campaign brief form, Claude copy generation, Flux image generation, n8n webhook integration
- [x] 01-05-PLAN.md — Campaign results UI (copy/image tabs, platform-adaptive variants, real-time progress)

### Phase 2: Japanese Text Compositing
**Goal**: Generated images have correctly rendered Japanese text overlaid server-side with proper typography, line-breaking, and brand styling
**Depends on**: Phase 1
**Requirements**: COPY-02, IMG-02, IMG-03, IMG-05
**Success Criteria** (what must be TRUE):
  1. System composites Japanese text onto AI-generated base images with correct Noto Sans JP typography
  2. Text overlay follows kinsoku shori line-break rules (no prohibited characters at line start/end)
  3. User's keigo register selection is maintained consistently across all generated copy
  4. Brand kit colors, logo, and font preferences are applied to composited images
**Plans**: 4 plans

Plans:
- [x] 02-01-PLAN.md — Types, kinsoku character sets, BudouX line-breaking engine (TDD)
- [x] 02-02-PLAN.md — Contrast analyzer, text renderer (horizontal/vertical), logo placer
- [x] 02-03-PLAN.md — Claude Vision layout engine for AI-driven text placement
- [x] 02-04-PLAN.md — Compositing pipeline orchestrator, storage, pipeline integration, UI updates

### Phase 3: Multi-Platform Formatting & Delivery
**Goal**: A single brief produces a complete, downloadable campaign kit with correctly sized and validated assets for all 7 target platforms
**Depends on**: Phase 2
**Requirements**: COPY-03, COPY-05, IMG-04, PLAT-01, PLAT-02, PLAT-03, PLAT-04, PLAT-05, PLAT-06, PLAT-07, WORK-02, WORK-04, WORK-08
**Success Criteria** (what must be TRUE):
  1. System generates platform-specific copy variants (correct character limits and format constraints per platform)
  2. System auto-resizes images to all 7 platform dimensions (LINE 1040x1040, YDA banners, Rakuten 700x700, Instagram feed/story, TikTok 9:16, X card, email 600px)
  3. User can review all generated assets in a grid view with platform-dimension previews
  4. User can download the complete campaign kit as a ZIP organized by platform
  5. Full pipeline executes end-to-end from brief submission through n8n orchestration to delivered kit
**Plans**: TBD

Plans:
- [ ] 03-01: TBD
- [ ] 03-02: TBD
- [ ] 03-03: TBD

### Phase 4: Video & Audio Pipeline
**Goal**: Campaign kits include video ads, Japanese voiceover, AI avatar presenters, and cinematic video across multiple aspect ratios
**Depends on**: Phase 3
**Requirements**: VID-01, VID-02, VID-03, VID-04, VID-05, WORK-03
**Success Criteria** (what must be TRUE):
  1. System generates 15s/30s video ads via Kling in 16:9, 9:16, and 1:1 aspect ratios
  2. System generates cinematic video via Runway Gen-4 for premium campaigns
  3. System generates natural Japanese voiceover via ElevenLabs with correct intonation
  4. System generates AI avatar presenter ads via HeyGen with Japanese lip-sync
  5. Dashboard shows progressive generation status (copy first, images next, video last) and system auto-routes to fallback models on provider failure
**Plans**: TBD

Plans:
- [ ] 04-01: TBD
- [ ] 04-02: TBD
- [ ] 04-03: TBD

### Phase 5: Workflow & Intelligence
**Goal**: Agencies can iterate on campaigns with selective regeneration, formal approval workflows, templates, and AI-powered quality assurance
**Depends on**: Phase 4
**Requirements**: FOUND-05, INTEL-03, INTEL-04, WORK-05, WORK-06, WORK-09
**Success Criteria** (what must be TRUE):
  1. User can selectively regenerate individual assets (single headline, single image) without regenerating the entire kit
  2. Ringi-style approval workflow routes assets through creator, reviewer, and approver stages
  3. User can view campaign history and re-run a previous campaign with modifications
  4. User can start a brief from pre-built templates for common JP campaign types (seasonal launch, flash sale, new product, brand awareness)
  5. QA agent validates output for keigo consistency, brand compliance, and visual coherence before delivery; Viral/Trend agent feeds trending insights into creative direction
**Plans**: TBD

Plans:
- [ ] 05-01: TBD
- [ ] 05-02: TBD
- [ ] 05-03: TBD

### Phase 6: Billing & Compliance
**Goal**: Platform is monetizable with subscription tiers, credit-based metering, and advertising law compliance flagging
**Depends on**: Phase 5
**Requirements**: BILL-01, BILL-02, BILL-03, WORK-07, INTEL-05
**Success Criteria** (what must be TRUE):
  1. User can subscribe to a tier (Starter/Pro/Business) via Stripe with JPY pricing
  2. System tracks credit consumption per campaign and user can view credit balance and usage history
  3. System shows cost estimation before generation begins
  4. Compliance agent flags potential advertising law violations (Keihyouhou/Yakki Ho) and platform rule issues before delivery
**Plans**: TBD

Plans:
- [ ] 06-01: TBD
- [ ] 06-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Core Pipeline | 5/5 | Complete | 2026-02-07 |
| 2. Japanese Text Compositing | 4/4 | Complete | 2026-02-08 |
| 3. Multi-Platform Formatting & Delivery | 0/3 | Not started | - |
| 4. Video & Audio Pipeline | 0/3 | Not started | - |
| 5. Workflow & Intelligence | 0/3 | Not started | - |
| 6. Billing & Compliance | 0/2 | Not started | - |

---
*Roadmap created: 2026-02-06*
*Last updated: 2026-02-08*
