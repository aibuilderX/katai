/**
 * Contrast Analyzer
 *
 * Analyzes image regions to determine optimal text readability treatments.
 * Uses Sharp's stats() API to compute luminance (WCAG formula) and variance,
 * then selects from three contrast treatment tiers:
 *   - High variance (busy background) -> semi-transparent backdrop
 *   - Low variance + extreme luminance -> text stroke
 *   - Medium variance -> drop shadow
 *
 * Called by the compositing pipeline after layout coordinates are determined
 * and before text SVG rendering begins.
 */

import sharp from "sharp"
import type { ContrastTreatment, RegionStats } from "./types"

/**
 * Extract an image region and compute luminance + variance statistics.
 *
 * @param imageBuffer - Full image buffer (PNG or JPEG)
 * @param region - Rectangle to analyze (coordinates in pixels)
 * @returns RegionStats with WCAG relative luminance and average channel stdev
 */
export async function analyzeRegionContrast(
  imageBuffer: Buffer,
  region: { x: number; y: number; width: number; height: number }
): Promise<RegionStats> {
  // Get image dimensions to clamp the region within bounds
  const metadata = await sharp(imageBuffer).metadata()
  const imgWidth = metadata.width ?? 1
  const imgHeight = metadata.height ?? 1

  // Clamp region coordinates to image bounds
  const left = Math.max(0, Math.round(region.x))
  const top = Math.max(0, Math.round(region.y))
  const right = Math.min(imgWidth, Math.round(region.x + region.width))
  const bottom = Math.min(imgHeight, Math.round(region.y + region.height))

  // Ensure region has at least 1px dimensions after clamping
  const width = Math.max(1, right - left)
  const height = Math.max(1, bottom - top)

  // Extract the region and compute per-channel statistics
  const regionBuffer = await sharp(imageBuffer)
    .extract({ left, top, width, height })
    .toBuffer()

  const stats = await sharp(regionBuffer).stats()

  // WCAG relative luminance formula: 0.2126*R + 0.7152*G + 0.0722*B
  const rMean = stats.channels[0].mean / 255
  const gMean = stats.channels[1].mean / 255
  const bMean = stats.channels[2].mean / 255
  const luminance = 0.2126 * rMean + 0.7152 * gMean + 0.0722 * bMean

  // Variance as average standard deviation across RGB channels
  const variance =
    (stats.channels[0].stdev + stats.channels[1].stdev + stats.channels[2].stdev) / 3

  return { luminance, variance }
}

/**
 * Select the appropriate contrast treatment for text readability.
 *
 * Three-tier system based on region statistics:
 * 1. High variance (stdev > 50): Semi-transparent backdrop (busy backgrounds need maximum coverage)
 * 2. Low variance (<25) + extreme luminance (<0.3 or >0.7): Text stroke (clean backgrounds)
 * 3. Medium variance (25-50): Drop shadow (moderate backgrounds)
 *
 * @param luminance - WCAG relative luminance (0-1)
 * @param variance - Average RGB channel standard deviation
 * @param textColor - Text fill color (used to determine contrasting stroke color)
 * @returns ContrastTreatment configuration for the SVG renderer
 */
export function selectContrastTreatment(
  luminance: number,
  variance: number,
  _textColor: string
): ContrastTreatment {
  // Tier 1: High variance -- busy background needs a backdrop
  if (variance > 50) {
    return {
      type: "backdrop",
      opacity: 0.6,
    }
  }

  // Tier 2: Low variance + extreme luminance -- stroke is sufficient
  if (variance < 25) {
    if (luminance > 0.7) {
      // Light background -> dark stroke for contrast
      return {
        type: "stroke",
        strokeColor: "rgba(0,0,0,0.5)",
        strokeWidth: 2,
      }
    }
    if (luminance < 0.3) {
      // Dark background -> light stroke for contrast
      return {
        type: "stroke",
        strokeColor: "rgba(255,255,255,0.3)",
        strokeWidth: 2,
      }
    }
  }

  // Tier 3: Medium variance (or low variance with mid luminance) -> drop shadow
  return {
    type: "shadow",
    shadowOffset: 2,
    shadowBlur: 4,
  }
}
