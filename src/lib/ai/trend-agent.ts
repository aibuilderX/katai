/**
 * Trend analysis agent.
 * Synthesizes Japanese market trends via Claude (no external API).
 * Provides creative direction insights based on campaign brief context.
 */

import Anthropic from "@anthropic-ai/sdk"
import { TREND_SYSTEM_PROMPT, buildTrendUserPrompt } from "./prompts/trend-analysis"

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// ----------- Trend Types -----------

export interface TrendInsight {
  title: string
  relevance: string
  suggestion: string
}

export interface TrendInsightsResult {
  trends: TrendInsight[]
  seasonalTags: string[]
  recommendedHashtags: string[]
}

// ----------- Tool Schema -----------

const TREND_INSIGHTS_TOOL: Anthropic.Tool = {
  name: "deliver_trend_insights",
  description:
    "日本市場のトレンド分析結果を構造化された形式で返します。",
  input_schema: {
    type: "object" as const,
    strict: true,
    properties: {
      trends: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "トレンドのタイトル",
            },
            relevance: {
              type: "string",
              description: "このキャンペーンとの関連性",
            },
            suggestion: {
              type: "string",
              description: "具体的な活用提案",
            },
          },
          required: ["title", "relevance", "suggestion"],
        },
        description: "関連トレンド一覧（3〜5件）",
      },
      seasonalTags: {
        type: "array",
        items: { type: "string" },
        description: "季節やイベントに関連するタグ",
      },
      recommendedHashtags: {
        type: "array",
        items: { type: "string" },
        description: "SNSで効果的なハッシュタグ推薦",
      },
    },
    required: ["trends", "seasonalTags", "recommendedHashtags"],
  },
}

// ----------- Main Function -----------

/**
 * Analyze market trends relevant to the campaign brief.
 * Returns structured trend insights (no DB persistence -- displayed on-demand).
 */
export async function analyzeTrends(
  brief: {
    objective: string
    targetAudience: string
    platforms: string[]
    creativeMoodTags?: string[]
    creativeDirection?: string
  },
  brandProfile: {
    name: string
    targetMarket?: string | null
    positioningStatement?: string | null
  }
): Promise<TrendInsightsResult> {
  const userPrompt = buildTrendUserPrompt(brief, brandProfile)

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250514",
    max_tokens: 4096,
    temperature: 0.3, // Slightly creative for trend synthesis
    system: TREND_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: userPrompt,
      },
    ],
    tools: [TREND_INSIGHTS_TOOL],
    tool_choice: { type: "tool", name: "deliver_trend_insights" },
  })

  // Extract structured result
  const toolUseBlock = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  )

  if (!toolUseBlock) {
    throw new Error(
      "Claude did not return structured trend insights via tool use."
    )
  }

  return toolUseBlock.input as TrendInsightsResult
}
