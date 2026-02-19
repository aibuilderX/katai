/**
 * Strategic Insight agent prompt builder.
 *
 * Produces the system prompt, user message, and tool schema for the Strategic
 * Insight agent -- the first agent in the 5-agent pipeline.
 *
 * The Strategic Insight agent classifies a campaign brief into:
 * - Schwartz awareness level (5 stages)
 * - LF8 desires (1-3 primary) with optional Japanese cultural overlay
 * - Copywriting framework (PAS/AIDA/BAB/AIDMA/AISAS)
 * - Target insight, creative direction, key messages, tonal guidance
 *
 * Design decisions:
 * - XML-tagged system prompt per Claude 4.6 best practices (research section 2.4)
 * - Tool-use forced output for schema compliance (ORCH-09 quality gate)
 * - 1 few-shot example per research section 2.3 recommendation
 * - Confidence scores (high/medium/low) per classification dimension
 * - English system prompt, Japanese output field (summaryJa) per research recommendation
 * - No "think step by step" or "be thorough" language (Claude 4.6 overthinks with these)
 *
 * @see .planning/phases/09.1-agent-prompt-engineering-photorealistic-output/09.1-RESEARCH.md
 */

import type { CampaignBrief } from "@/types/campaign"
import type { N8nWebhookPayload } from "@/types/pipeline"
import type { ToolSchema } from "./types"
import { buildPromptFromSections, type PromptSection } from "./types"
import {
  SCHWARTZ_AWARENESS_LEVELS,
  LF8_DESIRES,
  JAPANESE_DESIRE_NUANCES,
  COPYWRITING_FRAMEWORKS,
} from "../shared/frameworks"

// ===== System Prompt Builder =====

/**
 * Build the system prompt for the Strategic Insight agent.
 *
 * The prompt embeds all framework knowledge directly (Schwartz, LF8, Japanese
 * nuances, 5 copywriting frameworks) so the agent can classify without
 * external lookups. Includes 1 few-shot example demonstrating the complete
 * output format.
 */
export function buildStrategicInsightSystemPrompt(): string {
  const sections: PromptSection[] = [
    {
      tag: "role",
      content:
        "You are a strategic marketing analyst specializing in the Japanese market. You classify campaign briefs into actionable strategic frameworks that guide downstream creative and copy agents. Your classifications are confident and decisive — you always provide a classification even from sparse input.",
    },
    {
      tag: "knowledge",
      content: buildKnowledgeSection(),
    },
    {
      tag: "task",
      content: [
        "Analyze the campaign brief and classify it into:",
        "1) Schwartz awareness level with confidence score",
        "2) Primary LF8 desires (1-3) with confidence score",
        "3) Japanese desire nuance if applicable (wa, bi_ishiki, or anshin)",
        "4) Copywriting framework with confidence score and rationale",
        "5) Target insight — a substantive audience insight (not a generic statement)",
        "6) Creative direction — actionable direction for the Creative Director agent",
        "7) Key messages — 2-4 concrete messages grounded in the brief, not generic platitudes",
        "8) Tonal guidance — register recommendation (casual/standard/formal) with reasoning",
        "9) Market context — 1-2 sentences on competitive/market positioning when inferable",
        "10) summaryJa — approximately 10 word Japanese summary of the strategic direction",
        "",
        "Always infer confidently. If the brief is vague, make reasonable assumptions based on product type, audience, and industry patterns. Never leave fields empty or request more information.",
      ].join("\n"),
    },
    {
      tag: "constraints",
      content: [
        "- Classification must be decisive — never output 'unclear' or 'need more info'",
        "- Framework rationale must explain WHY this framework suits this specific brief (minimum 20 characters)",
        "- Key messages: 2-4 concrete messages tied to the brief's product and audience, not generic marketing platitudes",
        "- Tonal guidance must specify register recommendation (casual/standard/formal) with reasoning based on product category and audience",
        "- summaryJa: approximately 10 word Japanese summary of the strategic direction",
        "- Market context: 1-2 sentences on competitive/market positioning when inferable from the brief",
        "- Confidence scores reflect your certainty: 'high' when the brief gives clear signals, 'medium' when you are making reasonable inferences, 'low' when the brief is very vague",
        "- primaryDesires: select 1-3 LF8 desire names that are most relevant to the brief",
      ].join("\n"),
    },
    {
      tag: "output_format",
      content:
        "Use the deliver_strategic_insight tool to return your analysis. All fields are required except japaneseDesireNuance and marketContext which are optional.",
    },
    {
      tag: "examples",
      content: buildFewShotExample(),
    },
  ]

  return buildPromptFromSections(sections)
}

// ===== Knowledge Section Builder =====

