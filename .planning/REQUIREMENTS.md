# Requirements: AI Content Studio

**Defined:** 2026-02-06
**Core Value:** A non-technical user submits a brief and receives a complete, download-ready campaign kit with correct Japanese copy and platform-compliant assets in under 5 minutes.

## v1 Requirements

### Foundation

- [ ] **FOUND-01**: User can create account with email/password and log in
- [ ] **FOUND-02**: User can create and manage team with roles (admin, editor, viewer)
- [ ] **FOUND-03**: User can create brand profiles with logo, colors, fonts, tone, and keigo defaults
- [ ] **FOUND-04**: Dashboard UI is fully Japanese-native (culturally adapted, not translated)
- [ ] **FOUND-05**: User can view campaign history and re-run with modifications
- [ ] **FOUND-06**: Dashboard is responsive and mobile-friendly

### AI Copy Generation

- [ ] **COPY-01**: System generates ad copy (headlines, CTAs, body, social captions) via Claude
- [ ] **COPY-02**: User can select keigo register (casual/standard/keigo) and output maintains consistent register
- [ ] **COPY-03**: System generates copy length variants (headline, description, long-form) per platform
- [ ] **COPY-04**: System generates 3-5 A/B copy variants per asset
- [ ] **COPY-05**: System enforces platform-specific copy rules (character limits, format constraints)
- [ ] **COPY-06**: Generated copy correctly mixes kanji, hiragana, katakana, and romaji

### AI Image Generation

- [ ] **IMG-01**: System generates images via Flux 1.1 Pro Ultra
- [ ] **IMG-02**: System composites Japanese text onto AI-generated images server-side with correct typography
- [ ] **IMG-03**: Text compositing follows kinsoku shori line-break rules
- [ ] **IMG-04**: System auto-resizes images to platform-specific dimensions
- [ ] **IMG-05**: System applies brand kit (colors, logo) to generated images

### AI Video & Audio

- [ ] **VID-01**: System generates 15s/30s video ads via Kling 3.0 in 16:9, 9:16, 1:1
- [ ] **VID-02**: System generates cinematic video via Runway Gen-4
- [ ] **VID-03**: System generates Japanese voiceover via ElevenLabs with natural intonation
- [ ] **VID-04**: System generates AI avatar presenter ads via HeyGen with JP lip-sync
- [ ] **VID-05**: System auto-routes to fallback model if primary provider fails

### AI Intelligence Layer

- [ ] **INTEL-01**: Creative Director agent analyzes brief + trends + brand guidelines and produces creative strategy (visual direction, messaging angle, tone, color palette)
- [ ] **INTEL-02**: Prompt Optimizer agent crafts model-specific prompts for each AI provider (Flux, Kling, Runway, ElevenLabs, HeyGen)
- [ ] **INTEL-03**: QA agent validates output for keigo consistency, brand compliance, and visual coherence before delivery
- [ ] **INTEL-04**: Viral/Trend Analyzer agent ingests trending content and feeds insights into creative direction
- [ ] **INTEL-05**: Compliance agent flags advertising law violations (Keihyouhou/Yakki Ho) and platform rule issues

### Platform Formats

- [ ] **PLAT-01**: System generates LINE Rich Message format (1040x1040)
- [ ] **PLAT-02**: System generates Yahoo! JAPAN YDA banner formats (300x250, 728x90, 160x600, 320x50)
- [ ] **PLAT-03**: System generates Rakuten product listing format (700x700 min, product copy)
- [ ] **PLAT-04**: System generates Instagram formats (1080x1080 feed, 1080x1920 story/reels)
- [ ] **PLAT-05**: System generates TikTok formats (1080x1920 9:16)
- [ ] **PLAT-06**: System generates Twitter/X formats (1200x675 card, 280-char copy)
- [ ] **PLAT-07**: System generates HTML email with keigo body (600px wide, mobile-responsive)

### Campaign Workflow

- [ ] **WORK-01**: User submits structured campaign brief (brand, objective, audience, platforms, register, product info)
- [ ] **WORK-02**: System generates complete campaign kit from a single brief via n8n orchestration
- [ ] **WORK-03**: Dashboard shows progressive generation (copy first, images next, video last)
- [ ] **WORK-04**: User can review all assets in grid view with platform-dimension preview
- [ ] **WORK-05**: User can selectively regenerate individual assets without regenerating entire kit
- [ ] **WORK-06**: Ringi-style approval workflow (creator -> reviewer -> approver)
- [ ] **WORK-07**: System shows cost estimation before generation
- [ ] **WORK-08**: User can download campaign kit as ZIP organized by platform
- [ ] **WORK-09**: Pre-built brief templates for common JP campaign types (seasonal launch, flash sale, new product, brand awareness)

### Billing

- [ ] **BILL-01**: Subscription tiers via Stripe (Starter/Pro/Business) with JPY pricing
- [ ] **BILL-02**: Credit-based generation metering (campaign complexity determines credit cost)
- [ ] **BILL-03**: User can view credit balance and usage history

