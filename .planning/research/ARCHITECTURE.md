# Architecture Patterns: AI Content Studio

**Domain:** AI-orchestrated ad campaign generation SaaS (Japanese market)
**Researched:** 2026-02-06
**Overall confidence:** MEDIUM (training knowledge only -- WebSearch/WebFetch unavailable; verify n8n docs for queue-mode and sub-workflow specifics before implementation)

---

## System Overview

The platform has five major zones, each with clear boundaries and a single communication protocol between them.

```
[Browser]
    |
    | HTTPS (Vercel Edge, Tokyo PoP)
    v
[Next.js Dashboard] ----REST----> [n8n Orchestrator] ----HTTPS----> [6 AI Providers]
    |                                   |                              (Claude, Flux,
    | Prisma/Drizzle                    | HTTP callbacks                Kling, ElevenLabs,
    v                                   v                              HeyGen, Runway)
[PostgreSQL Tokyo] <----webhook---- [n8n Workers]
    |                                   |
    |                                   | S3 PutObject
    v                                   v
[Stripe Billing] <--webhooks--  [S3-Compatible Tokyo Storage]
```

### The Five Zones

| Zone | Runs On | Responsibility | Owns |
|------|---------|----------------|------|
| **Dashboard** | Vercel (Tokyo edge) | User interaction, brief submission, campaign review, billing UI | Session state, UI state |
| **Orchestrator** | n8n (US VPS) | Workflow execution, AI provider routing, compositing, fallback logic | Workflow definitions, execution state |
| **Data** | PostgreSQL (Tokyo, Supabase/Neon) | Persistent state, campaign records, user data, credit ledger | All business data |
| **Storage** | S3-compatible (Tokyo) | Generated assets, composited images, final campaign kits | Binary assets |
| **Billing** | Stripe (external) | Subscription management, credit metering, invoicing | Payment state, subscription state |

---

## Component Boundaries

### 1. Next.js Dashboard (Vercel)

**Responsibility:** Everything the user sees and interacts with.

**Owns:**
- Authentication (NextAuth.js or Clerk -- JWT-based, stateless at edge)
- Brief builder UI (structured form: brand, platforms, tone/register, product info)
- Campaign review grid (platform previews at correct aspect ratios)
- Asset approval workflow (approve / request regen per asset)
- Brand profile CRUD
- Billing management (Stripe Customer Portal embed + credit balance display)
- Campaign history and re-run

**Does NOT own:**
- AI generation (delegates to n8n)
- Image compositing (delegates to n8n)
- Credit deduction (delegates to n8n callback which writes to DB)
- Asset storage (reads signed URLs from DB, does not write to S3 directly)

**API Routes (Next.js Route Handlers):**

| Route | Purpose | Direction |
|-------|---------|-----------|
| `POST /api/campaigns` | Accept brief, validate, write to DB, trigger n8n | Dashboard -> n8n |
| `GET /api/campaigns/[id]` | Poll campaign status + asset list | Dashboard <- DB |
| `GET /api/campaigns/[id]/status` | SSE endpoint for real-time progress | Dashboard <- DB (polling) |
| `POST /api/campaigns/[id]/regen` | Request single asset regeneration | Dashboard -> n8n |
| `POST /api/campaigns/[id]/approve` | Mark assets as approved | Dashboard -> DB |
| `GET /api/assets/[id]/download` | Generate signed S3 URL | Dashboard <- S3 |
| `GET /api/campaigns/[id]/kit` | Generate ZIP download URL | Dashboard -> n8n |
| `POST /api/webhooks/n8n` | Receive progress updates from n8n | n8n -> Dashboard |
| `POST /api/webhooks/stripe` | Receive billing events from Stripe | Stripe -> Dashboard |

**Architecture pattern:** Next.js App Router with Route Handlers for API. Server Components for data-fetching pages. Client Components only for interactive elements (brief form, review grid). Middleware for auth checks.

**Confidence:** HIGH for Next.js patterns, MEDIUM for specific API route design (will evolve during implementation).

---

### 2. n8n Orchestrator (US VPS, Self-Hosted)

This is the most architecturally complex component. It must be decomposed into discrete workflows.

**Responsibility:** All AI generation, compositing, asset processing, fallback routing, and delivery packaging.

**Does NOT own:**
- User authentication (trusts signed requests from Dashboard)
- Persistent business data (writes results back to PostgreSQL via HTTP or direct connection)
- Billing logic (reports credit consumption; Dashboard/DB handles deduction)

#### n8n Workflow Architecture

**Principle:** One master workflow triggers sub-workflows. Sub-workflows are typed by asset category. This gives you independent deploy, test, and retry per asset type.

```
MASTER WORKFLOW: campaign-orchestrator
    |
    |-- [Webhook Trigger] receives brief from Dashboard API
    |-- [Code Node] parse brief, determine required assets per platform
    |-- [Code Node] check credit balance (HTTP call to Dashboard API or direct DB query)
    |-- [Split In Batches / parallel branches]
    |       |
    |       |-- [Execute Sub-Workflow] copy-generation
    |       |-- [Execute Sub-Workflow] image-generation
    |       |-- [Execute Sub-Workflow] video-generation (if selected)
    |       |-- [Execute Sub-Workflow] voice-generation (if selected)
    |       |-- [Execute Sub-Workflow] avatar-generation (if selected)
    |       |-- [Execute Sub-Workflow] cinematic-generation (if selected)
    |       |
    |-- [Merge Node] collect all generated assets
    |-- [Execute Sub-Workflow] compositing-pipeline
    |-- [Execute Sub-Workflow] platform-sizing
    |-- [Execute Sub-Workflow] kit-packaging
    |-- [HTTP Request] callback to Dashboard with completion status
    |-- [Code Node] report credit consumption
```

