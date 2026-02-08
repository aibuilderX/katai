# Phase 3: Multi-Platform Formatting & Delivery - Research

**Researched:** 2026-02-08
**Domain:** Multi-platform image resizing, platform-specific copy generation, grid preview UI, ZIP packaging, and end-to-end pipeline orchestration
**Confidence:** HIGH

---

## Summary

Phase 3 transforms the system from generating a single composited image and generic copy into producing a complete, downloadable campaign kit with correctly sized and validated assets for all selected platforms. The phase has five interconnected workstreams: (1) platform-specific copy generation with enforced character limits, (2) image auto-resizing to all platform dimensions using sharp, (3) a grid-view review UI with platform-dimension previews, (4) ZIP download packaging organized by platform, and (5) wiring the full pipeline end-to-end from brief submission through n8n orchestration to delivered kit.

The existing codebase provides strong foundations. Platform definitions with dimensions already exist in `src/lib/constants/platforms.ts`. The compositing pipeline in `src/lib/compositing/index.ts` already produces composited images at base resolution. Copy generation via Claude exists but currently generates identical copy for all platforms rather than platform-specific variants. The campaign detail UI has a Download button that is currently non-functional.

**Primary recommendation:** Use sharp's `resize()` with `fit: 'cover'` for platform image resizing (already a dependency), archiver for server-side ZIP generation streamed via Next.js App Router route handlers, extend Claude's copy generation prompt to produce platform-specific variants with enforced character limits, and build a new grid-view tab in the campaign detail page that shows assets grouped by platform with dimension badges.

---

## Standard Stack

### Core (already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| sharp | ^0.34.5 | Image resize/crop/format conversion | Already used for compositing; `resize()` with fit modes handles all platform dimensions. HIGH confidence -- verified via Context7 |
| @anthropic-ai/sdk | ^0.73.0 | Claude API for platform-specific copy generation | Already used; extend tool schema for per-platform variants |
| Next.js 15 App Router | 16.1.6 | Route handlers for ZIP streaming, API endpoints | Already the framework; supports `new Response(stream)` natively |
| Supabase Storage | ^2.95.3 | Store resized platform assets | Already the storage layer |
| Drizzle ORM | ^0.45.1 | Database operations for platform assets | Already the ORM |

### New Dependencies

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| archiver | ^7.x | Server-side ZIP archive creation with streaming | ZIP download endpoint -- generates archive from Supabase Storage buffers. HIGH confidence -- verified via Context7, 9M+ weekly npm downloads |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| archiver | JSZip | JSZip works in browser + server but archiver has better streaming support for server-side generation. archiver is the standard for Node.js streaming ZIP |
| archiver | adm-zip | adm-zip is simpler API but loads entire ZIP into memory. archiver streams, which matters for large campaign kits |
| react-email | Hand-rolled HTML | react-email provides React components for email templates with cross-client compatibility. However, PLAT-07 only requires generating static HTML -- hand-rolling a simple table-based template with inline CSS is sufficient for Phase 3 and avoids adding a dependency for a single template |

**Installation:**
```bash
npm install archiver @types/archiver
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── lib/
│   ├── constants/
│   │   └── platforms.ts              # EXISTING -- extend with copy constraints
│   ├── platforms/
│   │   ├── copy-constraints.ts       # NEW: Character limits, format rules per platform
│   │   ├── image-resizer.ts          # NEW: Sharp-based multi-platform resize pipeline
│   │   ├── email-template.ts         # NEW: HTML email generator (PLAT-07)
│   │   └── zip-packager.ts           # NEW: archiver-based ZIP generation
│   ├── ai/
│   │   └── prompts/
│   │       └── copy-generation.ts    # MODIFY: Platform-specific copy prompt
│   └── compositing/
│       └── index.ts                  # MODIFY: Accept target dimensions for resize
├── app/
│   └── api/
│       └── campaigns/
│           └── [id]/
│               ├── route.ts          # EXISTING
│               ├── download/
│               │   └── route.ts      # NEW: ZIP download endpoint
│               └── platform-assets/
│                   └── route.ts      # NEW: Fetch resized assets by platform
└── components/
    └── campaign/
        ├── platform-grid-view.tsx    # NEW: Grid view with platform previews
        ├── platform-asset-card.tsx   # NEW: Individual platform asset card
        └── download-button.tsx       # NEW: Download button with progress
```

