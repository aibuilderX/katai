/**
 * Compositing type definitions for Phase 2.
 *
 * Shared interfaces used across all compositing modules:
 * kinsoku line-breaking, text rendering, layout engine,
 * contrast analysis, and the compositing pipeline orchestrator.
 */

// ---------------------------------------------------------------------------
// Text primitives
// ---------------------------------------------------------------------------

/** A positioned text element ready for SVG/Pango rendering. */
export interface TextElement {
  text: string
  x: number
  y: number
  fontSize: number
  fontFamily: string
  color: string
  maxWidth: number
  align: "left" | "center" | "right"
}

/** Semantic role of a text element within an ad creative. */
export type TextRole = "headline" | "tagline" | "cta"

/** Writing direction: horizontal (yokogaki) or vertical (tategaki). */
export type TextOrientation = "horizontal" | "vertical"

// ---------------------------------------------------------------------------
// Readability treatments
// ---------------------------------------------------------------------------

/** Contrast treatment applied to text for readability over images. */
export interface ContrastTreatment {
  type: "backdrop" | "stroke" | "shadow"
  /** Backdrop opacity (0-1). Only used when type = 'backdrop'. */
  opacity?: number
  /** Stroke color. Only used when type = 'stroke'. */
  strokeColor?: string
  /** Stroke width in pixels. Only used when type = 'stroke'. */
  strokeWidth?: number
  /** Shadow offset in pixels. Only used when type = 'shadow'. */
  shadowOffset?: number
  /** Shadow blur radius in pixels. Only used when type = 'shadow'. */
  shadowBlur?: number
}

// ---------------------------------------------------------------------------
// Layout system
// ---------------------------------------------------------------------------

/** Placement coordinates and constraints for a single text element. */
export interface TextPlacement {
  x: number
  y: number
  maxWidth: number
  align: "left" | "center" | "right"
}

/** A rectangular image region with brightness classification. */
export interface ContrastZone {
  region: { x: number; y: number; width: number; height: number }
  brightness: "light" | "dark" | "mixed"
}

/**
 * One of 3 layout alternatives produced by the layout engine.
 * Each alternative places text elements in different image regions.
 */
export interface LayoutAlternative {
  id: string // 'A' | 'B' | 'C'
  headline: TextPlacement
  tagline: TextPlacement | null
  cta: TextPlacement
  logo: { x: number; y: number } | null
  orientation: TextOrientation
  contrastZones: ContrastZone[]
}

// ---------------------------------------------------------------------------
// Line breaking
// ---------------------------------------------------------------------------

/** Result of Japanese line-breaking (kinsoku shori). */
export interface LineBreakResult {
  lines: string[]
  orientation: TextOrientation
}

// ---------------------------------------------------------------------------
// Pipeline input / output
// ---------------------------------------------------------------------------

/** Input to the compositing pipeline for a single base image. */
export interface CompositingInput {
  baseImageBuffer: Buffer
  imageWidth: number
  imageHeight: number
  headline: string
  tagline: string | null
  cta: string
  fontFamily: string
  brandColors: { primary: string; accent: string }
  logoBuffer: Buffer | null
}

/** Full compositing result containing all layout variants. */
export interface CompositingResult {
  composites: Array<{
    layoutId: string
    imageBuffer: Buffer
    metadata: LayoutMetadata
  }>
}

/**
 * Metadata stored alongside each composited image.
 * Enables Phase 5 re-rendering with modified positions.
 */
export interface LayoutMetadata {
  layoutId: string
  orientation: TextOrientation
  headline: { text: string; x: number; y: number; fontSize: number; lines: string[] }
  tagline?: { text: string; x: number; y: number; fontSize: number; lines: string[] }
  cta: { text: string; x: number; y: number; fontSize: number }
  logo?: { x: number; y: number; width: number }
  treatment: ContrastTreatment
  fontFamily: string
  brandColors: { primary: string; accent: string }
  baseImageAssetId: string
}

// ---------------------------------------------------------------------------
// Image analysis
// ---------------------------------------------------------------------------

/** Luminance and variance statistics for an image region. */
export interface RegionStats {
  luminance: number
  variance: number
}