#### Sub-Workflow Definitions

**SW-1: copy-generation**
```
Trigger: Execute Workflow Trigger (receives brief data)
    |-- [Code Node] construct Claude prompt with keigo register, brand tone, platform constraints
    |-- [HTTP Request] call Claude API
    |-- [IF Node] response quality check (length, contains required scripts)
    |-- [Code Node] parse copy variants per platform
    |-- [Code Node] run basic JP quality checks (character count, forbidden chars, line break rules)
    |-- Return: array of copy objects {platform, headline, body, cta, register}
```

**SW-2: image-generation**
```
Trigger: Execute Workflow Trigger (receives brief + copy)
    |-- [Code Node] construct Flux prompt (use Claude-generated image description as base)
    |-- [HTTP Request] call Flux API (primary)
    |-- [IF Node] check success
    |       |-- Fail path: [HTTP Request] call backup image model
    |-- [Code Node] validate image response (dimensions, format)
    |-- [HTTP Request] upload base image to S3
    |-- Return: array of base image objects {s3_key, width, height, model_used}
```

**SW-3: video-generation**
```
Trigger: Execute Workflow Trigger (receives brief + base images)
    |-- [Code Node] construct Kling prompt for 15s/30s variants
    |-- [HTTP Request] call Kling API (this is async -- poll for completion)
    |-- [Wait Node] poll every 10s until complete (max 3 min)
    |-- [IF Node] check success, fallback to Runway if Kling fails
    |-- [HTTP Request] download generated video
    |-- [HTTP Request] upload to S3
    |-- Return: video objects {s3_key, duration, aspect_ratio, model_used}
```

**SW-4: voice-generation**
```
Trigger: Execute Workflow Trigger (receives copy text)
    |-- [Code Node] select persona, construct ElevenLabs request
    |-- [HTTP Request] call ElevenLabs API
    |-- [IF Node] check quality (duration, format)
    |-- [HTTP Request] upload to S3
    |-- Return: audio objects {s3_key, duration, persona}
```

**SW-5: avatar-generation**
```
Trigger: Execute Workflow Trigger (receives copy + audio)
    |-- [HTTP Request] call HeyGen API with JP-presenting avatar + audio
    |-- [Wait Node] poll for completion (HeyGen is async, up to 5 min)
    |-- [HTTP Request] download result
    |-- [HTTP Request] upload to S3
    |-- Return: avatar video objects {s3_key, duration}
```

**SW-6: cinematic-generation**
```
Trigger: Execute Workflow Trigger (receives brief)
    |-- [HTTP Request] call Runway API (Gen-3/Gen-4 depending on availability)
    |-- [Wait Node] poll for completion
    |-- [HTTP Request] download + upload to S3
    |-- Return: cinematic objects {s3_key, duration, resolution}
```

**SW-7: compositing-pipeline** (detailed in section below)

**SW-8: platform-sizing**
```
Trigger: Execute Workflow Trigger (receives composited images)
    |-- [Code Node] define platform dimension map
    |-- [Split In Batches] for each platform x each image
    |       |-- [Code Node] call Sharp resize + crop to target dimensions
    |       |-- [HTTP Request] upload sized variant to S3
    |-- [Merge] collect all sized variants
    |-- Return: sized asset array {s3_key, platform, width, height}
```

**SW-9: kit-packaging**
```
Trigger: Execute Workflow Trigger (receives all assets)
    |-- [Code Node] organize assets into folder structure:
    |       /LINE/
    |       /Yahoo_JAPAN/
    |       /Rakuten/
    |       /Instagram/
    |       /TikTok/
    |       ... etc
    |-- [Code Node] generate ZIP using archiver
    |-- [HTTP Request] upload ZIP to S3
    |-- Return: {zip_s3_key, manifest}
```

#### Parallel Execution Strategy

n8n executes branches between a split and a merge node concurrently. The key architectural decision:

**Copy generation runs FIRST (not in parallel with images).** Why: Claude-generated copy informs image prompts (e.g., headline text determines text overlay content, product descriptions influence image composition). This is a real dependency.

```
Phase 1 (sequential): copy-generation
    |
Phase 2 (parallel): image-generation + video-generation + voice-generation
    |                                                         |
Phase 3 (depends on voice): avatar-generation                |
    |                                                         |
Phase 4 (depends on images): cinematic-generation (uses base images as reference)
    |
Phase 5 (sequential): compositing-pipeline (needs images + copy)
    |
Phase 6 (sequential): platform-sizing (needs composited images)
    |
Phase 7 (sequential): kit-packaging (needs everything)
```

**Implementation in n8n:** Use the "Execute Workflow" node with `mode: once` for each sub-workflow. For parallel execution in Phase 2, split into parallel branches before the Execute Workflow nodes and merge after. n8n's execution engine handles the concurrency.

**Confidence:** HIGH for the phasing logic. MEDIUM for n8n-specific parallel execution mechanics -- verify that "Execute Sub-Workflow" nodes on parallel branches truly execute concurrently in n8n's current version. Training data suggests yes, but confirm with docs.

#### Fallback Routing Pattern

Each AI-calling sub-workflow implements:

```
[Primary API Call]
    |
[IF Node: status == success AND result passes validation]
    |-- YES: continue
    |-- NO: [Code Node: log failure reason]
              |
              [Secondary API Call (backup provider)]
              |
              [IF Node: backup success?]
                  |-- YES: continue (flag asset as "generated by backup")
                  |-- NO: [Code Node: mark asset as FAILED, include in status callback]
```

