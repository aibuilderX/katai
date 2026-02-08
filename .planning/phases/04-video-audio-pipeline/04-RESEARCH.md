# Phase 4: Video & Audio Pipeline - Research

**Researched:** 2026-02-09
**Domain:** AI video generation (Kling, Runway), Japanese TTS (ElevenLabs), AI avatar with lip-sync (HeyGen), fallback routing, progressive pipeline UI
**Confidence:** MEDIUM

---

## Summary

Phase 4 extends the campaign pipeline from static images + copy to include video ads, Japanese voiceover, AI avatar presenters, and cinematic video. This is the most API-integration-heavy phase so far, requiring orchestration of four new external AI providers (Kling, Runway Gen-4, ElevenLabs, HeyGen) alongside the existing Flux and Claude integrations. Each provider uses a different authentication scheme, different async patterns, different pricing models, and different generation timelines (ranging from seconds for TTS to minutes for video).

The core challenge is not individual API integration -- each provider has well-documented REST APIs and, in some cases, official SDKs. The challenge is orchestrating these providers into a coherent pipeline that: (1) generates assets in the right order (copy -> images -> voiceover -> video -> avatar), (2) provides progressive status updates to the user across a multi-minute generation window, (3) handles failures gracefully by routing to fallback providers, and (4) stays within reasonable cost per campaign.

The existing codebase already has the right architectural bones: n8n handles pipeline orchestration, the n8n webhook route handles result callbacks with progressive status updates, the `CampaignProgress` type already has a stage-based structure, and the `assets` table supports `type: 'video' | 'audio'` with a flexible `metadata` JSONB column. Phase 4 extends these patterns rather than replacing them.

**Primary recommendation:** Use the official Runway `@runwayml/sdk` npm package for cinematic video, the official `@elevenlabs/elevenlabs-js` SDK for Japanese TTS, direct REST API calls via n8n HTTP Request nodes for Kling (JWT auth) and HeyGen (API key auth), and fal.ai as the Kling API proxy for simpler authentication and pay-per-use pricing. Extend the `CampaignProgress` type with `videoStatus`, `voiceoverStatus`, and `avatarStatus` fields. Implement fallback routing in n8n using the error output path + IF node pattern.

---

## Standard Stack

### Core (new dependencies for Phase 4)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@runwayml/sdk` | latest | Runway Gen-4 video generation (cinematic) | Official TypeScript SDK with built-in retry, error types, task polling. HIGH confidence -- verified via Context7 `/runwayml/sdk-node` |
| `@elevenlabs/elevenlabs-js` | latest | Japanese voiceover TTS generation | Official TypeScript SDK with streaming, error handling, auto-retry. HIGH confidence -- verified via Context7 `/elevenlabs/elevenlabs-js` |

### Core (existing, extended)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| n8n HTTP Request node | (self-hosted) | Kling API and HeyGen API integration via REST | Already the orchestration layer; HTTP Request nodes handle JWT/API key auth, polling, and error routing natively |
| Supabase Storage | ^2.95.3 | Store generated video/audio assets | Already the storage layer; supports large files |
| Drizzle ORM | ^0.45.1 | Database operations for video/audio asset records | Already the ORM |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `jsonwebtoken` | ^9.x | JWT token generation for Kling API auth | Only if calling Kling API directly (not via fal.ai proxy) |
| `node-fetch` or built-in `fetch` | native | HTTP calls for Kling/HeyGen from Next.js API routes | Only needed if calling providers from Next.js route handlers instead of n8n |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Official Kling API (JWT auth, pre-paid packages) | fal.ai proxy for Kling | fal.ai: simpler auth (API key), pay-per-use ($0.07-0.168/sec), no 90-day package lock-in. Official API: cheaper at scale ($0.04-0.112/sec) but requires $4200+ upfront package purchase and JWT token management. **Recommend fal.ai for MVP, migrate to official API at scale** |
| Runway `@runwayml/sdk` | Direct REST API calls | SDK provides TypeScript types, automatic retry (2x), error classes. No reason to hand-roll |
| ElevenLabs `@elevenlabs/elevenlabs-js` | Direct REST API calls | SDK provides streaming, error types, auto-retry. No reason to hand-roll |
| HeyGen official SDK | Direct REST API calls via n8n | HeyGen has no official JS SDK. REST API is straightforward (API key in header). Use n8n HTTP Request node |
| n8n for all orchestration | Next.js API routes with queue | n8n already orchestrates the pipeline. Adding video steps to n8n workflow is natural extension. Moving to Next.js API routes would require building queue, retry, and status tracking from scratch |

**Installation:**
```bash
npm install @runwayml/sdk @elevenlabs/elevenlabs-js
```

If using Kling official API directly (not fal.ai):
```bash
npm install jsonwebtoken @types/jsonwebtoken
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── lib/
│   ├── ai/
│   │   ├── claude.ts              # EXISTING -- copy generation
│   │   ├── flux.ts                # EXISTING -- image generation
│   │   ├── runway.ts              # NEW: Runway Gen-4 cinematic video client
│   │   ├── elevenlabs.ts          # NEW: ElevenLabs Japanese TTS client
│   │   ├── kling.ts               # NEW: Kling video ad generation client (or via n8n only)
│   │   ├── heygen.ts              # NEW: HeyGen avatar video client (or via n8n only)
│   │   └── provider-health.ts     # NEW: Provider health tracking for fallback routing
│   └── constants/
│       └── video-providers.ts     # NEW: Provider configs, fallback mappings, cost tables
├── app/
│   └── api/
│       └── webhooks/
│           └── n8n/
│               └── route.ts       # MODIFY: Handle video/audio asset callbacks + progressive status
├── types/
│   └── campaign.ts                # MODIFY: Add videoStatus, voiceoverStatus, avatarStatus to CampaignProgress
└── hooks/
    └── use-campaign-progress.ts   # EXISTING -- already supports real-time updates via Supabase Realtime
```

