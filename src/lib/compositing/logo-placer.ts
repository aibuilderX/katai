/**
 * Logo Placer
 *
 * Scales and positions a brand logo for compositing onto ad creatives.
 * Default placement is bottom-right with 40px padding (per locked decision:
 * "Fixed corner logo placement with consistent padding").
 *
 * Returns a Sharp composite-compatible overlay object ready for
 * `sharp(baseImage).composite([overlay])`.
 *
 * Logo is always resized to ~12% of image width to maintain consistent
 * visual weight across different image dimensions.
 */

import sharp from "sharp"

/**
 * Prepare a logo buffer as a positioned overlay for Sharp composite().
 *
 * Scales the logo to approximately 12% of the image width, then positions
 * it at the bottom-right corner with 40px padding (or at a custom position).
 *
 * @param logoBuffer - Raw logo image buffer (PNG, JPEG, SVG, etc.)
 * @param imageWidth - Base image width in pixels
 * @param imageHeight - Base image height in pixels
 * @param position - Optional override position { x, y } in pixels
 * @returns Sharp overlay object: { input: Buffer, top: number, left: number }
 */
export async function prepareLogoOverlay(
  logoBuffer: Buffer,
  imageWidth: number,
  imageHeight: number,
  position?: { x: number; y: number }
): Promise<{ input: Buffer; top: number; left: number }> {
  const LOGO_WIDTH_RATIO = 0.12
  const EDGE_PADDING = 40

  // Scale logo to ~12% of image width
  const targetWidth = Math.round(imageWidth * LOGO_WIDTH_RATIO)

  // Resize and convert to PNG (always chain .png().toBuffer() per research anti-pattern note)
  const resizedBuffer = await sharp(logoBuffer)
    .resize(targetWidth)
    .png()
    .toBuffer()

  // Get the proportional height after resize
  const meta = await sharp(resizedBuffer).metadata()
  const logoHeight = meta.height ?? Math.round(targetWidth * 0.5) // Fallback if metadata unavailable

  // Calculate position
  let left: number
  let top: number

  if (position) {
    // Use custom position
    left = position.x
    top = position.y
  } else {
    // Default: bottom-right with 40px padding from edges
    left = imageWidth - targetWidth - EDGE_PADDING
    top = imageHeight - logoHeight - EDGE_PADDING
  }

  return { input: resizedBuffer, top, left }
}