### Pattern 1: Platform Copy Constraints Registry

**What:** A declarative registry mapping each platform ID to its copy constraints (character limits, required fields, format rules). Used by both the Claude prompt builder and client-side validation.

**When to use:** Any time copy needs to be generated or validated for a specific platform.

**Example:**
```typescript
// Source: Codebase pattern + platform research
export interface PlatformCopyConstraints {
  platformId: string
  headline: { maxChars: number; label: string }
  body: { maxChars: number; label: string }
  cta: { maxChars: number; label: string }
  hashtags: { max: number; required: boolean }
  formatNotes: string[] // Platform-specific formatting rules
}

export const PLATFORM_COPY_CONSTRAINTS: Record<string, PlatformCopyConstraints> = {
  line: {
    platformId: "line",
    headline: { maxChars: 20, label: "タイトル" },
    body: { maxChars: 60, label: "テキスト" },  // Rich message text limit
    cta: { maxChars: 15, label: "アクション" },
    hashtags: { max: 0, required: false },  // LINE doesn't use hashtags
    formatNotes: ["リッチメッセージ向け短文", "絵文字使用可"],
  },
  yahoo_japan: {
    platformId: "yahoo_japan",
    headline: { maxChars: 15, label: "タイトル" },  // 15 full-width chars
    body: { maxChars: 39, label: "説明文" },  // 39 chars shown, max 90
    cta: { maxChars: 15, label: "ボタン" },
    hashtags: { max: 0, required: false },
    formatNotes: ["YDA広告規定準拠", "記号使用制限あり"],
  },
  rakuten: {
    platformId: "rakuten",
    headline: { maxChars: 30, label: "キャッチコピー" },  // 30 chars visible in search
    body: { maxChars: 87, label: "商品説明" },  // Catch copy limit
    cta: { maxChars: 15, label: "購入ボタン" },
    hashtags: { max: 0, required: false },
    formatNotes: ["楽天SEO対策考慮", "商品名は別途127文字まで"],
  },
  instagram: {
    platformId: "instagram",
    headline: { maxChars: 30, label: "見出し" },
    body: { maxChars: 125, label: "キャプション" },  // 125 chars before "more"
    cta: { maxChars: 20, label: "CTA" },
    hashtags: { max: 5, required: true },
    formatNotes: ["125文字以内で要点を伝える（それ以降は「続きを読む」）"],
  },
  tiktok: {
    platformId: "tiktok",
    headline: { maxChars: 25, label: "見出し" },
    body: { maxChars: 100, label: "説明文" },  // Ad description limit
    cta: { maxChars: 15, label: "CTA" },
    hashtags: { max: 3, required: true },
    formatNotes: ["短く簡潔に", "トレンドワード活用推奨"],
  },
  x: {
    platformId: "x",
    headline: { maxChars: 25, label: "見出し" },
    body: { maxChars: 280, label: "ツイート本文" },  // Tweet char limit
    cta: { maxChars: 15, label: "CTA" },
    hashtags: { max: 3, required: true },
    formatNotes: ["280文字制限（URLは23文字としてカウント）"],
  },
  email: {
    platformId: "email",
    headline: { maxChars: 50, label: "件名" },
    body: { maxChars: 500, label: "メール本文" },
    cta: { maxChars: 20, label: "CTAボタン" },
    hashtags: { max: 0, required: false },
    formatNotes: ["件名は50文字以内推奨", "敬語レベル厳守", "HTML形式"],
  },
}
```

### Pattern 2: Image Resize Pipeline

**What:** A function that takes a composited image buffer and a list of target platform dimensions, and produces resized variants using sharp. Each variant is stored with platform and dimension metadata.

**When to use:** After compositing is complete, before assets are available for review or download.

