# Feature Landscape: AI Content Studio (Japanese Market)

**Domain:** AI-powered ad campaign generation SaaS, Japan-focused
**Researched:** 2026-02-06
**Overall Confidence:** MEDIUM (based on training data; external verification tools unavailable)

---

## Table Stakes

Features users expect from any AI ad/content generation platform. Missing any of these and the product feels incomplete or unprofessional to Japanese agency and brand users.

### TS-1: Universal Table Stakes (Platform-Agnostic)

| ID | Feature | Why Expected | Complexity | Confidence | Notes |
|----|---------|--------------|------------|------------|-------|
| TS-U01 | **Text copy generation** | Core value prop of every competitor (Jasper, Copy.ai, Narrato). Users expect headline, body, CTA generation at minimum. | Low | HIGH | Claude handles this natively. The differentiator is Japanese quality, not the capability itself. |
| TS-U02 | **Image generation from prompts** | AdCreative.ai, Canva AI, and Pencil all offer this. Users expect text-to-image for ad creatives. | Medium | HIGH | Flux 1.1 Pro Ultra is the planned engine. Must handle Japanese text overlay as post-process (AI image models do NOT reliably render Japanese text). |
| TS-U03 | **Multiple output format/size support** | Every competitor supports standard IAB sizes (300x250, 728x90, 160x600, 1080x1080, 1200x628, etc.). Resizing a single creative to multiple formats is baseline. | Medium | HIGH | Must include JP-specific sizes (see TS-J section). Auto-resize/recompose is expected. |
| TS-U04 | **Brand kit / brand voice settings** | Jasper, Canva, Narrato all offer brand voice profiles. Agencies manage multiple brands -- this is non-negotiable. | Medium | HIGH | Store brand colors, fonts, logos, tone guidelines, and (for Japan) keigo level defaults per brand. |
| TS-U05 | **Template library** | Canva has 100K+ templates. Jasper has campaign templates. Users expect starting points, not blank canvases. | Medium | HIGH | Templates must be Japan-format-aware (LINE, YDA, Rakuten) from day one. |
| TS-U06 | **Export to standard formats** | PNG, JPG, PDF, MP4 export. Users need deliverables they can upload to ad platforms. | Low | HIGH | Include CSV/spreadsheet export for Rakuten bulk listing formats. |
| TS-U07 | **History and versioning** | Every SaaS has undo/version history. Agencies need audit trails. | Medium | HIGH | Japanese agencies are particularly documentation-conscious. Version comparison view is expected. |
| TS-U08 | **User authentication and team accounts** | Multi-user with roles. Agencies have account managers, designers, approvers. | Medium | HIGH | Map to Japanese org hierarchy: tantousha (person in charge), kakarichou (section chief), buchou (department head). |
| TS-U09 | **Basic analytics/usage dashboard** | Credit consumption, generation counts, export counts. Users need to track ROI. | Low | HIGH | Show per-brand, per-campaign, per-user breakdowns. |
| TS-U10 | **Responsive/mobile-friendly UI** | SaaS expectation. Japanese users frequently review on mobile. | Medium | HIGH | Japanese agencies review approvals on trains (mobile-first review flow matters). |
| TS-U11 | **Copy length variants** | Short (headline), medium (description), long (article/LP). All competitors offer length control. | Low | HIGH | JP copy tends shorter for ads (character density is higher). Must respect character count limits, not word count. |
| TS-U12 | **A/B variant generation** | Generate 3-5 variants per creative. AdCreative.ai and Pencil make this central. | Low | HIGH | This is the AI value prop: not one output, but a set of options to choose from. |

### TS-2: Japan-Specific Table Stakes

These are table stakes specifically because the product targets Japan. A "Japan-focused" platform without these would be rejected immediately.

