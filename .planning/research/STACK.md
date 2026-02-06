# Technology Stack

**Project:** AI Content Studio
**Researched:** 2026-02-06
**Research mode:** Ecosystem (Stack dimension)
**Overall confidence:** MEDIUM — Based on training data (cutoff May 2025). Versions should be verified against npm/official docs before `package.json` creation. Core architectural recommendations are HIGH confidence; specific version pins are MEDIUM.

---

## Recommended Stack

### Core Framework — Next.js on Vercel

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Next.js | ^15.x (verify latest) | Full-stack framework | App Router with RSC for dashboard; API Routes for webhook handlers; Edge Runtime for Tokyo-edge SSR; built-in image optimization; i18n routing for ja locale | HIGH |
| React | ^19.x | UI layer | Required by Next.js 15; Server Components reduce client JS bundle; concurrent features for complex dashboard grids | HIGH |
| TypeScript | ^5.6+ | Type safety | Essential for complex multi-provider API response types; campaign schema validation; prevents runtime errors across 6 AI provider integrations | HIGH |
| Vercel | Platform | Hosting & deployment | Tokyo edge CDN (hnd1 region); zero-config Next.js deployment; preview deploys for staging; built-in analytics; serverless functions for webhooks | HIGH |

**Why Next.js over alternatives:**
- **Not Remix:** Vercel-native deployment is zero-friction; Remix's streaming strengths matter less for a dashboard app where most data is fetched server-side
- **Not Nuxt/SvelteKit:** React ecosystem has deeper Japanese community support, more UI component libraries with JP locale support
- **Not plain React SPA:** Need server-side API routes for n8n webhooks, SSR for initial dashboard load speed, and Edge Runtime for Tokyo-region server rendering

**App Router (not Pages Router):** The project is greenfield. App Router is the current standard. Server Components significantly reduce client bundle for a dashboard that's mostly data display. Layouts give natural dashboard shell structure.

### Database — Supabase PostgreSQL (Tokyo Region)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Supabase | Platform | Managed PostgreSQL + Auth + Storage | Tokyo region (ap-northeast-1); built-in Row Level Security; real-time subscriptions for campaign progress updates; Auth with email/password + social; Storage for temporary asset staging | HIGH |
| PostgreSQL | 15+ (Supabase managed) | Primary database | JSONB for flexible campaign briefs and AI response caching; strong typing for billing records; mature full-text search for campaign history | HIGH |
| @supabase/supabase-js | ^2.x (verify latest) | Client SDK | Type-safe queries; real-time subscriptions; auth helpers for Next.js | MEDIUM |
| Drizzle ORM | ^0.34+ (verify latest) | Type-safe SQL | Lightweight, SQL-first ORM; excellent TypeScript inference; no heavy abstraction layer; works alongside direct Supabase client for real-time features | MEDIUM |

**Why Supabase over Neon:**
- **Auth included:** Supabase Auth eliminates a separate auth service (no need for NextAuth/Clerk). Supports email/password, Google, and magic link flows out of the box
- **Real-time built-in:** Campaign generation progress (6 AI providers completing in parallel) naturally maps to Supabase real-time subscriptions. The dashboard can show live progress without polling
- **Storage included:** Supabase Storage in Tokyo region provides S3-compatible storage for temporary asset staging before final delivery, avoiding a separate storage service setup
- **Row Level Security:** Multi-tenant SaaS data isolation via RLS policies, not application-layer filtering — more secure by default

**Why not Neon:**
- Neon is excellent for pure PostgreSQL, but this project benefits from Supabase's integrated platform (Auth + Storage + Real-time). Neon would require adding separate services for each of those, increasing operational complexity
- Neon's serverless branching is nice but not critical for this use case

**Why Drizzle ORM over Prisma:**
- **Lighter runtime:** Drizzle has no query engine binary; Prisma's engine adds ~10MB+ to serverless functions and increases cold starts on Vercel
- **SQL-first:** Drizzle generates SQL that looks like SQL. For complex campaign queries (JOIN across users, campaigns, assets, billing), this is more predictable
- **Edge compatible:** Drizzle works in Vercel Edge Runtime; Prisma historically had Edge compatibility issues (Prisma Accelerate required)
- **Not Prisma:** Prisma's cold start penalty in serverless and its abstraction overhead are not justified here. Drizzle gives type safety without the weight

### Object Storage — S3-Compatible (Tokyo Region)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Supabase Storage | Included | Temporary asset staging | Same platform; simple API; Tokyo region; RLS-protected buckets; presigned URLs for secure downloads | HIGH |
| Cloudflare R2 | Service | Primary asset delivery + long-term storage | Zero egress fees (critical for SaaS with large media files); S3-compatible API; global CDN; Workers for signed URL generation | HIGH |
| @aws-sdk/client-s3 | ^3.x | S3-compatible client | Works with both Supabase Storage and R2; presigned URL generation; multipart uploads for large video files | HIGH |

**Storage architecture recommendation:**
1. **Supabase Storage** — Temporary staging. n8n uploads AI-generated assets here during generation. Dashboard reads from here for preview
2. **Cloudflare R2** — Long-term storage + delivery. After campaign approval, assets are moved to R2. Campaign kit ZIP downloads served from R2. Zero egress fees prevent cost explosion as user base grows

