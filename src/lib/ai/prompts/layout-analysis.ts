/**
 * Layout Analysis Prompt & Claude Vision Tool Definition
 *
 * Defines the structured tool schema for Claude Vision layout analysis
 * and builds context-aware prompts for analyzing advertising images.
 *
 * Claude Vision analyzes base images to detect safe areas (sky, gradients,
 * solid regions) and returns 3 distinct layout alternatives with pixel-
 * accurate text placement coordinates for headline, tagline, CTA, and logo.
 *
 * Used by: src/lib/compositing/layout-engine.ts
 */

import type Anthropic from "@anthropic-ai/sdk"

/**
 * Anthropic tool definition for structured layout output.
 *
 * Forces Claude to return exactly 3 layout alternatives, each with
 * text placement coordinates, orientation, and contrast zone assessment.
 * Uses tool_choice: { type: 'tool', name: 'deliver_layout_alternatives' }
 * to guarantee structured output.
 */
export const LAYOUT_ANALYSIS_TOOL: Anthropic.Tool = {
  name: "deliver_layout_alternatives",
  description:
    "Analyze the advertising image and return 3 distinct layout alternatives for text placement. Each alternative places headline, tagline, and CTA in different regions of the image, avoiding the main subject.",
  input_schema: {
    type: "object" as const,
    properties: {
      alternatives: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "Layout identifier: 'A', 'B', or 'C'",
            },
            headline: {
              type: "object",
              description: "Headline (catch copy) placement coordinates",
              properties: {
                x: { type: "number", description: "Left edge x-coordinate in pixels" },
                y: { type: "number", description: "Top edge y-coordinate in pixels" },
                maxWidth: {
                  type: "number",
                  description: "Maximum text width in pixels",
                },
                align: {
                  type: "string",
                  enum: ["left", "center", "right"],
                  description: "Text alignment within maxWidth",
                },
              },
              required: ["x", "y", "maxWidth", "align"],
            },
            tagline: {
              oneOf: [
                {
                  type: "object",
                  description: "Tagline (sub copy) placement coordinates",
                  properties: {
                    x: { type: "number", description: "Left edge x-coordinate in pixels" },
                    y: { type: "number", description: "Top edge y-coordinate in pixels" },
                    maxWidth: {
                      type: "number",
                      description: "Maximum text width in pixels",
                    },
                    align: {
                      type: "string",
                      enum: ["left", "center", "right"],
                      description: "Text alignment within maxWidth",
                    },
                  },
                  required: ["x", "y", "maxWidth", "align"],
                },
                { type: "null" },
              ],
              description: "Tagline placement or null if not needed",
            },
            cta: {
              type: "object",
              description: "CTA (call-to-action) placement coordinates",
              properties: {
                x: { type: "number", description: "Left edge x-coordinate in pixels" },
                y: { type: "number", description: "Top edge y-coordinate in pixels" },
                maxWidth: {
                  type: "number",
                  description: "Maximum text width in pixels",
                },
                align: {
                  type: "string",
                  enum: ["left", "center", "right"],
                  description: "Text alignment within maxWidth",
                },
              },
              required: ["x", "y", "maxWidth", "align"],
            },
            orientation: {
              type: "string",
              enum: ["horizontal", "vertical"],
              description:
                "Text writing direction: 'horizontal' (yokogaki) or 'vertical' (tategaki)",
            },
            contrastZones: {
              type: "array",
              description:
                "Brightness assessment for regions where text will be placed",
              items: {
                type: "object",
                properties: {
                  region: {
                    type: "object",
                    properties: {
                      x: { type: "number" },
                      y: { type: "number" },
                      width: { type: "number" },
                      height: { type: "number" },
                    },
                    required: ["x", "y", "width", "height"],
                  },
                  brightness: {
                    type: "string",
                    enum: ["light", "dark", "mixed"],
                    description:
                      "Dominant brightness of the region for contrast treatment selection",
                  },
                },
                required: ["region", "brightness"],
              },
            },
          },
          required: ["id", "headline", "cta", "orientation", "contrastZones"],
        },
        minItems: 3,
        maxItems: 3,
        description: "Exactly 3 layout alternatives using different image regions",
      },
      imageDescription: {
        type: "string",
        description:
          "Brief description of the image content (main subject, background, composition)",
      },
      safeAreas: {
        type: "array",
        description:
          "Regions of the image with low visual complexity suitable for text placement",
        items: {
          type: "object",
          properties: {
            x: { type: "number" },
            y: { type: "number" },
            width: { type: "number" },
            height: { type: "number" },
          },
          required: ["x", "y", "width", "height"],
        },
      },
    },
    required: ["alternatives", "imageDescription", "safeAreas"],
  },
}