### Pattern 1: Async Submit-Poll-Retrieve (All Video Providers)

**What:** Every video/audio provider uses the same fundamental async pattern: submit a generation request, receive a task ID, poll for completion, retrieve the result URL. This is identical to the existing Flux pattern in `src/lib/ai/flux.ts`.

**When to use:** Every video/audio generation call.

**Example (Runway Gen-4 via SDK):**
```typescript
// Source: Context7 /runwayml/sdk-node + official docs
import RunwayML from "@runwayml/sdk"

const runway = new RunwayML({
  apiKey: process.env.RUNWAYML_API_SECRET,
})

export async function generateCinematicVideo(
  imageUrl: string,
  promptText: string,
  options: { ratio?: string; duration?: number } = {}
): Promise<string> {
  // 1. Submit generation task
  const task = await runway.imageToVideo.create({
    model: "gen4_turbo",
    promptImage: imageUrl,
    promptText,
    ratio: options.ratio ?? "1920:1080",  // 16:9 default for cinematic
    duration: options.duration ?? 10,
  })

  // 2. Poll for completion
  const maxAttempts = 60  // 60 * 5s = 5 min timeout
  let attempts = 0

  while (attempts < maxAttempts) {
    await new Promise((resolve) => setTimeout(resolve, 5000))
    attempts++

    const result = await runway.tasks.retrieve(task.id)

    if (result.status === "SUCCEEDED") {
      // 3. Retrieve result URL
      if (result.output?.[0]) {
        return result.output[0]  // Video URL
      }
      throw new Error(`Runway task ${task.id} succeeded but no output URL`)
    }

    if (result.status === "FAILED") {
      throw new Error(`Runway generation failed for task ${task.id}: ${result.failure ?? "unknown"}`)
    }

    // PENDING or RUNNING -- continue polling
  }

  throw new Error(`Runway generation timed out after ${maxAttempts * 5}s for task ${task.id}`)
}
```

### Pattern 2: ElevenLabs Japanese TTS (Synchronous Return)

**What:** ElevenLabs TTS is one of the few providers that returns audio synchronously (or streams it). No polling needed. The response is a binary audio stream.

**When to use:** Generating Japanese voiceover for ad copy.

**Example:**
```typescript
// Source: Context7 /elevenlabs/elevenlabs-js
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js"
import { createClient } from "@/lib/supabase/admin"

const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
})

export async function generateJapaneseVoiceover(
  text: string,
  voiceId: string,
  options: { modelId?: string } = {}
): Promise<{ buffer: Buffer; duration: number }> {
  const audio = await elevenlabs.textToSpeech.convert(voiceId, {
    text,
    modelId: options.modelId ?? "eleven_multilingual_v2",
    outputFormat: "mp3_44100_128",
    languageCode: "ja",  // Enforce Japanese
    // Note: apply_language_text_normalization increases latency significantly
    // Only enable if intonation issues observed
  })

  // Convert ReadableStream to Buffer
  const chunks: Uint8Array[] = []
  const reader = audio.getReader()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
  }
  const buffer = Buffer.concat(chunks)

  return { buffer, duration: estimateAudioDuration(buffer.length) }
}

function estimateAudioDuration(bufferSize: number): number {
  // MP3 at 128kbps: ~16KB per second
  return Math.round(bufferSize / 16000)
}
```

### Pattern 3: Kling Video Generation via fal.ai Proxy

**What:** Use fal.ai as a proxy to access Kling models with simple API key auth instead of JWT token management.

**When to use:** Generating 15s/30s video ads in multiple aspect ratios.

**Example (via n8n HTTP Request node or direct):**
```typescript
// Source: fal.ai Kling API documentation
const FAL_API_BASE = "https://queue.fal.run"

export async function generateKlingVideo(
  prompt: string,
  options: {
    imageUrl?: string       // For image-to-video
    duration?: 5 | 10 | 15  // seconds
    aspectRatio?: "16:9" | "9:16" | "1:1"
    withAudio?: boolean
  } = {}
): Promise<string> {
  const apiKey = process.env.FAL_KEY
  if (!apiKey) throw new Error("FAL_KEY not set")

  const endpoint = options.imageUrl
    ? "fal-ai/kling-video/v2.6/pro/image-to-video"
    : "fal-ai/kling-video/v2.6/pro/text-to-video"

  // 1. Submit
  const submitRes = await fetch(`${FAL_API_BASE}/${endpoint}`, {
    method: "POST",
    headers: {
      "Authorization": `Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      ...(options.imageUrl ? { image_url: options.imageUrl } : {}),
      duration: String(options.duration ?? 5),
      aspect_ratio: options.aspectRatio ?? "16:9",
      ...(options.withAudio ? { enable_audio: true } : {}),
    }),
  })

  const { request_id } = await submitRes.json()

  // 2. Poll
  const maxAttempts = 60
  let attempts = 0
  while (attempts < maxAttempts) {
    await new Promise((r) => setTimeout(r, 5000))
    attempts++

    const statusRes = await fetch(
      `${FAL_API_BASE}/${endpoint}/requests/${request_id}/status`,
      { headers: { "Authorization": `Key ${apiKey}` } }
    )
    const status = await statusRes.json()

    if (status.status === "COMPLETED") {
      const resultRes = await fetch(
        `${FAL_API_BASE}/${endpoint}/requests/${request_id}`,
        { headers: { "Authorization": `Key ${apiKey}` } }
      )
      const result = await resultRes.json()
      return result.video?.url ?? result.output?.url
    }

    if (status.status === "FAILED") {
      throw new Error(`Kling generation failed: ${status.error}`)
    }
  }

  throw new Error(`Kling generation timed out after ${maxAttempts * 5}s`)
}
```

### Pattern 4: HeyGen Avatar Video via REST API

**What:** HeyGen uses a simple API key auth with a video generation endpoint that accepts avatar configuration, voice settings, and script text.

**When to use:** Generating AI avatar presenter ads with Japanese lip-sync.

**Example:**
```typescript
// Source: HeyGen API docs -- POST /v2/video/generate
const HEYGEN_API_BASE = "https://api.heygen.com"