**Why R2 over AWS S3:**
- **Zero egress:** A campaign kit with 20+ assets (images, videos, audio) could be 500MB+. At scale, S3 egress ($0.09/GB) would dominate hosting costs. R2 has zero egress fees
- **S3-compatible:** Same SDK, same presigned URL patterns, drop-in replacement
- **R2 has Tokyo PoP:** Content is served from Tokyo edge, matching latency requirements

**Why not Supabase Storage alone:**
- Supabase Storage is great for auth-gated temporary files but lacks R2's egress-free economics for public/shared delivery at scale. Use both.

### Authentication

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Supabase Auth | Included | User authentication | Bundled with Supabase; email/password + Google OAuth; JWT-based sessions; middleware integration for Next.js; RLS policies use auth.uid() | HIGH |
| @supabase/ssr | ^0.5+ | Next.js auth helpers | Server-side auth in App Router; cookie-based session management; middleware protection for routes | MEDIUM |

**Why not NextAuth (Auth.js) or Clerk:**
- **Supabase Auth is free and bundled:** No separate service, no additional API calls, no per-MAU pricing (Clerk charges per MAU)
- **RLS integration:** Supabase Auth JWTs automatically work with Row Level Security policies — the database enforces data isolation, not just the application layer
- **Simpler stack:** One less service to manage. Auth, database, storage, and real-time all from one platform

### Billing — Stripe Hybrid Model

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Stripe | API v2024+ | Payment processing | Industry standard; supports Japanese market (JPY); subscription + metered billing in one platform; Stripe Tax for JP consumption tax | HIGH |
| stripe (Node SDK) | ^17.x (verify) | Server-side SDK | Webhook handling; subscription management; usage record reporting | MEDIUM |
| @stripe/stripe-js | ^4.x (verify) | Client SDK | Checkout Session redirect; Payment Element for card collection; secure tokenization | MEDIUM |

**Billing architecture — Hybrid model:**

```
Subscription Tiers (monthly, JPY):
  Starter:  Y9,800/mo  — 50 credits/mo, 3 platforms
  Business: Y29,800/mo — 200 credits/mo, all platforms
  Agency:   Y98,000/mo — 1000 credits/mo, all platforms, API access, priority queue

Credit Top-Ups (on-demand, JPY):
  10 credits:  Y2,980
  50 credits:  Y12,800
  200 credits: Y44,800

Credit Costs Per Generation:
  Image (single):     1 credit
  Copy (full set):    1 credit
  Video (15s):        3 credits
  Video (30s):        5 credits
  Avatar video:       5 credits
  Cinematic video:    8 credits
  Full campaign kit:  ~15-25 credits (varies by platforms selected)
```

**Stripe implementation pattern:**
1. **Stripe Subscriptions** with `metered` billing items for credit usage
2. **Stripe Checkout** for subscription sign-up and credit top-up purchases
3. **Stripe Webhooks** to Next.js API route for subscription lifecycle events
4. **Usage Records API** — After each generation, report credit consumption to Stripe
5. **Stripe Customer Portal** for self-service plan changes and payment method updates
6. **Stripe Tax** for automatic JP consumption tax (10%) calculation

**Why not LemonSqueezy or Paddle:**
- Stripe has native JPY support with Japanese payment methods (konbini, bank transfer)
- Stripe's metered billing API is mature; LemonSqueezy and Paddle lack equivalent metered usage reporting
- Stripe Tax handles JP consumption tax automatically

### AI Orchestration — n8n (Self-Hosted)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| n8n | Latest stable (self-hosted) | AI workflow orchestration | Visual workflow builder; parallel branch execution; error handling per branch; HTTP Request node for all AI APIs; webhook triggers from Next.js; credential management for 6 API keys | HIGH |
| Docker + Docker Compose | Latest | n8n deployment | Reproducible deployment; easy upgrades; volume mounts for persistence | HIGH |

**n8n Workflow Patterns for AI Orchestration:**

#### Pattern 1: Webhook-Triggered Campaign Generation

```
Next.js API Route
  |
  v
n8n Webhook Node (receives campaign brief JSON)
  |
  v
Set Node (normalize brief, extract parameters)
  |
  v
Split In Batches / Parallel Branches (fan-out)
  |
  +---> Branch 1: Claude API (copy generation)
  |       |-> HTTP Request to Anthropic API
  |       |-> Parse response, extract copy variants
  |
  +---> Branch 2: Flux 1.1 Pro Ultra (image generation)
  |       |-> HTTP Request to Flux API (replicate/bfl)
  |       |-> Poll for completion (Wait + HTTP loop)
  |       |-> Download generated images
  |
  +---> Branch 3: ElevenLabs (TTS generation)
  |       |-> Depends on Branch 1 (needs copy text)
  |       |-> HTTP Request to ElevenLabs API
  |       |-> Download audio files
  |
  +---> Branch 4: Kling 3.0 (video generation)
  |       |-> Depends on Branch 2 (needs base images)
  |       |-> HTTP Request to Kling API
  |       |-> Poll for completion
  |
  +---> Branch 5: HeyGen (avatar video)
  |       |-> Depends on Branch 1 + Branch 3 (needs script + audio)
  |       |-> HTTP Request to HeyGen API
  |       |-> Poll for completion
  |
  +---> Branch 6: Runway Gen-4 (cinematic video)
  |       |-> Depends on Branch 2 (needs base images)
  |       |-> HTTP Request to Runway API
  |       |-> Poll for completion
  |
  v
Merge Node (wait for all branches)
  |
  v
HTTP Request (callback to Next.js with results)
  |
  v
Supabase Node (update campaign status)
```

