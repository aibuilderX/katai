/**
 * Advertising law compliance agent.
 * Checks generated copy against Japanese advertising regulations
 * (Keihyouhou / Yakki Ho) and platform-specific rules
 * via Claude with structured tool output.
 *
 * Mirrors the architecture of qa-agent.ts.
 */

import Anthropic from "@anthropic-ai/sdk"
import { db } from "@/lib/db"
import {
  campaigns,
  brandProfiles,
  copyVariants,
  complianceReports,
  ComplianceIssue,
} from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import {
  COMPLIANCE_SYSTEM_PROMPT,
  buildComplianceUserPrompt,
} from "./prompts/compliance-check"

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// ----------- Compliance Report Types -----------

export interface ComplianceReport {
  overallRisk: "low" | "medium" | "high"
  keihyouhouIssues: ComplianceIssue[]
  yakkihoIssues: ComplianceIssue[]
  platformRuleIssues: ComplianceIssue[]
}

// ----------- Tool Schema -----------

const issueProperties = {
  category: {
    type: "string",
    description: "問題のカテゴリ",
  },
  field: {
    type: "string",
    description:
      "問題が見つかったフィールド（例: headline, bodyText, ctaText）",
  },
  problematicText: {
    type: "string",
    description: "問題のあるテキスト箇所",
  },
  issue: {
    type: "string",
    description: "問題の説明",
  },
  severity: {
    type: "string",
    enum: ["error", "warning"],
    description: "重要度（error: 法令違反の可能性が高い、warning: グレーゾーン）",
  },
  suggestion: {
    type: "string",
    description: "改善提案",
  },
  legalBasis: {
    type: "string",
    description: "法的根拠（該当する法令・条文）",
  },
} as const

const issueRequired = [
  "category",
  "field",
  "problematicText",
  "issue",
  "severity",
  "suggestion",
  "legalBasis",
]

const COMPLIANCE_TOOL: Anthropic.Tool = {
  name: "deliver_compliance_report",
  description:
    "広告コピーの法令コンプライアンス検証結果を構造化された形式で返します。",
  input_schema: {
    type: "object" as const,
    strict: true,
    properties: {
      overallRisk: {
        type: "string",
        enum: ["low", "medium", "high"],
        description:
          "全体のリスクレベル（low: 問題なし、medium: 要確認、high: 法令違反の可能性あり）",
      },
      keihyouhouIssues: {
        type: "array",
        items: {
          type: "object",
          properties: {
            ...issueProperties,
            category: {
              type: "string",
              enum: ["yuryou_gonin", "yuuri_gonin", "stealth_marketing"],
              description:
                "景品表示法の違反カテゴリ（yuryou_gonin: 優良誤認、yuuri_gonin: 有利誤認、stealth_marketing: ステマ）",
            },
          },
          required: issueRequired,
        },
        description: "景品表示法に関する問題リスト",
      },
      yakkihoIssues: {
        type: "array",
        items: {
          type: "object",
          properties: {
            ...issueProperties,
            category: {
              type: "string",
              enum: [
                "medical_claim",
                "prohibited_expression",
                "safety_claim",
                "testimonial_efficacy",
              ],
              description:
                "薬機法の違反カテゴリ（medical_claim: 医薬品的効能、prohibited_expression: 禁止表現、safety_claim: 安全性表現、testimonial_efficacy: 体験談による効能保証）",
            },
          },
          required: issueRequired,
        },
        description: "薬機法に関する問題リスト",
      },
      platformRuleIssues: {
        type: "array",
        items: {
          type: "object",
          properties: {
            platform: {
              type: "string",
              description: "対象プラットフォーム",
            },
            field: {
              type: "string",
              description: "問題が見つかったフィールド",
            },
            problematicText: {
              type: "string",
              description: "問題のあるテキスト箇所",
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
            legalBasis: {
              type: "string",
              description: "該当するプラットフォームポリシー",
            },
          },
          required: [
            "platform",
            "field",
            "problematicText",
            "issue",
            "severity",
            "suggestion",
            "legalBasis",
          ],
        },
        description: "プラットフォームポリシーに関する問題リスト",
      },
    },
    required: ["overallRisk", "keihyouhouIssues", "yakkihoIssues", "platformRuleIssues"],
  },
}

// ----------- Main Function -----------

/**
 * Run compliance check on all copy variants for a campaign.
 *
 * 1. Fetches campaign, brand profile, and copy variants from DB
 * 2. Calls Claude with structured tool output
 * 3. Stores result in complianceReports table
 * 4. Returns the compliance report
 */
export async function runComplianceCheck(
  campaignId: string
): Promise<ComplianceReport> {
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

  // Build user prompt with brand context and platforms from brief
  const brief = campaign.brief
  const userPrompt = buildComplianceUserPrompt(
    {
      name: brand.name,
      productCatalog: brand.productCatalog,
      positioningStatement: brand.positioningStatement,
    },
    variants.map((v) => ({
      platform: v.platform,
      variantLabel: v.variantLabel,
      headline: v.headline,
      bodyText: v.bodyText,
      ctaText: v.ctaText,
    })),
    brief.platforms
  )

  // Call Claude
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250514",
    max_tokens: 4096,
    temperature: 0, // Deterministic compliance checking
    system: COMPLIANCE_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: userPrompt,
      },
    ],
    tools: [COMPLIANCE_TOOL],
    tool_choice: { type: "tool", name: "deliver_compliance_report" },
  })

  // Extract structured result
  const toolUseBlock = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  )

  if (!toolUseBlock) {
    throw new Error(
      "Claude did not return structured compliance report via tool use."
    )
  }

  const report = toolUseBlock.input as ComplianceReport

  // Store in complianceReports table
  await db.insert(complianceReports).values({
    campaignId,
    overallRisk: report.overallRisk,
    keihyouhouResult: report.keihyouhouIssues,
    yakkihoResult: report.yakkihoIssues,
    platformRuleResult: report.platformRuleIssues,
  })

  return report
}