function buildKnowledgeSection(): string {
  const awarenessLevelsText = SCHWARTZ_AWARENESS_LEVELS.map(
    (level) =>
      `- ${level.label} (${level.labelJa}): ${level.description}\n  Downstream implication: ${level.downstreamImplication}`
  ).join("\n")

  const lf8DesiresText = LF8_DESIRES.map(
    (desire) =>
      `- LF8-${desire.id}: ${desire.name} (${desire.nameJa}): ${desire.description}`
  ).join("\n")

  const japaneseNuancesText = JAPANESE_DESIRE_NUANCES.map(
    (nuance) =>
      `- ${nuance.name} (${nuance.nameJa}): ${nuance.description} [Related LF8: ${nuance.relatedLf8Ids.join(", ")}]`
  ).join("\n")

  const frameworksText = COPYWRITING_FRAMEWORKS.map(
    (fw) =>
      `- ${fw.id} (${fw.name} / ${fw.nameJa}): ${fw.description}\n  Best for: ${fw.bestFor}\n  Structure: ${fw.structure.join(" → ")}`
  ).join("\n")

  const frameworkSelectionGuide = [
    "Framework selection criteria:",
    "  * PAS: Best for pain-point products, problem-aware audiences, health/wellness, security",
    "  * AIDA: General awareness, broad audiences, new market entry, e-commerce",
    "  * BAB: Transformation products, aspirational positioning, coaching/courses, beauty/fitness",
    "  * AIDMA: Traditional Japanese channels, brand recall campaigns, established brands, luxury, repeat-purchase categories",
    "  * AISAS: Digital-first Japanese campaigns, social sharing, search-heavy purchase journeys, youth-targeted campaigns",
  ].join("\n")

  return [
    "=== Schwartz 5 Awareness Levels ===",
    "Eugene Schwartz's universal framework for classifying a prospect's cognitive state relative to a product.",
    "",
    awarenessLevelsText,
    "",
    "=== LF8 Life Force 8 Desires ===",
    "Drew Eric Whitman's eight hardwired human desires that drive consumer behavior. Select 1-3 most relevant desires.",
    "",
    lf8DesiresText,
    "",
    "=== Japanese Desire Nuances ===",
    "Three cultural overlays from Dentsu research that supplement LF8 for the Japanese market. Include when applicable.",
    "",
    japaneseNuancesText,
    "",
    "=== 5 Copywriting Frameworks ===",
    "Select the single most appropriate framework for the brief.",
    "",
    frameworksText,
    "",
    frameworkSelectionGuide,
  ].join("\n")
}

// ===== Few-Shot Example =====

function buildFewShotExample(): string {
  return [
    "Example: Organic skincare line for 30s women",
    "",
    "Brief: New organic skincare brand targeting women in their 30s. Product is a serum with natural ingredients. Objective: launch awareness on Instagram and LINE. Target audience: health-conscious women 28-38 in urban Japan. Mood: clean, natural, trustworthy.",
    "",
    "Expected output (via deliver_strategic_insight tool):",
    JSON.stringify(
      {
        awarenessLevel: "problem_aware",
        awarenessConfidence: "high",
        primaryDesires: [
          "Survival, enjoyment of life, life extension",
          "Social approval",
        ],
        desireConfidence: "high",
        japaneseDesireNuance:
          "bi_ishiki — aesthetic refinement drives premium skincare choices in Japan; consumers value ingredient quality and packaging presentation",
        copywritingFramework: "AISAS",
        frameworkConfidence: "high",
        frameworkRationale:
          "AISAS is optimal because the target audience (urban 30s women) actively searches for skincare reviews and ingredient information before purchasing, and shares skincare discoveries on Instagram. The Search-Action-Share cycle matches this audience's purchase journey perfectly.",
        targetInsight:
          "Urban Japanese women in their 30s are increasingly skeptical of synthetic ingredients and seek 'clean beauty' products they can research and validate through peer reviews and ingredient transparency.",
        creativeDirection:
          "Lead with ingredient transparency and natural origin story. Visual direction should emphasize clean, minimal aesthetics with natural textures. Avoid hard-sell claims — let product quality and ingredient story build trust. Position as a knowledgeable friend sharing a discovery, not a brand pushing a product.",
        keyMessages: [
          "Organic ingredients sourced from Japanese farms with full transparency",
          "Dermatologist-recommended for sensitive skin in urban environments",
          "Join the community of women choosing clean beauty",
        ],
        tonalGuidance:
          "Standard register (です/ます). The product sits between accessible and premium — standard register conveys professionalism and trust without being stiff. The organic/natural positioning calls for warmth within a credible frame.",
        marketContext:
          "The Japanese clean beauty market is growing rapidly with increasing consumer demand for ingredient transparency. Competition from established brands (SHIRO, THREE) means differentiation through community and direct engagement is key.",
        summaryJa:
          "30代女性向けオーガニックスキンケア、AISAS型SNS展開で認知拡大",
      },
      null,
      2
    ),
  ].join("\n")
}

// ===== User Message Builder =====

/**
 * Build the user message for the Strategic Insight agent.
 *
 * Formats the campaign brief and brand profile into XML-tagged sections
 * for clear parsing by the agent.
 *
 * @param brief - The campaign brief from the user
 * @param brandProfile - The brand profile data
 */