#### Pattern 2: Dependency-Aware Parallel Execution

The 6 AI providers have dependencies:
```
Phase 1 (parallel, no deps):
  - Claude (copy) --------+
  - Flux (images) --------+---> ~10-30s each

Phase 2 (parallel, depends on Phase 1):
  - ElevenLabs (TTS) <--- needs Claude copy
  - Kling (video) <------ needs Flux images
  - Runway (cinematic) <- needs Flux images

Phase 3 (depends on Phase 1 + 2):
  - HeyGen (avatar) <---- needs Claude script + ElevenLabs audio

Phase 4 (compositing, depends on all):
  - JP text overlay <---- needs Flux images + Claude copy
  - Asset packaging
```

**n8n implementation:** Use the **Merge** node in "Wait for All" mode between phases. Phase 1 branches run in parallel. Merge collects results. Phase 2 branches fan out with Phase 1 data. This gives maximum parallelism while respecting dependencies.

#### Pattern 3: Polling for Async AI APIs

Most AI APIs (Flux, Kling, Runway, HeyGen) are async — you submit a job and poll for results.

```
HTTP Request (submit generation job)
  |
  v
Wait Node (30 seconds)
  |
  v
HTTP Request (check job status)
  |
  v
IF Node (status === "completed"?)
  |
  YES --> Continue to next step
  NO --> Loop back to Wait Node (with max retries)
```

**n8n-specific tips:**
- Use the **Wait** node (not JavaScript setTimeout) for polling delays
- Set **max retries** (e.g., 20 iterations x 30s = 10 min max wait) to prevent infinite loops
- Use **Error Trigger** workflow to handle API failures gracefully
- Store intermediate results in Supabase via the **Supabase** node after each AI provider completes, so the dashboard can show progressive updates

#### Pattern 4: Fallback Routing

```
HTTP Request (primary provider)
  |
  v
IF Node (error or timeout?)
  |
  YES --> HTTP Request (fallback provider)
  NO --> Continue with primary result
```

Configure per-provider fallbacks:
- Flux -> DALL-E 3 (fallback image gen)
- Kling -> Runway (fallback video gen)
- ElevenLabs -> OpenAI TTS (fallback voice)
- Claude -> GPT-4o (fallback copy, but loses keigo specialization)

#### Pattern 5: Progress Reporting via Webhooks

After each AI provider completes, fire a webhook back to Next.js:

```
[AI Provider completes]
  |
  v
HTTP Request Node (POST to Next.js /api/campaigns/[id]/progress)
  Body: { provider: "flux", status: "completed", assetUrl: "..." }
  |
  v
Next.js API Route --> Supabase update --> Real-time subscription fires --> Dashboard updates
```

This gives users live progress: "Copy: Done, Images: Done, Video: Generating (45%)..."

### Image Processing — Server-Side Compositing Pipeline

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Sharp | ^0.33+ (verify latest) | Image manipulation | Fastest Node.js image library (libvips-based); resize, composite, format conversion; SVG overlay support for text compositing; AVIF/WebP output | HIGH |
| @resvg/resvg-js | ^2.6+ | SVG to raster | Renders SVG (with embedded fonts) to PNG for compositing with Sharp; handles complex text layout SVGs; Rust-based, fast | HIGH |
| opentype.js | ^1.3+ | Font metrics | Parses OTF/TTF fonts for precise text measurement; needed for kinsoku shori line-break calculations; glyph-level metrics for kerning | HIGH |
| Satori | ^0.12+ (verify) | HTML/CSS to SVG | Vercel's library for generating SVG from JSX; used by next/og; handles font embedding; good for structured text layouts | MEDIUM |
| Noto Sans JP | Font files | Japanese typography | Google's open-source JP font; full kanji coverage; multiple weights (Regular, Medium, Bold); variable font available | HIGH |
| M PLUS Rounded 1c | Font files | Secondary JP font | Rounded, friendly aesthetic for casual campaigns; open source; full JP coverage | HIGH |

**Japanese Text Compositing Pipeline:**

This is the most technically complex part of the stack. AI models (Flux, DALL-E, etc.) cannot reliably render Japanese text. The hybrid approach is:

1. **AI generates base image** (no text, or text removed/ignored)
2. **Server-side compositing** adds Japanese text with correct typography