**Fallback provider map:**

| Primary | Backup | Notes |
|---------|--------|-------|
| Flux (images) | DALL-E 3 or Stable Diffusion | Different prompt format needed |
| Kling (video) | Runway | Different API contract |
| ElevenLabs (voice) | OpenAI TTS | Quality difference -- flag |
| HeyGen (avatar) | None (skip asset) | No equivalent backup |
| Runway (cinematic) | Kling (downgrade quality) | Flag as non-premium |
| Claude (copy) | GPT-4o | Different prompt tuning needed |

**Confidence:** MEDIUM -- backup providers depend on available API access and may have different pricing/quality profiles.

---

### 3. Compositing Pipeline (Detailed)

This is the core technical differentiator. AI models cannot reliably render Japanese text, so the platform uses a hybrid approach: AI generates the base image, then server-side code composites Japanese typography on top.

#### Why Hybrid Compositing

1. **AI text rendering failure rate for JP:** Current image models (Flux, DALL-E, SD) fail at CJK text rendering ~80%+ of the time -- garbled characters, wrong stroke order, mixed scripts
2. **Typographic precision:** JP advertising requires exact font control, kinsoku shori line-break rules, correct vertical/horizontal layout
3. **Brand consistency:** Server-side compositing uses exact brand fonts and colors, not AI approximations

#### Pipeline Steps

```
Input: base_image (from Flux/AI), copy_text (from Claude), platform_spec, brand_profile

Step 1: Image Analysis
    - Read base image dimensions and format via Sharp metadata
    - Identify "safe zones" for text placement (predefined per template, or use basic saliency detection)

Step 2: Text Layout Engine
    - Determine text area bounding box based on platform spec
    - Apply kinsoku shori rules:
        * No opening brackets/punctuation at line start
        * No closing brackets/punctuation at line end
        * Correct handling of small kana (gyou-matsu kinsoku)
    - Calculate line breaks for headline + body + CTA
    - Determine font sizes to fit bounding box (auto-scaling)
    - Handle tri-script mixing (hiragana flows naturally, katakana for emphasis, kanji for density)

Step 3: Text Rendering
    - Use node-canvas (Canvas 2D API in Node.js) for text rendering:
        * Load Noto Sans JP / M PLUS Rounded fonts (server-bundled .ttf/.otf)
        * Render text to transparent PNG layer
        * Apply text styling: weight, size, color, letter-spacing, line-height
        * Optional: text shadow, outline, background pill behind text
    - Alternative: Use Sharp's composite with SVG text overlay
        * Construct SVG with <text> elements, font-face declarations
        * Sharp composites SVG over base image

Step 4: Composite
    - Sharp.composite() layers:
        * Layer 0: AI-generated base image
        * Layer 1: Semi-transparent gradient/overlay for text legibility (if needed)
        * Layer 2: Rendered JP text
        * Layer 3: Brand logo (from brand profile, pre-uploaded)
        * Layer 4: CTA button / badge (if platform requires)
    - Output: composited image at base resolution (typically 1024x1024 or 1920x1080)

Step 5: Output
    - Write composited image to buffer
    - Pass to platform-sizing sub-workflow
```

#### Technology Choice: Sharp vs node-canvas vs Both

**Recommendation: Use BOTH Sharp AND node-canvas.**

| Task | Tool | Why |
|------|------|-----|
| Image loading, resizing, format conversion | Sharp | Fastest, libvips-based, handles memory efficiently |
| Japanese text rendering with font control | node-canvas | Cairo-based, supports CJK fonts, measureText() for layout |
| Compositing layers together | Sharp | composite() is fast and memory-efficient |
| Final export (PNG/JPEG/WebP) | Sharp | Best quality/compression control |

**The flow:**
1. node-canvas renders text to transparent PNG buffer
2. Sharp composites that PNG over the base image
3. Sharp handles all resize/crop/format operations

**Why not Sharp SVG text alone?** Sharp's SVG rendering (via librsvg) has inconsistent CJK font support depending on server environment. node-canvas with explicitly loaded font files is more reliable for Japanese typography.

**Why not Puppeteer/headless Chrome?** Too heavy for a compositing pipeline that needs to produce 11+ variants per image. node-canvas is ~10x faster per operation.

**Confidence:** HIGH for Sharp capabilities. MEDIUM for node-canvas CJK font loading specifics -- test with Noto Sans JP early in development. The font file must be explicitly registered via `registerFont()` before use.

#### Where Compositing Runs

**Option A (Recommended): Inside n8n via Code Node**

n8n Code nodes can run arbitrary Node.js. Install Sharp and node-canvas as additional packages in the n8n environment.

```
n8n Docker/server:
    npm install sharp canvas

    # Copy font files to server
    /usr/share/fonts/NotoSansJP-*.ttf
    /usr/share/fonts/MPLUSRounded-*.ttf
```

Pro: Compositing stays in the same workflow, no extra service to deploy.
Con: Heavy image processing on the n8n server; may slow other workflow executions.

**Option B: Separate Compositing Microservice**

A lightweight Express/Fastify service that accepts compositing jobs via HTTP.

```
POST /composite
Body: { base_image_url, text_layers[], brand_assets, platform_spec }
Response: { composited_image_url }
```

Pro: Isolates CPU-heavy work from n8n, independently scalable.
Con: Extra service to deploy and maintain.

**Recommendation for v1: Option A** (inside n8n). At 3 concurrent campaigns, n8n can handle the compositing load. Move to Option B if you hit CPU bottlenecks (monitor n8n server CPU during generation).

