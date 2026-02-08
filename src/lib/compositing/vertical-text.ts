/**
 * Vertical Text (Tategaki) Renderer
 *
 * Renders Japanese text vertically using character-by-character SVG placement.
 * This approach is required because Sharp's librsvg does NOT support CSS
 * `writing-mode: vertical-rl` (documented anti-pattern from research).
 *
 * Character handling:
 * - CJK/fullwidth characters: rendered upright (no rotation)
 * - Half-width Latin/numbers (A-Z, a-z, 0-9): rotated 90 degrees clockwise
 *
 * Also provides `shouldUseVerticalText()` to determine when tategaki
 * is appropriate based on headline characteristics and image aspect ratio.
 */

import type { ContrastTreatment } from "./types"

// ---------------------------------------------------------------------------
// XML safety (local copy to avoid circular imports)
// ---------------------------------------------------------------------------

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

// ---------------------------------------------------------------------------
// CJK character detection
// ---------------------------------------------------------------------------

/** Regex matching CJK Unified Ideographs, Hiragana, Katakana, and CJK Compatibility Ideographs. */
const CJK_REGEX = /[\u3000-\u9fff\uf900-\ufaff]/

/** Regex matching half-width Latin letters and ASCII digits. */
const HALFWIDTH_REGEX = /[A-Za-z0-9]/

// ---------------------------------------------------------------------------
// Vertical text SVG builder
// ---------------------------------------------------------------------------

/**
 * Build an SVG buffer for vertical (tategaki) text, character-by-character.
 *
 * @param text - Full text string to render vertically
 * @param fontSize - Font size in pixels
 * @param fontFamily - Font family name
 * @param color - Text fill color
 * @param treatment - Contrast treatment (backdrop, stroke, or shadow)
 * @returns SVG as a Buffer, ready for Sharp composite()
 */
export function buildVerticalTextSvg(
  text: string,
  fontSize: number,
  fontFamily: string,
  color: string,
  treatment: ContrastTreatment
): Buffer {
  const padding = 20
  const charHeight = fontSize * 1.2
  const svgHeight = text.length * charHeight + padding * 2
  const svgWidth = fontSize + padding * 2

  let svgContent = ""

  // --- Treatment: Backdrop (full-height rect behind the column) ---
  if (treatment.type === "backdrop") {
    svgContent += `<rect x="0" y="0" width="${svgWidth}" height="${svgHeight}" rx="8" ry="8" fill="rgba(0,0,0,${treatment.opacity ?? 0.6})" />`
  }

  // Render each character
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const x = padding
    const y = padding + i * charHeight + fontSize
    const escapedChar = escapeXml(char)
    const centerX = x + fontSize / 2
    const centerY = y - fontSize / 2

    // --- Treatment: Shadow (render shadow chars first) ---
    if (treatment.type === "shadow") {
      const offset = treatment.shadowOffset ?? 2
      const shadowOpacity = 0.4

      if (HALFWIDTH_REGEX.test(char)) {
        svgContent += `<text x="${x + offset}" y="${y + offset}" font-family="${fontFamily}" font-size="${fontSize}" fill="rgba(0,0,0,${shadowOpacity})" transform="rotate(90, ${centerX + offset}, ${centerY + offset})" text-anchor="middle">${escapedChar}</text>`
      } else {
        svgContent += `<text x="${x + offset}" y="${y + offset}" font-family="${fontFamily}" font-size="${fontSize}" fill="rgba(0,0,0,${shadowOpacity})" text-anchor="start">${escapedChar}</text>`
      }
    }

    // --- Main character ---
    if (HALFWIDTH_REGEX.test(char)) {
      // Half-width Latin/numbers: rotate 90 degrees clockwise
      if (treatment.type === "stroke") {
        svgContent += `<text x="${x}" y="${y}" font-family="${fontFamily}" font-size="${fontSize}" fill="${color}" stroke="${treatment.strokeColor}" stroke-width="${treatment.strokeWidth ?? 2}" paint-order="stroke" transform="rotate(90, ${centerX}, ${centerY})" text-anchor="middle">${escapedChar}</text>`
      } else {
        svgContent += `<text x="${x}" y="${y}" font-family="${fontFamily}" font-size="${fontSize}" fill="${color}" transform="rotate(90, ${centerX}, ${centerY})" text-anchor="middle">${escapedChar}</text>`
      }
    } else {
      // CJK/fullwidth: render upright
      if (treatment.type === "stroke") {
        svgContent += `<text x="${x}" y="${y}" font-family="${fontFamily}" font-size="${fontSize}" fill="${color}" stroke="${treatment.strokeColor}" stroke-width="${treatment.strokeWidth ?? 2}" paint-order="stroke" text-anchor="start">${escapedChar}</text>`
      } else {
        svgContent += `<text x="${x}" y="${y}" font-family="${fontFamily}" font-size="${fontSize}" fill="${color}" text-anchor="start">${escapedChar}</text>`
      }
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}">${svgContent}</svg>`

  return Buffer.from(svg)
}

// ---------------------------------------------------------------------------
// Vertical text eligibility
// ---------------------------------------------------------------------------

/**
 * Determine whether vertical text (tategaki) is appropriate for a headline.
 *
 * All three conditions must be met:
 * 1. Headline is 12 characters or fewer (long vertical text is awkward)
 * 2. Headline is primarily CJK characters (>70% CJK)
 * 3. Image is not a wide banner (aspect ratio <= 1.5)
 *
 * @param headlineLength - Number of characters in the headline
 * @param headlineText - Full headline string (for CJK ratio analysis)
 * @param imageAspectRatio - Image width / height ratio
 * @returns true if vertical text should be offered as a layout alternative
 */
export function shouldUseVerticalText(
  headlineLength: number,
  headlineText: string,
  imageAspectRatio: number
): boolean {
  // Condition 1: Short headline
  if (headlineLength > 12) return false

  // Condition 2: Primarily CJK characters (>70%)
  const chars = [...headlineText]
  if (chars.length === 0) return false
  const cjkCount = chars.filter((ch) => CJK_REGEX.test(ch)).length
  const cjkRatio = cjkCount / chars.length
  if (cjkRatio <= 0.7) return false

  // Condition 3: Not a wide banner
  if (imageAspectRatio > 1.5) return false

  return true
}
