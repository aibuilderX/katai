/**
 * Prompt templates for Flux 1.1 Pro Ultra image generation.
 * IMPORTANT: Do NOT include Japanese text in prompts (compositing is Phase 2).
 */

import type { CampaignBrief } from "@/types/campaign"

interface BrandProfileForImagePrompt {
  name: string
  colors?: { primary: string; secondary: string; accent: string; background: string } | null
  toneTags?: string[] | null
  targetMarket?: string | null
}

const MOOD_TAG_TO_VISUAL: Record<string, string> = {
  bright: "bright, well-lit, high-key lighting",
  dark: "dark, moody, low-key lighting, dramatic shadows",
  minimal: "minimalist composition, clean lines, negative space",
  colorful: "vibrant colors, rich saturation, colorful palette",
  retro: "retro aesthetic, vintage film look, nostalgic tones",
  modern: "contemporary design, sleek, cutting-edge",
  natural: "organic textures, earthy tones, natural materials",
  luxury: "luxurious, premium materials, gold accents, elegant",
  pop: "pop art inspired, bold graphics, eye-catching",
  cool: "cool tones, blue and silver palette, sophisticated",
  japanese: "Japanese design sensibility, wabi-sabi, subtle elegance",
  urban: "urban setting, city backdrop, metropolitan atmosphere",
}

const OBJECTIVE_TO_VISUAL: Record<string, string> = {
  awareness: "eye-catching, attention-grabbing, bold visual impact",
  conversion: "product-focused, clear value proposition, compelling",
  engagement: "inviting, interactive-looking, warm and approachable",
  branding: "brand identity, consistent visual language, memorable",
  promotion: "promotional, sale-oriented, urgency, excitement",
  new_product: "product reveal, fresh, innovative, spotlight on product",
}

/**
 * Build an image generation prompt for Flux 1.1 Pro Ultra.
 *
 * CRITICAL: No Japanese text in the prompt.
 * Text compositing onto images is Phase 2 (server-side overlay).
 * This generates base advertising photography/illustration only.
 */
export function buildImagePrompt(
  brief: CampaignBrief,
  brand: BrandProfileForImagePrompt
): string {
  const parts: string[] = []

  // Base style
  parts.push("Professional advertising photography for a Japanese market campaign.")

  // Objective-based visual direction
  const objectiveVisual = OBJECTIVE_TO_VISUAL[brief.objective]
  if (objectiveVisual) {
    parts.push(objectiveVisual)
  }

  // Mood tags to visual descriptions
  if (brief.creativeMoodTags && brief.creativeMoodTags.length > 0) {
    const moodDescriptions = brief.creativeMoodTags
      .map((tag) => MOOD_TAG_TO_VISUAL[tag])
      .filter(Boolean)
    if (moodDescriptions.length > 0) {
      parts.push(moodDescriptions.join(", "))
    }
  }

  // Brand color guidance
  if (brand.colors) {
    parts.push(
      `Color palette emphasizing ${brand.colors.primary} as primary color with ${brand.colors.secondary} and ${brand.colors.accent} as accent colors.`
    )
  }

  // Creative direction (free text from user, in English translation guidance)
  if (brief.creativeDirection) {
    parts.push(`Creative direction: ${brief.creativeDirection}`)
  }

  // Target audience visual cues
  if (brief.targetAudience) {
    parts.push(`Target audience context: ${brief.targetAudience}`)
  }

  // Quality and style guidance
  parts.push(
    "High-resolution, studio quality, 8K, professional commercial photography. No text or typography in the image. Clean composition suitable for ad campaign overlay."
  )

  return parts.join(" ")
}

/**
 * Generate prompt variations for multiple image generation.
 * Each variation emphasizes a different visual angle while maintaining brand consistency.
 */
export function buildImagePromptVariations(
  brief: CampaignBrief,
  brand: BrandProfileForImagePrompt,
  count: number = 4
): string[] {
  const basePrompt = buildImagePrompt(brief, brand)

  const variations = [
    "Close-up product shot with shallow depth of field.",
    "Wide-angle lifestyle scene showing the product in context.",
    "Abstract artistic interpretation with brand color palette.",
    "Hero shot with dramatic lighting and premium staging.",
    "Environmental portrait showing target audience in natural setting.",
    "Flat lay composition with complementary styling elements.",
  ]

  return Array.from({ length: count }, (_, i) => {
    const variation = variations[i % variations.length]
    return `${basePrompt} ${variation}`
  })
}