**Confidence:** HIGH for the compositing approach. MEDIUM for n8n's ability to handle Sharp+canvas in Code nodes -- verify that the n8n Docker image allows native module installation (Sharp requires libvips, canvas requires Cairo).

---

### 4. Platform Sizing Specification

The sizing sub-workflow takes composited images and produces platform-specific variants. This is a critical reference table.

| Platform | Format | Dimensions (px) | Aspect Ratio | Notes |
|----------|--------|-----------------|--------------|-------|
| LINE Rich Message | Square | 1040 x 1040 | 1:1 | Must be exactly these dims |
| LINE Rich Message | Wide | 1040 x 585 | 16:9-ish | Fixed spec |
| Yahoo! JAPAN Display | Banner | 600 x 500 | 6:5 | YDA spec |
| Yahoo! JAPAN Display | Wide | 1200 x 628 | ~1.91:1 | YDA responsive |
| Rakuten Product | Main | 700 x 700 | 1:1 | Max 2MB |
| Rakuten Product | Banner | 1200 x 300 | 4:1 | Shop header |
| Instagram Feed | Square | 1080 x 1080 | 1:1 | |
| Instagram Story | Vertical | 1080 x 1920 | 9:16 | |
| TikTok | Vertical | 1080 x 1920 | 9:16 | |
| Twitter/X | In-stream | 1200 x 675 | 16:9 | |
| GDN | Responsive | 1200 x 628 | ~1.91:1 | Google Display Network |
| GDN | Square | 1200 x 1200 | 1:1 | |
| YouTube | Thumbnail | 1280 x 720 | 16:9 | |
| DOOH | Landscape | 1920 x 1080 | 16:9 | Digital out-of-home |
| DOOH | Portrait | 1080 x 1920 | 9:16 | Vertical signage |
| Email | Header | 600 x 300 | 2:1 | Max width 600 |
| In-Store POP | A4 Poster | 2480 x 3508 | ~1:1.4 | 300 DPI, print-ready |

**Sizing strategy:**
1. Generate base composited image at highest needed resolution (typically 2480x3508 for print, or 1920x1080 for digital-only campaigns)
2. Use Sharp to resize DOWN to each target dimension
3. Apply platform-specific adjustments (Rakuten max file size, LINE exact pixel requirements)
4. Export format: PNG for transparency-needed, JPEG for photo-heavy (quality 90), WebP as optional secondary

**Confidence:** MEDIUM for exact platform dimensions -- these are based on training data and should be verified against current platform documentation before implementation. Platform specs change; build the dimension table as configuration (JSON/DB), not hardcoded.

---

### 5. Database Schema (PostgreSQL, Tokyo)

#### Core Tables

```sql
-- Users & Auth
users (
    id UUID PK,
    email TEXT UNIQUE,
    name TEXT,
    stripe_customer_id TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)

-- Brand Profiles
brand_profiles (
    id UUID PK,
    user_id UUID FK -> users,
    name TEXT,
    logo_s3_key TEXT,
    primary_color TEXT,
    secondary_color TEXT,
    font_preference TEXT,  -- 'noto_sans' | 'mplus_rounded' | etc.
    tone TEXT,             -- brand voice description
    default_register TEXT, -- 'casual' | 'standard' | 'keigo'
    product_info JSONB,    -- flexible product catalog
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)

-- Campaigns
campaigns (
    id UUID PK,
    user_id UUID FK -> users,
    brand_profile_id UUID FK -> brand_profiles,
    brief JSONB,           -- full brief payload (platforms, register, product, etc.)
    status TEXT,           -- 'pending' | 'generating' | 'compositing' | 'sizing' | 'packaging' | 'complete' | 'failed' | 'partial'
    n8n_execution_id TEXT, -- link to n8n execution for debugging
    credits_consumed INTEGER,
    kit_zip_s3_key TEXT,
    progress JSONB,        -- { total_assets: 24, completed: 18, failed: 1, current_phase: 'sizing' }
    error_log JSONB,       -- array of errors if any assets failed
    created_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
)

-- Individual Assets
assets (
    id UUID PK,
    campaign_id UUID FK -> campaigns,
    type TEXT,             -- 'image' | 'video' | 'audio' | 'avatar' | 'cinematic' | 'copy'
    platform TEXT,         -- 'line' | 'yahoo_japan' | 'rakuten' | 'instagram' | etc.
    variant TEXT,          -- 'base' | 'composited' | 'sized_1080x1080' | etc.
    s3_key TEXT,
    width INTEGER,
    height INTEGER,
    file_size_bytes BIGINT,
    mime_type TEXT,
    model_used TEXT,       -- 'flux' | 'dalle3' | 'kling' | etc. (tracks which AI produced it)
    is_fallback BOOLEAN DEFAULT FALSE,
    status TEXT,           -- 'generating' | 'complete' | 'failed'
    approval_status TEXT,  -- 'pending' | 'approved' | 'rejected'
    metadata JSONB,        -- model-specific metadata, generation params
    created_at TIMESTAMPTZ
)

-- Copy (text assets stored separately for easy editing)
copy_variants (
    id UUID PK,
    campaign_id UUID FK -> campaigns,
    platform TEXT,
    register TEXT,         -- 'casual' | 'standard' | 'keigo'
    headline TEXT,
    body_text TEXT,
    cta_text TEXT,
    hashtags TEXT[],
    approval_status TEXT,
    created_at TIMESTAMPTZ
)

-- Credit Ledger
credit_transactions (
    id UUID PK,
    user_id UUID FK -> users,
    campaign_id UUID FK -> campaigns NULL, -- null for purchases
    type TEXT,             -- 'purchase' | 'consumption' | 'refund' | 'subscription_grant'
    amount INTEGER,        -- positive for credits added, negative for consumed
    balance_after INTEGER,
    description TEXT,
    stripe_invoice_id TEXT,
    created_at TIMESTAMPTZ
)

-- Brief Templates
brief_templates (
    id UUID PK,
    user_id UUID FK -> users NULL, -- null = system template
    name TEXT,
    category TEXT,         -- 'beauty' | 'food' | 'ecommerce' | 'luxury' | etc.
    template JSONB,        -- pre-filled brief fields
    created_at TIMESTAMPTZ
)
```