| ID | Feature | Why Expected | Complexity | Confidence | Notes |
|----|---------|--------------|------------|------------|-------|
| TS-J01 | **Full Japanese language UI** | Target users are Japanese. English-only UI is a dealbreaker. Not just translation -- culturally native UI copy, date formats (2026年2月6日), yen formatting, etc. | Medium | HIGH | Use native JP UI copywriter, not machine translation. Honorific UI text for business SaaS (desu/masu style). |
| TS-J02 | **Japanese typography rendering** | Proper font rendering for ad creatives: Gothic (sans-serif) and Mincho (serif) families. Noto Sans JP, Noto Serif JP as minimums. Must handle vertical text (tategaki). | High | HIGH | Font licensing is a concern. Morisawa and Fontworks are premium JP font vendors. Noto is free and good enough for MVP. |
| TS-J03 | **Kinsoku shori (禁則処理)** | Japanese line-breaking rules. Certain characters cannot start/end a line (opening brackets cannot end a line, closing brackets/periods cannot start a line). Any text rendering without this looks broken to Japanese eyes. | Medium | HIGH | This is NOT optional. CSS `word-break: normal` with `lang="ja"` handles most cases in web UI, but image/PDF text overlay requires explicit implementation. |
| TS-J04 | **Tri-script text handling** | Japanese text mixes kanji, hiragana, katakana, and frequently includes romaji (Latin) and numbers. Copy generation must seamlessly mix scripts. Brand names often in katakana or romaji. | Medium | HIGH | Claude handles this natively in generation. The challenge is in layout: different scripts have different ideal spacing (aki) rules. |
| TS-J05 | **LINE ad format support** | LINE has 96M+ MAU in Japan (75%+ penetration). LINE ads are essential for any JP ad campaign. Formats: LINE Rich Message (1040x1040), Rich Menu (2500x1686 or 1200x810), LINE Ads Platform display ads. | Medium | MEDIUM | Exact current specs should be verified against LINE for Business documentation. Specs may have updated since training data. |
| TS-J06 | **Yahoo! JAPAN YDA format support** | Yahoo! JAPAN is the #2 search/display platform in Japan. YDA (Yahoo! Display Ads) has specific format requirements distinct from Google Display Network. | Medium | MEDIUM | YDA responsive ads, banner ads, and in-feed ads each have specific size/text requirements. Verify current specs. |
| TS-J07 | **Standard social media formats (JP usage patterns)** | Instagram (widely used in JP), X/Twitter (extremely popular in JP -- higher per-capita usage than US), Facebook (less dominant but used by business), TikTok (growing fast in JP). | Low | HIGH | Prioritize X/Twitter and Instagram over Facebook for JP market. Include X-specific character counting (JP chars = 1 char, not 2). |
| TS-J08 | **Yen-based pricing display** | All pricing, credit costs, ROI calculations in JPY. No decimals (yen has no subunits). | Low | HIGH | Use comma separation per Japanese convention: 1,000円, 10,000円. |

---

## Differentiators

Features that set AI Content Studio apart. Not strictly expected, but create competitive advantage -- especially against non-JP competitors trying to serve this market.

### D-1: Japan-Specific Differentiators (Primary Moat)