```
Step 1: Text Layout Calculation
  - Input: copy text (JP), font, size, area dimensions, layout mode (horizontal/vertical)
  - opentype.js parses font, gets glyph metrics
  - Apply kinsoku shori rules (line-break prohibitions)
  - Calculate line breaks, character positions
  - Handle tate-chu-yoko (horizontal numbers in vertical text)
  - Output: positioned glyph array with (x, y, char) for each character

Step 2: SVG Generation
  - Build SVG with positioned <text> elements
  - Embed font as base64 in SVG (for resvg-js to render correctly)
  - Apply text styling (color, stroke, shadow, outline)
  - Handle furigana (ruby text) positioning if needed

Step 3: SVG to Raster
  - resvg-js renders SVG to PNG with alpha channel
  - High-DPI rendering (2x) for crisp text on retina displays

Step 4: Composite onto Base Image
  - Sharp composites the text PNG onto the AI-generated base image
  - Apply blending modes if needed (multiply for dark backgrounds, screen for light)
  - Output final image in required format/dimensions per ad platform
```

**Kinsoku Shori Implementation Notes:**

Kinsoku shori (禁則処理) are Japanese typographic rules that prohibit certain characters from appearing at the start or end of a line. This is NOT optional for professional Japanese advertising.

```typescript
// Characters that CANNOT start a line (gyomatsu kinsoku)
const LINE_START_PROHIBITED = [
  '、', '。', '，', '．', '・', '：', '；', '？', '！',
  '）', '】', '》', '」', '』', '〕', '｝', '〉',
  'ー', '～', '…', '‥',
  'っ', 'ぁ', 'ぃ', 'ぅ', 'ぇ', 'ぉ', 'ゃ', 'ゅ', 'ょ',
  'ッ', 'ァ', 'ィ', 'ゥ', 'ェ', 'ォ', 'ャ', 'ュ', 'ョ',
];

// Characters that CANNOT end a line (gyotou kinsoku)
const LINE_END_PROHIBITED = [
  '（', '【', '《', '「', '『', '〔', '｛', '〈',
];
```

These rules must be enforced during the line-break calculation in Step 1. The `opentype.js` glyph metrics + these prohibition tables produce correct line breaks.

**Vertical text (tategaki) considerations:**
- Characters rotate 90 degrees (except Latin/numbers which use tate-chu-yoko)
- Punctuation positions shift (。goes to top-right, not bottom-left)
- Line progression is right-to-left
- This is primarily used for DOOH and In-Store POP formats
- Implementation: SVG `writing-mode: vertical-rl` with manual adjustments for punctuation

### Video Processing

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| FFmpeg | 6.x+ (system binary) | Video processing | Industry standard; resize, crop, concatenate, add audio tracks, format conversion; text overlay via drawtext filter (backup for JP text on video) | HIGH |
| fluent-ffmpeg | ^2.1+ | FFmpeg Node.js wrapper | Chainable API for FFmpeg commands; async execution with progress events; handles complex filter graphs | HIGH |

**Video processing use cases:**
1. **Aspect ratio conversion:** AI generates 16:9; need 9:16 (TikTok), 1:1 (Instagram), 4:5 (LINE)
2. **Audio mixing:** Overlay ElevenLabs TTS onto Kling/Runway video
3. **Title card compositing:** Add JP text frames to beginning/end of video
4. **Format encoding:** H.264 for web delivery; H.265 for higher compression; MP4 container
5. **Thumbnail extraction:** Pull key frame for campaign grid preview

**Where to run FFmpeg:**
- NOT on Vercel (serverless has no FFmpeg binary and 50MB function limit)
- On the **n8n VPS** (same server, Execute Command node) or a **dedicated media processing VPS**
- Consider a Docker sidecar with FFmpeg pre-installed alongside n8n

### Campaign Asset Packaging

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| archiver | ^7.0+ | ZIP generation | Stream-based ZIP creation; add files from buffers or streams; important for large campaign kits (500MB+) without memory exhaustion | HIGH |
| mime-types | ^2.1+ | MIME type detection | Correct Content-Type headers for varied asset types (PNG, MP4, MP3, PDF) | HIGH |

### UI Component Layer

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Tailwind CSS | ^4.x (verify) | Utility CSS | Rapid UI development; excellent responsive design; purges unused CSS; great DX with VS Code IntelliSense | HIGH |
| shadcn/ui | Latest | Component primitives | Copy-paste components (not npm dependency); fully customizable; built on Radix UI; accessible; works with Tailwind | HIGH |
| Radix UI | ^1.x | Accessible primitives | Underlying primitives for shadcn/ui; handles keyboard navigation, focus management, ARIA attributes | HIGH |
| Lucide React | ^0.460+ | Icons | Clean icon set; tree-shakeable; consistent with shadcn/ui aesthetic | MEDIUM |
| next-intl | ^3.x (verify) | Internationalization | App Router compatible; server component support; message format for Japanese pluralization rules (which differ from English) | MEDIUM |
| Zustand | ^5.x (verify) | Client state | Lightweight global state for campaign builder UI state; simpler than Redux; works with React 19 | MEDIUM |
| TanStack Query | ^5.x | Server state | Campaign list caching, optimistic updates for approval workflow, polling for generation status (supplement to Supabase real-time) | MEDIUM |
| react-dropzone | ^14.x | File upload | Brand asset uploads (logos, product images); drag-and-drop; file type validation | MEDIUM |
| Framer Motion | ^11.x | Animation | Campaign grid transitions; progress animations; subtle polish for premium SaaS feel | LOW (nice-to-have) |

