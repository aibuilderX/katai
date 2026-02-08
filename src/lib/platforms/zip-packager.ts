/**
 * ZIP Campaign Kit Packager
 *
 * Builds a downloadable ZIP archive containing:
 * - Platform-resized images organized by platform folder
 * - Per-platform copy text files with all 4 variants
 * - Email HTML template (if present)
 * - Composited images in a composited/ folder
 *
 * Uses streaming via PassThrough so the response can start before
 * the entire archive is built in memory.
 */

import archiver from "archiver"
import { PassThrough } from "stream"
import { db } from "@/lib/db"
import { assets, copyVariants } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { PLATFORMS } from "@/lib/constants/platforms"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CampaignZipResult {
  stream: PassThrough
  fileName: string
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build a ZIP archive containing all downloadable assets for a campaign.
 *
 * Structure:
 *   {platformId}/copy.txt
 *   {platformId}/{image-file}.png
 *   email/template.html
 *   composited/{image-file}.png
 *
 * Individual asset fetch failures are logged and skipped -- the archive
 * still contains whatever assets could be fetched successfully.
 */
export async function buildCampaignZip(
  campaignId: string
): Promise<CampaignZipResult> {
  // Fetch all assets for this campaign
  const allAssets = await db
    .select()
    .from(assets)
    .where(eq(assets.campaignId, campaignId))

  const platformImages = allAssets.filter((a) => a.type === "platform_image")
  const compositedImages = allAssets.filter(
    (a) => a.type === "composited_image"
  )
  const emailHtmlAssets = allAssets.filter((a) => a.type === "email_html")

  // Fetch all copy variants
  const allCopyVariants = await db
    .select()
    .from(copyVariants)
    .where(eq(copyVariants.campaignId, campaignId))

  // Create archive
  const archive = archiver("zip", { zlib: { level: 6 } })
  const passthrough = new PassThrough()

  archive.pipe(passthrough)

  // Handle archive errors
  archive.on("error", (err) => {
    console.error("[zip-packager] Archive error:", err.message)
    passthrough.destroy(err)
  })

  // -------------------------------------------------------------------------
  // Add platform images (batched fetch, 5 concurrent)
  // -------------------------------------------------------------------------
  const platformImageBuffers = await fetchBuffersBatched(
    platformImages.map((a) => ({ url: a.storageKey, id: a.id })),
    5
  )

  for (const asset of platformImages) {
    const buffer = platformImageBuffers.get(asset.id)
    if (!buffer) continue

    const meta = asset.metadata as Record<string, unknown> | null
    const platformId = (meta?.platform as string) || "unknown"
    const fileName = asset.fileName || `${asset.id}.png`

    archive.append(buffer, { name: `${platformId}/${fileName}` })
  }

  // -------------------------------------------------------------------------
  // Add copy text files (one per platform)
  // -------------------------------------------------------------------------
  const variantsByPlatform = new Map<
    string,
    typeof allCopyVariants
  >()
  for (const variant of allCopyVariants) {
    const existing = variantsByPlatform.get(variant.platform) || []
    existing.push(variant)
    variantsByPlatform.set(variant.platform, existing)
  }

  for (const [platformId, variants] of variantsByPlatform) {
    const platformDef = PLATFORMS.find((p) => p.id === platformId)
    const platformName = platformDef?.nameJa || platformId

    // Sort variants by label to ensure consistent ordering
    const sorted = [...variants].sort((a, b) =>
      a.variantLabel.localeCompare(b.variantLabel)
    )

    let copyText = `プラットフォーム: ${platformName}\n\n`

    for (const variant of sorted) {
      copyText += `=== ${variant.variantLabel} ===\n`
      copyText += `見出し: ${variant.headline}\n`
      copyText += `本文: ${variant.bodyText}\n`
      copyText += `CTA: ${variant.ctaText}\n`
      const hashtags = (variant.hashtags || []) as string[]
      if (hashtags.length > 0) {
        copyText += `ハッシュタグ: ${hashtags.join(" ")}\n`
      }
      copyText += `\n`
    }

    archive.append(Buffer.from(copyText, "utf-8"), {
      name: `${platformId}/copy.txt`,
    })
  }

  // -------------------------------------------------------------------------
  // Add email HTML template (if present)
  // -------------------------------------------------------------------------
  if (emailHtmlAssets.length > 0) {
    const emailAsset = emailHtmlAssets[0]
    try {
      const resp = await fetch(emailAsset.storageKey)
      if (resp.ok) {
        const htmlBuffer = Buffer.from(await resp.arrayBuffer())
        archive.append(htmlBuffer, { name: "email/template.html" })
      }
    } catch (err) {
      console.warn(
        "[zip-packager] Failed to fetch email HTML:",
        err instanceof Error ? err.message : err
      )
    }
  }

  // -------------------------------------------------------------------------
  // Add composited images
  // -------------------------------------------------------------------------
  const compositedBuffers = await fetchBuffersBatched(
    compositedImages.map((a) => ({ url: a.storageKey, id: a.id })),
    5
  )

  for (const asset of compositedImages) {
    const buffer = compositedBuffers.get(asset.id)
    if (!buffer) continue

    const fileName = asset.fileName || `${asset.id}.png`
    archive.append(buffer, { name: `composited/${fileName}` })
  }

  // Finalize -- this triggers the stream to flush and end
  archive.finalize()

  const shortId = campaignId.slice(0, 8)
  return {
    stream: passthrough,
    fileName: `campaign-kit-${shortId}.zip`,
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Fetch multiple URLs in parallel, batched to avoid overwhelming the server.
 * Failed fetches are logged and skipped (the Map will not contain that entry).
 */
async function fetchBuffersBatched(
  items: Array<{ url: string; id: string }>,
  batchSize: number
): Promise<Map<string, Buffer>> {
  const results = new Map<string, Buffer>()

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const settled = await Promise.allSettled(
      batch.map(async (item) => {
        const resp = await fetch(item.url)
        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status} for ${item.url}`)
        }
        const buffer = Buffer.from(await resp.arrayBuffer())
        return { id: item.id, buffer }
      })
    )

    for (const result of settled) {
      if (result.status === "fulfilled") {
        results.set(result.value.id, result.value.buffer)
      } else {
        console.warn(
          "[zip-packager] Asset fetch failed, skipping:",
          result.reason instanceof Error
            ? result.reason.message
            : result.reason
        )
      }
    }
  }

  return results
}