| ID | Feature | Value Proposition | Complexity | Confidence | Notes |
|----|---------|-------------------|------------|------------|-------|
| D-J01 | **Keigo register control** | Generate copy at specific politeness levels: casual (tameguchi), polite (teineigo/desu-masu), respectful (sonkeigo), humble (kenjougo). Ad copy for a luxury brand vs a youth fashion brand requires fundamentally different registers. No Western competitor handles this. | High | HIGH | Claude can be prompted for keigo levels, but consistent enforcement requires structured prompting + validation. Build a keigo classifier to validate output matches requested level. |
| D-J02 | **Seasonal/cultural calendar integration** | Japan has rich seasonal marketing: oshogatsu (New Year), setsubun, hinamatsuri, hanami, Golden Week, obon, shichi-go-san, kurisumasu, nenbou (year-end). Auto-suggest campaigns tied to JP cultural calendar. Include 二十四節気 (24 seasonal divisions) for luxury/traditional brands. | Medium | HIGH | Massive differentiator. No Western platform has this. Pre-built campaign templates per seasonal event. |
| D-J03 | **Rakuten listing format generation** | Generate complete Rakuten Ichiba product listing kits: main image (700x700 min, white background), sub-images, catch copy, product description (long-form HTML), and search keywords. Rakuten's listing format is unique and complex. | High | MEDIUM | Rakuten listing pages are notoriously long-form with heavy visual design. This is a significant value prop for e-commerce merchants. Verify current Rakuten RMS (Rakuten Merchant Server) format specs. |
| D-J04 | **Platform-specific copy rules enforcement** | Each JP ad platform has specific text rules: LINE Ads character limits, YDA title/description limits, Rakuten prohibited words (overstatement restrictions per Keihyouhou / 景品表示法). Auto-enforce these in generation. | High | HIGH | The Keihyouhou (Act against Unjustifiable Premiums and Misleading Representations) compliance check is a killer feature for agencies who fear regulatory action. |
| D-J05 | **Japanese color palette intelligence** | Suggest culturally appropriate color schemes. Red/white for celebrations, black for luxury, pastel for spring campaigns. Avoid unlucky combinations. Understand that Japanese design aesthetic differs from Western (more information-dense, more text overlay on images). | Medium | MEDIUM | Cultural color associations are well-documented but nuanced. Start with seasonal color palettes (spring pastels, summer brights, autumn warm, winter cool). |
| D-J06 | **Furigana (ruby text) support** | Add reading aids above kanji for accessibility or stylistic purposes. Important for children's products, educational content, or when using unusual kanji readings (ateji) common in JP advertising. | Medium | HIGH | HTML ruby text is straightforward for web. Image rendering of furigana requires careful typography. |
| D-J07 | **Vertical text (tategaki) layouts** | Generate ad creatives with vertical Japanese text. Essential for traditional, luxury, and cultural brand aesthetics. Vertical text is still widely used in Japanese print and high-end digital advertising. | High | HIGH | CSS `writing-mode: vertical-rl` for web, but image generation with vertical text requires explicit layout engine. |
| D-J08 | **Rakuten/Amazon JP marketplace image rules** | White background product images, specific dimension requirements, prohibited text overlay rules (Amazon JP restricts text on main images). Auto-validate generated images against marketplace rules. | Medium | MEDIUM | Rules change periodically. Build as configurable rule sets that can be updated. |

### D-2: Workflow Differentiators

| ID | Feature | Value Proposition | Complexity | Confidence | Notes |
|----|---------|-------------------|------------|------------|-------|
| D-W01 | **Campaign brief templates** | Structured intake: target audience, platform mix, tone, budget, timeline, seasonal hook. Pre-built brief templates for common JP campaign types (new product launch, seasonal sale, brand awareness, recruitment). | Medium | HIGH | This is the "10x" UX differentiator. Turn a 30-minute brief-writing process into 5 minutes of form-filling. |
| D-W02 | **Approval workflow with ringi-style flow** | Japanese businesses use ringi (稟議) -- a formal bottom-up approval process. Build multi-step approval: creator -> reviewer -> approver, with stamp (hanko) metaphor for digital approval. | High | HIGH | This maps directly to how JP agencies work. Western competitors have simple approve/reject. This needs sequential multi-approver chains. |
| D-W03 | **Selective regeneration** | Regenerate only the headline, or only the image, or only the CTA -- without regenerating the entire creative. Preserve approved elements while iterating on others. | Medium | HIGH | Critical for efficiency. Agencies approve copy, then iterate on visuals, or vice versa. Component-level regeneration prevents rework. |
| D-W04 | **Campaign kit generation (atomic unit = campaign)** | Generate a complete campaign kit in one action: banner ads (multiple sizes), social posts (multiple platforms), LINE rich messages, copy variations, video thumbnails. The unit of work is the campaign, not the individual asset. | High | HIGH | This is the core product differentiator vs Canva (asset-level) or Jasper (copy-only). Pencil does this for video but not for full multi-format campaigns. |
| D-W05 | **Client presentation export** | Export campaign kit as a polished presentation (PDF/PPTX) suitable for client review. Japanese agencies present to clients in formal meetings -- raw asset folders are insufficient. | Medium | HIGH | Include mockup frames (smartphone frame for LINE, browser frame for web banners). Japanese clients expect polished presentations. |
| D-W06 | **Revision request with annotation** | Allow approvers to draw/annotate on creatives to indicate changes. "Move this text up," "change this color" expressed visually, then fed back to AI for regeneration. | High | MEDIUM | Complex but high value. Start with text-based revision notes, evolve to visual annotation. |
| D-W07 | **Brief-to-campaign pipeline** | Fill out brief -> AI generates full campaign kit -> review/approve/regenerate -> export. This end-to-end pipeline is the product, not just individual generation features. | High | HIGH | This is the product architecture, not just a feature. Everything feeds into this pipeline. |

