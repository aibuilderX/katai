/**
 * Claude API client for structured Japanese copy generation.
 * Uses tool-based structured output for guaranteed schema compliance.
 *
 * Model: claude-sonnet-4-5-20250514 (pinned version)
 * Temperature: 0.2 (low for keigo register consistency)
 */

import Anthropic from "@anthropic-ai/sdk"
import { buildSystemPrompt, buildCopyPrompt } from "./prompts/copy-generation"
import type { CampaignBrief } from "@/types/campaign"

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
