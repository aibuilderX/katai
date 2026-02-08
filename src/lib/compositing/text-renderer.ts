/**
 * Horizontal Text Renderer
 *
 * Generates SVG buffers for horizontal (yokogaki) text overlays with
 * readability treatments. Produces SVG buffers ready for Sharp composite().
 *
 * Two renderers:
 * - buildTextSvg(): Multi-line text with contrast treatment (backdrop/stroke/shadow)
 * - buildCtaSvg(): CTA pill button with brand accent background
 *
 * SVG output is consumed by the compositing pipeline which positions
 * these buffers on the base image at layout-engine-determined coordinates.
 */

import type { TextElement, ContrastTreatment } from "./types"

// ---------------------------------------------------------------------------
// XML safety
// ---------------------------------------------------------------------------

/**
 * Escape special XML characters in text content for safe SVG embedding.
 * Prevents SVG parsing errors from user-provided text containing &, <, >, ".
 */
export function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

// ---------------------------------------------------------------------------
// Horizontal text SVG
// ---------------------------------------------------------------------------

/**
 * Build an SVG buffer for horizontal text with readability treatment.
 *
 * @param element - Text element with font, color, alignment, and max width
 * @param treatment - Contrast treatment (backdrop, stroke, or shadow)
 * @param lines - Pre-broken text lines (from kinsoku line-breaking engine)
 * @returns SVG as a Buffer, ready for Sharp composite()
 */
export function buildTextSvg(
  element: TextElement,
  treatment: ContrastTreatment,
  lines: string[]
): Buffer {
  const { fontSize, fontFamily, color, maxWidth, align } = element
  const lineHeight = fontSize * 1.4
  const padding = 20

  // SVG dimensions: width covers maxWidth + padding on both sides
  const svgWidth = maxWidth + padding * 2
  const svgHeight = lines.length * lineHeight + padding * 2

  // Text anchor and x position based on alignment
  let textAnchor: string
  let textX: number
  if (align === "center") {
    textAnchor = "middle"
    textX = svgWidth / 2
  } else if (align === "right") {
    textAnchor = "end"
    textX = svgWidth - padding
  } else {
    textAnchor = "start"
    textX = padding
  }

  let svgContent = ""

  // --- Treatment: Backdrop ---
  if (treatment.type === "backdrop") {
    svgContent += `<rect x="0" y="0" width="${svgWidth}" height="${svgHeight}" rx="8" ry="8" fill="rgba(0,0,0,${treatment.opacity ?? 0.6})" />`
  }

  // Render each line
  for (let i = 0; i < lines.length; i++) {
    const lineY = padding + i * lineHeight + fontSize
    const escapedText = escapeXml(lines[i])

    // --- Treatment: Shadow (render shadow text first, behind main text) ---
    if (treatment.type === "shadow") {
      const offset = treatment.shadowOffset ?? 2
      const shadowOpacity = 0.4
      svgContent += `<text x="${textX + offset}" y="${lineY + offset}" font-family="${fontFamily}" font-size="${fontSize}" text-anchor="${textAnchor}" fill="rgba(0,0,0,${shadowOpacity})">${escapedText}</text>`
    }

    // --- Main text ---
    if (treatment.type === "stroke") {
      svgContent += `<text x="${textX}" y="${lineY}" font-family="${fontFamily}" font-size="${fontSize}" text-anchor="${textAnchor}" fill="${color}" stroke="${treatment.strokeColor}" stroke-width="${treatment.strokeWidth ?? 2}" paint-order="stroke">${escapedText}</text>`
    } else {
      svgContent += `<text x="${textX}" y="${lineY}" font-family="${fontFamily}" font-size="${fontSize}" text-anchor="${textAnchor}" fill="${color}">${escapedText}</text>`
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}">${svgContent}</svg>`

  return Buffer.from(svg)
}

// ---------------------------------------------------------------------------
// CTA pill SVG
// ---------------------------------------------------------------------------

/**
 * Build an SVG buffer for a CTA (call-to-action) pill button.
 *
 * CTA elements use exact brand colors for their backdrop (per locked decision:
 * "CTA elements can use exact brand colors (they have their own backdrop)").
 *
 * @param text - CTA text (e.g. "今すぐ購入")
 * @param fontSize - Font size in pixels
 * @param fontFamily - Font family name
 * @param brandColor - Brand accent color for pill background
 * @param textColor - Text fill color (typically white or contrasting)
 * @returns SVG as a Buffer, ready for Sharp composite()
 */
export function buildCtaSvg(
  text: string,
  fontSize: number,
  fontFamily: string,
  brandColor: string,
  textColor: string
): Buffer {
  const padding = 40
  const pillWidth = text.length * fontSize + padding
  const pillHeight = fontSize * 2
  const borderRadius = fontSize * 0.4

  const escapedText = escapeXml(text)

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${pillWidth}" height="${pillHeight}"><rect x="0" y="0" width="${pillWidth}" height="${pillHeight}" rx="${borderRadius}" ry="${borderRadius}" fill="${brandColor}" /><text x="${pillWidth / 2}" y="${pillHeight / 2 + fontSize * 0.35}" font-family="${fontFamily}" font-size="${fontSize}" text-anchor="middle" fill="${textColor}">${escapedText}</text></svg>`

  return Buffer.from(svg)
}