export async function generateAvatarVideo(params: {
  avatarId: string
  voiceId: string
  script: string
  dimension?: { width: number; height: number }
}): Promise<string> {
  const apiKey = process.env.HEYGEN_API_KEY
  if (!apiKey) throw new Error("HEYGEN_API_KEY not set")

  // 1. Submit video generation
  const genRes = await fetch(`${HEYGEN_API_BASE}/v2/video/generate`, {
    method: "POST",
    headers: {
      "X-Api-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      video_inputs: [{
        character: {
          type: "avatar",
          avatar_id: params.avatarId,
          avatar_style: "normal",
        },
        voice: {
          type: "text",
          voice_id: params.voiceId,
          input_text: params.script,
          speed: 1.0,
        },
      }],
      dimension: params.dimension ?? { width: 1920, height: 1080 },
    }),
  })

  const { data } = await genRes.json()
  const videoId = data.video_id

  // 2. Poll for completion
  const maxAttempts = 120  // Avatar videos can take 2-5 minutes
  let attempts = 0
  while (attempts < maxAttempts) {
    await new Promise((r) => setTimeout(r, 5000))
    attempts++

    const statusRes = await fetch(
      `${HEYGEN_API_BASE}/v1/video_status.get?video_id=${videoId}`,
      { headers: { "X-Api-Key": apiKey } }
    )
    const statusData = await statusRes.json()

    if (statusData.data?.status === "completed") {
      return statusData.data.video_url
    }

    if (statusData.data?.status === "failed") {
      throw new Error(`HeyGen video generation failed for ${videoId}`)
    }
  }

  throw new Error(`HeyGen generation timed out after ${maxAttempts * 5}s`)
}
```

### Pattern 5: Progressive Pipeline Status (WORK-03)

**What:** Extend `CampaignProgress` to track video/audio stages independently. The pipeline generates assets in order: copy -> images -> voiceover -> video -> avatar. The dashboard shows each stage's status in real-time.

**When to use:** Every campaign that includes video generation.

**Example (extended CampaignProgress type):**
```typescript
// Source: Existing src/types/campaign.ts pattern
export interface CampaignProgress {
  stage: string
  copyStatus: "pending" | "generating" | "complete" | "failed"
  imageStatus: "pending" | "generating" | "complete" | "failed"
  compositingStatus?: "pending" | "generating" | "complete" | "failed"
  platformResizeStatus?: "pending" | "generating" | "complete" | "failed"
  emailStatus?: "pending" | "generating" | "complete" | "failed"
  // Phase 4 additions:
  voiceoverStatus?: "pending" | "generating" | "complete" | "failed" | "skipped"
  videoStatus?: "pending" | "generating" | "complete" | "failed" | "skipped"
  avatarStatus?: "pending" | "generating" | "complete" | "failed" | "skipped"
  percentComplete: number
  currentStep: string
}
```

### Pattern 6: Fallback Routing (VID-05)

**What:** When a primary video provider fails (API error, timeout, rate limit), automatically route to a fallback provider. Implemented in n8n using the error output path.

**When to use:** Every video generation step.

**n8n Implementation:**
```
[Kling Video Gen] --error--> [IF: retryCount < 3] --true--> [Wait 10s] ---> [Kling Retry]
                                                   --false--> [Runway Fallback Gen]

[Runway Cinematic] --error--> [IF: retryCount < 3] --true--> [Wait 10s] ---> [Runway Retry]
                                                    --false--> [Kling Fallback Gen]
```

**Provider health tracking (optional enhancement):**
```typescript
// Source: Circuit breaker pattern
interface ProviderHealth {
  providerId: string
  consecutiveFailures: number
  lastFailure: Date | null
  circuitOpen: boolean  // true = skip this provider
}

