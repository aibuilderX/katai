/**
 * Layout Engine - Claude Vision Integration
 *
 * Analyzes base images via Claude Vision API to detect safe areas and
 * generate 3 structured layout alternatives with text placement coordinates.
 *
 * Pipeline: base image -> Claude Vision analysis -> coordinate validation -> LayoutAlternative[]
 *
 * Key behaviors:
 * - Sends image as base64 to Claude Vision with structured tool output
 * - Validates and corrects all coordinates (20px grid snap, 40px edge padding, overlap resolution)
 * - Falls back to 3 safe default layouts when Claude API is unavailable
 *
 * Model: claude-sonnet-4-5-20250514 (same as copy generation)
 */

import Anthropic from "@anthropic-ai/sdk"
import type { LayoutAlternative, TextPlacement } from "./types"
import {
  LAYOUT_ANALYSIS_TOOL,
  buildLayoutAnalysisPrompt,
} from "@/lib/ai/prompts/layout-analysis"

// ---------------------------------------------------------------------------
// Main analysis function
// ---------------------------------------------------------------------------

export interface AnalyzeImageLayoutParams {
  imageBuffer: Buffer
  imageWidth: number
  imageHeight: number
  hasTagline: boolean
  hasLogo: boolean
  headlineText: string
}

/**
 * Analyze a base image via Claude Vision and return 3 validated layout alternatives.
 *
 * Sends the image to Claude Vision with a structured tool definition that forces
 * exactly 3 layout alternatives. Each alternative is post-processed to snap
 * coordinates to a 20px grid, clamp within bounds, and resolve overlaps.
 *
 * Falls back to safe default layouts if the Claude API call fails.
 *
 * @param params - Image buffer, dimensions, and content flags
 * @returns 3 validated LayoutAlternative objects
 */
export async function analyzeImageLayout(
  params: AnalyzeImageLayoutParams
): Promise<LayoutAlternative[]> {
  const {
    imageBuffer,
    imageWidth,
    imageHeight,
    hasTagline,
    hasLogo,
    headlineText,
  } = params

  try {
    const anthropic = new Anthropic()
    const base64Image = imageBuffer.toString("base64")

    const prompt = buildLayoutAnalysisPrompt({
      imageWidth,
      imageHeight,
      hasTagline,
      hasLogo,
      headlineText,
      headlineLength: [...headlineText].length,
    })

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250514",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/png",
                data: base64Image,
              },
            },
            {
              type: "text",
              text: prompt,
            },
          ],
        },
      ],
      tools: [LAYOUT_ANALYSIS_TOOL],
      tool_choice: { type: "tool", name: "deliver_layout_alternatives" },
    })

    // Extract structured result from tool use content block
    const toolUseBlock = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
    )

    if (!toolUseBlock) {
      console.warn(
        "[layout-engine] Claude did not return tool_use block. Using fallback layouts."
      )
      return buildFallbackLayouts(imageWidth, imageHeight, hasTagline, hasLogo)
    }

    const result = toolUseBlock.input as {
      alternatives: Array<{
        id: string
        headline: TextPlacement
        tagline: TextPlacement | null
        cta: TextPlacement
        orientation: "horizontal" | "vertical"
        contrastZones: Array<{
          region: { x: number; y: number; width: number; height: number }
          brightness: "light" | "dark" | "mixed"
        }>
      }>
    }

    if (!result.alternatives || result.alternatives.length === 0) {
      console.warn(
        "[layout-engine] Claude returned empty alternatives. Using fallback layouts."
      )
      return buildFallbackLayouts(imageWidth, imageHeight, hasTagline, hasLogo)
    }

    // Validate and correct each alternative
    const validated = result.alternatives.map((alt) => {
      const layout: LayoutAlternative = {
        id: alt.id,
        headline: alt.headline,
        tagline: hasTagline ? alt.tagline : null,
        cta: alt.cta,
        logo: hasLogo
          ? { x: imageWidth - 40 - 120, y: imageHeight - 40 - 40 }
          : null,
        orientation: alt.orientation,
        contrastZones: alt.contrastZones ?? [],
      }
      return validateLayoutCoordinates(layout, imageWidth, imageHeight)
    })

    return validated
  } catch (error) {
    console.warn(
      "[layout-engine] Claude Vision API call failed. Using fallback layouts.",
      error instanceof Error ? error.message : error
    )
    return buildFallbackLayouts(imageWidth, imageHeight, hasTagline, hasLogo)
  }
}

