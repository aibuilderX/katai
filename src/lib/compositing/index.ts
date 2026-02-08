/**
 * Compositing Pipeline Orchestrator
 *
 * Ties together all compositing modules into a single end-to-end pipeline:
 * fetch base image -> Claude Vision layout -> kinsoku line-breaking ->
 * contrast analysis -> SVG rendering -> Sharp compositing -> Supabase
 * Storage upload -> assets table insert.
 *
 * Entry point: compositeCampaignImages() orchestrates compositing for
 * all campaign images, producing 3 layout variants per image.
 */

import sharp from "sharp"
import { analyzeImageLayout } from "./layout-engine"
import { breakJapaneseText } from "./kinsoku"
import {
  analyzeRegionContrast,
  selectContrastTreatment,
} from "./contrast-analyzer"
import { buildTextSvg, buildCtaSvg } from "./text-renderer"
import { buildVerticalTextSvg } from "./vertical-text"
import { prepareLogoOverlay } from "./logo-placer"
import type {
  CompositingResult,
  LayoutMetadata,
  LayoutAlternative,
  ContrastTreatment,
} from "./types"
import type { BrandColors } from "@/lib/db/schema"
import { db } from "@/lib/db"
import { assets } from "@/lib/db/schema"
import { adminClient } from "@/lib/supabase/admin"
import { JAPANESE_FONTS } from "@/lib/constants/fonts"

// ---------------------------------------------------------------------------
// Pipeline parameters
// ---------------------------------------------------------------------------

export interface CompositeCampaignImagesParams {
  campaignId: string
  baseImages: Array<{
    assetId: string
    url: string
    width: number
    height: number
  }>
  copyVariant: {
    headline: string
    bodyText: string
    ctaText: string
  }
  brandProfile: {
    fontPreference: string
    colors: BrandColors | null
    logoUrl: string | null
  }
  onProgress?: (percent: number, step: string) => Promise<void>
}

// ---------------------------------------------------------------------------
// Main orchestrator
// ---------------------------------------------------------------------------

/**
 * Orchestrate compositing for all campaign images.
 *
 * For each base image, analyzes layout via Claude Vision, renders text SVGs
 * with kinsoku line-breaking and contrast treatment, composites 3 layout
 * variants, uploads to Supabase Storage, and inserts asset records.
 *
 * Images are processed in parallel. Individual image failures are logged
 * and skipped -- only throws if ALL images fail.
 *
 * @returns One CompositingResult per base image (each containing 3 layout variants)
 */
export async function compositeCampaignImages(
  params: CompositeCampaignImagesParams
): Promise<CompositingResult[]> {
  const { campaignId, baseImages, copyVariant, brandProfile, onProgress } =
    params

  // Resolve font family from brand preference
  const fontDef = JAPANESE_FONTS.find(
    (f) => f.id === brandProfile.fontPreference
  )
  const fontFamily = fontDef?.nameEn ?? "Noto Sans JP"

  // Resolve brand colors
  const brandColors = brandProfile.colors ?? {
    primary: "#333333",
    secondary: "#666666",
    accent: "#E63946",
    background: "#FFFFFF",
  }

  // Fetch logo buffer if available
  let logoBuffer: Buffer | null = null
  if (brandProfile.logoUrl) {
    try {
      const logoResp = await fetch(brandProfile.logoUrl)
      logoBuffer = Buffer.from(await logoResp.arrayBuffer())
    } catch (err) {
      console.warn(
        "[compositing] Failed to fetch logo, compositing without it:",
        err instanceof Error ? err.message : err
      )
    }
  }

  // Determine tagline: use bodyText if <= 30 characters, otherwise null
  const tagline =
    [...copyVariant.bodyText].length <= 30 ? copyVariant.bodyText : null

  const totalImages = baseImages.length
  const results: CompositingResult[] = []
  const errors: Error[] = []

  // Process all images in parallel
  const imagePromises = baseImages.map(async (baseImage, imageIndex) => {
    try {
      const result = await compositeOneImage({
        campaignId,
        baseImage,
        headline: copyVariant.headline,
        tagline,
        ctaText: copyVariant.ctaText,
        fontFamily,
        brandColors: { primary: brandColors.primary, accent: brandColors.accent },
        logoBuffer,
      })

      // Report progress
      if (onProgress) {
        const percent = Math.round(
          ((imageIndex + 1) / totalImages) * 100
        )
        await onProgress(
          percent,
          `画像 ${imageIndex + 1}/${totalImages} 合成完了`
        )
      }

      return result
    } catch (err) {
      console.error(
        `[compositing] Failed to composite image ${baseImage.assetId}:`,
        err instanceof Error ? err.message : err
      )
      errors.push(
        err instanceof Error
          ? err
          : new Error(`Compositing failed for ${baseImage.assetId}`)
      )
      return null
    }
  })

  const settled = await Promise.all(imagePromises)
  for (const r of settled) {
    if (r) results.push(r)
  }

  // If ALL images failed, throw
  if (results.length === 0 && errors.length > 0) {
    throw new Error(
      `All ${errors.length} image(s) failed compositing. First error: ${errors[0].message}`
    )
  }

  return results
}