function shouldUseProvider(health: ProviderHealth): boolean {
  if (!health.circuitOpen) return true
  // Re-try after 5 minutes cooldown
  const cooldownMs = 5 * 60 * 1000
  if (health.lastFailure && Date.now() - health.lastFailure.getTime() > cooldownMs) {
    return true  // Half-open: try one request
  }
  return false
}
```

### Anti-Patterns to Avoid

- **Calling all video providers in parallel:** Video generation is expensive ($0.50-$6.00 per video). Sequential generation with early failure detection prevents wasted spend. Generate voiceover first (cheapest, ~$0.01), then short video ads (Kling, ~$0.70-$1.00), then cinematic (Runway, ~$0.50-$1.50), then avatar (HeyGen, ~$6.00/min). If an early step fails, halt before spending on expensive later steps.
- **Blocking the webhook handler on video generation:** Video generation takes 1-5 minutes. Never generate video synchronously in the n8n webhook callback. Use n8n's async workflow with Wait nodes for polling.
- **Storing video URLs from providers without downloading:** Provider-hosted URLs are typically temporary (expire in hours/days). Always download the video to Supabase Storage immediately after generation and store the Supabase storage key, not the provider URL.
- **Generating all aspect ratios for every video:** Only generate aspect ratios the user selected in their brief's `platforms` array. Instagram Stories needs 9:16, feed needs 1:1, YouTube needs 16:9. Map platform -> required aspect ratios, deduplicate, and generate only what's needed.
- **Using ElevenLabs v3 model for Japanese without testing:** The v3 model is newer but `eleven_multilingual_v2` has longer track record with Japanese. Test both before committing to v3 for production.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT token generation for Kling API | Custom JWT signing with crypto | `jsonwebtoken` npm package (if using official API) or fal.ai proxy (no JWT needed) | JWT has subtle security requirements (timing, algorithm validation). Use a battle-tested library or avoid JWT entirely via proxy |
| Video generation task polling | Custom polling loops per provider | Unified async poll utility (or n8n Wait + HTTP Request loop) | Each provider has different status field names, timeout characteristics, and retry semantics. A shared utility reduces bugs |
| Audio format conversion | FFmpeg binaries on server | ElevenLabs SDK returns MP3 directly; Kling returns video with audio baked in | MP3 is universally supported. Avoid FFmpeg dependency unless you need to merge separate audio + video tracks |
| Provider fallback routing | Custom state machine in Next.js | n8n error output path + IF node | n8n already has built-in error handling with visual debugging. State machines in code are harder to maintain and debug |
| Progressive UI status | Custom WebSocket server | Supabase Realtime (already configured) | The `useCampaignProgress` hook already subscribes to campaign row updates. Just update the `progress` JSONB column and the UI updates automatically |

**Key insight:** The biggest risk in Phase 4 is cost management and generation time. A single campaign with 3 aspect ratios of video + voiceover + avatar could cost $10-$20 and take 5-10 minutes. The pipeline must be designed to fail fast and fail cheap: generate the cheapest assets first, validate they succeed, then proceed to expensive assets.

---

## Common Pitfalls

### Pitfall 1: Video Generation Timeout on Serverless

**What goes wrong:** Video generation takes 1-5 minutes. If you try to call a video API and wait for the result in a Next.js API route on Vercel, you hit the 60-second function timeout.
**Why it happens:** Vercel serverless functions have a hard 60-second timeout (even on Pro plan: 300s). Video generation regularly exceeds this.
**How to avoid:** All video generation must be orchestrated through n8n (which has no timeout on self-hosted instances) or through a background job system. Never call video APIs directly from Next.js API routes with synchronous waiting. The n8n workflow submits the task, uses Wait nodes for polling, and sends results back via the existing webhook callback.
**Warning signs:** 504 Gateway Timeout errors on production, partial campaign generation.

### Pitfall 2: Temporary Provider URLs Expiring

**What goes wrong:** The campaign shows generated videos for the first few hours, then all video thumbnails and playback break.
**Why it happens:** Kling, Runway, and HeyGen all return temporary URLs that expire (typically 1-24 hours). If you store the provider URL in the database instead of downloading to Supabase Storage, assets disappear.
**How to avoid:** In the n8n workflow, immediately after receiving a completed video URL, download it and upload to Supabase Storage. Store the Supabase storage key in the `assets` table, never the provider URL.
**Warning signs:** Videos work immediately after generation but break the next day.

### Pitfall 3: Japanese Voiceover Intonation Issues

**What goes wrong:** ElevenLabs generates Japanese audio that sounds robotic or has incorrect pitch accent on certain words, especially proper nouns, brand names, and technical terms.
**Why it happens:** Japanese pitch accent is notoriously difficult for TTS systems. Common issues: flat intonation on compound words, incorrect accent on katakana loanwords, unnatural pause patterns in long sentences.
**How to avoid:** (1) Use `eleven_multilingual_v2` model which has the strongest Japanese support. (2) Keep voiceover scripts short (under 100 characters per segment). (3) Add SSML-like markers in the text if supported. (4) Test with native speaker before production. (5) The `languageCode: "ja"` parameter helps enforce Japanese phonetics. (6) `apply_language_text_normalization` is available but "can heavily increase latency."
**Warning signs:** Native Japanese speakers report unnatural-sounding audio; brand names pronounced incorrectly.

### Pitfall 4: HeyGen Avatar Video Cost Explosion

**What goes wrong:** A campaign with 3 avatar videos at 30 seconds each costs $9.00 in HeyGen credits alone (6 credits/min for Avatar IV = $0.50/credit on Scale plan * 6 credits * 1.5 min = $9.00).
**Why it happens:** Avatar IV is HeyGen's premium offering at 6 credits/minute. Combined with other video costs, a full campaign kit can exceed $20.
**How to avoid:** (1) Default to Photo Avatar (1 credit/min) instead of Avatar IV (6 credits/min) for standard campaigns. Reserve Avatar IV for "premium" tier only. (2) Limit avatar videos to 15 seconds maximum unless user explicitly requests 30 seconds. (3) Show cost estimation before generation (WORK-07 is a Phase 6 requirement, but a basic estimate here prevents bill shock).
**Warning signs:** Monthly API bill spikes; users complain about generation credits being consumed too quickly.

### Pitfall 5: n8n Workflow Complexity Explosion

**What goes wrong:** The n8n workflow becomes a tangled web of 50+ nodes with branching paths for each provider, aspect ratio, and fallback, making it impossible to debug or modify.
**Why it happens:** Each video provider needs: submit node, wait node, poll node, error handler, fallback path. Multiply by 3 providers and 3 aspect ratios = 27+ node chains.
**How to avoid:** (1) Use n8n sub-workflows: one sub-workflow per provider (e.g., "Generate Kling Video" sub-workflow handles submit/poll/retry internally). (2) The main campaign workflow calls sub-workflows sequentially. (3) Keep the main workflow clean with just: copy -> images -> voiceover -> video -> avatar -> callback. (4) Each sub-workflow handles its own retry/fallback logic.
**Warning signs:** n8n workflow canvas is unreadable; changes break unrelated paths; debugging requires tracing through 20+ nodes.

### Pitfall 6: Race Condition on Progressive Status Updates

**What goes wrong:** Multiple n8n nodes update the campaign's `progress` JSONB column concurrently, and one update overwrites another (e.g., voiceover completion overwrites video status).
**Why it happens:** If voiceover and video generation run in parallel and both update `progress` at the same moment, the last write wins and the other status is lost.
**How to avoid:** (1) Use n8n's sequential execution for status updates -- never update progress from parallel branches simultaneously. (2) In the n8n webhook callback handler, use a Postgres JSONB merge update instead of full replacement: `jsonb_set(progress, '{videoStatus}', '"complete"')`. (3) Alternatively, use separate webhook calls for each stage completion.
**Warning signs:** Dashboard shows voiceover as "pending" even though it completed; status flickers between states.

---

## Code Examples

### Runway Gen-4 Image-to-Video (TypeScript)

```typescript
// Source: Context7 /runwayml/sdk-node -- verified HIGH confidence
import RunwayML from "@runwayml/sdk"