/**
 * Parameters for building the layout analysis prompt.
 */
export interface LayoutAnalysisPromptParams {
  imageWidth: number
  imageHeight: number
  hasTagline: boolean
  hasLogo: boolean
  headlineText: string
  headlineLength: number
}

/**
 * Build a context-aware prompt for Claude Vision layout analysis.
 *
 * The prompt instructs Claude to analyze the image content and return
 * 3 layout alternatives with pixel coordinates. It accounts for:
 * - Image dimensions and safe edge padding (40px)
 * - Whether tagline and logo are present
 * - Tategaki eligibility (vertical safe area, short CJK headline, non-wide format)
 * - Logo fixed position (bottom-right corner with 40px padding)
 *
 * @param params - Image and content context for the prompt
 * @returns Prompt text string to send alongside the image
 */
export function buildLayoutAnalysisPrompt(
  params: LayoutAnalysisPromptParams
): string {
  const {
    imageWidth,
    imageHeight,
    hasTagline,
    hasLogo,
    headlineText,
    headlineLength,
  } = params

  // Determine if tategaki should be considered as an alternative
  const cjkCharCount = (headlineText.match(/[\u3000-\u9FFF\uF900-\uFAFF]/g) || [])
    .length
  const isMostlyCJK = cjkCharCount / Math.max(headlineLength, 1) > 0.6
  const isShortHeadline = headlineLength <= 12
  const isWideFormat = imageWidth / imageHeight > 1.5
  const tategakiEligible = isShortHeadline && isMostlyCJK && !isWideFormat

  const taglineInstruction = hasTagline
    ? "- Tagline (sub copy): secondary text element, smaller than headline. Place below or near the headline."
    : "- Tagline: NOT needed for this format. Set tagline to null for all alternatives."

  const logoInstruction = hasLogo
    ? `- Logo: fixed position at bottom-right corner with 40px padding from edges (x: ${imageWidth - 40 - 120}, y: ${imageHeight - 40 - 40}). Do NOT vary logo position across alternatives.`
    : "- Logo: NOT included. No logo position needed."

  const tategakiInstruction = tategakiEligible
    ? `\n\nIMPORTANT: The headline "${headlineText}" is ${headlineLength} characters, primarily CJK, and the image is not a wide banner. One of the 3 alternatives MUST use vertical (tategaki) text orientation. Place vertical text in a tall narrow safe area. The other 2 alternatives should use horizontal orientation.`
    : "\n\nAll 3 alternatives should use horizontal text orientation (the headline is not suitable for vertical text in this context)."

  return `Analyze this ${imageWidth}x${imageHeight}px advertising image for Japanese text placement.

You must return exactly 3 layout alternatives with coordinates in pixels. Each alternative must place text elements in DIFFERENT regions of the image.

TEXT ELEMENTS TO PLACE:
- Headline (catch copy): primary text element, largest size. The headline text is: "${headlineText}" (${headlineLength} characters)
${taglineInstruction}
- CTA (call-to-action): button or action text element
${logoInstruction}

PLACEMENT RULES:
1. Place text in areas with low visual complexity (sky, gradients, solid colors, blurred backgrounds)
2. NEVER cover the main subject of the image (people, products, key objects)
3. Each of the 3 alternatives MUST use a DIFFERENT region of the image
4. All coordinates must be within image bounds with 40px edge padding:
   - x: minimum 40, maximum ${imageWidth - 40}
   - y: minimum 40, maximum ${imageHeight - 40}
   - maxWidth: minimum 200, maximum ${imageWidth - 80}
5. Headline maxWidth must be at least 200px for readability
6. Assess brightness (light/dark/mixed) for each region where text will be placed -- this determines contrast treatment
${tategakiInstruction}

Return your analysis using the deliver_layout_alternatives tool.`
}
