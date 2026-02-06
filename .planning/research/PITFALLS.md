# Domain Pitfalls: AI Content Studio (Japanese Market Ad Generation)

**Domain:** AI-powered ad campaign generation SaaS for the Japanese market
**Researched:** 2026-02-06
**Overall confidence:** MEDIUM (training-data-based; WebSearch/WebFetch unavailable -- verify critical items against current docs before implementation)

---

## Critical Pitfalls

Mistakes that cause rewrites, launch blockers, or platform rejection.

---

### CP-1: Mojibake and Encoding Corruption in the Multi-Service Pipeline

**What goes wrong:** Japanese text passes through 6+ services (Claude API -> n8n -> PostgreSQL -> Next.js -> image compositing -> ZIP packaging). Any hop that defaults to Latin-1, ASCII, or mishandles UTF-8 BOM will produce garbled output (mojibake). This is not one bug -- it is a class of bugs that will recur at every pipeline boundary.

**Why it happens:**
- n8n HTTP Request nodes may not set `charset=utf-8` explicitly on outbound/inbound headers
- PostgreSQL connection strings missing `?client_encoding=UTF8`
- Node.js `Buffer` operations defaulting to `ascii` instead of `utf-8`
- ZIP library encoding for filenames (many ZIP libs default to CP437 for filenames, which mangles JP characters)
- JSON.parse/stringify is UTF-8 safe, but file I/O (fs.readFile without encoding) returns Buffer, not string
- S3 object metadata Content-Type missing `charset=utf-8`
- Claude API responses are UTF-8 but intermediate caching (Redis) may truncate multi-byte characters if using byte-length limits

**Consequences:** Garbled Japanese text in generated assets. Users see `????` or `???` or `\u00e3\u0081...` raw bytes. Immediate credibility destroyer -- JP users will not trust the platform.

**Warning signs:**
- Katakana appears correctly but kanji does not (partial encoding support)
- Text looks fine in the dashboard but is garbled in downloaded assets
- Text works in development but fails in production (different default locales)
- Half-width katakana (`ｱｲｳ`) appears where full-width was expected

**Prevention:**
1. Establish an encoding contract: UTF-8 everywhere, no exceptions. Document it.
2. Add encoding assertion tests at every pipeline boundary (n8n -> DB, DB -> API, API -> compositing, compositing -> storage, storage -> download).
3. Use `Buffer.from(text, 'utf-8')` explicitly everywhere in Node.js.
4. Set PostgreSQL `client_encoding` to `UTF8` at connection level.
5. For ZIP file creation, use a library that supports UTF-8 filenames (e.g., `archiver` with `{ zlib: { level: 9 } }` and UTF-8 language encoding flag). Test with filenames containing kanji.
6. Set `Content-Type: application/json; charset=utf-8` on all API responses.
7. Create a "canary string" test: `"テスト漢字ABCabc123半角ｶﾀｶﾅ"` -- run it through the entire pipeline end-to-end on every deploy.

**Detection:** Automated test that submits a brief containing all three scripts (hiragana, katakana, kanji) plus half-width characters and verifies pixel-perfect output at the end.

**Phase:** Must be addressed in Phase 1 (foundation). If encoding is broken, nothing else works.

**Severity:** CRITICAL

**Confidence:** HIGH (encoding issues with Japanese text are extremely well-documented and near-universal in multi-service architectures)

---

### CP-2: Kinsoku Shori Violations in Image Text Compositing

**What goes wrong:** Japanese has strict line-breaking rules (kinsoku shori / 禁則処理) defined in JIS X 4051 and W3C JLREQ. Characters like `。`, `、`, `)`, `」` cannot begin a line. Characters like `(`, `「` cannot end a line. Periods and commas must stay attached to the preceding character. Standard text layout engines (CSS, browser rendering) handle this automatically. Image compositing libraries (Sharp, node-canvas, Jimp) do NOT.

**Why it happens:**
- Sharp's `text` functionality is limited and does not implement kinsoku shori
- node-canvas uses Pango/Cairo on Linux which has partial CJK support but not full kinsoku shori
- Developers implement naive word-wrap by character count, breaking at any position
- Copy-pasting CSS text-wrapping logic does not work for programmatic image generation
- The rules are complex: there are ~30 character classes with different start/end/break behaviors

**Consequences:**
- A closing bracket `」` starts a new line (looks amateur)
- A period `。` appears at the start of a line (reads as broken)
- Long unbroken strings of kanji overflow the text box with no wrapping
- Japanese design professionals and agency users will immediately reject output

**Warning signs:**
- Text looks "slightly off" but nobody can articulate why
- Punctuation appears at line starts in generated images
- QA passes in English testing but fails on Japanese content
- Client feedback says "the text feels wrong" without specifics

**Prevention:**
1. Implement a dedicated kinsoku shori text layout engine as a standalone module. Do NOT rely on image library text rendering.
2. Key rules to implement:
   - **Line-start prohibition (行頭禁則):** `、。,.!?」』）〕】》〉…ー` cannot start a line
   - **Line-end prohibition (行末禁則):** `「『（〔【《〈` cannot end a line
   - **Inseparable characters (分離禁則):** `——`, `……`, `!!`, `??` must stay together
   - **Hanging punctuation (ぶら下げ):** Allow `、。` to hang past the right margin rather than pushing to next line
3. Process text layout in a separate pass: input text -> line-break calculation -> per-line positioned rendering onto image.
4. Use Noto Sans JP (already planned) which has correct metrics. Ensure you load the font file explicitly in your compositing tool; do NOT rely on system font fallback.
5. Build a visual regression test suite with known-correct reference images for tricky cases.

**Detection:** Automated screenshot comparison against reference images for a set of test strings containing all problematic character patterns.

**Phase:** Phase 1-2 (image compositing foundation). This is the core technical moat -- getting it wrong undermines the entire value proposition.

**Severity:** CRITICAL

**Confidence:** HIGH (kinsoku shori rules are defined in JIS X 4051 and W3C JLREQ specification; the lack of support in image libraries is well-established)

---