### D-3: Multi-Model Orchestration Differentiators

| ID | Feature | Value Proposition | Complexity | Confidence | Notes |
|----|---------|-------------------|------------|------------|-------|
| D-M01 | **Unified prompt-to-multi-asset generation** | Single campaign brief produces: copy (Claude), images (Flux), video (Kling/Runway), voiceover (ElevenLabs), avatar presenter (HeyGen). User doesn't think about which AI model -- they think about what they want. | Very High | HIGH | This is the core technical challenge. Orchestration layer must translate campaign brief into model-specific prompts. |
| D-M02 | **Cross-model consistency** | Generated image matches generated copy theme. Video uses generated image as keyframe. Avatar speaks generated copy with generated voiceover. Visual and tonal consistency across all outputs. | Very High | HIGH | Requires careful prompt engineering: extract visual themes from copy, use image-to-video pipelines, maintain style tokens across generations. |
| D-M03 | **Smart model routing** | Automatically select Kling for product demos (better at object focus) vs Runway Gen-4 for brand storytelling (better cinematics). Route to the best model per asset type without user needing to understand model differences. | High | MEDIUM | Model capabilities shift rapidly. Build as a configurable routing layer, not hardcoded logic. |
| D-M04 | **Progressive generation with previews** | Show copy first (fast, seconds), then image previews (slower, 10-30s), then video (slowest, minutes). Don't make users wait for everything -- stream results as they complete. | Medium | HIGH | Critical UX pattern. WebSocket or SSE for real-time generation status. Show progress per asset type. |
| D-M05 | **Cost estimation before generation** | Show estimated credit cost for a campaign kit before generating. Break down: "Copy: 2 credits, Images: 15 credits, Video: 40 credits. Total: 57 credits." | Low | HIGH | Essential for credit-based billing transparency. JP business users are especially sensitive to unexpected costs. |
| D-M06 | **Model fallback chains** | If Kling is down or rate-limited, fall back to Runway (or vice versa). If Flux fails, retry or fall back to alternative. Users should never see "generation failed" without automatic retry. | High | HIGH | Production reliability feature. Must handle rate limits, outages, and quota exhaustion gracefully. |
| D-M07 | **Japanese voice model selection** | ElevenLabs / TTS with native Japanese voices. Male/female, age ranges, formal/casual tone. Must sound natural, not robotic. Critical for video ad voiceovers. | Medium | MEDIUM | Japanese TTS quality varies significantly by provider. Verify ElevenLabs Japanese voice quality. Voicevox is a high-quality open-source JP TTS alternative to evaluate. |

### D-4: AI Intelligence Differentiators

| ID | Feature | Value Proposition | Complexity | Confidence | Notes |
|----|---------|-------------------|------------|------------|-------|
| D-A01 | **Competitor ad analysis** | Upload or link competitor ads. AI analyzes messaging, visual style, and positioning. Generate "counter-campaigns" that differentiate. | High | MEDIUM | Requires vision model analysis of competitor creatives. Claude's vision capability can handle this. |
| D-A02 | **Performance prediction scoring** | Score generated creatives on predicted performance (CTR, engagement). AdCreative.ai's core feature. | High | LOW | Requires training data that may not be available at launch. Can approximate with heuristic scoring (text-to-image ratio, CTA clarity, color contrast) initially. |
| D-A03 | **Auto-localization (JP regional)** | Adapt campaigns for regional Japanese dialects/preferences. Kansai vs Kanto sensibilities. Osaka humor vs Tokyo sophistication. | Medium | MEDIUM | Niche but impressive. Start with standard Japanese, offer Kansai-dialect option for casual/humor campaigns. |
| D-A04 | **Hashtag generation (JP-aware)** | Generate platform-appropriate hashtags in Japanese. Understand JP hashtag conventions (longer, more descriptive than English hashtags). Include trending JP hashtag integration. | Low | HIGH | JP Twitter/Instagram hashtags are often full phrases. Include a mix of JP and relevant English hashtags. |

