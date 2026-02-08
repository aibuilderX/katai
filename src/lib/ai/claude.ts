/**
 * Claude API client for structured Japanese copy generation.
 * Uses tool-based structured output for guaranteed schema compliance.
 *
 * Model: claude-sonnet-4-5-20250514 (pinned version)
 * Temperature: 0.2 (low for keigo register consistency)
 */

import Anthropic from "@anthropic-ai/sdk"
import { buildSystemPrompt, buildCopyPrompt, buildPlatformCopyPrompt } from "./prompts/copy-generation"
import type { BrandProfileForPrompt } from "./prompts/copy-generation"
import type { CampaignBrief } from "@/types/campaign"
import {
  PLATFORM_COPY_CONSTRAINTS,
  getConstraintsForPlatforms,
  validateCopyLength,
} from "@/lib/platforms/copy-constraints"

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export interface CopyVariant {
  headline: string
  body: string
  cta: string
  hashtags: string[]
}

export interface CopyGenerationResult {
  variants: CopyVariant[]
}

/**
 * Tool schema for structured copy variant delivery.
 * Forces Claude to return exactly 4 variants with consistent structure.
 */
const DELIVER_COPY_VARIANTS_TOOL: Anthropic.Tool = {
  name: "deliver_copy_variants",
  description:
    "生成した広告コピーバリエーションを構造化された形式で返します。必ず4つのバリエーション（A案〜D案）を含めてください。",
  input_schema: {
    type: "object" as const,
    properties: {
      variants: {
        type: "array",
        items: {
          type: "object",
          properties: {
            headline: {
              type: "string",
              description: "見出し（15〜30文字程度）",
            },
            body: {
              type: "string",
              description: "本文（50〜100文字程度）",
            },
            cta: {
              type: "string",
              description: "アクションボタンテキスト（5〜15文字程度）",
            },
            hashtags: {
              type: "array",
              items: { type: "string" },
              description: "関連ハッシュタグ（3〜5個）",
            },
          },
          required: ["headline", "body", "cta", "hashtags"],
        },
        minItems: 4,
        maxItems: 4,
        description: "4つのコピーバリエーション（A案〜D案）",
      },
    },
    required: ["variants"],
  },
}

interface BrandProfileForGeneration {
  name: string
  colors?: { primary: string; secondary: string; accent: string; background: string } | null
  defaultRegister: string
  toneTags?: string[] | null
  toneDescription?: string | null
  productCatalog?: Array<{
    name: string
    description: string
    keyFeatures: string[]
    priceRange: string
    targetSegment: string
  }> | null
  positioningStatement?: string | null
  brandStory?: string | null
  targetMarket?: string | null
  brandValues?: string[] | null
}

/**
 * Generate structured copy with 4 A/B variants using Claude API.
 *
 * Uses tool-based structured output (not raw text) to guarantee schema compliance.
 * All 4 variants are generated in a single API call for register consistency.
 *
 * @param brief - Campaign brief with objectives, audience, platforms
 * @param brandProfile - Brand profile with identity, tone, product info
 * @returns 4 copy variants with headline, body, CTA, and hashtags
 */
export async function generateCopy(
  brief: CampaignBrief | Record<string, unknown>,
  brandProfile: BrandProfileForGeneration | Record<string, unknown>
): Promise<CopyGenerationResult> {
  const typedBrief = brief as CampaignBrief
  const typedBrand = brandProfile as BrandProfileForGeneration

  const systemPrompt = buildSystemPrompt(typedBrand)
  const userPrompt = buildCopyPrompt(typedBrief, typedBrand)

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250514", // Pinned model version
    max_tokens: 4096,
    temperature: 0.2, // Low temperature for keigo register consistency
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: userPrompt,
      },
    ],
    tools: [DELIVER_COPY_VARIANTS_TOOL],
    tool_choice: { type: "tool", name: "deliver_copy_variants" },
  })

  // Extract structured result from tool use content block
  const toolUseBlock = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  )

  if (!toolUseBlock) {
    throw new Error(
      "Claude did not return structured output via tool use. Response had no tool_use block."
    )
  }

  const result = toolUseBlock.input as { variants: CopyVariant[] }

  if (!result.variants || result.variants.length !== 4) {
    throw new Error(
      `Expected 4 copy variants, received ${result.variants?.length ?? 0}`
    )
  }

  return {
    variants: result.variants,
  }
}

// ---------------------------------------------------------------------------
// Platform-aware copy generation (Phase 3)
// ---------------------------------------------------------------------------

/**
 * A single copy variant for a specific platform, respecting its character limits.
 */
export interface PlatformCopyVariant {
  headline: string
  body: string
  cta: string
  hashtags: string[]
}

/**
 * Result of platform-aware copy generation: variants grouped by platform.
 */
export interface PlatformCopyResult {
  platforms: Array<{
    platformId: string
    variants: PlatformCopyVariant[]
  }>
}

/**
 * Tool schema for structured platform-specific copy delivery.
 * Returns variants grouped by platform, each with exactly 4 variants.
 */