### CP-3: Keigo Register Drift Within a Campaign Kit

**What goes wrong:** A single campaign kit must maintain consistent politeness register (casual/polite/keigo) across all generated copy: headlines, body text, CTA buttons, email sequences, video scripts, social media posts. AI models, even Claude, will drift registers mid-generation or between separate API calls. A headline in casual register (`見てみて!`) next to body copy in keigo (`ご確認いただけますと幸いです`) makes the brand voice feel schizophrenic.

**Why it happens:**
- Each asset type is generated in a separate API call. The model has no memory of prior calls.
- System prompts requesting "keigo" are interpreted differently across calls -- sometimes the model uses teineigo (polite), sometimes sonkeigo (respectful), sometimes kenjogo (humble).
- Short-form text (headlines, CTAs) naturally gravitates toward casual register even when prompted for keigo.
- Copy-paste prompt engineering that works in English ("be formal") maps poorly to the three-axis Japanese politeness system.
- Model temperature settings > 0 introduce register variation.

**Consequences:**
- Campaign kit feels incoherent -- mixing `です/ます` with `だ/である` forms
- Misuse of sonkeigo vs kenjogo (using humble language about the customer, or respectful language about your own company) is a serious cultural error
- Agency clients who understand keigo will lose trust immediately
- B2B campaigns using incorrect keigo toward client's customers is a relationship-damaging mistake

**Warning signs:**
- Verb endings inconsistent across assets (`ください` in one, `してね` in another)
- The same CTA rendered in different register in different platform formats
- QA reviewer flags "tone inconsistency" without being able to specify the linguistic mechanism

**Prevention:**
1. Define explicit register profiles with linguistic constraints, not just labels:
   - **Casual (カジュアル):** `だ/だよ/じゃん/〜ね` endings, no honorific prefixes, emoji permitted
   - **Polite (丁寧語):** `です/ます` endings, `お/ご` prefixes on select words, no `させていただく` overuse
   - **Keigo (敬語):** Full sonkeigo for customer actions (`いらっしゃる/ご覧になる`), kenjogo for company actions (`申す/いたす`), teineigo baseline
2. Include register-specific few-shot examples in every prompt, not just instruction text.
3. Use a "register validation" post-processing step: regex/rule-based check for register-inconsistent verb endings per asset.
4. Set temperature to 0 or very low (0.1-0.2) for copy generation to reduce variation.
5. Generate all copy for one campaign kit in a single Claude API call with structured output if possible, or pass prior generations as context to subsequent calls.
6. Build a register-consistency checker that flags mixed endings within a single campaign kit before delivery.

**Detection:** Automated regex patterns matching verb ending forms (`です$`, `ます$`, `だ$`, `だよ$`, `ね$`) and flagging if multiple register families appear in a single campaign kit.

**Phase:** Phase 1-2 (copy generation pipeline). Register control is the language moat.

**Severity:** CRITICAL

**Confidence:** HIGH (keigo system is well-documented; LLM register drift is observable and reproducible)

---

### CP-4: Platform Format Rejection Due to Spec Non-Compliance

**What goes wrong:** Each ad platform (LINE, Yahoo! JAPAN, Rakuten, GDN, etc.) has strict asset specifications -- not just dimensions but file size limits, text-to-image ratio rules, prohibited content areas, file format requirements, and metadata constraints. Assets that look correct visually get rejected by platform validation systems.

**Why it happens:**
- LINE Rich Message has exact dimension requirements (1040x1040 for 1-area, specific grid layouts for multi-area) and a maximum file size of 1MB per image
- Yahoo! JAPAN Display Ads enforce a 20% text overlay rule (similar to old Facebook rule) and reject images with excessive text
- Rakuten product listing images have specific safe zones where text must not appear
- GDN has aspect ratio tolerance of only +/-1% in some formats
- Platform specs change without notice -- a format that worked last month may be rejected today
- JPEG quality settings affect file size unpredictably; a "1MB limit" means you need to binary-search compression quality
- LINE requires specific image maps (coordinate-based click regions) for Rich Messages with multiple links

**Consequences:**
- User generates a full campaign kit, tries to upload to platforms, gets rejected
- Rejection reasons from platforms are often vague ("Image does not meet requirements")
- User blames the product, not the platform
- Each rejected format requires manual investigation and regeneration

**Warning signs:**
- No pre-upload validation in the pipeline
- Platform specs hardcoded without version tracking
- File sizes hovering near limits (900KB for a 1MB limit)
- Testing only on one platform and assuming others work

**Prevention:**
1. Build a platform spec registry: a configuration file per platform documenting every constraint (dimensions, file size, text ratio, safe zones, file formats, metadata requirements). Version-track this file.
2. Implement post-generation validation that checks every asset against its target platform spec before delivering to the user.
3. For file size limits: always generate at high quality first, then compress iteratively until under limit. Use `sharp.toBuffer()` with quality parameter binary search.
4. For text-to-image ratio: calculate the ratio programmatically before compositing. If text exceeds the platform limit, flag it for the user rather than silently failing.
5. Build platform-specific preview modes in the dashboard showing safe zones and constraint violations.
6. Create a "platform spec update" process: quarterly audit of each platform's current requirements. Subscribe to platform developer newsletters/blogs.
7. For LINE Rich Messages: validate image map coordinates match the actual image dimensions exactly.

**Detection:**
- Automated validation suite that runs every generated asset against the platform spec registry
- Canary tests that submit test assets to each platform monthly (if APIs allow) to detect spec changes

**Phase:** Phase 2-3 (platform formatting layer). Must be designed into the architecture from the start but fully implemented when multi-platform output is built.

**Severity:** CRITICAL

**Confidence:** MEDIUM (specific platform specs should be verified against current documentation for LINE, Yahoo! JAPAN Ads, and Rakuten before implementation)

---

### CP-5: AI API Cascading Failures and Cost Explosions

**What goes wrong:** A single campaign kit generation triggers calls to 6 AI APIs (Claude for copy, Flux for images, Kling for video, ElevenLabs for voice, HeyGen for avatars, Runway for cinematic). If one API is slow or fails, the entire kit generation stalls. Worse, retry logic without proper controls can multiply costs exponentially.