**Key design decisions:**
- `campaigns.progress` as JSONB: allows flexible progress tracking without schema changes as pipeline evolves
- `assets.variant`: distinguishes base AI output from composited and from platform-sized -- one base image produces many asset rows
- `credit_transactions`: append-only ledger pattern for billing audit trail -- never update, only insert
- `campaigns.brief` as JSONB: briefs are complex and evolving; JSONB avoids constant migrations

**Confidence:** HIGH for schema patterns. The exact columns will evolve, but the table structure is sound.

---

### 6. Asset Storage Architecture (S3-Compatible, Tokyo)

#### Bucket Structure

```
bucket: ai-studio-assets
    /users/{user_id}/brand/{brand_profile_id}/
        logo.png
        ...
    /campaigns/{campaign_id}/
        /base/                   -- raw AI-generated assets
            image_001.png
            video_001.mp4
            audio_001.mp3
        /composited/             -- text-overlaid images
            image_001_composited.png
        /sized/                  -- platform-specific variants
            image_001_line_1040x1040.png
            image_001_yahoo_1200x628.jpg
            image_001_instagram_1080x1080.png
            ...
        /kit/
            campaign_kit.zip     -- final downloadable package
        /copy/
            copy_variants.json   -- text assets as structured data
```

#### Access Patterns

| Who | Access | How |
|-----|--------|-----|
| n8n (writes) | Upload generated assets | S3 PutObject with IAM credentials stored in n8n |
| Dashboard (reads) | Display previews, enable downloads | Pre-signed URLs generated by Next.js API routes |
| Users (reads) | Download assets and ZIP | Pre-signed URLs with 1-hour expiry |

**Pre-signed URL pattern:**
- Dashboard API route receives asset request
- Looks up S3 key from `assets` table
- Generates pre-signed GET URL (1-hour expiry)
- Returns URL to client
- Client fetches directly from S3 (no proxy through Next.js)

**Why pre-signed URLs instead of proxying:** Asset files can be large (videos 50MB+). Pre-signed URLs let the browser download directly from the Tokyo S3 endpoint, avoiding Vercel function timeout/size limits.

**Confidence:** HIGH for S3 patterns.

---

### 7. Real-Time Progress Communication

Campaign generation takes 1-5 minutes. The user needs progress feedback.

#### Pattern: Database Polling + SSE

```
n8n workflow (during execution):
    |-- After each sub-workflow completes:
    |   [HTTP Request] POST to Dashboard API: /api/webhooks/n8n
    |   Body: { campaign_id, phase, assets_completed, total_assets, current_step }
    |
Dashboard API (/api/webhooks/n8n):
    |-- Update campaigns.progress JSONB in PostgreSQL
    |-- Update campaigns.status
    |-- Insert completed asset rows
    |
Dashboard SSE endpoint (/api/campaigns/[id]/status):
    |-- Client opens SSE connection
    |-- Server polls DB every 2-3 seconds
    |-- Sends progress events to client
    |-- Closes connection when status = 'complete' or 'failed'
```

**Why not WebSocket?** Vercel serverless functions don't natively support WebSocket (they're stateless). SSE works over standard HTTP and is supported. For even simpler implementation, client-side polling every 3 seconds is acceptable for a 1-5 minute job.

**Why not direct n8n -> browser push?** The browser doesn't have a direct connection to n8n. n8n is on a US VPS behind no public WebSocket endpoint. The database is the shared state bridge.

**Alternative: Supabase Realtime.** If using Supabase for PostgreSQL, Supabase Realtime can push database changes to the client via WebSocket. This eliminates the need for SSE/polling entirely.

```
n8n -> writes progress to Supabase PostgreSQL
Supabase Realtime -> pushes change to browser via WebSocket channel
Dashboard client -> subscribes to campaigns:{id} channel
```

**Recommendation:** If using Supabase, use Supabase Realtime (simplest). If using Neon or bare PostgreSQL, use client-side polling every 3 seconds (simplest to implement, good enough for the use case).

**Confidence:** HIGH for the pattern. MEDIUM for Supabase Realtime specifics -- verify channel subscription API.

---

### 8. Stripe Billing Integration

#### Billing Model

Two revenue streams, managed together:

| Stream | Stripe Concept | How It Works |
|--------|---------------|--------------|
| Subscription tiers | Stripe Subscriptions (monthly/annual) | Each tier includes N credits/month + feature gates |
| Credit top-ups | Stripe Checkout (one-time) | Buy additional credit packs |

#### Subscription Tiers (Suggested)

| Tier | Monthly Credits | Price | Features |
|------|----------------|-------|----------|
| Starter | 50 credits | ~$49/mo | Images + copy only, 5 platforms |
| Professional | 200 credits | ~$149/mo | All asset types, all platforms, priority generation |
| Agency | 1000 credits | ~$499/mo | All features, API access, 5 brand profiles, bulk generation |

