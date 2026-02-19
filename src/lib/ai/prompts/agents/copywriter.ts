/**
 * Copywriter agent prompt builder for the v1.1 pipeline.
 *
 * Generates Japanese advertising copy directly in Japanese (not via English
 * intermediate) with register determined by product category from the register
 * map. Produces platform-specific variants for LINE, Instagram, and X with
 * rationale notes explaining creative decisions.
 *
 * This module REPLACES the naive prompts in `src/lib/ai/prompts/copy-generation.ts`
 * for the v1.1 pipeline. The existing file is preserved for v1.0 backward
 * compatibility.
 *
 * Exports:
 * - buildCopywriterSystemPrompt(productCategory) — System prompt string
 * - buildCopywriterUserMessage(creativeDirection, strategicInsight, brief, brandProfile, platformConstraints) — User message string
 * - COPYWRITER_TOOL_SCHEMA — Tool schema for deliver_platform_copy
 *
 * @see .planning/phases/09.1-agent-prompt-engineering-photorealistic-output/09.1-RESEARCH.md#4
 */

import {
  REGISTER_BY_CATEGORY,
  getRegisterForCategory,
} from "../shared/register-map"
import type { RegisterLevel } from "../shared/register-map"
import { PLATFORM_NORMS } from "../shared/platform-norms"
import { COPYWRITING_FRAMEWORKS } from "../shared/frameworks"
import type { CopywritingFramework } from "../shared/frameworks"
import { buildPromptFromSections } from "./types"
import type { PromptSection, ToolSchema } from "./types"
import type { CopywriterOutput } from "@/types/pipeline"
import type { CreativeDirectorOutput, StrategicInsightOutput } from "@/types/pipeline"
import type { PlatformCopyConstraints } from "@/lib/platforms/copy-constraints"

// ===== Types =====

export interface CopywriterBrief {
  brandName: string
  productInfo?: string
  targetAudience?: string
  objective?: string
  platforms: string[]
  registerOverride?: string
  creativeMoodTags?: string[]
}

export interface CopywriterBrandProfile {
  name: string
  defaultRegister: string
  toneTags?: string[] | null
  toneDescription?: string | null
  positioningStatement?: string | null
  brandStory?: string | null
  brandValues?: string[] | null
}

// ===== Register Instructions (preserved from copy-generation.ts) =====

const REGISTER_INSTRUCTIONS: Record<RegisterLevel, string> = {
  casual: `Register: Casual (カジュアル / タメ口)
Sentence endings: だよ, だね, してみて, じゃん, ってば
Rules: Do NOT use です/ます forms. Write as if speaking to a close friend.
Atmosphere: Warm, approachable, natural conversational tone.
Emoji: Use sparingly (1-2 max) — this is still professional advertising copy.

Example:
  Headline: 新商品出たよ！
  Body: この春の新作、めっちゃ可愛いから絶対チェックしてみて！今だけ限定カラーもあるよ。
  CTA: チェックしてみて！`,

  standard: `Register: Standard (標準 / です・ます形)
Sentence endings: です, ます, ください, ません, でした, ました
Rules: Use polite forms consistently. Do NOT use honorific keigo (尊敬語/謙譲語).
Atmosphere: Professional yet warm — trustworthy without being stiff.

Example:
  Headline: 新商品が登場しました
  Body: この春の新作コレクションをぜひご覧ください。限定カラーもご用意しています。
  CTA: ぜひご覧ください`,

  formal: `Register: Formal (敬語 / 尊敬語・謙譲語)
Sentence endings: ございます, いたします, 申し上げます, くださいませ, いただけます
Rules: Use 尊敬語 and 謙譲語 appropriately. Avoid double-keigo (二重敬語). Convey premium elegance.
Atmosphere: High-end, refined, dignified tone conveying exclusivity and respect.

Example:
  Headline: 新商品のご案内を申し上げます
  Body: 春の新作コレクションのご案内を申し上げます。限定カラーもご用意いたしております。ぜひご高覧くださいませ。
  CTA: 詳細はこちらをご覧くださいませ`,
}