**UI architecture note:** The dashboard is Japanese-first, not English-translated-to-Japanese. This means:
- Default locale is `ja`, English is secondary
- Button text lengths differ (Japanese is often more compact)
- Form layouts accommodate vertical text labels where culturally appropriate
- Date formatting: 2026年2月6日 (Japanese era year optional)
- Currency: always JPY with Y or 円 symbol, no decimal points

### Email / Notifications

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Resend | Service | Transactional email | Simple API; React Email templates; generous free tier (3K emails/mo); good deliverability | MEDIUM |
| React Email | ^3.x (verify) | Email templates | JSX email templates; consistent with React codebase; preview in browser during development | MEDIUM |

### Monitoring / Observability

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Sentry | ^8.x | Error tracking | Captures errors across Next.js (client + server), n8n webhooks; source maps; performance tracing | HIGH |
| Vercel Analytics | Included | Web analytics | Built-in with Vercel; Core Web Vitals; no extra setup | HIGH |
| Upstash Redis | Service | Rate limiting + queue | Tokyo region available; serverless Redis; rate limit API calls per user; queue campaign generation requests | MEDIUM |

**Why Upstash Redis:**
- Rate limiting for the generation API (prevent credit abuse)
- Campaign generation queue (FIFO, max 3 concurrent per constraint)
- Short-lived cache for AI API responses (dedup identical requests within 5 min)
- Tokyo region = low latency from Next.js Edge Runtime

### Development Tooling

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| pnpm | ^9.x | Package manager | Faster than npm; strict dependency resolution; disk-efficient; workspace support for future monorepo | HIGH |
| ESLint | ^9.x | Linting | Flat config format; Next.js plugin; TypeScript-aware | HIGH |
| Prettier | ^3.x | Formatting | Consistent code style; integrates with ESLint | HIGH |
| Vitest | ^2.x | Unit testing | Fast, Vite-based; compatible with Jest API; native TypeScript/ESM | HIGH |
| Playwright | ^1.48+ | E2E testing | Cross-browser; reliable; Vercel integration; can test JP text rendering | MEDIUM |
| Husky + lint-staged | Latest | Git hooks | Pre-commit linting; prevent broken code from being committed | MEDIUM |
| Docker Compose | Latest | Local dev environment | Run n8n, PostgreSQL, and Redis locally for development | HIGH |

---

## n8n-Specific Deep Dive

### n8n Nodes Used

| Node | Purpose | Configuration Notes |
|------|---------|-------------------|
| **Webhook** | Receive campaign briefs from Next.js | POST method; JSON body; respond with 202 Accepted immediately (async processing) |
| **HTTP Request** | Call all 6 AI provider APIs | Set per-provider authentication; configure timeout (120s for image gen, 300s for video gen) |
| **IF** | Conditional branching | Check API response status; check if optional providers are requested in brief |
| **Merge** | Wait for parallel branches | "Wait for All" mode to synchronize after parallel AI calls |
| **Wait** | Polling delay for async APIs | 15-30 second intervals; combine with loop for status checking |
| **Set** | Data transformation | Normalize AI API responses to common schema; extract URLs from responses |
| **Code** | Custom JavaScript | Kinsoku shori calculations; complex data transformations; credit cost calculation |
| **Supabase** | Database operations | Update campaign status; store asset metadata; log credit usage |
| **Error Trigger** | Error handling | Catch provider failures; trigger fallback routing; send error webhooks |
| **Switch** | Multi-path routing | Route to different providers based on brief parameters (e.g., video style selection) |
| **Loop Over Items** | Batch processing | Process multiple platform-specific formats from single generation |
| **Execute Command** | System commands | Run FFmpeg for video processing; run Sharp-based compositing scripts |

### n8n Credential Management

Store all AI provider API keys in n8n's credential store (encrypted at rest):
- Anthropic API key (Claude)
- BFL / Replicate API key (Flux 1.1 Pro Ultra)
- Kling API key
- ElevenLabs API key
- HeyGen API key
- Runway API key
- Supabase service role key
- Stripe secret key (for webhook verification)

### n8n Environment Recommendations

| Setting | Value | Reason |
|---------|-------|--------|
| `EXECUTIONS_TIMEOUT` | 600 (10 min) | Campaign generation can take up to 5 minutes; add buffer |
| `EXECUTIONS_TIMEOUT_MAX` | 900 (15 min) | Hard ceiling for runaway workflows |
| `N8N_PAYLOAD_SIZE_MAX` | 256 (MB) | Large video files pass through n8n |
| `EXECUTIONS_DATA_PRUNE` | true | Prevent disk exhaustion from execution history |
| `EXECUTIONS_DATA_MAX_AGE` | 168 (hours / 7 days) | Keep 7 days of execution data for debugging |
| `N8N_CONCURRENCY_PRODUCTION_LIMIT` | 5 | Limit concurrent workflow executions to prevent VPS overload |