**Example:**
```typescript
// Source: sharp Context7 docs -- resize API
import sharp from "sharp"

interface ResizeTarget {
  platformId: string
  label: string
  width: number
  height: number
}

interface ResizedAsset {
  platformId: string
  dimensionLabel: string
  width: number
  height: number
  buffer: Buffer
  fileName: string
}

export async function resizeForPlatforms(
  sourceBuffer: Buffer,
  sourceWidth: number,
  sourceHeight: number,
  targets: ResizeTarget[]
): Promise<ResizedAsset[]> {
  const results: ResizedAsset[] = []

  for (const target of targets) {
    const resized = await sharp(sourceBuffer)
      .resize(target.width, target.height, {
        fit: "cover",             // Crop to fill exact dimensions
        position: "attention",    // Smart crop using attention detection
        kernel: sharp.kernel.lanczos3,  // High-quality downsampling
      })
      .png({ quality: 90 })
      .toBuffer()

    results.push({
      platformId: target.platformId,
      dimensionLabel: target.label,
      width: target.width,
      height: target.height,
      buffer: resized,
      fileName: `${target.platformId}-${target.label}-${target.width}x${target.height}.png`,
    })
  }

  return results
}
```

### Pattern 3: ZIP Download via Route Handler Streaming

**What:** A Next.js App Router route handler that assembles a ZIP archive from Supabase Storage assets and streams it to the client.

**When to use:** When user clicks the "Download" button on campaign detail page.

**Example:**
```typescript
// Source: archiver Context7 docs + Next.js route handler pattern
import { ZipArchive } from "archiver"
import { PassThrough } from "stream"

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const campaignId = params.id
  // ... auth check, fetch assets from DB ...

  const archive = new ZipArchive({ zlib: { level: 6 } })
  const passthrough = new PassThrough()
  archive.pipe(passthrough)

  // Add assets organized by platform folder
  for (const asset of platformAssets) {
    const response = await fetch(asset.storageKey)
    const buffer = Buffer.from(await response.arrayBuffer())
    archive.append(buffer, {
      name: `${asset.platformId}/${asset.fileName}`,
    })
  }

  // Add copy as text files per platform
  for (const [platform, variants] of Object.entries(copyByPlatform)) {
    const copyText = formatCopyForExport(variants)
    archive.append(copyText, {
      name: `${platform}/copy.txt`,
    })
  }

  archive.finalize()

  // Convert Node stream to Web ReadableStream
  const stream = new ReadableStream({
    start(controller) {
      passthrough.on("data", (chunk) => controller.enqueue(chunk))
      passthrough.on("end", () => controller.close())
      passthrough.on("error", (err) => controller.error(err))
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="campaign-${campaignId}.zip"`,
    },
  })
}
```

### Pattern 4: Platform-Specific Copy Prompt Extension

**What:** Modify the existing Claude copy generation to produce per-platform variants with enforced character limits, instead of one-size-fits-all copy.

**When to use:** During campaign generation, replacing the current `generateCopy` flow.

**Example:**
```typescript
// Source: Existing copy-generation.ts pattern
// Current: generates 4 generic variants
// Phase 3: generates 4 variants PER PLATFORM with platform-specific constraints