**Why it happens:**
- AI APIs have variable latency (image generation can take 10-120 seconds depending on load)
- APIs rate-limit without warning at scale (Flux/Replicate throttle to queue-based processing under load)
- Retry storms: if generation fails at step 5/6, naive retry logic re-runs steps 1-4 at full cost
- AI model version changes (model deprecation, new default versions) break prompts silently -- output quality degrades rather than erroring
- Pricing changes without notice (Anthropic, OpenAI have changed pricing multiple times)
- API quotas are per-account, not per-request -- concurrent campaign generations compete for the same quota
- ElevenLabs and HeyGen have character/minute-based quotas that are easy to exhaust with Japanese text (which is more information-dense per character)

**Consequences:**
- Campaign generation takes 15+ minutes instead of <5 minutes target
- A single failed API call blocks the entire kit
- Retry storms generate $50+ in API costs for a single campaign
- User sees partial results with no explanation of what failed
- Monthly API bills 3-10x expected due to retries and failed generations

**Warning signs:**
- No per-generation cost tracking
- Retry logic with no maximum attempt limit
- No circuit breaker pattern on API calls
- API calls running sequentially instead of in parallel where possible
- No budget cap per generation or per user

**Prevention:**
1. **Implement circuit breakers** on every external API call. After 3 consecutive failures, trip the circuit and return a graceful degradation (kit without video, kit without avatar) rather than retrying indefinitely.
2. **Track cost per generation** at the API call level. Log token counts, image counts, video seconds, voice characters for every call. Set a hard cost ceiling per generation (e.g., $5) and abort if exceeded.
3. **Idempotent generation steps:** Cache intermediate results (generated copy, base images) so retries resume from the failure point, not from scratch. Use n8n's execution data to persist intermediate state.
4. **Parallel-where-possible pipeline:** Image generation, video generation, and copy generation can start in parallel once the brief is processed. Don't serialize everything.
5. **Set explicit timeouts** per API call: copy generation 30s, image generation 90s, video generation 180s. Fail fast rather than hanging.
6. **API cost alerts:** Set up billing alerts on all 6 API provider dashboards. Track actual cost vs projected cost daily.
7. **Model version pinning:** Always specify model version in API calls (`claude-3-opus-20240229`, not `claude-3-opus`). Test new versions before switching.
8. **Budget guards per user/tier:** Free tier gets X credits, Pro tier gets Y credits. Never allow unbounded generation.
9. **Graceful degradation response:** If video API fails, deliver the kit with images and copy, clearly marking "Video generation failed -- retry available." Do not block the entire delivery.

**Detection:**
- Cost-per-generation dashboard with anomaly alerts
- API latency monitoring with p95/p99 tracking
- Circuit breaker state dashboard
- Weekly cost reconciliation against projected usage

**Phase:** Phase 1 (pipeline architecture). Cost controls and circuit breakers must be designed into the pipeline from day one, not retrofitted.

**Severity:** CRITICAL

**Confidence:** HIGH (AI API operational patterns, pricing changes, and cascading failure modes are well-documented across the industry)

---

## High-Severity Pitfalls

Mistakes that cause significant delays, degraded quality, or user churn.

---

### HP-1: n8n Workflow Complexity Explosion

**What goes wrong:** n8n workflows that start simple become unmanageable as features are added. A single "generate campaign" workflow grows to 100+ nodes with conditional branches for each platform, each asset type, each error case. Debugging becomes impossible, and changes to one branch break others.

**Why it happens:**
- n8n's visual workflow editor becomes unusable past ~50 nodes
- Error handling in n8n requires explicit error branches for each node -- every API call needs a success path and failure path
- Conditional logic (if LINE selected, if Yahoo selected, etc.) creates exponential branching
- n8n's execution model loads the entire workflow into memory -- large workflows consume excessive RAM
- Sub-workflows in n8n have their own quirks: data passing between parent/child is serialized as JSON, losing type information
- n8n's built-in retry mechanism is per-node, not per-workflow-segment -- you cannot "retry from this point"
- Self-hosted n8n on a single VPS becomes a single point of failure

**Consequences:**
- Adding a new platform format requires modifying a workflow that nobody can fully understand
- A bug in the LINE branch breaks the Yahoo branch due to shared node dependencies
- n8n crashes or OOMs during complex campaign generation
- Deployment/updates to n8n workflows require restarting the service, causing downtime

**Warning signs:**
- Workflow canvas requires scrolling more than 3 screens in any direction
- "I'm afraid to change this workflow" sentiment
- Inconsistent behavior between workflow executions (timing-dependent bugs)
- n8n memory usage growing over time (memory leaks in long-running workflows)

**Prevention:**
1. **Decompose into sub-workflows from day one:**
   - Master orchestrator workflow (receives brief, dispatches to sub-workflows, aggregates results)
   - Copy generation sub-workflow
   - Image generation sub-workflow
   - Video generation sub-workflow
   - Voice generation sub-workflow
   - Platform formatting sub-workflow (one per platform or one parameterized)
   - Delivery/packaging sub-workflow
2. **Standardize the sub-workflow interface:** Every sub-workflow takes the same input shape (brief + config) and returns the same output shape (assets + metadata + errors).
3. **Use n8n queue mode** with separate workers for CPU-intensive tasks. This requires Redis and PostgreSQL (not SQLite).
4. **Set execution timeouts** on all workflows (n8n supports `EXECUTIONS_TIMEOUT` and `EXECUTIONS_TIMEOUT_MAX`).
5. **Implement health monitoring:** Use n8n's webhook endpoints to build a health check dashboard. Monitor execution times, failure rates, queue depth.
6. **Version control workflows:** Export n8n workflows as JSON and commit to git. Track changes over time. This is not built-in -- you must build an export/commit script.
7. **Consider n8n as orchestrator only:** Heavy processing (image compositing, text layout, validation) should happen in external services called by n8n, not in n8n Code nodes.