const DELIVER_PLATFORM_COPY_TOOL: Anthropic.Tool = {
  name: "deliver_platform_copy",
  description:
    "プラットフォーム別に最適化された広告コピーバリエーションを構造化された形式で返します。各プラットフォームに対して正確に4つのバリエーション（A案〜D案）を含めてください。",
  input_schema: {
    type: "object" as const,
    properties: {
      platforms: {
        type: "array",
        items: {
          type: "object",
          properties: {
            platformId: {
              type: "string",
              description: "プラットフォームID（例: line, instagram, x）",
            },
            variants: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  headline: {
                    type: "string",
                    description: "プラットフォーム別文字数制限に従った見出し",
                  },
                  body: {
                    type: "string",
                    description: "プラットフォーム別文字数制限に従った本文",
                  },
                  cta: {
                    type: "string",
                    description: "プラットフォーム別文字数制限に従ったCTAテキスト",
                  },
                  hashtags: {
                    type: "array",
                    items: { type: "string" },
                    description: "プラットフォーム要件に従ったハッシュタグ（不要な場合は空配列）",
                  },
                },
                required: ["headline", "body", "cta", "hashtags"],
              },
              minItems: 4,
              maxItems: 4,
              description: "4つのコピーバリエーション（A案〜D案）",
            },
          },
          required: ["platformId", "variants"],
        },
        description: "プラットフォーム別のコピーバリエーション",
      },
    },
    required: ["platforms"],
  },
}

/**
 * Generate platform-specific copy variants via a single Claude API call.
 *
 * Produces 4 variants PER PLATFORM with enforced character limits.
 * All platforms are generated in one call for cost efficiency and register consistency.
 * Server-side validation truncates over-limit fields as a safety net.
 *
 * @param brief - Campaign brief with objectives, audience, platforms
 * @param brandProfile - Brand profile with identity, tone, product info
 * @param platformIds - Array of platform identifiers to generate copy for
 * @returns Platform-grouped copy variants with per-platform character limits enforced
 */
export async function generatePlatformCopy(
  brief: CampaignBrief | Record<string, unknown>,
  brandProfile: BrandProfileForPrompt | Record<string, unknown>,
  platformIds: string[]
): Promise<PlatformCopyResult> {
  const typedBrief = brief as CampaignBrief
  const typedBrand = brandProfile as BrandProfileForPrompt

  // Get constraints for selected platforms
  const constraints = getConstraintsForPlatforms(platformIds)

  if (constraints.length === 0) {
    throw new Error(
      `No valid platform constraints found for IDs: ${platformIds.join(", ")}. ` +
        `Valid platforms: ${Object.keys(PLATFORM_COPY_CONSTRAINTS).join(", ")}`
    )
  }

  const systemPrompt = buildSystemPrompt(typedBrand)
  const userPrompt = buildPlatformCopyPrompt(typedBrief, typedBrand, constraints)

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250514", // Pinned model version
    max_tokens: 8192, // More tokens needed for multi-platform output
    temperature: 0.2, // Low temperature for keigo register consistency
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: userPrompt,
      },
    ],
    tools: [DELIVER_PLATFORM_COPY_TOOL],
    tool_choice: { type: "tool", name: "deliver_platform_copy" },
  })

  // Extract structured result from tool use content block
  const toolUseBlock = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  )

  if (!toolUseBlock) {
    throw new Error(
      "Claude did not return structured output via tool use. Response had no tool_use block."
    )
  }

  const rawResult = toolUseBlock.input as {
    platforms: Array<{
      platformId: string
      variants: PlatformCopyVariant[]
    }>
  }

  if (!rawResult.platforms || rawResult.platforms.length === 0) {
    throw new Error("Claude returned empty platforms array in platform copy result.")
  }

  // Validate each platform has exactly 4 variants
  for (const platform of rawResult.platforms) {
    if (!platform.variants || platform.variants.length !== 4) {
      throw new Error(
        `Expected 4 variants for platform ${platform.platformId}, ` +
          `received ${platform.variants?.length ?? 0}`
      )
    }
  }

  // Server-side safety net: validate and truncate over-limit fields
  const validatedPlatforms = rawResult.platforms.map((platform) => {
    const constraint = PLATFORM_COPY_CONSTRAINTS[platform.platformId]
    if (!constraint) {
      // Unknown platform returned by Claude -- pass through without validation
      return platform
    }

    const validatedVariants = platform.variants.map((variant, variantIdx) => {
      const variantLabel = String.fromCharCode(65 + variantIdx) // A, B, C, D

      // Validate headline
      const headlineCheck = validateCopyLength(variant.headline, constraint.headline.maxChars)
      if (!headlineCheck.valid) {
        console.warn(
          `[copy-validation] ${platform.platformId} ${variantLabel}案 headline over limit: ` +
            `${headlineCheck.actual}/${constraint.headline.maxChars} chars. Truncating.`
        )
        variant = { ...variant, headline: headlineCheck.truncated! }
      }

      // Validate body
      const bodyCheck = validateCopyLength(variant.body, constraint.body.maxChars)
      if (!bodyCheck.valid) {
        console.warn(
          `[copy-validation] ${platform.platformId} ${variantLabel}案 body over limit: ` +
            `${bodyCheck.actual}/${constraint.body.maxChars} chars. Truncating.`
        )
        variant = { ...variant, body: bodyCheck.truncated! }
      }

      // Validate CTA
      const ctaCheck = validateCopyLength(variant.cta, constraint.cta.maxChars)
      if (!ctaCheck.valid) {
        console.warn(
          `[copy-validation] ${platform.platformId} ${variantLabel}案 cta over limit: ` +
            `${ctaCheck.actual}/${constraint.cta.maxChars} chars. Truncating.`
        )
        variant = { ...variant, cta: ctaCheck.truncated! }
      }

      return variant
    })

    return { platformId: platform.platformId, variants: validatedVariants }
  })

  return { platforms: validatedPlatforms }
}