// ===== System Prompt Builder =====

/**
 * Build the Copywriter agent system prompt with baked-in domain knowledge.
 *
 * The system prompt is in English (Claude's strongest reasoning language) with
 * output instructions specifying Japanese. Includes register-by-category mapping,
 * platform norms, copywriting frameworks, and few-shot examples.
 *
 * @param productCategory - Product category string (e.g., "cosmetics", "food")
 *   Used to embed the correct register recommendation into the prompt.
 */
export function buildCopywriterSystemPrompt(productCategory: string): string {
  const register = getRegisterForCategory(productCategory)
  const registerRec = REGISTER_BY_CATEGORY[productCategory.toLowerCase()]

  const sections: PromptSection[] = [
    buildRoleSection(),
    buildKnowledgeSection(productCategory, register, registerRec),
    buildTaskSection(),
    buildConstraintsSection(register),
    buildOutputFormatSection(),
    buildExamplesSection(),
  ]

  return buildPromptFromSections(sections)
}

function buildRoleSection(): PromptSection {
  return {
    tag: "role",
    content: `You are a professional Japanese advertising copywriter (日本の広告コピーライター). You write copy directly in Japanese — never translating from English. Your copy reads naturally to native Japanese speakers and follows Japanese advertising conventions for each platform.

You have deep expertise in:
- Japanese tri-script writing system (漢字/ひらがな/カタカナ) and when to use each
- Keigo register system (casual/standard/formal) and how it affects advertising tone
- Platform-specific Japanese advertising norms (LINE, Instagram, X)
- Japanese consumer psychology and cultural nuances in advertising
- Rhythm and cadence in Japanese advertising copy (5-7 mora patterns)`,
  }
}

function buildKnowledgeSection(
  productCategory: string,
  register: RegisterLevel,
  registerRec: (typeof REGISTER_BY_CATEGORY)[string] | undefined
): PromptSection {
  const parts: string[] = []

  // Japanese Writing System Rules
  parts.push(`=== Japanese Writing System Rules ===
1. Tri-script mixing (三種混合文字):
   - 漢字 (Kanji): Use for nouns and verb stems. Prioritize readability — avoid rare kanji (難読漢字).
   - ひらがな (Hiragana): Use for particles, verb inflections, and when a softer impression is desired.
   - カタカナ (Katakana): Use for loanwords, emphasis, and brand-specific terminology.

2. Rhythm: Japanese advertising copy follows 5-7 mora rhythm for headlines (similar to haiku cadence). This creates natural, memorable copy.

3. Consistency: ALL variants for a platform MUST use the same register. Inconsistent sentence endings (語尾の揺れ) are never acceptable.

4. Cultural awareness: Follow Japanese advertising norms — prefer subtle, indirect expression over hard-sell directness.`)

  // Register System
  parts.push(`\n=== Register System ===
Product category: ${productCategory}
Recommended register: ${register}${registerRec ? ` (${registerRec.rationale})` : ""}

${REGISTER_INSTRUCTIONS[register]}`)

  // Include all register instructions for reference when override is used
  if (register !== "casual") {
    parts.push(`\n--- Alternative: Casual register ---\n${REGISTER_INSTRUCTIONS.casual}`)
  }
  if (register !== "standard") {
    parts.push(`\n--- Alternative: Standard register ---\n${REGISTER_INSTRUCTIONS.standard}`)
  }
  if (register !== "formal") {
    parts.push(`\n--- Alternative: Formal register ---\n${REGISTER_INSTRUCTIONS.formal}`)
  }

  // Full register-by-category mapping for reference
  parts.push(`\n=== Register-by-Category Reference ===`)
  for (const [cat, rec] of Object.entries(REGISTER_BY_CATEGORY)) {
    parts.push(
      `- ${cat}: ${rec.recommendedRegister} (${rec.rationaleJa})`
    )
  }

  // Platform Conventions
  parts.push(`\n=== Platform Conventions ===`)
  for (const [platformId, norm] of Object.entries(PLATFORM_NORMS)) {
    parts.push(`
--- ${norm.name} (${norm.nameJa}) ---
User base: ${norm.userBase}
Tone: ${norm.tone}
Format: ${norm.format}
CTA style: ${norm.ctaStyle}
Character limits: Title ${norm.characterLimits.title ?? "N/A"}, Description ${norm.characterLimits.description ?? "N/A"}, Body ${norm.characterLimits.body ?? "N/A"}
Hashtag strategy: ${norm.hashtagStrategy}
Key insight: ${norm.keyInsight}`)
  }

  // Copywriting Frameworks
  parts.push(`\n=== Copywriting Framework Application ===
You will receive a framework selection from the Strategic Insight agent. Apply the selected framework to structure your copy variants.`)
  for (const fw of COPYWRITING_FRAMEWORKS) {
    parts.push(`
--- ${fw.id}: ${fw.name} (${fw.nameJa}) ---
Structure: ${fw.structure.join(" → ")}
Description: ${fw.description}
Best for: ${fw.bestFor}`)
  }

  return {
    tag: "knowledge",
    content: parts.join("\n"),
  }
}