export function buildStrategicInsightUserMessage(
  brief: CampaignBrief,
  brandProfile: N8nWebhookPayload["brandProfile"]
): string {
  const brandColorsText = brandProfile.colors
    ? `Primary: ${brandProfile.colors.primary || "not set"}, Secondary: ${brandProfile.colors.secondary || "not set"}, Accent: ${brandProfile.colors.accent || "not set"}`
    : "No brand colors defined"

  const productCatalogText =
    brandProfile.productCatalog && brandProfile.productCatalog.length > 0
      ? brandProfile.productCatalog
          .map((p) => `${p.name}: ${p.description || "no description"}`)
          .join("; ")
      : "No product catalog"

  const sections: PromptSection[] = [
    {
      tag: "brief",
      content: [
        `Product/Service: ${brief.campaignProductInfo || brandProfile.name}`,
        `Objective: ${brief.objective}`,
        `Target Audience: ${brief.targetAudience}`,
        `Platforms: ${brief.platforms.join(", ")}`,
        `Creative Direction: ${brief.creativeDirection}`,
        `Mood Tags: ${brief.creativeMoodTags.join(", ")}`,
        `Register Override: ${brief.registerOverride || "none — infer from product category"}`,
      ].join("\n"),
    },
    {
      tag: "brand_context",
      content: [
        `Brand Name: ${brandProfile.name}`,
        `Positioning: ${brandProfile.positioningStatement || "not specified"}`,
        `Target Market: ${brandProfile.targetMarket || "not specified"}`,
        `Brand Story: ${brandProfile.brandStory || "not specified"}`,
        `Brand Values: ${brandProfile.brandValues ? brandProfile.brandValues.join(", ") : "not specified"}`,
        `Tone: ${brandProfile.toneDescription || "not specified"}`,
        `Tone Tags: ${brandProfile.toneTags ? brandProfile.toneTags.join(", ") : "not specified"}`,
        `Default Register: ${brandProfile.defaultRegister}`,
        `Colors: ${brandColorsText}`,
        `Product Catalog: ${productCatalogText}`,
      ].join("\n"),
    },
  ]

  return (
    buildPromptFromSections(sections) +
    "\n\nClassify this brief and deliver your strategic analysis."
  )
}

// ===== Tool Schema =====

/**
 * Tool-use schema for the Strategic Insight agent.
 *
 * Forces structured output via tool_choice: { type: "tool", name: "deliver_strategic_insight" }.
 * Acts as the ORCH-09 quality gate — schema compliance guarantees output completeness.
 *
 * All fields required except japaneseDesireNuance and marketContext.
 */
export const STRATEGIC_INSIGHT_TOOL_SCHEMA: ToolSchema = {
  name: "deliver_strategic_insight",
  description:
    "Deliver the strategic analysis of the campaign brief. All fields are required except japaneseDesireNuance and marketContext.",
  input_schema: {
    type: "object",
    properties: {
      awarenessLevel: {
        type: "string",
        enum: [
          "unaware",
          "problem_aware",
          "solution_aware",
          "product_aware",
          "most_aware",
        ],
        description:
          "Schwartz awareness level classification for the target audience",
      },
      awarenessConfidence: {
        type: "string",
        enum: ["high", "medium", "low"],
        description:
          "Confidence in the awareness level classification",
      },
      primaryDesires: {
        type: "array",
        items: { type: "string" },
        minItems: 1,
        maxItems: 3,
        description:
          "1-3 LF8 desire names most relevant to the brief",
      },
      desireConfidence: {
        type: "string",
        enum: ["high", "medium", "low"],
        description:
          "Confidence in the desire classification",
      },
      japaneseDesireNuance: {
        type: "string",
        description:
          "Optional Japanese cultural overlay (wa, bi_ishiki, or anshin) with explanation",
      },
      copywritingFramework: {
        type: "string",
        enum: ["PAS", "AIDA", "BAB", "AIDMA", "AISAS"],
        description:
          "Selected copywriting framework for the campaign",
      },
      frameworkConfidence: {
        type: "string",
        enum: ["high", "medium", "low"],
        description:
          "Confidence in the framework selection",
      },
      frameworkRationale: {
        type: "string",
        minLength: 20,
        description:
          "Explanation of why this framework is the best fit for this specific brief",
      },
      targetInsight: {
        type: "string",
        minLength: 10,
        description:
          "Substantive audience insight grounded in the brief",
      },
      creativeDirection: {
        type: "string",
        minLength: 10,
        description:
          "Actionable direction for the Creative Director agent",
      },
      keyMessages: {
        type: "array",
        items: { type: "string" },
        minItems: 2,
        maxItems: 4,
        description:
          "2-4 concrete key messages tied to the brief's product and audience",
      },
      tonalGuidance: {
        type: "string",
        description:
          "Register recommendation (casual/standard/formal) with reasoning",
      },
      marketContext: {
        type: "string",
        description:
          "Optional 1-2 sentences on competitive/market positioning",
      },
      summaryJa: {
        type: "string",
        description:
          "Approximately 10 word Japanese summary of the strategic direction",
      },
    },
    required: [
      "awarenessLevel",
      "awarenessConfidence",
      "primaryDesires",
      "desireConfidence",
      "copywritingFramework",
      "frameworkConfidence",
      "frameworkRationale",
      "targetInsight",
      "creativeDirection",
      "keyMessages",
      "tonalGuidance",
      "summaryJa",
    ],
  },
}