---

## Anti-Features

Features to deliberately NOT build. Common mistakes in this domain that would waste resources or harm the product.

| ID | Anti-Feature | Why Avoid | What to Do Instead |
|----|--------------|-----------|-------------------|
| AF-01 | **Built-in image editor (full Canva clone)** | Canva has 1000+ engineers on their editor. Building even a basic vector editor is a multi-year effort that will always feel inferior. This is a trap that consumes all eng resources. | Offer simple adjustments (crop, text edit, color swap) and export to Canva/Figma for detailed editing. Focus on generation, not editing. |
| AF-02 | **Built-in video editor (timeline NLE)** | Same as above but worse. Video editing is an entire product category. | Generate complete short video clips. Offer trim/cut only. Export to CapCut/Premiere for editing. |
| AF-03 | **Social media scheduling/publishing** | This is Buffer/Hootsuite/Later's domain. Building a scheduler means maintaining API integrations with 10+ platforms that change constantly. | Export in platform-ready formats with posting guidelines. Integrate with existing schedulers via API later. |
| AF-04 | **Ad platform API integration (auto-posting to Google/Meta/LINE Ads)** | Ad platform APIs are complex, change frequently, and require platform-specific review processes. This is a maintenance nightmare. | Generate platform-compliant assets. Let users upload manually or via their existing ad management tools. Consider API integrations only for Phase 3+ after core product is proven. |
| AF-05 | **Free-form chat-based generation** | "Chat with AI to create ads" sounds good but produces unpredictable results. Agencies need structured, repeatable workflows -- not open-ended conversations. | Structured brief -> generation pipeline. Use chat only for refinement/iteration within structured flows. |
| AF-06 | **Training/fine-tuning custom models** | Fine-tuning image or language models per customer is expensive, slow, and creates maintenance burden. Most customers don't have enough data anyway. | Use in-context learning: brand kits, style references, example uploads. Claude and Flux handle few-shot adaptation well without fine-tuning. |
| AF-07 | **Multi-language support (beyond JP)** | Tempting to go global early, but the JP-specific features ARE the moat. Diluting focus to support English, Chinese, Korean etc. weakens the core value proposition. | Be the best JP platform first. If expanding, do Korean or Traditional Chinese next (similar complexity), not English (crowded market). |
| AF-08 | **Real-time collaboration (Google Docs style)** | Operational transforms / CRDTs for real-time co-editing are extremely complex. Japanese agency workflows are sequential (ringi), not simultaneous. | Async workflow: create -> review -> approve. Show who's viewing, but don't build real-time co-editing. |
| AF-09 | **Blockchain/NFT anything** | NFT hype is over. Adding blockchain for "asset provenance" adds complexity with zero user value. | Standard database versioning and audit logs provide all the provenance agencies need. |
| AF-10 | **Overly granular model selection UI** | Exposing "choose between Kling 3.0 and Runway Gen-4" to end users adds cognitive load without value. Users don't care which model -- they care about results. | Smart routing (D-M03) handles model selection. Expose only as "quality" or "style" preferences, not model names. Power users get model override in advanced settings. |

---

## Feature Dependencies

Understanding build order requires mapping what depends on what.