**Detection:**
- Workflow node count tracking (alert if any workflow exceeds 40 nodes)
- Execution time monitoring (alert if any workflow exceeds 3 minutes)
- Memory usage monitoring on n8n VPS
- Weekly workflow complexity review

**Phase:** Phase 1 (architecture). Workflow decomposition must be the starting architecture, not a refactoring target.

**Severity:** HIGH

**Confidence:** HIGH (n8n scaling limitations are well-documented in their own docs and community forums)

---

### HP-2: Japanese Font Rendering Failures in Image Compositing

**What goes wrong:** Server-side image compositing produces incorrect Japanese text rendering: missing glyphs (tofu boxes), incorrect character spacing, wrong font weight, fallback to a system font that looks different from the intended design, or broken vertical text layout.

**Why it happens:**
- Noto Sans JP has multiple weight files; the compositing server must have ALL weights installed and explicitly referenced
- Font fallback chains on Linux servers differ from macOS/Windows -- kanji that render correctly in local development produce tofu on the production server
- CJK characters have different advance widths than Latin characters -- mixed JP/Latin text spacing looks wrong if not handled per-script
- Sharp (libvips) has limited text rendering capabilities; node-canvas (Cairo/Pango) is more capable but heavier
- Vertical text (tategaki / 縦書き) requires rotating individual characters, not rotating the entire text block -- `ー` (prolonged sound mark) must rotate 90 degrees, latin characters must rotate, but kanji should not
- Some kanji are rendered differently in JP vs CN font variants (e.g., 骨, 直, 角) -- using a CN-defaulting font stack produces visually incorrect characters for JP readers
- Docker/Linux environments may not have `fontconfig` configured correctly for CJK fonts

**Consequences:**
- Tofu boxes (`□□□□`) instead of text
- Wrong font appearance (Gothic when Mincho was intended)
- Text spacing looks "off" but is hard to pinpoint
- Vertical text is completely broken (characters not rotated correctly)

**Warning signs:**
- Text renders correctly on the developer's Mac but not on the Linux production server
- Tofu appears only for rare kanji (JIS Level 2+)
- Font weight looks different between the dashboard preview and generated images
- Vertical text has `ー` displayed horizontally (not rotated)

**Prevention:**
1. **Bundle fonts explicitly:** Include Noto Sans JP (all weights: Thin through Black) and any other fonts in the Docker image or deployment package. Do NOT rely on system fonts.
2. **Configure fontconfig** in the production environment: create `/etc/fonts/local.conf` mapping Japanese font family names to bundled font files.
3. **Use node-canvas (Cairo/Pango) over Sharp** for text rendering. Sharp is excellent for image manipulation but weak for complex text layout. Composite text layer in node-canvas, then merge with Sharp.
4. **Implement vertical text rendering manually:** For tategaki, position each character individually. Rotate `ー`, `〜`, `…` 90 degrees. Keep kanji upright. Position small kana (`ゃゅょっ`) in the upper-right of the character cell.
5. **Test with JIS Level 2 kanji:** Include rare characters like `鷗`, `瀧`, `芦` in your test suite -- these are the first to fail with incomplete font coverage.
6. **Script-aware spacing:** Detect runs of Latin vs CJK characters and apply different inter-character spacing rules. JIS X 4051 specifies quarter-em spacing between CJK and Latin characters.
7. **Build a visual regression test suite** with reference images generated on a known-correct system.

**Detection:**
- Visual regression tests comparing output against reference images (pixel-level diff)
- Character coverage test: render all JIS Level 1 and Level 2 kanji and check for tofu
- Font inventory check in CI/CD: verify all required font files exist and are loadable

**Phase:** Phase 1-2 (image compositing engine). This is the technical core of the product.

**Severity:** HIGH

**Confidence:** HIGH (CJK font rendering on Linux servers is a well-known challenge; vertical text rendering is a documented gap in most image libraries)

---

### HP-3: Stripe Billing Edge Cases with Credit Metering

**What goes wrong:** Hybrid billing (subscription tiers + metered credit usage) creates edge cases that either cost the business money or anger customers: credits consumed for failed generations, race conditions between credit check and API call, timezone-dependent billing cycles, and Japanese credit card processing quirks.

**Why it happens:**
- **Failed generation credits:** User's credits are deducted when generation starts. If an API fails mid-generation, the credits are gone but the user received nothing. Refund logic is complex -- how many credits for a partial kit?
- **Race conditions:** User has 5 credits remaining. They open two browser tabs and submit two briefs simultaneously. Both pass the credit check, both start generating, but only 5 credits exist. Result: negative credit balance or double-charge.
- **Metered billing reporting:** Stripe metered billing requires usage records to be reported. If the n8n pipeline crashes after generation but before usage reporting, the usage is never billed.
- **JPY billing:** Japanese Yen has no decimal places. Stripe handles this, but any internal calculation that uses cents/decimals will produce errors. JPY 1000 is `1000`, not `10.00`.
- **Japanese credit cards:** Some JP credit cards (especially JCB and some regional bank cards) have specific 3DS2 requirements. Stripe's JP integration may require a JP Stripe account (Stripe Atlas entity) for optimal acceptance rates.
- **Subscription cycle timing:** Japan uses the concept of billing at end-of-month more commonly than anniversary billing. Users may be confused by mid-month subscription starts.

**Consequences:**
- Users lose credits for failed generations and demand refunds (support burden)
- Business loses revenue due to unreported metered usage
- Currency calculation errors produce incorrect charges
- Low credit card acceptance rates for JP customers reduce conversion

**Warning signs:**
- No credit reservation/hold mechanism
- Credits deducted at start of generation with no refund path
- Currency stored as float instead of integer
- No testing with JCB cards
- Usage reporting as a synchronous step in the generation pipeline