**Credit costs per asset type (approximate):**

| Asset | Credits | Rationale |
|-------|---------|-----------|
| Copy set (all platforms) | 2 | Cheapest API call (Claude) |
| Image (base + compositing) | 5 | Flux API cost + compute |
| Video (15s) | 15 | Kling/Runway are expensive |
| Voice/TTS (30s) | 3 | ElevenLabs per-character pricing |
| Avatar video (15s) | 20 | HeyGen is premium priced |
| Cinematic video (15s) | 25 | Runway Gen-3/4 is most expensive |
| Full campaign kit | Sum of selected assets | Transparent pricing |

#### Integration Architecture

```
[Stripe] --------webhooks-------> [Next.js /api/webhooks/stripe]
                                        |
                                        v
                                  [Webhook Handler]
                                        |
                    +-------------------+-------------------+
                    |                   |                   |
            subscription.created  invoice.paid    subscription.deleted
            subscription.updated                  invoice.payment_failed
                    |                   |                   |
                    v                   v                   v
            Update user tier     Add credits to       Downgrade/suspend
            in DB                credit_transactions    account
                                 ledger
```

**Credit deduction flow:**
1. User submits brief
2. Dashboard API calculates estimated credit cost based on selected platforms and asset types
3. Check `credit_transactions` ledger: current balance >= estimated cost?
   - YES: Create campaign record with status `pending`, reserve credits (insert negative transaction with type `reservation`)
   - NO: Return 402, show upgrade/top-up prompt
4. n8n generates assets
5. On completion callback, finalize credit consumption:
   - If actual cost < reservation: insert refund transaction for difference
   - If generation partially failed: insert refund for failed assets

**Why ledger pattern over simple balance column?** Audit trail, race condition safety (INSERT is safer than UPDATE for concurrent requests), easy to debug billing disputes.

**Confidence:** HIGH for Stripe patterns. MEDIUM for exact credit pricing (depends on actual API costs which should be calculated from provider pricing pages).

---

### 9. Brief-to-Campaign-Kit Data Flow (End-to-End)

This is the complete flow from user action to deliverable.

```
[1] USER SUBMITS BRIEF
    |
    | Browser: POST /api/campaigns
    | Body: { brand_profile_id, platforms: [...], register, product_info, ... }
    v

[2] DASHBOARD API VALIDATES & RESERVES
    |
    | - Validate brief (required fields, valid platforms)
    | - Calculate credit estimate
    | - Check credit balance
    | - Insert campaign record (status: 'pending')
    | - Insert credit reservation transaction
    | - POST to n8n webhook URL with campaign data
    | - Return campaign_id to browser
    v

[3] BROWSER OPENS PROGRESS CHANNEL
    |
    | - SSE to /api/campaigns/{id}/status  (or Supabase Realtime subscribe)
    | - Show progress UI: "Generating copy..."
    v

[4] N8N MASTER WORKFLOW STARTS
    |
    | - Receives webhook with brief + campaign_id
    | - Parses brief, determines required sub-workflows
    | - Updates campaign status -> 'generating'
    v

[5] PHASE 1: COPY GENERATION (sequential, must complete first)
    |
    | - SW-1 calls Claude with brief + register + brand tone
    | - Returns copy variants per platform
    | - n8n sends progress callback: { phase: 'copy', completed: 1 }
    v

[6] PHASE 2: PARALLEL GENERATION
    |
    | - SW-2 (images): Flux with copy-informed prompts -> base images -> S3
    | - SW-3 (video): Kling with brief -> raw videos -> S3
    | - SW-4 (voice): ElevenLabs with copy text -> audio files -> S3
    | - All run in parallel branches
    | - Progress callbacks after each completes
    | - Fallback routing if any provider fails
    v

[7] PHASE 3: DEPENDENT GENERATION (if selected)
    |
    | - SW-5 (avatar): HeyGen with audio from Phase 2 -> avatar videos -> S3
    | - SW-6 (cinematic): Runway with brief + base images -> cinematic video -> S3
    v

[8] PHASE 4: COMPOSITING
    |
    | - SW-7 receives base images + copy variants + brand profile
    | - For each base image:
    |     node-canvas renders JP text layer (with kinsoku shori)
    |     Sharp composites: base + overlay + text + logo
    | - Upload composited images to S3
    | - Insert asset records in DB
    | - Progress callback: { phase: 'compositing', completed: N }
    v

[9] PHASE 5: PLATFORM SIZING
    |
    | - SW-8 receives composited images
    | - For each image x each selected platform:
    |     Sharp resize to target dimensions (see dimension table)
    |     Upload sized variant to S3
    |     Insert asset record in DB
    | - Progress callback: { phase: 'sizing', completed: N }
    v

[10] PHASE 6: KIT PACKAGING
    |
    | - SW-9 collects all S3 keys
    | - Downloads all assets
    | - Organizes into folder structure by platform
    | - Creates ZIP archive
    | - Uploads ZIP to S3
    | - Updates campaign record: kit_zip_s3_key, status -> 'complete'
    v

[11] COMPLETION CALLBACK
    |
    | - n8n POST to /api/webhooks/n8n: { campaign_id, status: 'complete', credits_actual }
    | - Dashboard API finalizes credit transaction
    | - Dashboard API updates campaign status
    v

[12] USER SEES RESULTS
    |
    | - Progress UI shows "Complete!"
    | - Campaign review page loads: grid of all assets by platform
    | - Each asset shows preview (pre-signed S3 URL)
    | - "Download Kit" button generates pre-signed URL for ZIP
    | - User can approve/reject individual assets
    | - User can request regeneration of specific assets (triggers targeted n8n sub-workflow)
```

