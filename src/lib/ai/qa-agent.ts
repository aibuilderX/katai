/**
 * QA validation agent.
 * Validates generated copy for keigo consistency and brand compliance
 * via Claude with structured tool output.
 *
 * Text-based QA only for MVP (visual coherence via Claude Vision is deferred).
 */

import Anthropic from "@anthropic-ai/sdk"
import { db } from "@/lib/db"
import {
  campaigns,
  brandProfiles,
  copyVariants,
  qaReports,
} from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { QA_SYSTEM_PROMPT, buildQAUserPrompt } from "./prompts/qa-validation"

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// ----------- QA Report Types -----------

export interface QAIssue {
  field: string
  issue: string
  severity: "error" | "warning"
  suggestion: string
}

export interface QAReport {
  overallScore: number
  keigoConsistency: {
    passed: boolean
    issues: QAIssue[]
  }
  brandCompliance: {
    passed: boolean
    issues: QAIssue[]
  }
}

// ----------- Tool Schema -----------

const QA_VALIDATION_TOOL: Anthropic.Tool = {
  name: "deliver_qa_report",
  description:
    "広告コピーのQA検証結果を構造化された形式で返します。",
  input_schema: {
    type: "object" as const,
    strict: true,
    properties: {
      overallScore: {
        type: "integer",
        description: "全体の品質スコア（0〜100）",
        minimum: 0,
        maximum: 100,
      },
      keigoConsistency: {
        type: "object",
        properties: {
          passed: {
            type: "boolean",
            description: "敬語の一貫性チェック結果",
          },
          issues: {
            type: "array",
            items: {
              type: "object",
              properties: {
                field: {
                  type: "string",
                  description:
                    "問題が見つかったフィールド（例: headline, bodyText, ctaText）",
                },
                issue: {
                  type: "string",
                  description: "問題の説明",
                },
                severity: {
                  type: "string",
                  enum: ["error", "warning"],
                  description: "重要度",
                },
                suggestion: {
                  type: "string",
                  description: "改善提案",
                },
              },
              required: ["field", "issue", "severity", "suggestion"],
            },
            description: "敬語に関する問題リスト",
          },
        },
        required: ["passed", "issues"],
      },
      brandCompliance: {
        type: "object",
        properties: {
          passed: {
            type: "boolean",
            description: "ブランドコンプライアンスチェック結果",
          },
          issues: {
            type: "array",
            items: {
              type: "object",
              properties: {
                field: {
                  type: "string",
                  description: "問題が見つかったフィールド",
                },
                issue: {
                  type: "string",
                  description: "問題の説明",
                },
                severity: {
                  type: "string",
                  enum: ["error", "warning"],
                  description: "重要度",
                },
                suggestion: {
                  type: "string",
                  description: "改善提案",
                },
              },
              required: ["field", "issue", "severity", "suggestion"],
            },
            description: "ブランド準拠に関する問題リスト",
          },
        },
        required: ["passed", "issues"],
      },
    },
    required: ["overallScore", "keigoConsistency", "brandCompliance"],
  },
}

// ----------- Main Function -----------

/**
 * Run QA validation on all copy variants for a campaign.
 *
 * 1. Fetches campaign, brand profile, and copy variants from DB
 * 2. Calls Claude with structured tool output
 * 3. Stores result in qaReports table
 * 4. Returns the QA report
 */
export async function runQAValidation(campaignId: string): Promise<QAReport> {
  // Fetch campaign
  const campaignResult = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.id, campaignId))
    .limit(1)

  if (campaignResult.length === 0) {
    throw new Error(`Campaign not found: ${campaignId}`)
  }

  const campaign = campaignResult[0]

  // Fetch brand profile
  const brandResult = await db
    .select()
    .from(brandProfiles)
    .where(eq(brandProfiles.id, campaign.brandProfileId))
    .limit(1)

  if (brandResult.length === 0) {
    throw new Error(`Brand profile not found: ${campaign.brandProfileId}`)
  }

  const brand = brandResult[0]

  // Fetch all copy variants
  const variants = await db
    .select()
    .from(copyVariants)
    .where(eq(copyVariants.campaignId, campaignId))

  if (variants.length === 0) {
    throw new Error(`No copy variants found for campaign: ${campaignId}`)
  }

  // Call Claude
  const userPrompt = buildQAUserPrompt(brand, variants)

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250514",
    max_tokens: 4096,
    temperature: 0, // Deterministic validation
    system: QA_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: userPrompt,
      },
    ],
    tools: [QA_VALIDATION_TOOL],
    tool_choice: { type: "tool", name: "deliver_qa_report" },
  })

  // Extract structured result
  const toolUseBlock = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  )

  if (!toolUseBlock) {
    throw new Error(
      "Claude did not return structured QA report via tool use."
    )
  }

  const report = toolUseBlock.input as QAReport

  // Store in qaReports table
  await db.insert(qaReports).values({
    campaignId,
    overallScore: report.overallScore,
    keigoResult: report.keigoConsistency,
    brandResult: report.brandCompliance,
  })

  return report
}