**Prevention:**
1. **Credit reservation pattern:** When generation starts, RESERVE credits (mark as pending). On success, CONFIRM the reservation. On failure, RELEASE the reservation. Never deduct credits directly.
2. **Atomic credit operations:** Use PostgreSQL transactions for credit checks and deductions. `SELECT ... FOR UPDATE` on the credit balance row to prevent race conditions.
3. **Asynchronous usage reporting:** Report metered usage to Stripe via a separate, retriable background job, not inline with generation. Use a usage ledger table that persists even if the generation pipeline crashes.
4. **JPY-safe math:** Store all monetary values as integers (JPY has zero decimal places). Use `Stripe.price.create({ currency: 'jpy', unit_amount: 1000 })` not `unit_amount: 10.00`. Test with JPY-specific Stripe test mode.
5. **Partial generation credits:** Define a clear credit cost model: X credits for copy-only kit, Y credits for images+copy, Z credits for full kit. If video fails, only charge for what was delivered. Document this in pricing page.
6. **JP credit card testing:** Create a Stripe JP entity (or Stripe Atlas). Test with JCB test cards. Enable 3DS2 for JP cards.
7. **Idempotent billing:** Use Stripe's `idempotency_key` on all API calls to prevent duplicate charges from retries.

**Detection:**
- Credit balance reconciliation: weekly comparison of credit ledger vs Stripe records vs actual generation counts
- Alert on negative credit balances
- Monitor metered usage reporting failures
- Track credit card decline rates by card type (Visa/Mastercard vs JCB)

**Phase:** Phase 2-3 (billing implementation). The credit reservation pattern must be designed from the start; the JPY-specific concerns can be addressed during billing implementation.

**Severity:** HIGH

**Confidence:** MEDIUM (Stripe JPY handling is documented; JP credit card specifics should be verified against current Stripe JP documentation)

---

### HP-4: AI-Generated Copy Violating Japanese Advertising Law

**What goes wrong:** AI models generate advertising copy that violates Japanese advertising regulations -- specifically the Act Against Unjustifiable Premiums and Misleading Representations (景品表示法 / Keihin Hyoji Ho) and the Pharmaceutical and Medical Device Act (薬機法 / Yakki Ho). The platform delivers legally problematic copy to users who trust it and publish it.

**Why it happens:**
- Claude and other LLMs generate marketing-optimized text that naturally gravitates toward superlatives and efficacy claims -- exactly what Japanese advertising law prohibits
- **Prohibited patterns include:**
  - Absolute superiority claims (`日本一`, `世界初`, `最高品質`) without substantiation
  - Unsubstantiated efficacy claims for cosmetics/supplements (`シミが消える`, `痩せる`, `若返る`)
  - "No.1" claims without specifying survey source, period, and methodology
  - Before/after implied promises (`使用前・使用後`)
  - Double pricing deception (inflated "original price" next to "sale price")
  - Using medical terminology for non-medical products (`治療`, `効果`, `改善`)
- The Pharmaceutical Affairs Act (now Yakki Ho) is especially strict for beauty, health, and food products -- the exact industries likely to be early adopters
- LLMs have no built-in awareness of jurisdiction-specific advertising regulations
- The platform's target users (small agencies, e-commerce merchants) may not have legal review processes

**Consequences:**
- Users publish non-compliant ads, receive warnings or fines from Consumer Affairs Agency (消費者庁)
- Platform reputation damaged by association
- Potential legal liability if platform is seen as the "author" of non-compliant copy
- Fines for misleading representations can be significant (revenue-based penalties introduced in recent amendments)

**Warning signs:**
- No post-generation compliance checking
- Beauty/health product campaigns using efficacy language
- "No.1" or "best" claims without asterisks/disclaimers
- Generated copy includes before/after language

**Prevention:**
1. **Build a compliance flag system (not block system):** The platform should FLAG potentially non-compliant language and require user acknowledgment, not silently remove it. The platform is a tool, not a legal advisor.
2. **Keyword/pattern detection for high-risk terms:**
   - Absolute claims: `日本一`, `世界初`, `No.1`, `最高`, `最安`, `唯一`
   - Medical/efficacy terms: `治る`, `効く`, `改善する`, `予防する`, `シミが消える`
   - Pharmaceutical boundary terms: `効果`, `効能`, `治療`, `医学的`
   - Pricing terms: `通常価格`, `定価`, `メーカー希望小売価格` (when used in comparison)
3. **Industry-aware prompt engineering:** When the brief indicates beauty, health, food, or supplement products, add explicit constraints to the generation prompt: "Do not claim therapeutic effects. Do not use medical terminology. Include `※個人の感想です` (individual impression) for testimonial-style copy."
4. **Disclaimers injection:** For certain claim types, auto-suggest appropriate disclaimers: `※効果には個人差があります`, `※[調査会社名][調査期間]調べ`.
5. **Legal compliance documentation:** Include a prominent disclaimer in the platform that generated copy requires legal review before publication. Make this part of the approval workflow.
6. **Category-specific prompt constraints:** Maintain a database of per-industry prohibited terms and required disclaimers. Beauty products, health foods, financial services, and real estate each have specific regulations.

**Detection:**
- Automated regex scanning of all generated copy against prohibited term database
- Compliance score per campaign kit (percentage of assets with flagged terms)
- Dashboard widget showing flagged items with "Review Required" status

**Phase:** Phase 2-3 (copy generation quality layer). Basic keyword flagging in Phase 2, industry-specific rules in Phase 3.

**Severity:** HIGH

**Confidence:** HIGH (Japanese advertising law requirements are well-documented; 景品表示法 and 薬機法 are publicly available)

---

### HP-5: Image-Text Composition Layout Failures at Small Dimensions

**What goes wrong:** Text that looks fine on large-format images (1200x628 for Yahoo! Display) becomes illegible, overflows, or breaks layout on small formats (LINE thumbnail 240x240, mobile banner 320x50). The same copy cannot simply be scaled -- it must be reflowed, truncated, or replaced with shorter alternatives.

**Why it happens:**
- Japanese text is information-dense but requires larger font sizes for legibility than Latin text (kanji complexity requires minimum ~14px to be readable)
- A headline that fits in 8 Latin characters needs 4-6 kanji but those kanji need larger rendering
- Font size scaling is not linear -- half the dimensions does not mean half the font size, it means the text becomes unreadable
- Small formats like mobile banners have room for 4-8 Japanese characters maximum
- Different platforms have different minimum font size requirements for readability