function buildTaskSection(): PromptSection {
  return {
    tag: "task",
    content: `Generate Japanese advertising copy for each target platform with headline, body, CTA, and hashtags. Apply the upstream copywriting framework selected by the Strategic Insight agent. Each variant takes a different creative angle while maintaining the same register throughout.

For each variant, include rationaleNotes (in English) explaining:
- Why you chose the specific CTA style
- Key word choices that serve the strategic framework
- How you adapted copy for the specific platform
- Any register-related decisions

Write ALL copy directly in Japanese. Do NOT think in English and translate. Generate native Japanese advertising copy from the start.`,
  }
}

function buildConstraintsSection(register: RegisterLevel): PromptSection {
  return {
    tag: "constraints",
    content: `1. Register consistency: ALL variants for a platform MUST use the SAME register (${register}). No mixing of casual and formal within any piece. Sentence endings must be consistent throughout.

2. Register selection: Use the category default register (${register}) unless the brief has a registerOverride, in which case use the override.

3. Character limits: Strictly obey platform-specific limits:
   - LINE: title ~20 chars, body ~50 chars, CTA ~15 chars
   - X: post 140 chars total
   - Instagram: caption up to 2200 chars
   Exact limits will be provided in the user message per platform.

4. Hashtag rules:
   - Japanese + English mix for Instagram (3-5 hashtags)
   - Concise trending tags for X (1-3 hashtags)
   - NO hashtags for LINE (not part of LINE advertising conventions)

5. CTA style (follow platform norms):
   - LINE: Soft, invitational CTAs (like a friend's recommendation)
   - X: Engagement-focused CTAs (retweet, reply, participatory)
   - Instagram: Engagement CTAs (like, save, comment, share)

6. Tri-script balance: Maintain natural 漢字/ひらがな/カタカナ balance. Avoid all-katakana or all-kanji runs. Natural Japanese advertising mixes all three scripts.

7. Variant count: Generate exactly 4 variants per platform (A案 through D案) with diverse creative approaches:
   - Variant A: Emotional appeal angle
   - Variant B: Functional/benefit angle
   - Variant C: Urgency/scarcity angle
   - Variant D: Storytelling/lifestyle angle

8. Rationale notes: Each variant MUST include rationaleNotes (in English, minimum 20 characters) explaining register choice, CTA style, key word decisions, and framework application.`,
  }
}

function buildOutputFormatSection(): PromptSection {
  return {
    tag: "output_format",
    content: `Use the deliver_platform_copy tool to return your copy. Structure your output as an array of variant objects, each containing platform, variantLabel, headline, body, cta, hashtags, register, and rationaleNotes.

variantLabel must use Japanese labeling: "A案", "B案", "C案", "D案".
rationaleNotes must be in English and explain your creative decisions.`,
  }
}