```
FOUNDATION LAYER (must exist first):
  Authentication (TS-U08)
  └── Team/org management
  └── Brand kit storage (TS-U04)
       └── Per-brand keigo defaults (D-J01)

GENERATION CORE (the engine):
  Text generation via Claude (TS-U01)
  ├── Keigo register control (D-J01)
  ├── Copy length variants (TS-U11)
  ├── Platform-specific rules (D-J04)
  └── A/B variants (TS-U12)

  Image generation via Flux (TS-U02)
  ├── Japanese typography overlay (TS-J02)
  │   ├── Kinsoku shori (TS-J03)
  │   ├── Vertical text (D-J07)
  │   └── Furigana (D-J06)
  ├── Multiple format sizes (TS-U03)
  │   ├── LINE formats (TS-J05)
  │   ├── YDA formats (TS-J06)
  │   └── Rakuten formats (D-J03)
  └── Brand kit application (TS-U04)

ORCHESTRATION LAYER (ties models together):
  Campaign brief templates (D-W01)
  └── Brief-to-campaign pipeline (D-W07)
       ├── Unified multi-asset generation (D-M01)
       │   ├── Text gen (TS-U01) [required]
       │   ├── Image gen (TS-U02) [required]
       │   ├── Video gen (D-M01) [optional for MVP]
       │   ├── Voice gen (D-M07) [optional for MVP]
       │   └── Avatar gen (D-M01) [optional for MVP]
       ├── Cross-model consistency (D-M02)
       ├── Progressive previews (D-M04)
       └── Cost estimation (D-M05)

WORKFLOW LAYER (built on top of generation):
  History & versioning (TS-U07)
  └── Selective regeneration (D-W03)
  └── Approval workflow (D-W02)
       └── Revision annotations (D-W06)
  └── Client presentation export (D-W05)

INTELLIGENCE LAYER (built last, requires usage data):
  Competitor analysis (D-A01)
  Performance prediction (D-A02)
  Seasonal calendar (D-J02) [can be static data early, AI-enhanced later]
```

### Critical Path

The critical path for MVP is:

```
Auth -> Brand Kit -> Text Gen + Image Gen -> Template Library ->
Multi-format Export -> Campaign Brief -> Brief-to-Campaign Pipeline
```

Everything else can layer on top of this core.

---

## MVP Recommendation

### Phase 1: Core Generation Engine (MVP)

**Must include (absolutely non-negotiable for launch):**

1. **TS-U01** Text copy generation (Japanese, with basic keigo control)
2. **TS-U02** Image generation (with Japanese text overlay)
3. **TS-J01** Full Japanese language UI
4. **TS-J02** Japanese typography rendering (at least Gothic/Mincho, horizontal)
5. **TS-J03** Kinsoku shori in all text rendering
6. **TS-U03** Multiple output sizes (include LINE, YDA, standard social)
7. **TS-U04** Brand kit (colors, fonts, logos, tone)
8. **TS-U06** Export (PNG, JPG, PDF)
9. **TS-U08** Authentication with team accounts
10. **TS-U11** Copy length variants
11. **TS-U12** A/B variant generation (3-5 options)
12. **TS-U05** Template library (10-20 templates covering key JP formats)

**Should include (strong differentiator, include if timeline allows):**

13. **D-J01** Keigo register control (3 levels minimum: casual, polite, formal)
14. **D-W01** Campaign brief templates (5-10 templates)
15. **D-M04** Progressive generation with previews
16. **D-M05** Cost estimation before generation
17. **D-J02** Seasonal calendar integration (static data, basic suggestions)

### Defer to Phase 2:

- **D-W02** Approval workflow (ringi-style)
- **D-W04** Full campaign kit generation (multi-model orchestration)
- **D-W03** Selective regeneration
- **D-J03** Rakuten listing format generation
- **D-M01** Unified multi-asset generation (video, voice, avatar)
- **D-J07** Vertical text layouts

### Defer to Phase 3+:

- **D-A01** Competitor ad analysis
- **D-A02** Performance prediction scoring
- **D-W06** Visual annotation for revision requests
- **D-W05** Client presentation export (auto-generated PPTX)
- **D-M03** Smart model routing
- **D-A03** Regional dialect adaptation

---

## Platform Format Specifications (Reference)

Exact specifications should be verified against current platform documentation before implementation. These are best-known-as-of-training values.

### LINE Formats