**Consequences:**
- Text overflows the image boundary
- Text is technically present but unreadable at target display size
- Text truncated mid-character (rendering half a kanji)
- Users upload illegible assets to platforms, get poor ad performance

**Warning signs:**
- Only testing with large-format images
- Using the same headline text across all format sizes
- No minimum font size enforcement
- Text renders fine in the preview modal but is illegible at actual display size

**Prevention:**
1. **Generate copy variants per size class:** Large (full headline), Medium (shortened headline), Small (minimal text -- brand name + CTA only). The AI copy generation step should produce multiple length variants.
2. **Define minimum font size per format:** 24px minimum for display ads, 16px minimum for social, 14px absolute minimum for any format. If the text cannot fit at minimum size, truncate or use the shorter variant.
3. **Text budget per format:** Define maximum character counts per format based on safe zone and minimum font size. Enforce these in the compositing step.
4. **Preview at actual pixel size:** The dashboard should show assets at their actual rendered size, not scaled up. Users need to see what the end viewer sees.
5. **Auto-select copy variant:** The platform formatting step should automatically select the appropriate copy length variant based on the target format dimensions.

**Detection:**
- Automated legibility check: render text at target dimensions, verify font size >= minimum
- Character count validation per format before compositing
- Visual QA grid showing all formats side-by-side at actual size

**Phase:** Phase 2 (multi-format generation). Must be solved before launching multi-format support.

**Severity:** HIGH

**Confidence:** HIGH (Japanese typography legibility constraints are well-established)

---

## Moderate-Severity Pitfalls

Mistakes that cause technical debt, user frustration, or scaling issues.

---

### MP-1: Tri-Script Mixing Rendering Artifacts

**What goes wrong:** Japanese text frequently mixes three scripts (hiragana, katakana, kanji) with Latin characters and numbers. When compositing text onto images, the inter-script spacing, baseline alignment, and font fallback produce visual artifacts: inconsistent spacing between kanji and Latin letters, Latin text at a different baseline than kanji, or numbers in a proportional width where monospace was expected.

**Prevention:**
1. Implement JIS X 4051 inter-character spacing rules: quarter-em space between CJK and Latin/number runs.
2. Use the same font family for CJK and Latin where possible (Noto Sans JP includes Latin glyphs).
3. Test with mixed-script strings: `新商品ABC-123のご紹介` -- verify uniform baseline and consistent spacing.
4. For numbers in prices, use proportional figures for inline text but tabular (monospace) figures for price displays.

**Phase:** Phase 2 (image compositing refinement).
**Severity:** MEDIUM
**Confidence:** HIGH

---

### MP-2: n8n Webhook Reliability for Async API Callbacks

**What goes wrong:** Some AI APIs (especially video generation: Kling, Runway, HeyGen) are asynchronous -- you submit a job and receive a webhook callback when it completes. n8n webhooks can miss callbacks if the n8n process restarts, if the webhook URL changes, or if there is a network interruption. Lost callbacks mean stuck generations that never complete.

**Prevention:**
1. **Polling fallback:** For every async API call, implement both webhook and polling. If no webhook received within the expected time, poll the API for job status.
2. **Webhook URL stability:** Use a stable webhook URL (custom domain, not the n8n-generated URL). Configure a reverse proxy (nginx/Caddy) in front of n8n for URL stability.
3. **Job status table:** Maintain a `generation_jobs` table in PostgreSQL tracking every submitted async job. A cron/scheduled workflow checks for "stuck" jobs (submitted > 10 minutes ago, no callback) and polls their status.
4. **Idempotent callback handling:** Callbacks may arrive multiple times. The handler must be idempotent -- processing the same callback twice should not create duplicate assets.

**Phase:** Phase 1-2 (pipeline architecture).
**Severity:** MEDIUM
**Confidence:** HIGH

---

### MP-3: Campaign Brief Ambiguity Leading to Poor Generation Quality

**What goes wrong:** Users submit vague briefs ("make it look good", "professional feel") and receive generic, low-quality output. The AI cannot compensate for insufficient input. Users blame the platform for poor quality rather than their brief.

**Prevention:**
1. **Structured brief form** with required fields: target audience, key message, tone/register, platform selection, brand colors, CTA text. Reduce free-text fields.
2. **Brief templates** for common campaign types (product launch, seasonal sale, event promotion). Pre-fill with sensible defaults.
3. **Brief quality score:** Before generation, evaluate the brief completeness and warn the user if critical fields are missing.
4. **Example output preview:** Show example outputs for similar brief configurations so users can set expectations.
5. **Iterative refinement:** After first generation, allow users to provide specific feedback ("make headline shorter", "use more formal tone") rather than regenerating from scratch.

**Phase:** Phase 2 (brief enhancement).
**Severity:** MEDIUM
**Confidence:** HIGH

---

### MP-4: Asset Storage and CDN Costs Scaling Unexpectedly

**What goes wrong:** Each campaign kit generates 20-50 assets (images in multiple formats, video files, audio files). Video files alone can be 50-200MB each. At scale, storage costs and CDN egress charges grow faster than subscription revenue.

**Prevention:**
1. **Asset retention policy:** Campaigns older than 90 days have assets moved to cold storage (S3 Glacier / equivalent). Users can re-generate if needed.
2. **Video compression:** Compress video assets to appropriate bitrates for each platform (most social platforms re-encode anyway). Don't store 4K when the platform maximum is 1080p.
3. **Lazy generation for large assets:** Generate video/avatar only when the user explicitly requests it, not as part of the default kit. This reduces storage and API costs for users who only need images and copy.
4. **Cost-per-kit tracking:** Monitor storage cost per campaign kit and include it in the credit cost model.

**Phase:** Phase 3 (scaling and optimization).
**Severity:** MEDIUM
**Confidence:** MEDIUM

---

### MP-5: Seasonal and Cultural Context Failures in AI-Generated Content