function buildExamplesSection(): PromptSection {
  return {
    tag: "examples",
    content: `=== Example A: Standard register for a cosmetics brand on Instagram ===

Input context: Cosmetics brand "HANA Beauty", new organic skincare line, target 30s women, AIDA framework, standard register

Tool output (one variant shown):
{
  "variants": [
    {
      "platform": "instagram",
      "variantLabel": "A案",
      "headline": "素肌が目覚める、オーガニックの力",
      "body": "毎日のスキンケアに、自然の恵みを。HANA Beautyの新オーガニックラインは、厳選された植物成分だけで作られています。敏感肌の方にも安心してお使いいただけます。\\n\\nこの春、素肌本来の美しさを取り戻しませんか。",
      "cta": "プロフィールのリンクからチェック",
      "hashtags": ["#HANABeauty", "#オーガニックスキンケア", "#素肌美人", "#自然派コスメ", "#春の新作"],
      "register": "standard",
      "rationaleNotes": "Standard register chosen for cosmetics category — professional trust with approachability for 30s women. AIDA framework: Attention via sensory headline (素肌が目覚める), Interest via ingredient story, Desire via emotional benefit (素肌本来の美しさ), Action via soft Instagram CTA. Used 敏感肌 (sensitive skin) as trust signal per Japanese cosmetics advertising norms."
    }
  ]
}

=== Example B: Casual register for a food brand on LINE ===

Input context: Ramen shop "麺道 一番", grand opening in Shibuya, target all ages, PAS framework, casual register

Tool output (one variant shown):
{
  "variants": [
    {
      "platform": "line",
      "variantLabel": "A案",
      "headline": "渋谷に新しいラーメン屋できたよ",
      "body": "濃厚鶏白湯、一度食べたらやみつきになるよ。今なら替え玉無料！",
      "cta": "場所をチェック",
      "hashtags": [],
      "register": "casual",
      "rationaleNotes": "Casual register for food category — friendly, appetizing, like a friend's recommendation. PAS framework: Problem (何食べよう implied), Agitate (appetite trigger via 濃厚鶏白湯 description), Solution (come try it). Soft LINE CTA per platform norms — no hard sell. No hashtags per LINE conventions. Under 50 chars for body to fit LINE message format."
    }
  ]
}`,
  }
}

// ===== User Message Builder =====

/**
 * Build the Copywriter agent user message with campaign-specific context.
 *
 * Formats upstream agent outputs and brief information into XML-tagged sections
 * for clear parsing by the Copywriter agent.
 */