const client = new RunwayML({
  apiKey: process.env.RUNWAYML_API_SECRET,
})

// Create image-to-video task
const task = await client.imageToVideo.create({
  model: "gen4_turbo",                    // 5 credits/sec = $0.05/sec
  promptImage: "https://storage.example.com/campaign-image.png",
  promptText: "Smooth cinematic camera movement revealing the product",
  ratio: "1920:1080",                     // 16:9 for cinematic
  duration: 10,                           // 10 seconds
})

// Poll for task completion
const result = await client.tasks.retrieve(task.id)
// result.status: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED"
// result.output: string[] (video URLs when SUCCEEDED)
```

### ElevenLabs Japanese TTS (TypeScript)

```typescript
// Source: Context7 /elevenlabs/elevenlabs-js -- verified HIGH confidence
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js"

const client = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
})

// Generate Japanese voiceover
const audio = await client.textToSpeech.convert("voiceIdHere", {
  text: "新商品のご紹介です。限定セール開催中。",
  modelId: "eleven_multilingual_v2",       // Best Japanese support
  outputFormat: "mp3_44100_128",
  languageCode: "ja",                      // Enforce Japanese phonetics
})
// Returns ReadableStream<Uint8Array> -- pipe to file or Buffer
```

### Kling JWT Auth (if using official API directly)

```typescript
// Source: GitHub betasecond/KlingDemo -- verified MEDIUM confidence
import jwt from "jsonwebtoken"

function generateKlingJWT(): string {
  const accessKey = process.env.KLING_ACCESS_KEY!
  const secretKey = process.env.KLING_SECRET_KEY!

  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: accessKey,
    exp: now + 1800,   // 30 minute expiration
    nbf: now - 5,      // Valid 5 seconds ago (clock skew tolerance)
  }

  return jwt.sign(payload, secretKey, { algorithm: "HS256" })
}

// Use in Authorization header:
// Authorization: Bearer ${generateKlingJWT()}
```

### HeyGen Avatar Video Request

```typescript
// Source: HeyGen docs /reference/create-video -- verified MEDIUM confidence
const response = await fetch("https://api.heygen.com/v2/video/generate", {
  method: "POST",
  headers: {
    "X-Api-Key": process.env.HEYGEN_API_KEY!,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    video_inputs: [{
      character: {
        type: "avatar",            // or "talking_photo" for cheaper option
        avatar_id: "selected_avatar_id",
        avatar_style: "normal",    // "circle" | "closeUp" | "normal"
      },
      voice: {
        type: "text",
        voice_id: "japanese_voice_id",  // From GET /v2/voices
        input_text: "こんにちは、新製品のご案内です。",
        speed: 1.0,
        // emotion: "Friendly",    // Optional
      },
    }],
    dimension: { width: 1080, height: 1920 },  // 9:16 for vertical
    // callback_url: "https://your-app.com/api/webhooks/heygen",  // Optional webhook
  }),
})

const { data } = await response.json()
// data.video_id -- use to poll GET /v1/video_status.get?video_id={id}
```

### n8n Webhook Handler Extension for Video Assets

```typescript
// Source: Existing src/app/api/webhooks/n8n/route.ts pattern
// Phase 4 extends the payload to include video/audio assets:

interface N8nWebhookPayload {
  campaignId: string
  status: "success" | "failure"
  stage: "copy" | "image" | "voiceover" | "video" | "avatar" | "complete"
  copyVariants?: CopyVariantPayload[]
  imageUrls?: string[]
  // Phase 4 additions:
  videoAssets?: Array<{
    url: string
    provider: "kling" | "runway" | "heygen"
    aspectRatio: string
    duration: number
    type: "ad" | "cinematic" | "avatar"
    mimeType: string
  }>
  audioAssets?: Array<{
    url: string
    provider: "elevenlabs"
    duration: number
    mimeType: string
    voiceId: string
  }>
  error?: string
}
```

---

## Provider Comparison Matrix

### Video Generation Providers

| Feature | Kling (via fal.ai) | Runway Gen-4 Turbo | HeyGen Avatar IV |
|---------|--------------------|--------------------|------------------|
| **Primary Use** | 15s/30s ad videos | Cinematic video | Avatar presenter |
| **Input** | Text or Image + Text | Image + Text | Avatar + Script |
| **Max Duration** | 15s (Kling 3.0) / 10s (2.6) | 10s | 30 min (Scale plan) |
| **Aspect Ratios** | 16:9, 9:16, 1:1, 4:3, 3:4, 21:9 | 1920:1080, 1080:1920, 960:960, 1280:720, 720:1280 | Custom (width x height) |
| **Auth** | API Key (fal.ai) / JWT (official) | Bearer token (SDK handles) | X-Api-Key header |
| **SDK** | None (REST only) | `@runwayml/sdk` (TypeScript) | None (REST only) |
| **Cost (10s video)** | ~$0.70-$1.68 | ~$0.50 (turbo) / $1.50 (aleph) | ~$1.00 (avatar) / $6.00 (Avatar IV) per minute |
| **Generation Time** | 30-60s | 30-120s | 60-300s |
| **Audio Support** | Native audio (Kling 2.6+) | No native audio | Voice from text/audio |
| **Japanese Support** | Audio with JP mixing (Kling 3.0) | N/A (no audio) | 175+ languages incl. JP |
| **Fallback For** | Runway (similar visual quality) | Kling (similar visual quality) | None (unique capability) |

### TTS Provider

| Feature | ElevenLabs |
|---------|-----------|
| **Primary Use** | Japanese voiceover |
| **Models** | `eleven_multilingual_v2` (recommended), `eleven_v3`, `eleven_flash_v2_5` |
| **Japanese Quality** | HIGH -- dedicated JP text normalization |
| **Cost** | ~$0.01 per 100 chars (1 credit = 1 char, Starter plan $5/30K credits) |
| **Latency** | v2: ~300ms, Flash: ~75ms |
| **Output Format** | MP3, WAV, PCM, Opus |
| **Auth** | `xi-api-key` header / SDK handles |
| **SDK** | `@elevenlabs/elevenlabs-js` (TypeScript) |

---

## Pipeline Architecture

### Current Flow (Phase 1-3)

```
Brief -> n8n webhook -> Claude (platform-specific copy)
                     -> Flux (4 base images at 1024x1024)
                     -> Compositing (JP text overlay)
                     -> Platform Resize (all selected sizes)
                     -> ZIP packaging
                     -> Campaign status: complete
```

### Phase 4 Flow

```
Brief -> n8n webhook -> Claude (platform-specific copy)
                     -> Flux (4 base images at 1024x1024)
                     -> Compositing (JP text overlay)
                     -> Platform Resize (all selected sizes)
                     |
                     +-> ElevenLabs (Japanese voiceover from copy)        [cheapest first]
                     |   Status: voiceoverStatus = "generating"
                     |
                     +-> Kling (15s/30s video ads in 16:9, 9:16, 1:1)    [medium cost]
                     |   Status: videoStatus = "generating"
                     |   Uses: composited images as input (image-to-video)
                     |   Fallback: Runway Gen-4 Turbo on failure
                     |
                     +-> Runway Gen-4 (cinematic video, premium only)     [higher cost]
                     |   Status: videoStatus = "generating"
                     |   Uses: composited image as input
                     |   Fallback: Kling Pro mode on failure
                     |
                     +-> HeyGen (avatar presenter, if selected)           [highest cost]
                         Status: avatarStatus = "generating"
                         Uses: voiceover audio OR generated text + JP voice
                         No fallback (unique capability)
                     |
                     -> Download all provider URLs to Supabase Storage
                     -> Update assets table with video/audio records
                     -> Campaign status: complete
```

### Generation Order (Critical for Cost Control)

```
Step 1: Copy generation (Claude)           ~$0.02   |  ~5 seconds
Step 2: Image generation (Flux)            ~$0.24   |  ~60 seconds
Step 3: Compositing + Resize               ~$0.00   |  ~10 seconds
Step 4: Voiceover (ElevenLabs)             ~$0.05   |  ~5 seconds
Step 5: Video ads (Kling x 3 ratios)       ~$2.10   |  ~90-180 seconds
Step 6: Cinematic video (Runway)           ~$0.50   |  ~60-120 seconds
Step 7: Avatar video (HeyGen)             ~$1.00+   |  ~120-300 seconds
                                           --------    --------
Estimated total per campaign:              ~$3.91    |  ~6-12 minutes
```

If Step 4 (voiceover) fails, halt Steps 5-7.
If Step 5 (video) fails, try fallback, then halt.
Steps 5 and 6 can potentially run in parallel (different providers, different purpose).
Step 7 depends on Step 4 completing (needs voiceover audio for lip-sync).

### Database Schema Changes

The existing `assets` table already supports video and audio:
```sql
-- Existing schema (no migration needed):
-- assets.type: 'image' | 'video' | 'audio'  (already supports video/audio)
-- assets.metadata: JSONB (flexible for provider-specific data)