---

## Japanese Typography Deep Dive

### Font Stack

| Font | Weight Range | Use Case | License |
|------|-------------|----------|---------|
| Noto Sans JP | 100-900 | Primary UI + ad copy text | OFL (Open Font License) |
| Noto Serif JP | 200-900 | Premium/luxury campaigns | OFL |
| M PLUS Rounded 1c | 100-900 | Casual/friendly campaigns (beauty, F&B) | OFL |
| M PLUS 1p | 100-900 | Technical/clean campaigns | OFL |
| Zen Kaku Gothic New | 300-900 | Modern, geometric alternative | OFL |

**Font file strategy:**
- Bundle font files in the server-side compositing service (NOT downloaded at runtime)
- Use `.otf` format for opentype.js compatibility
- Pre-subset fonts if possible (remove unused kanji ranges for faster loading in web dashboard)
- For web dashboard: use `next/font` with `google` provider for Noto Sans JP; self-host for compositing service

### Text Processing Libraries

| Library | Purpose | Notes |
|---------|---------|-------|
| opentype.js | Glyph metrics, font parsing | Essential for precise character positioning in kinsoku shori calculations |
| budoux | Japanese line-break estimation | Google's ML-based Japanese word segmenter; better than naive character-based breaking; helps determine natural break points before applying kinsoku shori rules |
| TinySegmenter / kuromoji.js | Morphological analysis | If Claude's copy output needs post-processing for word boundaries; kuromoji.js is more accurate but heavier |

**budoux recommendation (HIGH confidence):**
Google's `budoux` library is specifically designed for CJK line breaking. It uses a small ML model to predict word boundaries in Japanese text (which has no spaces between words). Use this BEFORE applying kinsoku shori rules:

```typescript
import { loadDefaultJapaneseParser } from 'budoux';

const parser = loadDefaultJapaneseParser();
const segments = parser.parse('今日はとても天気がいいですね。');
// ["今日は", "とても", "天気が", "いいですね。"]
// Then apply kinsoku shori rules to these segments for line breaking
```

### Platform-Specific Asset Dimensions

| Platform | Format | Dimensions | Aspect Ratio | Notes |
|----------|--------|-----------|--------------|-------|
| LINE Rich Message | Image | 1040x1040 | 1:1 | Max 1MB; can be subdivided into 2-6 tap zones |
| LINE Rich Menu | Image | 2500x1686 or 2500x843 | Custom | Bottom menu bar; 1-6 tap zones |
| Yahoo! JAPAN Display | Banner | 600x500, 300x250, 728x90 | Various | YDN specs; text overlay limits |
| Rakuten Product | Main image | 700x700 min | 1:1 | White background required for some categories |
| Instagram Feed | Image | 1080x1080 | 1:1 | Also 1080x1350 (4:5) for portrait |
| Instagram Story/Reel | Video | 1080x1920 | 9:16 | 15-60s; safe zones for UI overlay |
| TikTok | Video | 1080x1920 | 9:16 | 15-60s |
| Twitter/X | Image | 1200x675 | 16:9 | Also 1200x1200 for 1:1 |
| GDN | Banner | 300x250, 336x280, 728x90, 160x600, 320x50 | Various | Responsive display ads |
| YouTube Pre-Roll | Video | 1920x1080 | 16:9 | 15s or 30s; first 5s non-skippable |
| DOOH | Video/Image | 1080x1920 (portrait), 1920x1080 (landscape) | 9:16 or 16:9 | High-res; large file OK |
| Email | Image | 600px width max | Flexible | Inline images; dark mode considerations |
| In-Store POP | Image | 2480x3508 (A4 300dpi) | A4 | Print-ready; CMYK conversion needed |

---

## Infrastructure Architecture

### Hosting Topology

```
[Users in Japan]
      |
      v
[Vercel Edge CDN - Tokyo (hnd1)]
      |
      v
[Next.js App - Serverless Functions]
      |
      +---> [Supabase - Tokyo (ap-northeast-1)]
      |       - PostgreSQL
      |       - Auth
      |       - Real-time
      |       - Storage (temp)
      |
      +---> [Cloudflare R2 - Tokyo PoP]
      |       - Asset delivery
      |       - ZIP downloads
      |
      +---> [Upstash Redis - Tokyo]
      |       - Rate limiting
      |       - Queue
      |
      +---> [n8n VPS - US (existing)]
              - AI workflow orchestration
              - FFmpeg video processing
              - JP text compositing service
              |
              +---> [Claude API - Anthropic]
              +---> [Flux API - BFL/Replicate]
              +---> [Kling API]
              +---> [ElevenLabs API]
              +---> [HeyGen API]
              +---> [Runway API]
```

### Latency Considerations