| Format | Dimensions | Notes | Confidence |
|--------|-----------|-------|------------|
| Rich Message | 1040 x 1040 px | Can be split into up to 6 tap areas. Single image. | MEDIUM |
| Rich Menu (large) | 2500 x 1686 px | Bottom menu, 6 areas max | MEDIUM |
| Rich Menu (compact) | 2500 x 843 px | Half-height variant | MEDIUM |
| LINE Ads: Image | 1080 x 1080 (square), 1200 x 628 (landscape) | Standard display ad sizes | MEDIUM |
| LINE VOOM post | 1080 x 1080 px | Timeline/VOOM feed | LOW |

### Yahoo! JAPAN YDA Formats

| Format | Dimensions | Notes | Confidence |
|--------|-----------|-------|------------|
| Responsive (image) | 1200 x 628 px (landscape), 300 x 300 px (square) | Auto-adjusted by YDA | MEDIUM |
| Banner | 300 x 250, 728 x 90, 160 x 600 | Standard IAB + JP additions | MEDIUM |
| In-feed | 1200 x 628 px | Yahoo! News feed placement | MEDIUM |
| Title length | 20 chars (short), 90 chars (long) | Character count, not byte count | LOW |
| Description | 90 chars max | May have changed. Verify. | LOW |

### Rakuten Ichiba Formats

| Format | Requirements | Notes | Confidence |
|--------|-------------|-------|------------|
| Main product image | Min 700 x 700 px, white background recommended | Square preferred | MEDIUM |
| Additional images | Up to 20 images | No strict size but consistency expected | MEDIUM |
| Catch copy | ~80 chars | Short promotional text | LOW |
| Product description | HTML allowed, very long-form | Rakuten pages are notoriously text-heavy | MEDIUM |
| Mobile thumbnail | 640 x 640 px | Mobile-optimized crop | LOW |

**NOTE:** All platform specifications carry MEDIUM or LOW confidence because they may have been updated after training data cutoff. Phase-specific research must verify exact current specs before implementation by checking each platform's official advertiser documentation.

---

## Japanese Language Feature Details

### Keigo Levels for Ad Copy