const DELIVER_PLATFORM_COPY_TOOL: Anthropic.Tool = {
  name: "deliver_platform_copy",
  description: "プラットフォーム別の広告コピーを返します",
  input_schema: {
    type: "object",
    properties: {
      platforms: {
        type: "array",
        items: {
          type: "object",
          properties: {
            platformId: { type: "string" },
            variants: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  headline: { type: "string" },
                  body: { type: "string" },
                  cta: { type: "string" },
                  hashtags: { type: "array", items: { type: "string" } },
                },
                required: ["headline", "body", "cta", "hashtags"],
              },
              minItems: 4,
              maxItems: 4,
            },
          },
          required: ["platformId", "variants"],
        },
      },
    },
    required: ["platforms"],
  },
}
```

### Anti-Patterns to Avoid

- **Resizing from resized images:** Always resize from the highest-resolution source (base composited image), never from a previously resized variant. Each resize from a resize compounds quality loss.
- **Synchronous ZIP in memory:** For campaigns with 7+ platforms and 4+ images each, the ZIP can be large. Always stream the archive rather than building the entire buffer in memory.
- **Platform dimension hardcoding in components:** Use the existing `PLATFORMS` registry, not hardcoded dimensions in component files. The registry is the single source of truth.
- **Generating all platform sizes eagerly:** Only resize for platforms the user selected in their brief. The `brief.platforms` array already tracks this.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Image resizing with smart cropping | Custom canvas/pixel manipulation | sharp `.resize()` with `fit: 'cover'` and `position: 'attention'` | sharp wraps libvips; handles color profiles, ICC, alpha channels, and attention-based smart crop |
| ZIP archive creation | Manual ZIP binary format assembly | archiver library | ZIP format has compression, CRC32, directory records, UTF-8 filename encoding -- complex binary format |
| HTML email rendering | String concatenation of HTML tags | Table-based template with inline CSS (simple enough for Phase 3) | Email clients strip `<style>` tags; all CSS must be inline. Use `<table>` layout, not flexbox/grid |
| Japanese character counting | `.length` | `[...str].length` (spread into codepoints) | JavaScript `.length` counts UTF-16 code units, not characters. A single emoji or kanji with surrogate pairs counts as 2 with `.length` but 1 with spread |
| Stream conversion (Node to Web) | Manual chunk forwarding | PassThrough pipe to ReadableStream or Node.js built-in `.toWeb()` | Edge cases with backpressure, encoding, and stream lifecycle |

**Key insight:** The biggest risk in this phase is character counting for Japanese text. JavaScript `String.length` counts UTF-16 code units, not user-perceived characters. For accurate Japanese character limits, always use `[...str].length` (codepoint count) or `Intl.Segmenter` for grapheme clusters. The existing BudouX dependency is already handling this awareness for line breaking.

---

## Common Pitfalls

### Pitfall 1: Aspect Ratio Distortion on Extreme Resize

**What goes wrong:** Resizing a 1:1 (1024x1024) composited image to a 728x90 leaderboard banner using `fit: 'cover'` crops away 90%+ of the image content, making the result unusable.
**Why it happens:** The source image aspect ratio (1:1) is drastically different from the target (8:1). Smart crop can't salvage this.
**How to avoid:** For extreme aspect ratio differences (source vs target ratio differs by >2x), use `fit: 'contain'` with a brand-colored background instead of `fit: 'cover'`. Alternatively, re-composite text onto the original base image resized to the target dimensions.
**Warning signs:** Preview shows mostly blank space or unrecognizable crops.

### Pitfall 2: Copy Generated Without Character Limits

**What goes wrong:** Claude generates copy that exceeds platform limits. The system stores it, and users discover truncation only when they paste into the ad platform.
**Why it happens:** The current prompt says "プラットフォームの特性を考慮した文字数にすること" but doesn't enforce specific limits.
**How to avoid:** Include explicit character limits in the Claude tool schema AND validate the response server-side. Truncate with ellipsis as a fallback, but log a warning.
**Warning signs:** Copy variants frequently exceed limits; users report truncation on ad platforms.

### Pitfall 3: ZIP Download Timeout on Large Campaigns

**What goes wrong:** The ZIP download endpoint fetches 30+ images from Supabase Storage, assembles them, and the request times out (especially on serverless).
**Why it happens:** Sequential fetching of images from storage + ZIP compression = slow. Vercel has 60s timeout on serverless.
**How to avoid:** Fetch all images from Supabase in parallel with `Promise.all()`. Use archiver's streaming API to start sending data before all images are fetched. Consider pre-generating the ZIP after campaign completion and storing it, then serving the cached ZIP.
**Warning signs:** Download spinner hangs, 504 errors on production.

### Pitfall 4: Email HTML Broken in Outlook/Gmail

**What goes wrong:** The generated HTML email template looks fine in Chrome but breaks in Outlook (no CSS Grid/Flexbox support) or gets clipped in Gmail (>102KB).
**Why it happens:** Email clients have wildly inconsistent CSS support. Outlook uses Word's rendering engine.
**How to avoid:** Use table-based layout only. All CSS must be inline (no `<style>` blocks for Outlook). Keep total HTML under 102KB for Gmail. Test with real email clients.
**Warning signs:** Layout breaks in Outlook preview; Gmail shows "View Entire Message" link.

### Pitfall 5: Platform-Specific Copy Stored Incorrectly

**What goes wrong:** The `copy_variants` table currently stores platform + variantLabel, but with Phase 3 generating truly platform-specific copy, the existing records from Phase 1/2 have the same copy replicated across platforms.
**Why it happens:** The current `runDirectGeneration` function generates 4 variants once, then inserts them for EACH platform (same copy, different platform column).
**How to avoid:** Phase 3 must change the generation flow: generate once per platform (or all platforms in one call with per-platform constraints). The existing DB schema already supports this -- `copy_variants` has `platform` column. Just stop duplicating.
**Warning signs:** Copy for LINE and Instagram are identical despite having very different character limits.

---

## Code Examples

### Image Resizing with Smart Crop (sharp)

```typescript
// Source: sharp Context7 docs -- /lovell/sharp
import sharp from "sharp"