**Total time estimate:** 2-4 minutes for images+copy only, 4-5 minutes with video/avatar/cinematic.

**Confidence:** HIGH for the data flow. This is the central architectural narrative.

---

### 10. n8n-Specific Architecture Patterns

#### Pattern: Webhook Authentication

n8n webhooks are publicly accessible URLs. Protect them.

```
Dashboard -> n8n: Include HMAC signature in header
    X-Signature: HMAC-SHA256(request_body, shared_secret)

n8n webhook node -> Code node: Verify signature
    if (!verifyHMAC(body, headers['x-signature'], SECRET)) {
        throw new Error('Invalid signature');
    }
```

#### Pattern: Idempotent Execution

If the Dashboard retries a webhook call (network timeout), n8n should not generate duplicates.

```
Each campaign_id is unique.
n8n Code node at start: Check if execution for this campaign_id already exists.
If yes: return existing execution status, don't re-run.
If no: proceed.
```

#### Pattern: Error Handling with Partial Results

A campaign kit should still deliver even if one asset type fails.

```
n8n Error Trigger workflow:
    - Catches any sub-workflow failure
    - Logs error to campaign.error_log
    - Marks specific asset as FAILED
    - Does NOT abort entire campaign
    - Continues to compositing/sizing/packaging with available assets
    - Final status: 'partial' (not 'complete' or 'failed')
```

#### Pattern: n8n Environment Variables

Store all API keys and configuration in n8n's credential system, not in workflow JSON.

```
Credentials to create:
    - Claude API key
    - Flux API key
    - Kling API key
    - ElevenLabs API key
    - HeyGen API key
    - Runway API key
    - S3 access (key + secret + endpoint + bucket)
    - PostgreSQL connection string
    - Dashboard webhook secret (for HMAC)
    - Stripe webhook secret (if n8n handles billing events)
```

#### Pattern: Queue Mode for Concurrency

For handling 3+ concurrent campaign generations, n8n should run in queue mode.

```
Architecture:
    [n8n Main Instance] - handles webhook triggers, UI
        |
        | Redis/BullMQ
        |
    [n8n Worker 1] - executes workflows
    [n8n Worker 2] - executes workflows (if needed)

Environment variables:
    EXECUTIONS_MODE=queue
    QUEUE_BULL_REDIS_HOST=redis-host
    QUEUE_BULL_REDIS_PORT=6379
```

This separates webhook reception from execution, preventing a long-running campaign generation from blocking new webhook triggers.

**Recommendation for v1:** Start with default execution mode (single process). Move to queue mode when you hit the 3-concurrent-campaign target and observe blocking. Queue mode adds Redis dependency.

**Confidence:** MEDIUM -- n8n queue mode documentation should be consulted for current config variable names and setup requirements. The concept is correct but env var names may have changed.

---

### 11. Security Boundaries

| Boundary | Protection |
|----------|-----------|
| Browser -> Dashboard | HTTPS (Vercel handles TLS), NextAuth JWT |
| Dashboard -> n8n | HMAC-signed webhooks over HTTPS |
| n8n -> AI providers | API keys in n8n credential store, HTTPS |
| n8n -> S3 | IAM credentials, bucket policy restricts writes to n8n IP |
| n8n -> PostgreSQL | Connection string with password, SSL mode required |
| Dashboard -> S3 (reads) | Pre-signed URLs (time-limited, per-object) |
| Stripe -> Dashboard | Stripe webhook signature verification |
| n8n -> Dashboard | Shared secret in callback headers |

**Data residency note:** User data and generated assets live in Tokyo (PostgreSQL + S3). n8n processes data on the US VPS but does not persist it there (all outputs are uploaded to Tokyo S3). AI provider calls transit through US/global endpoints -- this is unavoidable and acceptable (the data is ad creative, not PII).

---

### 12. Suggested Build Order

Based on component dependencies, here is the recommended implementation sequence.

```
Phase 1: Foundation (no AI, no n8n)
    [Next.js app] + [PostgreSQL] + [Auth] + [Basic UI shell]
    WHY FIRST: Everything depends on auth and data layer.
    Deliverable: User can sign up, log in, see empty dashboard.

Phase 2: Brief & Data Model
    [Brief form] + [Campaign/Asset DB schema] + [Brand profile CRUD]
    WHY SECOND: The brief is the input to everything else.
    Deliverable: User can create a brief and save it.

Phase 3: n8n Core Pipeline (copy + images only)
    [n8n master workflow] + [SW-1 copy] + [SW-2 images] + [Webhook integration]
    WHY THIRD: Start with simplest AI calls to prove the pipeline works.
    Deliverable: Brief triggers n8n, Claude generates copy, Flux generates images.

Phase 4: Compositing Pipeline
    [SW-7 compositing] + [Sharp + node-canvas setup] + [Kinsoku shori rules]
    WHY FOURTH: This is the key differentiator. Get it right before adding more asset types.
    Deliverable: AI images get correct JP text overlaid.

Phase 5: Platform Sizing + Kit Delivery
    [SW-8 sizing] + [SW-9 packaging] + [S3 storage] + [ZIP delivery] + [Campaign review UI]
    WHY FIFTH: Now you have a complete image+copy pipeline end-to-end.
    Deliverable: Full image campaign kit downloadable as ZIP.

Phase 6: Video & Audio Pipeline
    [SW-3 video] + [SW-4 voice] + [SW-5 avatar] + [SW-6 cinematic]
    WHY SIXTH: Each is independent; add incrementally.
    Deliverable: Full multi-modal campaign kit.

Phase 7: Billing
    [Stripe integration] + [Credit ledger] + [Subscription tiers] + [Usage metering]
    WHY SEVENTH: Don't gate development behind billing. Add when pipeline works.
    Deliverable: Users can subscribe and pay per generation.

Phase 8: Polish & Production
    [Fallback routing] + [Error handling] + [Progress UI] + [Approval workflow]
    [n8n queue mode] + [Performance optimization]
    WHY LAST: Hardening for real users.
    Deliverable: Production-ready system.
```