| Path | Latency | Mitigation |
|------|---------|------------|
| User -> Vercel Tokyo Edge | <20ms | Edge CDN in Tokyo |
| Vercel -> Supabase Tokyo | <5ms | Same region |
| Vercel -> n8n US VPS | ~120ms | Acceptable for async job submission; not in hot path |
| n8n -> AI APIs | Variable (50-300ms per request) | APIs are global; US VPS minimizes hops to most AI providers (US-based) |
| n8n -> Supabase Tokyo | ~120ms | Status updates; acceptable for async updates |
| User -> R2 Tokyo PoP | <20ms | CDN edge delivery |

**Why n8n stays on US VPS (not Tokyo):**
- Most AI provider APIs (Anthropic, Replicate, ElevenLabs, Runway, HeyGen) are US-based
- n8n -> AI API latency is lower from US
- n8n -> Supabase Tokyo latency (~120ms) is acceptable for async status updates
- Moving n8n to Tokyo would increase latency to all 6 AI providers
- The user never directly interacts with n8n; all interaction is via Next.js dashboard

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not Alternative |
|----------|-------------|-------------|-------------------|
| Framework | Next.js 15 | Remix, Nuxt | Vercel-native; larger JP ecosystem; RSC for dashboard |
| Database | Supabase (PostgreSQL) | Neon, PlanetScale | Supabase bundles Auth + Storage + Real-time; fewer services to manage |
| ORM | Drizzle | Prisma | Drizzle: no query engine binary, Edge-compatible, lighter serverless footprint |
| Auth | Supabase Auth | Clerk, NextAuth | Free, bundled, RLS-integrated; no per-MAU pricing |
| Storage | R2 + Supabase Storage | AWS S3, GCS | R2: zero egress fees; critical for media-heavy SaaS |
| CSS | Tailwind CSS | CSS Modules, Styled Components | Utility-first is fastest for rapid iteration; excellent tree-shaking |
| Components | shadcn/ui | Material UI, Ant Design, Chakra UI | Copy-paste ownership; no dependency lock-in; customizable JP aesthetics |
| State | Zustand | Redux, Jotai | Simplest API; minimal boilerplate; sufficient for dashboard state |
| Image processing | Sharp + resvg-js | Canvas (node-canvas), Jimp | Sharp is 10x faster (libvips); resvg-js handles fonts better than node-canvas |
| JP line breaking | budoux | Manual character rules | ML-based word segmenter handles edge cases manual rules miss |
| Package manager | pnpm | npm, yarn | Strict resolution; faster installs; disk efficient |
| Orchestration | n8n (self-hosted) | Temporal, Inngest, custom | Project constraint; visual builder; user has n8n experience |
| Billing | Stripe | LemonSqueezy, Paddle | JPY support; metered billing API; Japanese payment methods |
| Email | Resend | SendGrid, AWS SES | Simple API; React Email integration; generous free tier |
| Monitoring | Sentry | Datadog, New Relic | Best error tracking DX for JS/TS; generous free tier |
| Redis | Upstash | Redis Cloud, self-hosted | Serverless pricing; Tokyo region; no server to manage |

---

## What NOT to Use (Anti-Recommendations)

| Technology | Why Not |
|------------|---------|
| **node-canvas** | System dependency (cairo); painful Docker setup; worse font rendering than resvg-js for CJK; Sharp + resvg-js combo is superior |
| **Prisma** | Query engine binary adds cold start latency on Vercel; Drizzle is lighter and Edge-compatible |
| **Material UI / Ant Design** | Heavy bundle; opinionated design system fights against JP-native UI; shadcn/ui gives full control |
| **Firebase** | No Tokyo region for Firestore; Realtime Database is legacy; Supabase is the better fit for PostgreSQL + Tokyo |
| **AWS Lambda for n8n** | n8n needs persistent process; Lambda cold starts would break workflow execution; VPS is correct |
| **Puppeteer/Playwright for text rendering** | Headless browser is a sledgehammer; resvg-js + Sharp is faster, lighter, more predictable for text-on-image |
| **ImageMagick** | Slower than Sharp (libvips); harder to deploy; worse Node.js bindings |
| **GraphQL** | Over-engineering for this use case; REST + Supabase client SDK is sufficient; adds complexity without clear benefit |
| **Microservices** | Premature for a team of 1-2; monolithic Next.js + n8n orchestration is the right scale |
| **Kubernetes** | Over-engineering; Docker Compose on VPS is sufficient for 3 concurrent campaigns |
| **Self-hosted email (Postfix, etc.)** | Deliverability nightmare; use Resend or similar transactional email service |
| **i18next** | next-intl is more App Router-native; i18next has legacy SSR patterns |

---

## Installation Blueprint

```bash
# Initialize project
pnpm create next-app@latest ai-studio --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

# Core dependencies
pnpm add @supabase/supabase-js @supabase/ssr drizzle-orm postgres stripe @stripe/stripe-js

# Image/Video processing (server-side only)
pnpm add sharp @resvg/resvg-js opentype.js satori budoux fluent-ffmpeg archiver

# UI
pnpm add zustand @tanstack/react-query next-intl lucide-react react-dropzone framer-motion class-variance-authority clsx tailwind-merge

# Monitoring
pnpm add @sentry/nextjs @upstash/redis @upstash/ratelimit

# Email
pnpm add resend @react-email/components

# Dev dependencies
pnpm add -D drizzle-kit @types/fluent-ffmpeg @types/archiver vitest @vitejs/plugin-react playwright eslint-config-next prettier husky lint-staged

# shadcn/ui initialization (after project setup)
pnpm dlx shadcn@latest init
```