// ---------------------------------------------------------------------------
// Coordinate validation
// ---------------------------------------------------------------------------

/**
 * Validate and correct layout coordinates for a single alternative.
 *
 * Post-processing steps:
 * 1. Snap all coordinates to 20px grid
 * 2. Clamp within image bounds with 40px edge padding
 * 3. Ensure headline maxWidth >= 200px
 * 4. Resolve vertical overlaps between text elements
 *
 * @param layout - Raw layout alternative from Claude
 * @param imageWidth - Image width in pixels
 * @param imageHeight - Image height in pixels
 * @returns Corrected layout with all coordinates within safe bounds
 */
export function validateLayoutCoordinates(
  layout: LayoutAlternative,
  imageWidth: number,
  imageHeight: number
): LayoutAlternative {
  const corrected = { ...layout }

  // Helper: snap to 20px grid
  const snap = (value: number): number => Math.round(value / 20) * 20

  // Helper: clamp coordinate within image bounds with 40px padding
  const clampX = (x: number): number =>
    Math.max(40, Math.min(x, imageWidth - 40))
  const clampY = (y: number): number =>
    Math.max(40, Math.min(y, imageHeight - 40))

  // Helper: clamp maxWidth so text doesn't extend beyond right edge
  const clampMaxWidth = (x: number, maxWidth: number): number =>
    Math.max(200, Math.min(maxWidth, imageWidth - x - 40))

  // Validate headline placement
  corrected.headline = {
    x: clampX(snap(layout.headline.x)),
    y: clampY(snap(layout.headline.y)),
    maxWidth: 0, // set below
    align: layout.headline.align,
  }
  corrected.headline.maxWidth = Math.max(
    200,
    clampMaxWidth(corrected.headline.x, snap(layout.headline.maxWidth))
  )

  // Validate CTA placement
  corrected.cta = {
    x: clampX(snap(layout.cta.x)),
    y: clampY(snap(layout.cta.y)),
    maxWidth: 0, // set below
    align: layout.cta.align,
  }
  corrected.cta.maxWidth = Math.max(
    100,
    clampMaxWidth(corrected.cta.x, snap(layout.cta.maxWidth))
  )

  // Validate tagline placement (if present)
  if (layout.tagline) {
    corrected.tagline = {
      x: clampX(snap(layout.tagline.x)),
      y: clampY(snap(layout.tagline.y)),
      maxWidth: 0, // set below
      align: layout.tagline.align,
    }
    corrected.tagline.maxWidth = Math.max(
      100,
      clampMaxWidth(corrected.tagline.x, snap(layout.tagline.maxWidth))
    )
  }

  // Resolve vertical overlaps between text elements
  // Collect all elements with their estimated heights for overlap checking
  const ELEMENT_HEIGHT = 80 // Approximate height for a text block
  const OVERLAP_PADDING = 20

  interface PlacedElement {
    key: "headline" | "tagline" | "cta"
    y: number
    height: number
  }

  const elements: PlacedElement[] = [
    { key: "headline", y: corrected.headline.y, height: ELEMENT_HEIGHT },
  ]
  if (corrected.tagline) {
    elements.push({
      key: "tagline",
      y: corrected.tagline.y,
      height: ELEMENT_HEIGHT * 0.6,
    })
  }
  elements.push({
    key: "cta",
    y: corrected.cta.y,
    height: ELEMENT_HEIGHT * 0.7,
  })

  // Sort by y-position to process top-to-bottom
  elements.sort((a, b) => a.y - b.y)

  // Push down any overlapping elements
  for (let i = 1; i < elements.length; i++) {
    const prev = elements[i - 1]
    const curr = elements[i]
    const prevBottom = prev.y + prev.height + OVERLAP_PADDING

    if (curr.y < prevBottom) {
      // Overlapping -- push current element below previous
      const newY = clampY(snap(prevBottom))

      if (curr.key === "headline") {
        corrected.headline = { ...corrected.headline, y: newY }
      } else if (curr.key === "tagline" && corrected.tagline) {
        corrected.tagline = { ...corrected.tagline, y: newY }
      } else if (curr.key === "cta") {
        corrected.cta = { ...corrected.cta, y: newY }
      }

      // Update the element's y for subsequent overlap checks
      curr.y = newY
    }
  }

  return corrected
}