## v2 Requirements

### Additional Platform Formats

- **PLAT-08**: Digital OOH formats (1920x1080, 1080x1920)
- **PLAT-09**: In-Store POP (B5/A4 print-ready 300dpi, shelf talker sizes)
- **PLAT-10**: YouTube pre-roll formats (6s bumper, 15s non-skip, 30s skippable)
- **PLAT-11**: Google Display Network responsive + standard sizes

### Advanced Features

- **ADV-01**: Vertical text (tategaki) layouts for traditional/luxury brands
- **ADV-02**: Client presentation export (PDF/PPTX with mockup frames)
- **ADV-03**: Competitor ad analysis via Claude vision
- **ADV-04**: Performance prediction scoring (heuristic + ML)
- **ADV-05**: Visual annotation for revision requests
- **ADV-06**: Regional dialect support (Kansai casual option)
- **ADV-07**: Furigana (ruby text) support for accessibility
- **ADV-08**: Japanese color palette intelligence (seasonal, cultural)

### White-Label (Premium Tier)

- **WL-01**: Custom domain per tenant
- **WL-02**: Tenant branding on generated assets
- **WL-03**: Sub-accounts (agency -> client workspaces)
- **WL-04**: Per-tenant usage tracking and billing

### Integrations

- **INT-01**: Direct push to LINE Ads Manager
- **INT-02**: Direct push to Yahoo! JAPAN Ads
- **INT-03**: RESTful API for headless campaign generation
- **INT-04**: Webhook callback on campaign completion

## Out of Scope

| Feature | Reason |
|---------|--------|
| Built-in image/video editor | Canva has 1000+ engineers on this; focus on generation, not editing |
| Social media scheduling | Buffer/Hootsuite domain; export platform-ready assets instead |
| Model fine-tuning per customer | Expensive, slow, maintenance burden; use in-context learning instead |
| Multi-language support | JP-specific features ARE the moat; diluting to English weakens positioning |
| Real-time collaboration | JP agency workflows are sequential (ringi), not simultaneous |
| Blockchain/NFT | Zero user value; standard DB versioning provides audit trail |
| Mobile native app | Web-first; JP agencies review on mobile browser |
| CRM integration | Salesforce/HubSpot connectors deferred to post-v2 |
| A/B testing analytics | Requires ad platform integration not in v1 |
| Ad bidding optimization | Requires performance data pipeline not in v1 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 1 | Pending |
| FOUND-02 | Phase 1 | Pending |
| FOUND-03 | Phase 1 | Pending |
| FOUND-04 | Phase 1 | Pending |
| FOUND-05 | Phase 5 | Pending |
| FOUND-06 | Phase 1 | Pending |
| COPY-01 | Phase 1 | Pending |
| COPY-02 | Phase 2 | Pending |
| COPY-03 | Phase 3 | Pending |
| COPY-04 | Phase 1 | Pending |
| COPY-05 | Phase 3 | Pending |
| COPY-06 | Phase 1 | Pending |
| IMG-01 | Phase 1 | Pending |
| IMG-02 | Phase 2 | Pending |
| IMG-03 | Phase 2 | Pending |
| IMG-04 | Phase 3 | Pending |
| IMG-05 | Phase 2 | Pending |
| VID-01 | Phase 4 | Pending |
| VID-02 | Phase 4 | Pending |
| VID-03 | Phase 4 | Pending |
| VID-04 | Phase 4 | Pending |
| VID-05 | Phase 4 | Pending |
| INTEL-01 | Phase 1 | Pending |
| INTEL-02 | Phase 1 | Pending |
| INTEL-03 | Phase 5 | Pending |
| INTEL-04 | Phase 5 | Pending |
| INTEL-05 | Phase 6 | Pending |
| PLAT-01 | Phase 3 | Pending |
| PLAT-02 | Phase 3 | Pending |
| PLAT-03 | Phase 3 | Pending |
| PLAT-04 | Phase 3 | Pending |
| PLAT-05 | Phase 3 | Pending |
| PLAT-06 | Phase 3 | Pending |
| PLAT-07 | Phase 3 | Pending |
| WORK-01 | Phase 1 | Pending |
| WORK-02 | Phase 3 | Pending |
| WORK-03 | Phase 4 | Pending |
| WORK-04 | Phase 3 | Pending |
| WORK-05 | Phase 5 | Pending |
| WORK-06 | Phase 5 | Pending |
| WORK-07 | Phase 6 | Pending |
| WORK-08 | Phase 3 | Pending |
| WORK-09 | Phase 5 | Pending |
| BILL-01 | Phase 6 | Pending |
| BILL-02 | Phase 6 | Pending |
| BILL-03 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 46 total
- Mapped to phases: 46
- Unmapped: 0

---
*Requirements defined: 2026-02-06*
*Last updated: 2026-02-06 after roadmap creation*