**What goes wrong:** AI generates content that is seasonally inappropriate or culturally tone-deaf for the Japanese market. Examples: cherry blossom imagery in autumn campaigns, Christmas themes for New Year (Japanese New Year is distinct from Western Christmas), using the number 4 prominently (associated with death), red ink for names (funeral association), or missing major Japanese commercial seasons (Golden Week, Obon, Shichi-Go-San, year-end gift season / お歳暮).

**Prevention:**
1. **Seasonal context injection:** Based on the campaign date, inject seasonal context into the generation prompt (current season, upcoming holidays, seasonal colors and imagery).
2. **Cultural taboo checklist:** Maintain a list of cultural sensitivities and check generated content against them:
   - Number 4 (四/し = death/死) and 9 (九/く = suffering/苦) prominence
   - Color associations (white = mourning in some contexts, red ink = death)
   - Seasonal imagery matching actual season
   - Avoid mixing religious imagery (Shinto/Buddhist) inappropriately
3. **Japanese commercial calendar:** Build awareness of Japan-specific commercial events: 初売り (New Year sales), バレンタインデー (Valentine's - women give chocolate), ホワイトデー (White Day), 母の日, ゴールデンウィーク, お中元, お盆, 七五三, お歳暮, クリスマス, 年末年始.
4. **User confirmation for seasonal content:** If the campaign date is near a major season, prompt the user to confirm whether they want seasonal theming.

**Phase:** Phase 2-3 (content quality layer).
**Severity:** MEDIUM
**Confidence:** HIGH

---

### MP-6: HeyGen/Avatar API Output Quality for Japanese Speakers

**What goes wrong:** AI avatar services produce lip-sync and facial expressions optimized for English. Japanese speech has different mouth movements (fewer open vowels, different lip rounding for う-sounds, less jaw movement overall). The result looks uncanny -- lip movements don't match the audio, making the avatar feel obviously fake to Japanese viewers.

**Prevention:**
1. **Evaluate avatar quality for JP audio** before committing to HeyGen. Generate test videos with Japanese voiceover and have native speakers evaluate natural-ness.
2. **Choose JP-presenting avatars** that match the target demographic. Western-presenting avatars speaking Japanese create cognitive dissonance.
3. **Consider avatar as a premium/optional feature** rather than default. If quality is insufficient, don't include it in the standard kit -- make it opt-in with a quality disclaimer.
4. **Audio-first approach:** If avatar lip-sync quality is poor, offer a "voice + static image" or "voice + motion graphics" alternative that avoids the uncanny valley.

**Phase:** Phase 3 (avatar/video features).
**Severity:** MEDIUM
**Confidence:** MEDIUM (avatar API capabilities for Japanese should be verified against current HeyGen documentation and output samples)

---

### MP-7: Rate Limiting Across Concurrent Campaign Generations

**What goes wrong:** The system is designed for 3 concurrent campaign generations. Each generation makes 10-20 API calls across 6 providers. At 3 concurrent generations, that is 30-60 API calls within a short window. API rate limits are per-account (not per-campaign), so concurrent generations compete for the same quota and trigger rate limiting.

**Prevention:**
1. **Global rate limiter:** Implement a centralized rate limiter (Redis-based) that tracks API calls across all concurrent generations. Queue API calls when approaching provider limits.
2. **Per-provider concurrency limits:** Configure maximum concurrent requests per API provider (e.g., max 5 concurrent Flux requests, max 2 concurrent Kling requests).
3. **Priority queuing:** If rate limited, prioritize completing in-progress campaigns over starting new ones. A user waiting for a kit that is 80% done should not be blocked by a new kit starting.
4. **Stagger heavy operations:** Video and avatar generation are the slowest and most rate-limited. Stagger these across concurrent generations rather than launching all simultaneously.

**Phase:** Phase 2-3 (concurrency management).
**Severity:** MEDIUM
**Confidence:** HIGH

---

## Minor Pitfalls

Mistakes that cause annoyance or minor rework but are fixable.

---

### LP-1: Half-Width / Full-Width Character Inconsistency

**What goes wrong:** Japanese text uses both full-width (`！？０-９Ａ-Ｚ`) and half-width (`!?0-9A-Z`) characters. AI models inconsistently mix these within the same text block. Full-width numbers in prices (`１，９８０円`) look outdated; half-width punctuation in formal text looks careless.

**Prevention:**
1. Post-process all generated text to normalize width: half-width for numbers and Latin letters, full-width for Japanese punctuation (`！？、。`).
2. Define normalization rules per register: formal copy uses full-width punctuation, casual copy may use half-width.
3. Use a normalization library or regex-based converter as a pipeline step after every copy generation.

**Phase:** Phase 2 (copy post-processing).
**Severity:** MEDIUM (downgraded to minor because it is easily fixable with post-processing)
**Confidence:** HIGH

---

### LP-2: Inconsistent Date/Time Formatting for Japanese Audience

**What goes wrong:** Generated copy uses Western date formats (`2/14/2026`) instead of Japanese formats (`2026年2月14日` or `令和8年2月14日`). Time displayed in 12-hour format with AM/PM instead of 24-hour format. Day-of-week in English instead of Japanese (`月火水木金土日`).

**Prevention:**
1. All dates in generated copy should use Japanese format: `YYYY年M月D日（曜日）`
2. Implement date formatting utility that converts any date to Japanese format with optional era year (令和).
3. Add date format validation to the copy post-processing pipeline.

**Phase:** Phase 2 (copy post-processing).
**Severity:** LOW
**Confidence:** HIGH

---

### LP-3: Overly Literal Translation of Brand Terminology

**What goes wrong:** When brand names, product names, or slogans include English words, AI models sometimes translate them into Japanese when they should be transliterated to katakana, or leave them in English when the Japanese market convention is to use katakana. Example: "Spring Collection" should become `スプリングコレクション`, not `春のコレクション` (unless that is the brand's preference).

**Prevention:**
1. Brand profile should include a glossary of terms with preferred Japanese rendering (katakana, kanji, or keep English).
2. Include brand term glossary in every generation prompt.
3. Post-generation validation against brand glossary.

**Phase:** Phase 2 (brand profile features).
**Severity:** LOW
**Confidence:** HIGH

---

### LP-4: Email Sequence Generation Without Japanese Email Conventions

**What goes wrong:** AI generates email sequences following Western conventions: short subject lines, single CTA, minimal formatting. Japanese business emails have different conventions: specific greeting structures (`いつもお世話になっております`), seasonal greetings (時候の挨拶), closing formulas (`何卒よろしくお願いいたします`), and longer, more detailed body text. Marketing emails in Japan also tend to be more text-heavy than Western equivalents.

**Prevention:**
1. Include Japanese email structure templates in generation prompts: opening greeting, seasonal reference, main body, closing formula, signature block.
2. Register-appropriate email conventions: B2B emails require full keigo structure; B2C emails can be more casual but still need proper opening/closing.
3. Subject line length conventions: Japanese email subjects should be concise but often include brackets for categorization: `【お知らせ】`, `【期間限定】`.

**Phase:** Phase 2-3 (email generation features).
**Severity:** LOW
**Confidence:** HIGH

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation | Ref |
|-------------|---------------|------------|-----|
| Foundation / Pipeline Architecture | Encoding corruption across service boundaries | UTF-8 contract + canary string test | CP-1 |
| Foundation / Pipeline Architecture | n8n workflow becomes unmanageable | Sub-workflow decomposition from day one | HP-1 |
| Foundation / Pipeline Architecture | No cost controls on AI API calls | Circuit breakers + cost ceiling per generation | CP-5 |
| Foundation / Pipeline Architecture | Webhook callbacks lost for async APIs | Polling fallback + job status table | MP-2 |
| Image Compositing | Kinsoku shori violations | Dedicated text layout engine | CP-2 |
| Image Compositing | Font rendering failures on Linux server | Bundle fonts explicitly, use node-canvas | HP-2 |
| Image Compositing | Small format text illegibility | Size-class copy variants + minimum font size | HP-5 |
| Copy Generation | Keigo register drift across assets | Register profiles + validation + low temperature | CP-3 |
| Copy Generation | Advertising law violations | Compliance flag system + prohibited term DB | HP-4 |
| Copy Generation | Half-width/full-width inconsistency | Post-processing normalization | LP-1 |
| Multi-Platform Formatting | Platform spec non-compliance | Spec registry + post-generation validation | CP-4 |
| Multi-Platform Formatting | Format spec changes silently | Quarterly audit process + canary submissions | CP-4 |
| Billing | Credits consumed for failed generations | Reservation pattern (pending/confirm/release) | HP-3 |
| Billing | JPY decimal errors | Integer-only currency math | HP-3 |
| Video / Avatar Features | JP lip-sync quality insufficient | Evaluate before committing; offer alternatives | MP-6 |
| Scaling | Rate limiting across concurrent generations | Global rate limiter + priority queuing | MP-7 |
| Scaling | Storage costs growing faster than revenue | Retention policy + lazy generation | MP-4 |
| Content Quality | Seasonal/cultural inappropriateness | Seasonal context injection + cultural taboo checklist | MP-5 |

---

## Risk Heat Map

| Pitfall | Probability | Impact | Detectability | Risk Score |
|---------|-------------|--------|---------------|------------|
| CP-1: Mojibake in pipeline | Very High | Critical | Medium | CRITICAL |
| CP-2: Kinsoku shori violations | Very High | High | Low (subtle) | CRITICAL |
| CP-3: Keigo register drift | High | High | Medium | CRITICAL |
| CP-4: Platform format rejection | High | High | High (testable) | HIGH |
| CP-5: API cascade / cost explosion | High | Critical | Medium | CRITICAL |
| HP-1: n8n complexity explosion | High | High | Low (gradual) | HIGH |
| HP-2: Font rendering failures | Medium | High | High (visible) | HIGH |
| HP-3: Billing edge cases | Medium | High | Low (rare events) | HIGH |
| HP-4: Advertising law violations | High | Very High | Medium | HIGH |
| HP-5: Small format text issues | High | Medium | Medium | MEDIUM |
| MP-5: Cultural context failures | Medium | Medium | Low | MEDIUM |
| MP-7: Rate limiting at concurrency | Medium | Medium | High | MEDIUM |

---

## Sources and Confidence Notes

| Topic | Source | Confidence | Verification Needed |
|-------|--------|------------|---------------------|
| Kinsoku shori rules | JIS X 4051, W3C JLREQ (training data) | HIGH | Verify specific character classes against W3C JLREQ spec |
| Japanese advertising law | 景品表示法, 薬機法 (training data) | HIGH | Verify recent amendments and penalty structures against current Consumer Affairs Agency publications |
| n8n scaling limitations | n8n documentation (training data) | HIGH | Verify queue mode configuration against current n8n docs |
| Stripe JPY handling | Stripe documentation (training data) | MEDIUM | Verify JP-specific Stripe features and JCB support against current Stripe JP docs |
| AI API operational patterns | Industry experience (training data) | HIGH | Verify specific rate limits per provider against current API docs |
| LINE/Yahoo!/Rakuten specs | Training data (may be outdated) | MEDIUM | MUST verify all platform specs against current documentation before implementation |
| HeyGen JP lip-sync quality | Training data (limited) | LOW | Must evaluate with actual JP audio samples |
| Image library capabilities | Sharp/node-canvas docs (training data) | HIGH | Verify current Sharp text capabilities against latest release |
| Font rendering on Linux | CJK rendering experience (training data) | HIGH | Test with actual Docker/Linux environment |

**Overall confidence note:** WebSearch and WebFetch were unavailable during this research session. All findings are based on training data (cutoff May 2025). Platform-specific specifications (LINE, Yahoo! JAPAN, Rakuten) and current AI API pricing/limits should be verified against live documentation before implementation. The core linguistic and typographic pitfalls (kinsoku shori, keigo, encoding) are stable knowledge that does not change frequently and can be relied upon with HIGH confidence.

---

*Last updated: 2026-02-06*