// ---------------------------------------------------------------------------
// Fallback layouts
// ---------------------------------------------------------------------------

/**
 * Generate 3 safe default layouts when Claude Vision is unavailable.
 *
 * Uses percentage-based positioning relative to image dimensions:
 * - Layout A: Headline top-center, tagline below, CTA bottom-center (horizontal)
 * - Layout B: Headline top-left, tagline below, CTA bottom-right (horizontal)
 * - Layout C: Headline right-center (vertical if eligible), CTA bottom-center
 *
 * All coordinates satisfy the 40px edge padding constraint.
 *
 * @param imageWidth - Image width in pixels
 * @param imageHeight - Image height in pixels
 * @param hasTagline - Whether a tagline element is needed
 * @param hasLogo - Whether a logo should be placed
 * @returns 3 LayoutAlternative objects with safe coordinates
 */
function buildFallbackLayouts(
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

  // Layout A: Top-center headline, CTA bottom-center
  const layoutA: LayoutAlternative = {
    id: "A",
    headline: {
      x: pad,
      y: Math.round(imageHeight * 0.12),
      maxWidth: contentWidth,
      align: "center",
    },
    tagline: hasTagline
      ? {
          x: pad,
          y: Math.round(imageHeight * 0.28),
          maxWidth: Math.round(contentWidth * 0.7),
          align: "center",
        }
      : null,
    cta: {
      x: Math.round(imageWidth * 0.3),
      y: Math.round(imageHeight * 0.82),
      maxWidth: Math.round(contentWidth * 0.4),
      align: "center",
    },
    logo,
    orientation: "horizontal",
    contrastZones: [],
  }

  // Layout B: Top-left headline, CTA bottom-right
  const layoutB: LayoutAlternative = {
    id: "B",
    headline: {
      x: pad,
      y: Math.round(imageHeight * 0.1),
      maxWidth: Math.round(contentWidth * 0.6),
      align: "left",
    },
    tagline: hasTagline
      ? {
          x: pad,
          y: Math.round(imageHeight * 0.26),
          maxWidth: Math.round(contentWidth * 0.5),
          align: "left",
        }
      : null,
    cta: {
      x: Math.round(imageWidth * 0.55),
      y: Math.round(imageHeight * 0.85),
      maxWidth: Math.round(contentWidth * 0.4),
      align: "right",
    },
    logo,
    orientation: "horizontal",
    contrastZones: [],
  }

  // Layout C: Right-side headline, CTA bottom-center
  const layoutC: LayoutAlternative = {
    id: "C",
    headline: {
      x: Math.round(imageWidth * 0.55),
      y: Math.round(imageHeight * 0.15),
      maxWidth: Math.round(contentWidth * 0.4),
      align: "right",
    },
    tagline: hasTagline
      ? {
          x: Math.round(imageWidth * 0.55),
          y: Math.round(imageHeight * 0.35),
          maxWidth: Math.round(contentWidth * 0.35),
          align: "right",
        }
      : null,
    cta: {
      x: Math.round(imageWidth * 0.3),
      y: Math.round(imageHeight * 0.8),
      maxWidth: Math.round(contentWidth * 0.4),
      align: "center",
    },
    logo,
    orientation: "horizontal",
    contrastZones: [],
  }

  return [layoutA, layoutB, layoutC]
}