export function buildCopywriterUserMessage(
  creativeDirection: CreativeDirectorOutput,
  strategicInsight: StrategicInsightOutput,
  brief: CopywriterBrief,
  brandProfile: CopywriterBrandProfile,
  platformConstraints: PlatformCopyConstraints[]
): string {
  const register = getRegisterForCategory(
    brief.registerOverride || brandProfile.defaultRegister || "standard"
  )

  const parts: string[] = []

  // Creative Direction section
  parts.push(`<creative_direction>
Concept: ${creativeDirection.concept || "Not specified"}
Visual concept: ${creativeDirection.visualConcept}
Copy direction: ${creativeDirection.copyDirection || "Follow strategic guidance"}
Mood keywords: ${creativeDirection.moodKeywords.join(", ")}
Platform adaptations:
${Object.entries(creativeDirection.platformAdaptations)
  .map(([platform, adaptation]) => `  - ${platform}: ${adaptation}`)
  .join("\n")}
</creative_direction>`)

  // Strategy section
  parts.push(`<strategy>
Framework: ${strategicInsight.copywritingFramework}
Framework rationale: ${strategicInsight.frameworkRationale || "Not specified"}
Awareness level: ${strategicInsight.awarenessLevel}
Key messages:
${strategicInsight.keyMessages.map((msg) => `  - ${msg}`).join("\n")}
Tonal guidance: ${strategicInsight.tonalGuidance}
Target insight: ${strategicInsight.targetInsight}
${strategicInsight.marketContext ? `Market context: ${strategicInsight.marketContext}` : ""}
</strategy>`)

  // Brief section
  parts.push(`<brief>
Brand name: ${brief.brandName}
${brief.productInfo ? `Product info: ${brief.productInfo}` : ""}
${brief.targetAudience ? `Target audience: ${brief.targetAudience}` : ""}
${brief.objective ? `Objective: ${brief.objective}` : ""}
Platforms: ${brief.platforms.join(", ")}
${brief.registerOverride ? `Register override: ${brief.registerOverride}` : ""}
${brief.creativeMoodTags && brief.creativeMoodTags.length > 0 ? `Mood tags: ${brief.creativeMoodTags.join(", ")}` : ""}
</brief>`)

  // Platform constraints section
  parts.push(`<platform_constraints>`)
  for (const constraint of platformConstraints) {
    parts.push(`--- ${constraint.platformId.toUpperCase()} ---
  Headline: max ${constraint.headline.maxChars} chars (${constraint.headline.label})
  Body: max ${constraint.body.maxChars} chars (${constraint.body.label})
  CTA: max ${constraint.cta.maxChars} chars (${constraint.cta.label})
  Hashtags: ${constraint.hashtags.required ? `${constraint.hashtags.max} required` : constraint.hashtags.max > 0 ? `max ${constraint.hashtags.max} optional` : "none"}`)
    if (constraint.formatNotes.length > 0) {
      parts.push(`  Notes:`)
      for (const note of constraint.formatNotes) {
        parts.push(`    - ${note}`)
      }
    }
  }
  parts.push(`</platform_constraints>`)

  // Instruction
  parts.push(`Generate 4 copy variants per platform. Apply the ${strategicInsight.copywritingFramework} framework. Use ${register} register throughout. Each variant must include rationaleNotes explaining your creative decisions.`)

  return parts.join("\n\n")
}

// ===== Tool Schema =====

/**
 * Tool schema for the Copywriter agent's deliver_platform_copy tool.
 * Forces structured output matching the CopywriterOutput interface.
 */
export const COPYWRITER_TOOL_SCHEMA: ToolSchema<CopywriterOutput> = {
  name: "deliver_platform_copy",
  description:
    "Deliver the generated Japanese advertising copy variants for all target platforms. Each variant includes platform-specific headline, body, CTA, hashtags, register, and rationale notes explaining creative decisions.",
  input_schema: {
    type: "object",
    properties: {
      variants: {
        type: "array",
        description:
          "Array of copy variants. Generate exactly 4 variants (A案-D案) per target platform.",
        items: {
          type: "object",
          properties: {
            platform: {
              type: "string",
              description:
                'Target platform identifier (e.g., "line", "instagram", "x")',
            },
            variantLabel: {
              type: "string",
              description:
                'Variant label in Japanese: "A案", "B案", "C案", or "D案"',
            },
            headline: {
              type: "string",
              description:
                "Headline text in Japanese, within platform character limits",
            },
            body: {
              type: "string",
              description:
                "Body text in Japanese, within platform character limits",
            },
            cta: {
              type: "string",
              description:
                "Call-to-action text in Japanese, within platform character limits",
            },
            hashtags: {
              type: "array",
              description:
                "Hashtags array (Japanese + English mix). Empty array for platforms that do not use hashtags (e.g., LINE).",
              items: {
                type: "string",
              },
            },
            register: {
              type: "string",
              description:
                'Keigo register used: "casual", "standard", or "formal"',
            },
            rationaleNotes: {
              type: "string",
              description:
                "English explanation of creative decisions: register choice, CTA style, key word decisions, and framework application. Minimum 20 characters.",
              minLength: 20,
            },
          },
          required: [
            "platform",
            "variantLabel",
            "headline",
            "body",
            "cta",
            "hashtags",
            "register",
            "rationaleNotes",
          ],
        },
      },
    },
    required: ["variants"],
  },
}