// ---------------------------------------------------------------------------
// Single image compositing
// ---------------------------------------------------------------------------

interface CompositeOneImageParams {
  campaignId: string
  baseImage: { assetId: string; url: string; width: number; height: number }
  headline: string
  tagline: string | null
  ctaText: string
  fontFamily: string
  brandColors: { primary: string; accent: string }
  logoBuffer: Buffer | null
}

async function compositeOneImage(
  params: CompositeOneImageParams
): Promise<CompositingResult> {
  const {
    campaignId,
    baseImage,
    headline,
    tagline,
    ctaText,
    fontFamily,
    brandColors,
    logoBuffer,
  } = params

  // Step 1: Fetch base image buffer
  const response = await fetch(baseImage.url)
  const baseImageBuffer = Buffer.from(await response.arrayBuffer())

  // Step 2: Analyze layout via Claude Vision (with fallback)
  let layouts: LayoutAlternative[]
  try {
    layouts = await analyzeImageLayout({
      imageBuffer: baseImageBuffer,
      imageWidth: baseImage.width,
      imageHeight: baseImage.height,
      hasTagline: tagline !== null,
      hasLogo: logoBuffer !== null,
      headlineText: headline,
    })
  } catch (err) {
    console.warn(
      "[compositing] Layout analysis failed, using fallback layouts:",
      err instanceof Error ? err.message : err
    )
    // analyzeImageLayout already has internal fallback, but guard against unexpected throws
    layouts = buildMinimalFallbackLayouts(
      baseImage.width,
      baseImage.height,
      tagline !== null,
      logoBuffer !== null
    )
  }

  // Step 3: Composite each layout alternative
  const composites: CompositingResult["composites"] = []

  for (const layout of layouts) {
    try {
      const { imageBuffer: composited, metadata } =
        await compositeOneLayout({
          baseImageBuffer,
          imageWidth: baseImage.width,
          imageHeight: baseImage.height,
          layout,
          headline,
          tagline,
          ctaText,
          fontFamily,
          brandColors,
          logoBuffer,
          baseImageAssetId: baseImage.assetId,
        })

      // Upload to Supabase Storage
      const storagePath = `${campaignId}/${baseImage.assetId}-layout-${layout.id}.png`

      const { error: uploadError } = await adminClient.storage
        .from("composited-images")
        .upload(storagePath, composited, {
          contentType: "image/png",
          upsert: true,
        })

      if (uploadError) {
        console.error(
          `[compositing] Storage upload failed for ${storagePath}:`,
          uploadError.message
        )
        // Still include the composited buffer in results even if upload fails
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = adminClient.storage
        .from("composited-images")
        .getPublicUrl(storagePath)

      // Insert asset record
      await db.insert(assets).values({
        campaignId,
        type: "composited_image",
        storageKey: publicUrl,
        fileName: `${baseImage.assetId}-layout-${layout.id}.png`,
        width: String(baseImage.width),
        height: String(baseImage.height),
        mimeType: "image/png",
        modelUsed: "sharp-composite",
        metadata: metadata as unknown as Record<string, unknown>,
      })

      composites.push({
        layoutId: layout.id,
        imageBuffer: composited,
        metadata,
      })
    } catch (err) {
      console.error(
        `[compositing] Layout ${layout.id} compositing failed:`,
        err instanceof Error ? err.message : err
      )
      // Skip this layout variant, continue with others
    }
  }

  return { composites }
}

// ---------------------------------------------------------------------------
// Single layout compositing
// ---------------------------------------------------------------------------

interface CompositeOneLayoutParams {
  baseImageBuffer: Buffer
  imageWidth: number
  imageHeight: number
  layout: LayoutAlternative
  headline: string
  tagline: string | null
  ctaText: string
  fontFamily: string
  brandColors: { primary: string; accent: string }
  logoBuffer: Buffer | null
  baseImageAssetId: string
}

async function compositeOneLayout(
  params: CompositeOneLayoutParams
): Promise<{ imageBuffer: Buffer; metadata: LayoutMetadata }> {
  const {
    baseImageBuffer,
    imageWidth,
    imageHeight,
    layout,
    headline,
    tagline,
    ctaText,
    fontFamily,
    brandColors,
    logoBuffer,
    baseImageAssetId,
  } = params

  // Calculate font sizes
  const baseFontSize = Math.round(imageWidth / 16)
  const headlineSize = baseFontSize
  const taglineSize = Math.round(baseFontSize * 0.6)
  const ctaSize = Math.round(baseFontSize * 0.7)

  // Line-break headline
  let headlineLines: string[]
  try {
    const headlineResult = breakJapaneseText(
      headline,
      layout.headline.maxWidth,
      headlineSize,
      layout.orientation
    )
    headlineLines = headlineResult.lines
  } catch {
    // Fallback: use unsegmented text as single line
    headlineLines = [headline]
  }

  // Line-break tagline if present
  let taglineLines: string[] | null = null
  if (tagline && layout.tagline) {
    try {
      const taglineResult = breakJapaneseText(
        tagline,
        layout.tagline.maxWidth,
        taglineSize,
        "horizontal"
      )
      taglineLines = taglineResult.lines
    } catch {
      taglineLines = [tagline]
    }
  }

  // Analyze contrast for headline region
  let treatment: ContrastTreatment
  let textColor: string
  try {
    const headlineRegion = {
      x: layout.headline.x,
      y: layout.headline.y,
      width: layout.headline.maxWidth,
      height: headlineLines.length * headlineSize * 1.4 + 40,
    }
    const stats = await analyzeRegionContrast(baseImageBuffer, headlineRegion)
    textColor = stats.luminance < 0.5 ? "#FFFFFF" : "#1A1A1A"
    treatment = selectContrastTreatment(stats.luminance, stats.variance, textColor)
  } catch {
    // Fallback: white text with drop shadow
    textColor = "#FFFFFF"
    treatment = { type: "shadow", shadowOffset: 2, shadowBlur: 4 }
  }

  // Build SVG overlays
  const overlays: Array<{ input: Buffer; top: number; left: number }> = []

  // Headline SVG
  try {
    let headlineSvg: Buffer
    if (layout.orientation === "vertical") {
      headlineSvg = buildVerticalTextSvg(
        headline,
        headlineSize,
        fontFamily,
        textColor,
        treatment
      )
    } else {
      headlineSvg = buildTextSvg(
        {
          text: headline,
          x: layout.headline.x,
          y: layout.headline.y,
          fontSize: headlineSize,
          fontFamily,
          color: textColor,
          maxWidth: layout.headline.maxWidth,
          align: layout.headline.align,
        },
        treatment,
        headlineLines
      )
    }
    overlays.push({
      input: headlineSvg,
      top: layout.headline.y,
      left: layout.headline.x,
    })
  } catch (err) {
    console.warn(
      "[compositing] Headline SVG build failed, skipping:",
      err instanceof Error ? err.message : err
    )
  }

  // CTA SVG (always horizontal)
  try {
    const ctaSvg = buildCtaSvg(
      ctaText,
      ctaSize,
      fontFamily,
      brandColors.accent,
      "#FFFFFF"
    )
    overlays.push({
      input: ctaSvg,
      top: layout.cta.y,
      left: layout.cta.x,
    })
  } catch (err) {
    console.warn(
      "[compositing] CTA SVG build failed, skipping:",
      err instanceof Error ? err.message : err
    )
  }

  // Tagline SVG (always horizontal)
  if (tagline && taglineLines && layout.tagline) {
    try {
      const taglineSvg = buildTextSvg(
        {
          text: tagline,
          x: layout.tagline.x,
          y: layout.tagline.y,
          fontSize: taglineSize,
          fontFamily,
          color: textColor,
          maxWidth: layout.tagline.maxWidth,
          align: layout.tagline.align,
        },
        treatment,
        taglineLines
      )
      overlays.push({
        input: taglineSvg,
        top: layout.tagline.y,
        left: layout.tagline.x,
      })
    } catch (err) {
      console.warn(
        "[compositing] Tagline SVG build failed, skipping:",
        err instanceof Error ? err.message : err
      )
    }
  }

  // Logo overlay
  if (logoBuffer && layout.logo) {
    try {
      const logoOverlay = await prepareLogoOverlay(
        logoBuffer,
        imageWidth,
        imageHeight,
        layout.logo
      )
      overlays.push(logoOverlay)
    } catch (err) {
      console.warn(
        "[compositing] Logo overlay failed, skipping:",
        err instanceof Error ? err.message : err
      )
    }
  }

  // Composite all overlays onto base image
  const compositedBuffer = await sharp(baseImageBuffer)
    .composite(overlays)
    .png()
    .toBuffer()

  // Build metadata
  const metadata: LayoutMetadata = {
    layoutId: layout.id,
    orientation: layout.orientation,
    headline: {
      text: headline,
      x: layout.headline.x,
      y: layout.headline.y,
      fontSize: headlineSize,
      lines: headlineLines,
    },
    cta: {
      text: ctaText,
      x: layout.cta.x,
      y: layout.cta.y,
      fontSize: ctaSize,
    },
    treatment,
    fontFamily,
    brandColors,
    baseImageAssetId,
  }

  if (tagline && taglineLines && layout.tagline) {
    metadata.tagline = {
      text: tagline,
      x: layout.tagline.x,
      y: layout.tagline.y,
      fontSize: taglineSize,
      lines: taglineLines,
    }
  }

  if (layout.logo) {
    metadata.logo = {
      x: layout.logo.x,
      y: layout.logo.y,
      width: Math.round(imageWidth * 0.12),
    }
  }

  return { imageBuffer: compositedBuffer, metadata }
}

// ---------------------------------------------------------------------------
// Emergency fallback layouts (if analyzeImageLayout throws unexpectedly)
// ---------------------------------------------------------------------------

function buildMinimalFallbackLayouts(
  imageWidth: number,
  imageHeight: number,
  hasTagline: boolean,
  hasLogo: boolean
): LayoutAlternative[] {
  const pad = 40
  const contentWidth = imageWidth - pad * 2
  const logo = hasLogo
    ? { x: imageWidth - pad - 120, y: imageHeight - pad - 40 }
    : null

  return [
    {
      id: "A",
      headline: { x: pad, y: Math.round(imageHeight * 0.12), maxWidth: contentWidth, align: "center" },
      tagline: hasTagline ? { x: pad, y: Math.round(imageHeight * 0.28), maxWidth: Math.round(contentWidth * 0.7), align: "center" } : null,
      cta: { x: Math.round(imageWidth * 0.3), y: Math.round(imageHeight * 0.82), maxWidth: Math.round(contentWidth * 0.4), align: "center" },
      logo,
      orientation: "horizontal",
      contrastZones: [],
    },
    {
      id: "B",
      headline: { x: pad, y: Math.round(imageHeight * 0.1), maxWidth: Math.round(contentWidth * 0.6), align: "left" },
      tagline: hasTagline ? { x: pad, y: Math.round(imageHeight * 0.26), maxWidth: Math.round(contentWidth * 0.5), align: "left" } : null,
      cta: { x: Math.round(imageWidth * 0.55), y: Math.round(imageHeight * 0.85), maxWidth: Math.round(contentWidth * 0.4), align: "right" },
      logo,
      orientation: "horizontal",
      contrastZones: [],
    },
    {
      id: "C",
      headline: { x: Math.round(imageWidth * 0.55), y: Math.round(imageHeight * 0.15), maxWidth: Math.round(contentWidth * 0.4), align: "right" },
      tagline: hasTagline ? { x: Math.round(imageWidth * 0.55), y: Math.round(imageHeight * 0.35), maxWidth: Math.round(contentWidth * 0.35), align: "right" } : null,
      cta: { x: Math.round(imageWidth * 0.3), y: Math.round(imageHeight * 0.8), maxWidth: Math.round(contentWidth * 0.4), align: "center" },
      logo,
      orientation: "horizontal",
      contrastZones: [],
    },
  ]
}