-- Phase 4 uses metadata for:
-- Video: { provider: "kling", aspectRatio: "16:9", duration: 15, videoType: "ad" }
-- Video: { provider: "runway", aspectRatio: "16:9", duration: 10, videoType: "cinematic" }
-- Video: { provider: "heygen", aspectRatio: "9:16", duration: 15, videoType: "avatar", avatarId: "..." }
-- Audio: { provider: "elevenlabs", voiceId: "...", modelId: "eleven_multilingual_v2", script: "..." }
```

The `CampaignProgress` type needs extending (already shown in Pattern 5 above).

### New Environment Variables

```env
# Runway Gen-4
RUNWAYML_API_SECRET=

# ElevenLabs
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID_JP_FEMALE=     # Default Japanese female voice
ELEVENLABS_VOICE_ID_JP_MALE=       # Default Japanese male voice

# Kling (via fal.ai)
FAL_KEY=

# Kling (official API -- only if not using fal.ai)
KLING_ACCESS_KEY=
KLING_SECRET_KEY=

# HeyGen
HEYGEN_API_KEY=
HEYGEN_DEFAULT_AVATAR_ID=          # Default Japanese-presenting avatar
HEYGEN_JP_VOICE_ID=                # Default Japanese voice in HeyGen
```

---

## Cost Analysis

### Per-Campaign Cost Estimate

| Asset | Provider | Unit Cost | Qty per Campaign | Subtotal |
|-------|----------|-----------|-----------------|----------|
| Copy | Claude | ~$0.005/call | 1 | $0.005 |
| Base Images | Flux | ~$0.06/image | 4 | $0.24 |
| Voiceover | ElevenLabs | ~$0.01/100 chars | 1 (100 chars) | $0.01 |
| Video Ad (16:9, 10s) | Kling via fal.ai | ~$0.70/video | 1 | $0.70 |
| Video Ad (9:16, 10s) | Kling via fal.ai | ~$0.70/video | 1 | $0.70 |
| Video Ad (1:1, 10s) | Kling via fal.ai | ~$0.70/video | 1 | $0.70 |
| Cinematic (16:9, 10s) | Runway Gen-4 Turbo | ~$0.50/video | 1 | $0.50 |
| Avatar (15s) | HeyGen Photo Avatar | ~$0.25/video | 1 | $0.25 |
| **Total** | | | | **~$3.11** |

**Premium campaign (with Avatar IV):** Replace HeyGen Photo Avatar ($0.25) with Avatar IV (~$1.50-$3.00) = **~$4.36-$5.86** total.

**Notes:**
- HeyGen Avatar IV costs 6 credits/min at $0.50/credit (Scale plan). Photo Avatar costs 1 credit/min. Significant difference.
- Kling costs via fal.ai are higher than official API ($0.07/sec vs ~$0.04/sec at bulk pricing), but no upfront package required.
- Runway Gen-4 Turbo at 5 credits/sec ($0.05/sec) is cheaper than Gen-4 Aleph at 15 credits/sec ($0.15/sec). Use Turbo for standard, Aleph for premium.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Kling 1.x (5-10s max, no audio) | Kling 3.0 (3-15s, native audio, JP mixing) | 2025-2026 | Longer videos with synchronized audio in single generation |
| Runway Gen-3 Alpha | Runway Gen-4 Turbo/Aleph | 2025 | Better temporal consistency, more models available via API |
| ElevenLabs Multilingual v1 | ElevenLabs v3 + Multilingual v2 | 2025-2026 | Better Japanese intonation, lower latency with Flash models |
| HeyGen Avatar III | HeyGen Avatar IV | 2025 | Photorealistic expressions, diffusion-based lip-sync engine |
| Single video per campaign | Multi-aspect-ratio video ads | Phase 4 | Platform-ready video assets (16:9, 9:16, 1:1) |

**Deprecated/outdated:**
- Kling v1.x models -- replaced by v2.6+ with native audio. v1.x still available but inferior quality.
- Runway Gen-3 Alpha -- still available but Gen-4 Turbo is cheaper (same 5 credits/sec) with better quality.
- ElevenLabs `eleven_monolingual_v1` -- English-only, superseded by multilingual models.

---

## Open Questions

1. **Kling 3.0 API availability via fal.ai**
   - What we know: fal.ai lists Kling 2.6 Pro models. Kling 3.0 was announced with 15s generation and smart storyboard features.
   - What's unclear: Whether Kling 3.0 models are available via fal.ai yet, or only through the official API with bulk packages. The requirement says "Kling 3.0" specifically.
   - Recommendation: Start with Kling 2.6 Pro via fal.ai (supports 10s, all aspect ratios). The 10s limit is workable for 15s ads by generating 2x5s segments and concatenating, or by extending once 3.0 is available. Monitor fal.ai for 3.0 availability. If 3.0 is only on official API, consider the $4200 package for production.

2. **ElevenLabs voice selection for Japanese**
   - What we know: ElevenLabs has Japanese voices available via the voice library. The `eleven_multilingual_v2` model supports Japanese with dedicated text normalization.
   - What's unclear: Which specific voice IDs sound best for Japanese advertising (natural, professional, appropriate for brand campaigns). No pre-selected voice IDs available without testing.
   - Recommendation: During implementation, query `GET /v1/voices` filtered by Japanese, test 3-5 voices with sample ad copy, and store the selected voice IDs as environment variables. Consider allowing the user to select voice persona (male/female, formal/casual) in the brief.

3. **HeyGen Japanese-presenting avatar selection**
   - What we know: HeyGen has 100+ avatars. They support 175+ languages for voice including Japanese.
   - What's unclear: Which avatars look culturally appropriate for Japanese advertising. Avatar selection may need to be curated.
   - Recommendation: Manually curate 3-5 avatars from HeyGen's library that are suitable for Japanese business/advertising contexts. Store as selectable options or as a default. Test lip-sync quality with Japanese text specifically.

4. **Video ad duration: 15s vs 30s via Kling**
   - What we know: Kling 2.6 supports 5s and 10s. Kling 3.0 supports up to 15s. The requirement says "15s/30s video ads."
   - What's unclear: How to generate 30s videos. Neither Kling nor Runway supports 30s in a single generation.
   - Recommendation: For 30s ads, generate two 15s segments and concatenate server-side (using a simple FFmpeg call or a video stitching service). Alternatively, use the video extend feature. This is a known limitation -- document it clearly in the plan.

5. **Video + Audio merging for Runway cinematic**
   - What we know: Runway Gen-4 generates video without audio. ElevenLabs generates audio without video.
   - What's unclear: How to combine a Runway video with an ElevenLabs voiceover into a single playable asset.
   - Recommendation: Use FFmpeg to merge audio + video tracks server-side. This requires FFmpeg installed on the n8n server (self-hosted, so feasible). Alternatively, use the Runway API's built-in text-to-speech feature (they offer ElevenLabs voices via their audio endpoints at 1 credit per 50 chars). This avoids FFmpeg but costs more.

6. **Concurrent generation limits**
   - What we know: The project targets 3 concurrent campaigns (from PROJECT.md constraints). Each campaign could make 5-8 API calls to video providers.
   - What's unclear: Whether the API rate limits of each provider can handle 3 concurrent campaigns generating simultaneously (15-24 concurrent API requests).
   - Recommendation: Maintain the existing sequential processing pattern within each campaign. n8n can handle 3 concurrent workflow executions. Each workflow processes its video steps sequentially (not parallel) to stay within rate limits.

---

## Sources

### Primary (HIGH confidence)
- Context7 `/runwayml/sdk-node` -- SDK initialization, image-to-video create, error handling, TypeScript types
- Context7 `/elevenlabs/elevenlabs-js` -- SDK initialization, textToSpeech.convert, error handling, model IDs
- [Runway API Documentation](https://docs.dev.runwayml.com/) -- endpoints, pricing (5 credits/sec for gen4_turbo), aspect ratios, task management
- [Runway API Pricing](https://docs.dev.runwayml.com/guides/pricing/) -- credit costs per model, $0.01/credit
- [ElevenLabs API - Text to Speech](https://elevenlabs.io/docs/api-reference/text-to-speech/convert) -- endpoint, parameters, Japanese text normalization
- [ElevenLabs Models](https://elevenlabs.io/docs/overview/models) -- model IDs, language support, latency comparison

### Secondary (MEDIUM confidence)
- [Kling AI Official Pricing](https://klingai.com/global/dev/pricing) -- per-unit costs, model comparison, functional models (lip-sync, avatar, audio)
- [KlingAPI.com Documentation](https://klingapi.com/docs) -- endpoints, JWT auth, parameters, model list, camera controls, Kling 3.0 features
- [HeyGen API - Create Video](https://docs.heygen.com/reference/create-an-avatar-video-v2) -- endpoint, request schema, voice configuration, dimension options
- [HeyGen API - Credit Consumption](https://docs.heygen.com/reference/limits) -- credits per minute by avatar type, concurrent job limits, resolution caps
- [GitHub betasecond/KlingDemo](https://github.com/betasecond/KlingDemo) -- JWT auth pattern, Python reference implementation, polling pattern
- [n8n Error Handling](https://docs.n8n.io/flow-logic/error-handling/) -- error workflows, retry-on-fail, continue on error output
- [n8n Circuit Breaker Pattern](https://dev.to/jbhflow/idempotency-and-circuit-breakers-in-n8n-a-production-survival-guide-3cnb) -- fallback routing implementation in n8n
- [n8n Kling + ElevenLabs Workflow Templates](https://n8n.io/workflows/3121-ai-powered-short-form-video-generator-with-openai-flux-kling-and-elevenlabs/) -- real-world n8n integration patterns

### Tertiary (LOW confidence)
- fal.ai Kling pricing ($0.07-0.168/sec) -- from fal.ai pricing page, not verified against current rates
- HeyGen Japanese voice quality -- inferred from "175+ languages" claim, not tested with Japanese ad copy specifically
- Kling 3.0 API availability -- announced features, unclear which are available via API vs platform-only
- 30-second video generation -- no provider supports 30s natively; concatenation approach is theoretical

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- Runway SDK and ElevenLabs SDK verified via Context7 with code examples. HeyGen REST API verified via official docs. Kling API structure verified via multiple sources.
- Architecture: HIGH -- Pipeline extension follows existing n8n webhook + sequential processing pattern established in Phases 1-3.
- API integration details: MEDIUM -- Endpoints and auth methods verified, but exact parameter behaviors (especially Kling 3.0 features and HeyGen Japanese lip-sync quality) need validation during implementation.
- Cost estimates: MEDIUM -- Based on published pricing pages. Actual costs depend on generation parameters, retries, and provider pricing changes.
- Pitfalls: HIGH -- Based on real-world patterns observed in n8n workflow templates and video generation pipeline implementations.

**Research date:** 2026-02-09
**Valid until:** 2026-03-11 (30 days -- video AI space moves fast; pricing and model availability may change)