| Level | Japanese Term | Use Case | Example Context | Complexity to Implement |
|-------|--------------|----------|-----------------|------------------------|
| Casual (tameguchi) | タメ口 | Youth brands, SNS, fashion | "これマジでヤバい!" | Low (default Claude output with casual prompting) |
| Polite (teineigo) | 丁寧語 | Standard advertising, general audience | "新商品をご紹介します" | Low (standard desu/masu -- Claude's default JP) |
| Respectful (sonkeigo) | 尊敬語 | Luxury brands, B2B, addressing customers | "ぜひお試しくださいませ" | Medium (specific grammatical patterns) |
| Humble (kenjougo) | 謙譲語 | Company self-reference, service descriptions | "弊社がご提供いたします" | Medium (must apply only to company-side actions) |
| Mixed business (bijinesu keigo) | ビジネス敬語 | Standard B2B communications, formal campaigns | Combines sonkeigo + kenjougo appropriately | High (must correctly assign respect direction) |

**Implementation approach:** System prompts per keigo level with example patterns. Post-generation validation to catch common keigo errors (e.g., double-sonkeigo "おっしゃられる", mixing respect direction). Claude is reasonably good at keigo but occasionally makes errors that a native speaker would catch.

### Kinsoku Shori Rules (Minimum Implementation)

| Rule | Characters | Description |
|------|-----------|-------------|
| No line start | 、。,.!?」』）】〕 etc. | Closing punctuation and brackets cannot begin a line |
| No line end | 「『（【〔 etc. | Opening brackets cannot end a line |
| No break | Numbers, Latin sequences | Don't break in the middle of numbers or romaji words |
| Hanging punctuation | 、。 | Period/comma can "hang" past the line end margin (ぶら下げ) |

**Implementation approach:** For web UI, `lang="ja"` + `word-break: normal` + `overflow-wrap: break-word` handles 90% of cases via browser. For image generation text overlay, implement a simple line-break algorithm that respects these rules. Libraries exist for this in Node.js (e.g., `budoux` by Google for Japanese word segmentation).

### Tri-Script Considerations

| Script | Usage in Ads | Spacing Rule |
|--------|-------------|--------------|
| Kanji | Core meaning, brand authority | Quarter-em space before/after Latin text |
| Hiragana | Grammatical particles, soft feeling | No extra spacing needed between kana |
| Katakana | Foreign words, emphasis, brand names | Quarter-em space before/after Latin text |
| Romaji/Latin | Brand names, English words, stylistic | "aki" (空き) spacing around Latin text blocks |
| Numbers | Prices, dates, quantities | Proportional (half-width) numerals for body, full-width for headlines optional |

---

## Competitive Landscape Feature Matrix

| Feature | Canva | Jasper | AdCreative.ai | Pencil | Copy.ai | Narrato | **AI Content Studio** |
|---------|-------|--------|---------------|--------|---------|---------|----------------------|
| Japanese UI | Partial | No | No | No | No | No | **Native** |
| JP ad format templates | Few | N/A | No | No | N/A | N/A | **Comprehensive** |
| Keigo control | No | No | No | No | No | No | **Yes** |
| LINE/YDA formats | No | N/A | No | No | N/A | N/A | **Yes** |
| Rakuten listings | No | No | No | No | No | No | **Yes** |
| Multi-model (copy+image+video) | Partial | No | Partial | Video only | No | No | **Full orchestration** |
| Campaign kit generation | No | No | Partial | Partial | No | No | **Core feature** |
| Approval workflow | Basic | Enterprise | No | No | No | Basic | **Ringi-style** |
| JP typography (kinsoku, tategaki) | Partial | N/A | No | No | N/A | N/A | **Full support** |
| Seasonal/cultural calendar | No | No | No | No | No | No | **JP calendar** |
| Performance prediction | No | No | **Yes** | **Yes** | No | No | Phase 3 |
| Brand voice | Yes | **Yes** | Yes | No | Yes | Yes | Yes + keigo |
| A/B variants | No | Yes | **Yes** | **Yes** | Yes | Yes | Yes |
| Free tier | **Yes** | No | No | No | **Yes** | No | TBD |

**Key insight:** No competitor serves the Japanese market natively with cultural intelligence. The gap is wide. But this also means there's no proven market for an AI-native JP ad platform -- Japanese agencies may be more conservative about AI adoption. The seasonal calendar, keigo control, and platform-specific format support create a moat that's genuinely hard for Western platforms to replicate.

---

## Sources and Confidence Notes

| Topic | Source | Confidence |
|-------|--------|------------|
| Competitor feature sets (Canva, Jasper, etc.) | Training data, general knowledge | MEDIUM -- features may have evolved |
| LINE ad format specifications | Training data | MEDIUM -- verify against LINE for Business docs |
| Yahoo! JAPAN YDA specifications | Training data | LOW-MEDIUM -- verify against current YDA docs |
| Rakuten Ichiba listing requirements | Training data | MEDIUM -- verify against RMS documentation |
| Kinsoku shori rules | Well-established standard (JIS X 4051) | HIGH -- these rules are stable |
| Keigo system | Well-established linguistic system | HIGH -- the language hasn't changed |
| Japanese typography conventions | Well-established standards | HIGH -- these are stable cultural norms |
| AI model capabilities (Claude, Flux, etc.) | Training data + general knowledge | MEDIUM -- verify current model capabilities and pricing |
| Multi-model orchestration patterns | Training data, general architecture knowledge | MEDIUM -- this is emerging territory |

**Critical verification needed before implementation:**
1. Current LINE Rich Message and LINE Ads specifications (check LINE for Business portal)
2. Current YDA ad format specifications and character limits (check Yahoo! JAPAN advertising portal)
3. Current Rakuten RMS listing requirements (check RMS partner documentation)
4. ElevenLabs Japanese voice quality and availability (test directly)
5. Kling 3.0 and Runway Gen-4 Japanese text handling in video (test directly)
6. Current pricing for all six AI model APIs (check each provider)