// Resize for platform with attention-based smart crop
const resized = await sharp(sourceBuffer)
  .resize(1080, 1920, {
    fit: "cover",
    position: "attention",     // Uses saliency detection
    kernel: sharp.kernel.lanczos3,
  })
  .png()
  .toBuffer()

// For extreme aspect ratios, use contain with brand background
const contained = await sharp(sourceBuffer)
  .resize(728, 90, {
    fit: "contain",
    background: { r: 255, g: 255, b: 255, alpha: 1 },  // or brand color
  })
  .png()
  .toBuffer()
```

### ZIP Archive with Platform Folders (archiver)

```typescript
// Source: archiver Context7 docs -- /archiverjs/node-archiver
import { ZipArchive } from "archiver"

const archive = new ZipArchive({ zlib: { level: 6 } })
archive.pipe(outputStream)

// Add images organized by platform
archive.append(imageBuffer, { name: "instagram/feed-1080x1080.png" })
archive.append(imageBuffer, { name: "instagram/story-1080x1920.png" })
archive.append(imageBuffer, { name: "line/rich-message-1040x1040.png" })

// Add copy text files
archive.append("見出し: ...\n本文: ...", { name: "instagram/copy.txt" })

await archive.finalize()
```

### Japanese Character Count Validation

```typescript
// Source: JavaScript specification -- String iteration protocol
function countJapaneseChars(str: string): number {
  return [...str].length  // Spread into codepoints, not UTF-16 code units
}