**Critical dependency chain:**
- Compositing (Phase 4) depends on both copy generation and image generation (Phase 3)
- Platform sizing (Phase 5) depends on compositing (Phase 4)
- Avatar generation (Phase 6) depends on voice generation (also Phase 6) -- order within phase matters
- Kit packaging (Phase 5) depends on all asset types being defined

**Confidence:** HIGH for build ordering logic.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Monolithic n8n Workflow
**What:** Putting all generation logic in a single massive n8n workflow.
**Why bad:** Impossible to test individual asset types, can't retry a single failed step, workflow becomes visually unmanageable.
**Instead:** Master orchestrator + sub-workflows per asset type.

### Anti-Pattern 2: Synchronous Asset Delivery
**What:** Making the user wait for the entire pipeline before showing anything.
**Why bad:** 5-minute blank loading screen = user thinks it's broken.
**Instead:** Stream progress updates. Show completed assets as they arrive (copy appears in ~15s, images in ~30s, video later).

### Anti-Pattern 3: n8n as Database
**What:** Storing campaign state in n8n execution data and querying n8n's API for it.
**Why bad:** n8n execution data is ephemeral (deleted after retention period), not queryable efficiently, and couples your app to n8n's internal storage.
**Instead:** n8n writes all state to PostgreSQL. Dashboard reads from PostgreSQL. n8n is stateless between executions.

### Anti-Pattern 4: Client-Side S3 Uploads
**What:** Having the browser upload brand assets directly to S3 via pre-signed PUT URLs.
**Why bad:** Exposes S3 write access patterns, harder to validate/resize on upload, CORS complexity.
**Instead:** Upload through Next.js API route (which validates, resizes if needed, then uploads to S3 server-side). Brand logos are small -- the proxy overhead is negligible.

### Anti-Pattern 5: Hardcoded Platform Dimensions
**What:** Embedding pixel dimensions in code across multiple locations.
**Why bad:** Platform specs change. LINE updated Rich Message specs in 2024.
**Instead:** Single configuration source (JSON file or DB table) that all sizing code references. Update once, applies everywhere.

### Anti-Pattern 6: Credit Balance as Mutable Column
**What:** `users.credit_balance` column that gets incremented/decremented.
**Why bad:** Race conditions with concurrent campaigns, no audit trail, impossible to debug billing disputes.
**Instead:** Append-only `credit_transactions` ledger. Balance = SUM(amount). Use SELECT FOR UPDATE or serializable transactions for critical balance checks.

---

## Scalability Considerations

| Concern | At 10 users | At 100 users | At 1000 users |
|---------|-------------|--------------|---------------|
| n8n concurrency | Single process, fine | Queue mode + 2 workers | Queue mode + auto-scaling workers |
| S3 storage | Single bucket | Single bucket with lifecycle policies | CDN in front of S3 for preview images |
| PostgreSQL | Single instance | Read replica for dashboard queries | Connection pooling (PgBouncer), partitioning on campaigns |
| Compositing CPU | n8n Code node | Separate microservice | Microservice with horizontal scaling |
| AI API rate limits | No issue | Provider-specific rate limits may hit | Need multiple API keys or enterprise tier |

---

## Open Questions (Verify During Implementation)

1. **n8n Execute Sub-Workflow concurrency:** Do parallel branches with Execute Sub-Workflow nodes truly run concurrently, or are they sequential in the default execution mode? Test empirically.

2. **Sharp + node-canvas in n8n Docker:** Can the n8n Docker image be extended with native dependencies (libvips, Cairo) needed for Sharp and node-canvas? May need a custom Docker image.

3. **Kinsoku shori implementation:** Is there an npm library for Japanese line-break rules, or must it be implemented from scratch? Research `budoux` (Google's JP line-break library) as a potential solution.

4. **Supabase Realtime vs polling:** If using Supabase, test whether Realtime subscriptions work reliably from Vercel edge functions. There may be connection limits.

5. **n8n workflow version management:** How to version-control n8n workflow JSON? Export/import via API, or use n8n's built-in workflow versioning? Important for team collaboration and rollback.

6. **Asset cleanup policy:** When should old campaign assets be deleted from S3? Implement lifecycle rules or manual cleanup to control storage costs.

---

## Sources

All findings in this document are based on training data (cutoff: May 2025). WebSearch and WebFetch were unavailable during this research session. The following areas should be verified against current documentation before implementation:

- n8n sub-workflow execution and queue mode: https://docs.n8n.io/
- Sharp compositing API: https://sharp.pixelplumbing.com/
- node-canvas font registration: https://github.com/Automattic/node-canvas
- Supabase Realtime: https://supabase.com/docs/guides/realtime
- Stripe Billing/Metering: https://stripe.com/docs/billing
- Platform ad specifications: Verify each platform's current developer documentation
- BudouX (JP line breaks): https://github.com/google/budoux

**Confidence note:** Architecture patterns and component boundaries are HIGH confidence (these are well-established patterns). Specific API details and configuration syntax are MEDIUM confidence and must be verified with current docs.
