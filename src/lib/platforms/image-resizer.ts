import sharp from "sharp"
import { PLATFORMS } from "@/lib/constants/platforms"
import type { PlatformDefinition } from "@/lib/constants/platforms"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ResizeTarget {
  platformId: string
  label: string
  width: number
  height: number
}

export interface ResizedAsset {
  platformId: string
  dimensionLabel: string
  width: number
  height: number
  buffer: Buffer
  fileName: string
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build a flat array of resize targets from a list of platform IDs.
 * Unknown IDs are silently skipped.
 */
export function getResizeTargetsForPlatforms(
  platformIds: string[]
): ResizeTarget[] {
  const targets: ResizeTarget[] = []

  for (const pid of platformIds) {
    const platform: PlatformDefinition | undefined = PLATFORMS.find(
      (p) => p.id === pid
    )
    if (!platform) continue

    for (const dim of platform.dimensions) {
      targets.push({
        platformId: pid,
        label: dim.label,
        width: dim.width,
        height: dim.height,
      })
    }
  }

  return targets
}

/**
 * Resize a composited source image to every target dimension.
 *
 * - Similar aspect ratios use `cover` + attention-based smart crop.
 * - Extreme aspect ratios (>3x difference) use `contain` with a brand
 *   background color so content is not destructively cropped.
 *
 * Targets are processed sequentially to avoid memory spikes from sharp.
 */
export async function resizeForPlatforms(
  sourceBuffer: Buffer,
  sourceWidth: number,
  sourceHeight: number,
  targets: ResizeTarget[],
  brandBackgroundColor?: string
): Promise<ResizedAsset[]> {
  const results: ResizedAsset[] = []

  for (const target of targets) {
    const strategy = getResizeStrategy(
      sourceWidth,
      sourceHeight,
      target.width,
      target.height
    )

    let buffer: Buffer

    if (strategy.fit === "cover") {
      buffer = await sharp(sourceBuffer)
        .resize(target.width, target.height, {
          fit: "cover",
          position: "attention",
          kernel: sharp.kernel.lanczos3,
        })
        .png()
        .toBuffer()
    } else {
      // contain -- pad with brand background
      const bg = parseColor(brandBackgroundColor || "#FFFFFF")
      buffer = await sharp(sourceBuffer)
        .resize(target.width, target.height, {
          fit: "contain",
          background: bg,
          kernel: sharp.kernel.lanczos3,
        })
        .png()
        .toBuffer()
    }

    // Sanitise label for filename: replace spaces with hyphens, strip non-ASCII
    const safeLabel = target.label
      .replace(/\s+/g, "-")
      .replace(/[^\w-]/g, "")

    results.push({
      platformId: target.platformId,
      dimensionLabel: target.label,
      width: target.width,
      height: target.height,
      buffer,
      fileName: `${target.platformId}-${safeLabel}-${target.width}x${target.height}.png`,
    })
  }

  return results
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Determine whether to smart-crop (cover) or letterbox (contain) based on
 * how different the source and target aspect ratios are.
 *
 * A ratio difference greater than 3x indicates an extreme mismatch
 * (e.g., landscape source -> 728x90 banner or 160x600 skyscraper).
 * In these cases, `contain` preserves the full image with brand-coloured
 * padding rather than cropping most of the content away.
 */
function getResizeStrategy(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number
): { fit: "cover" | "contain"; useBackground: boolean } {
  const sourceRatio = sourceWidth / sourceHeight
  const targetRatio = targetWidth / targetHeight

  const ratioDifference = Math.max(
    sourceRatio / targetRatio,
    targetRatio / sourceRatio
  )

  if (ratioDifference > 3) {
    return { fit: "contain", useBackground: true }
  }

  return { fit: "cover", useBackground: false }
}

/**
 * Parse a hex colour string (#RGB, #RRGGBB, #RRGGBBAA) into the RGBA
 * object that sharp expects for the `background` option.
 * Falls back to opaque white on any parse failure.
 */
function parseColor(hex: string): { r: number; g: number; b: number; alpha: number } {
  const fallback = { r: 255, g: 255, b: 255, alpha: 1 }

  if (!hex || typeof hex !== "string") return fallback

  const cleaned = hex.replace(/^#/, "")

  let r: number, g: number, b: number, a = 1

  try {
    if (cleaned.length === 3) {
      // #RGB -> #RRGGBB
      r = parseInt(cleaned[0] + cleaned[0], 16)
      g = parseInt(cleaned[1] + cleaned[1], 16)
      b = parseInt(cleaned[2] + cleaned[2], 16)
    } else if (cleaned.length === 6) {
      r = parseInt(cleaned.slice(0, 2), 16)
      g = parseInt(cleaned.slice(2, 4), 16)
      b = parseInt(cleaned.slice(4, 6), 16)
    } else if (cleaned.length === 8) {
      r = parseInt(cleaned.slice(0, 2), 16)
      g = parseInt(cleaned.slice(2, 4), 16)
      b = parseInt(cleaned.slice(4, 6), 16)
      a = parseInt(cleaned.slice(6, 8), 16) / 255
    } else {
      return fallback
    }

    if (isNaN(r) || isNaN(g) || isNaN(b) || isNaN(a)) return fallback

    return { r, g, b, alpha: a }
  } catch {
    return fallback
  }
}