function validateCopyLength(
  text: string,
  maxChars: number,
  fieldName: string
): { valid: boolean; actual: number; truncated?: string } {
  const actual = countJapaneseChars(text)
  if (actual <= maxChars) {
    return { valid: true, actual }
  }
  // Truncate with ellipsis
  const chars = [...text]
  const truncated = chars.slice(0, maxChars - 1).join("") + "..."
  return { valid: false, actual, truncated }
}
```

### Next.js Route Handler for ZIP Streaming

```typescript
// Source: Next.js docs -- route handler with streaming
import { NextRequest, NextResponse } from "next/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // ... build ZIP archive ...

  const passthrough = new PassThrough()
  archive.pipe(passthrough)

  const stream = new ReadableStream({
    start(controller) {
      passthrough.on("data", (chunk: Buffer) => {
        controller.enqueue(new Uint8Array(chunk))
      })
      passthrough.on("end", () => controller.close())
      passthrough.on("error", (err: Error) => controller.error(err))
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="campaign-kit-${id}.zip"`,
      "Cache-Control": "no-store",
    },
  })
}
```

### Simple HTML Email Template (Table-Based)

```typescript
// Source: Email best practices research
export function buildEmailHtml(params: {
  headline: string
  bodyText: string
  ctaText: string
  ctaUrl: string
  headerImageUrl: string
  brandColors: { primary: string; accent: string }
}): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${params.headline}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:'Helvetica Neue',Arial,'Hiragino Kaku Gothic ProN',sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;margin:0 auto;background-color:#ffffff;">
    <tr>
      <td style="padding:0;">
        <img src="${params.headerImageUrl}" alt="" width="600" style="display:block;width:100%;height:auto;">
      </td>
    </tr>
    <tr>
      <td style="padding:32px 24px;">
        <h1 style="margin:0 0 16px;font-size:22px;line-height:1.4;color:#1a1a1a;">${params.headline}</h1>
        <p style="margin:0 0 24px;font-size:16px;line-height:1.8;color:#333333;">${params.bodyText}</p>
        <table role="presentation" cellpadding="0" cellspacing="0">
          <tr>
            <td style="background-color:${params.brandColors.accent};border-radius:4px;">
              <a href="${params.ctaUrl}" style="display:inline-block;padding:12px 32px;font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;">${params.ctaText}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
```

---

## Platform Dimension & Copy Constraint Reference

This is the consolidated reference for all 7 target platforms specified in the requirements.

### Image Dimensions

| Platform | Req ID | Format | Dimensions | Aspect Ratio | Notes |
|----------|--------|--------|------------|--------------|-------|
| LINE | PLAT-01 | Rich Message | 1040x1040 | 1:1 | Max 10MB, JPG/PNG |
| Yahoo! JAPAN YDA | PLAT-02 | Rectangle | 300x250 | 6:5 | |
| Yahoo! JAPAN YDA | PLAT-02 | Leaderboard | 728x90 | 8:1 | Extreme ratio -- use `contain` |
| Yahoo! JAPAN YDA | PLAT-02 | Skyscraper | 160x600 | 4:15 | Extreme ratio -- use `contain` |
| Yahoo! JAPAN YDA | PLAT-02 | Mobile Banner | 320x50 | 32:5 | Extreme ratio -- use `contain` |
| Rakuten | PLAT-03 | Product Image | 700x700 | 1:1 | Min 700x700 |
| Instagram | PLAT-04 | Feed | 1080x1080 | 1:1 | Updated: 1080x1440 (3:4) also recommended |
| Instagram | PLAT-04 | Story/Reels | 1080x1920 | 9:16 | Safe zones: top 14%, bottom 20% |
| TikTok | PLAT-05 | Video Thumbnail | 1080x1920 | 9:16 | |
| X (Twitter) | PLAT-06 | Card | 1200x675 | 16:9 | Confirmed via research |
| Email | PLAT-07 | Header | 600x200 | 3:1 | Email container max 600px |
| Email | PLAT-07 | Banner | 600x300 | 2:1 | |

### Copy Character Limits (per platform)

| Platform | Headline Max | Body Max | CTA Max | Hashtags | Source Confidence |
|----------|-------------|----------|---------|----------|-------------------|
| LINE | 20 chars | 60 chars | 15 chars | None | MEDIUM -- derived from official docs |
| Yahoo! JAPAN YDA | 15 full-width (30 half-width) | 39 visible (90 total) | 15 chars | None | MEDIUM -- from official help page |
| Rakuten | 30 chars (search visible) | 87 chars (catch copy) | 15 chars | None | MEDIUM -- from Japanese SEO guides |
| Instagram | 30 chars | 125 chars (before fold) | 20 chars | 3-5 required | HIGH -- from official docs |
| TikTok | 25 chars | 100 chars | 15 chars | 1-3 required | HIGH -- from official ad specs |
| X (Twitter) | 25 chars | 280 chars | 15 chars | 1-3 required | HIGH -- from official specs |
| Email | 50 chars (subject) | 500 chars | 20 chars | None | MEDIUM -- best practice, not enforced |

---

## Resize Strategy by Aspect Ratio

The composited images from Phase 2 are at the base image resolution (typically 1024x1024 from Flux). Resizing to platforms with similar aspect ratios (1:1) is straightforward. But resizing to extreme aspect ratios (728x90 leaderboard, 160x600 skyscraper) requires a different strategy.

### Strategy Decision Matrix

| Source AR vs Target AR | Ratio Diff | Strategy | sharp `fit` | Notes |
|------------------------|-----------|----------|-------------|-------|
| Similar (< 1.5x) | 1:1 -> 1:1, 1:1 -> 4:5 | Smart crop | `cover` + `attention` | Works well, minimal content loss |
| Moderate (1.5x - 3x) | 1:1 -> 16:9, 1:1 -> 9:16 | Smart crop with review | `cover` + `attention` | Some content loss; preview important |
| Extreme (> 3x) | 1:1 -> 8:1, 1:1 -> 32:5 | Contain with background | `contain` + brand bg | Cannot crop; must letterbox |
| Extreme (> 3x) | 1:1 -> 4:15 | Contain with background | `contain` + brand bg | Cannot crop; must letterbox |

**Recommendation:** For extreme ratios (YDA leaderboard 728x90, skyscraper 160x600, mobile banner 320x50), do NOT crop -- instead use `fit: 'contain'` with the brand's background color. These banner formats typically need purpose-built creative anyway, but auto-resizing with contain provides a usable starting point.

**Future improvement (not Phase 3):** Re-composite text onto base images resized to target dimensions (new layout per aspect ratio). This requires running the full compositing pipeline per platform dimension, which is expensive but produces better results for extreme ratios.

---

## Pipeline Architecture

### Current Flow (Phase 1+2)

```
Brief -> n8n webhook -> Claude (4 generic copy variants)
                     -> Flux (4 base images at 1024x1024)
                     -> Compositing (3 layouts per base image)
                     -> DB + Storage
```

### Phase 3 Flow

```
Brief -> n8n webhook -> Claude (4 variants PER PLATFORM with constraints)
                     -> Flux (4 base images at 1024x1024)
                     -> Compositing (3 layouts per base image at base resolution)
                     -> Platform Resize (composited -> all selected platform sizes)
                     -> HTML Email generation (if email platform selected)
                     -> DB + Storage (assets tagged with platform + dimensions)
                     -> Campaign status: complete

User Review:
  Campaign Detail -> Grid View tab (assets grouped by platform)
                  -> Download button -> ZIP stream (organized by platform)
```

### Key Pipeline Changes

1. **Copy generation** becomes platform-aware: one Claude call produces platform-specific variants
2. **Resize step** added after compositing: produces all platform size variants
3. **Asset storage** extended: assets table needs platform and dimension metadata
4. **New API endpoints**: download ZIP, fetch platform-specific assets
5. **New UI tab**: grid view showing all platform variants

### Database Schema Changes

The existing `assets` table needs minor extensions:

```sql
-- The assets table already has: id, campaign_id, type, storage_key, file_name, width, height, mime_type, model_used, prompt, metadata
-- Phase 3 leverages the metadata JSONB column to store:
-- { platform: "instagram", dimensionLabel: "フィード", sourceAssetId: "..." }
```

The `metadata` JSONB column on `assets` already exists and is flexible enough. No schema migration needed -- store platform info in metadata. Asset `type` can use "platform_image" to distinguish from "image" (base) and "composited_image".

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Generate same copy for all platforms | Platform-specific copy with character limits | Phase 3 | Dramatically better ad performance; copy fits each platform natively |
| Single image resolution | Multi-resolution with smart crop | Phase 3 | Assets ready for immediate upload to ad platforms |
| Manual download of individual files | ZIP campaign kit organized by platform | Phase 3 | Single-click workflow for marketing teams |
| Instagram recommended 1080x1080 | Instagram now recommends 1080x1440 (3:4) | 2025 | Feed posts can use taller format; existing 1080x1080 still supported |
| X card was 1200x628 | X card now 1200x675 | 2024 | Slightly different aspect ratio |

**Deprecated/outdated:**
- Instagram 1080x1080 as the primary feed format -- 1080x1440 (3:4) is now recommended, but 1:1 is still supported. The PLAT-04 requirement specifies 1080x1080 for feed, which remains valid.

---

## Open Questions

1. **Re-compositing vs. resizing for extreme aspect ratios**
   - What we know: `fit: 'contain'` with brand background works but produces letterboxed results. Re-compositing would produce better results but requires running the full pipeline per dimension.
   - What's unclear: Whether the quality difference justifies the cost (API calls, processing time) for banner formats.
   - Recommendation: Phase 3 uses resize-only. Future phase can add per-dimension compositing as a premium feature.

2. **Claude API cost for platform-specific copy**
   - What we know: Current flow makes 1 Claude API call for 4 variants. Phase 3 could either make 1 call with all platforms in the prompt (cheaper but larger prompt) or 1 call per platform (more focused but more API calls).
   - What's unclear: Whether Claude can reliably produce 4 variants x 7 platforms = 28 variants in a single call without quality degradation.
   - Recommendation: Single call with all platforms. Structure the tool schema to return nested `platforms[].variants[]`. If quality degrades with 7+ platforms, fall back to batching 3-4 platforms per call.

3. **Pre-generated ZIP vs. on-demand**
   - What we know: On-demand ZIP generation may timeout on serverless for large campaigns. Pre-generated ZIP uses storage space.
   - What's unclear: Typical campaign kit size (number of assets x file sizes).
   - Recommendation: Start with on-demand generation. If timeouts occur, add a background job that pre-generates the ZIP after campaign completion and stores it in Supabase Storage.

4. **320x50 mobile banner -- is it worth auto-generating?**
   - What we know: The PLAT-02 requirement specifies it. But a 320x50 crop of a 1024x1024 image is almost certainly unusable.
   - What's unclear: Whether users expect this to be a finished asset or a starting point.
   - Recommendation: Generate it with `contain` strategy as a placeholder. Display a warning badge in the grid view indicating "要調整" (needs adjustment) for extreme-ratio assets.

---

## Sources

### Primary (HIGH confidence)
- sharp Context7 library `/lovell/sharp` -- resize API, fit modes, position strategies
- archiver Context7 library `/archiverjs/node-archiver` -- ZIP archive creation, streaming, directory support
- JSZip Context7 library `/stuk/jszip` -- browser-side ZIP alternative (not recommended for server use)
- Existing codebase: `src/lib/constants/platforms.ts`, `src/lib/compositing/index.ts`, `src/lib/ai/claude.ts`, `src/app/api/campaigns/route.ts`

### Secondary (MEDIUM confidence)
- [Instagram Image Size Guide 2026](https://www.socialchamp.com/blog/instagram-image-size/) -- 1080x1080 feed, 1080x1920 story/reels confirmed
- [X (Twitter) Image Specs 2026](https://soona.co/image-resizer/twitter-spec-guide) -- 1200x675 card, 280 char limit confirmed
- [TikTok Ad Specs 2026](https://soona.co/image-resizer/tiktok-image-size-specs) -- 1080x1920, 100 char ad description
- [Responsive Email Design 2026](https://mailtrap.io/blog/responsive-email-design/) -- 600px width, table layout, inline CSS
- [Next.js Route Handlers](https://nextjs.org/docs/app/api-reference/file-conventions/route) -- streaming response pattern
- [How to Download ZIP Files in Next.js](https://www.codeconcisely.com/posts/nextjs-download-zip-file/) -- archiver + route handler pattern

### Tertiary (LOW confidence)
- LINE rich message character limits -- derived from multiple sources, not directly from official LINE developer docs API reference. Rich message text up to 400 chars confirmed, but per-field limits vary by template type.
- Yahoo! JAPAN YDA character limits -- official help pages were not fully loadable; limits derived from search result summaries. Title 15 full-width / 30 half-width chars, description up to 90 chars.
- Rakuten product listing specs -- product name 127 chars, catch copy 87 chars from Japanese SEO guides, not directly from Rakuten official API docs.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- sharp and archiver are industry standards; both verified via Context7 with code examples
- Architecture: HIGH -- patterns follow existing codebase conventions; resize pipeline is straightforward
- Platform dimensions: HIGH -- dimensions match requirements and are confirmed by platform docs
- Copy character limits: MEDIUM -- LINE, YDA, and Rakuten limits derived from unofficial sources; should be validated with platform-specific testing
- Pitfalls: HIGH -- based on real-world experience with image resizing, ZIP generation, and email rendering

**Research date:** 2026-02-08
**Valid until:** 2026-03-10 (30 days -- platform specs stable; library APIs stable)