**Note on Sharp in Vercel:**
Sharp works in Vercel Serverless Functions (Node.js runtime) but NOT in Edge Runtime. For the compositing pipeline, either:
1. Run compositing in a Vercel Serverless Function (Node.js runtime, not Edge) -- works for simple overlays
2. Run compositing on the n8n VPS as a separate service -- better for complex multi-step compositing with FFmpeg

**Recommendation:** Run the full compositing pipeline (Sharp + resvg-js + FFmpeg) on the n8n VPS as a Docker service. The n8n workflow calls this service via HTTP. This keeps heavy processing off Vercel (which has execution time limits) and co-locates it with FFmpeg.

---

## Version Verification Notes

**IMPORTANT: The following versions are based on training data (cutoff May 2025). Before creating `package.json`, verify current versions:**

| Package | Stated Version | Verify At | Risk if Wrong |
|---------|---------------|-----------|---------------|
| Next.js | ^15.x | `npm view next version` | LOW — 15.x is stable; minor versions are non-breaking |
| React | ^19.x | `npm view react version` | LOW — ships with Next.js |
| Sharp | ^0.33+ | `npm view sharp version` | LOW — API is stable across 0.3x versions |
| @resvg/resvg-js | ^2.6+ | `npm view @resvg/resvg-js version` | LOW — API is stable |
| Drizzle ORM | ^0.34+ | `npm view drizzle-orm version` | MEDIUM — Drizzle has frequent releases; check migration syntax |
| Satori | ^0.12+ | `npm view satori version` | MEDIUM — API may have changed |
| Tailwind CSS | ^4.x | `npm view tailwindcss version` | MEDIUM — v4 has new config format vs v3 |
| shadcn/ui | CLI-based | `pnpm dlx shadcn@latest` | LOW — always pulls latest |
| budoux | ^0.6+ | `npm view budoux version` | LOW — stable, small API surface |
| Stripe SDK | ^17.x | `npm view stripe version` | MEDIUM — check for breaking changes |
| Zustand | ^5.x | `npm view zustand version` | LOW — tiny API surface |
| TanStack Query | ^5.x | `npm view @tanstack/react-query version` | LOW — v5 API is stable |

---

## Sources and Confidence Assessment

| Recommendation | Confidence | Source Basis |
|----------------|------------|-------------|
| Next.js 15 + App Router | HIGH | Established standard as of May 2025; no reason to expect major shift |
| Supabase for Auth + DB + Storage + Real-time | HIGH | Well-established platform; Tokyo region confirmed in training data |
| Drizzle over Prisma | HIGH | Well-documented advantages for serverless/Edge; confirmed by multiple sources before cutoff |
| Sharp for image processing | HIGH | Industry standard Node.js image library; libvips-based; extensively documented |
| resvg-js for SVG rendering | HIGH | Rust-based, well-maintained; standard for server-side SVG |
| opentype.js for font metrics | HIGH | Only real option for client/server-side OTF/TTF parsing in JS |
| budoux for JP line breaking | HIGH | Google-maintained; specifically designed for CJK; used in Chrome |
| Kinsoku shori character tables | HIGH | JIS X 4051 standard; well-documented typographic rules |
| n8n workflow patterns | HIGH | Based on n8n's documented node types and execution model |
| Cloudflare R2 for storage | HIGH | Zero egress pricing confirmed; S3-compatible API confirmed |
| Stripe hybrid billing pattern | HIGH | Well-documented pattern; JPY support confirmed |
| Platform asset dimensions | MEDIUM | Based on platform specs known at training cutoff; LINE/Yahoo!/Rakuten specs should be re-verified as they may have updated |
| Specific npm package versions | MEDIUM | Versions approximate; verify with `npm view` before use |
| Upstash Redis Tokyo region | MEDIUM | Availability was confirmed before cutoff; verify current region list |
| Neon comparison | MEDIUM | Feature comparison based on May 2025 knowledge; both platforms evolve rapidly |
| Tailwind CSS v4 | MEDIUM | v4 was in development at cutoff; verify stable release status |

---

## Key Decisions Summary

1. **Supabase as the integrated platform** (Auth + DB + Storage + Real-time) rather than assembling separate services -- reduces operational complexity for a small team
2. **Drizzle ORM** for type-safe database access without Prisma's serverless overhead
3. **Sharp + resvg-js + opentype.js + budoux** as the Japanese text compositing stack -- this is the technical moat
4. **R2 for asset delivery** -- zero egress fees prevent cost explosion as the platform scales
5. **n8n stays on US VPS** -- closer to AI provider APIs; never in the user's hot path
6. **Compositing runs on n8n VPS** (not Vercel) -- co-located with FFmpeg; no serverless time limits
7. **budoux for Japanese word segmentation** before kinsoku shori -- ML-based, handles edge cases that character-level rules miss
8. **next-intl for i18n** (not i18next) -- App Router native; better RSC support
