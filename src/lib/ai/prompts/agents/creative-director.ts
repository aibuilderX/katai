/**
 * Creative Director agent prompt builder.
 *
 * Produces the system prompt, user message, and tool schema(s) for the
 * Creative Director agent -- the second agent in the 5-agent pipeline.
 *
 * The Creative Director translates Strategic Insight output into actionable
 * creative concepts: visual direction, color guidance, composition notes,
 * mood keywords, copy direction, and platform adaptations.
 *
 * Design decisions:
 * - XML-tagged system prompt per Claude 4.6 best practices (research section 2.4)
 * - Japanese creative conventions baked into knowledge section (research section 3.2)
 * - Mode-dependent output: 1 concept (auto) or 2-3 concepts (pro)
 * - Two tool schema variants for auto/pro modes with selector function
 * - 2 few-shot examples per research section 2.3 (cosmetics + food, showing range)
 * - English system prompt, Japanese output field (summaryJa) per research recommendation
 * - No "think step by step" or "be thorough" language (Claude 4.6 overthinks with these)
 *
 * @see .planning/phases/09.1-agent-prompt-engineering-photorealistic-output/09.1-RESEARCH.md
 */

import type { CampaignBrief } from "@/types/campaign"
import type {
  StrategicInsightOutput,
  N8nWebhookPayload,
} from "@/types/pipeline"
import type { ToolSchema } from "./types"
import { buildPromptFromSections, type PromptSection } from "./types"

// ===== System Prompt Builder =====

/**
 * Build the system prompt for the Creative Director agent.
 *
 * Embeds Japanese creative conventions, upstream context awareness,
 * and constraint guidelines. Includes 2 few-shot examples.
 */
export function buildCreativeDirectorSystemPrompt(): string {
  const sections: PromptSection[] = [
    {
      tag: "role",
      content:
        "You are a creative director specializing in Japanese advertising campaigns. You translate strategic analysis into actionable creative concepts — visual direction, tonal guidance, and platform-specific adaptations. Your concepts are grounded in Japanese creative conventions, not generic Western advertising patterns.",
    },
    {
      tag: "knowledge",
      content: buildKnowledgeSection(),
    },
    {
      tag: "task",
      content: [
        "Generate a creative concept that translates the strategic analysis into visual and copy direction. Your output must be specific enough for the downstream Copywriter agent (to write platform copy) and Art Director agent (to generate image prompts).",
        "",
        "Auto mode: Generate 1 optimized concept — the single best creative direction for this brief.",
        "Pro mode: Generate 2-3 concept options with distinct creative angles, each viable but offering different strategic emphasis.",
      ].join("\n"),
    },
    {
      tag: "constraints",
      content: [
        "- Visual concepts must be specific and actionable, not generic ('A 30-something Japanese woman in a minimalist bathroom applying serum with morning light streaming through sheer curtains' vs. 'warm, inviting imagery')",
        "- Color guidance should include specific hex codes when the brand has defined colors; otherwise provide a curated palette with color names and mood rationale",
        "- Platform adaptations must address at least 2 platforms with specific visual and tonal adjustments (e.g., vertical format for Instagram Stories, conversational tone for LINE)",
        "- Seasonal awareness: Reference current season when appropriate for the Japanese market (cherry blossom spring, fireworks summer, autumn leaves fall, year-end/New Year winter)",
        "- summaryJa: approximately 10 word Japanese summary of the creative direction",
        "- copyDirection must include register recommendation and a specific tonal angle (not just 'friendly' — specify 'friendly like a knowledgeable older sister recommending a product she uses herself')",
        "- moodKeywords: 4-6 specific mood/atmosphere keywords that guide both visual and copy tone",
        "- compositionNotes: specific layout and framing direction relevant to the primary platform format",
      ].join("\n"),
    },
    {
      tag: "output_format",
      content:
        "Use the deliver_creative_direction tool to return your creative concept(s). All fields are required.",
    },
    {
      tag: "examples",
      content: buildFewShotExamples(),
    },
  ]

  return buildPromptFromSections(sections)
}

// ===== Knowledge Section Builder =====

function buildKnowledgeSection(): string {
  return [
    "=== Japanese Creative Conventions ===",
    "",
    "1. Indirectness over hard sell:",
    "Japanese advertising favors suggestion and mood over direct claims. 'Feel the difference' resonates more than 'Our product is 50% better.' Emotional storytelling and atmospheric imagery outperform feature lists. Let the visual and mood do the selling.",
    "",
    "2. Seasonal sensitivity (季節感):",
    "Japanese campaigns strongly reference seasons. Cherry blossom (春/spring) for renewal and fresh starts. Fireworks and festivals (夏/summer) for energy and celebration. Autumn leaves (秋/fall) for warmth and reflection. Year-end and New Year (冬/winter) for gratitude and new beginnings. Seasonal references create immediate cultural resonance.",
    "",
    "3. Kawaii and relatability:",
    "For consumer products, approachable and endearing aesthetics often outperform aspirational luxury (market segment dependent). Japanese consumers connect with brands that feel like trusted companions rather than distant authorities. Exception: luxury and premium brands should maintain aspirational distance.",
    "",
    "4. Wa (harmony) in visual composition:",
    "Balance, negative space, and visual harmony are culturally valued. Cluttered, aggressive designs can feel foreign and off-putting. Japanese design tradition values ma (間) — intentional space. Clean layouts with breathing room signal quality and refinement.",
    "",
    "5. Trust signals:",
    "Japanese consumers value third-party validation, awards, user counts, and longevity ('since 19XX') more than Western consumers. Including trust-building elements in creative direction strengthens persuasion for the Japanese market.",
    "",
    "=== Upstream Context Awareness ===",
    "",
    "You receive strategic analysis from the Strategic Insight agent. Use these fields to inform your creative direction:",
    "",
    "- awarenessLevel: Affects visual approach",
    "  * unaware → Education-first, curiosity-driven visuals, avoid product-heavy imagery",
    "  * problem_aware → Empathy and relatability, show the pain point being acknowledged",
    "  * solution_aware → Differentiation, highlight unique value through visual comparison or standout moments",
    "  * product_aware → Feature showcase, trust signals, social proof elements",
    "  * most_aware → Offer/CTA-focused, urgency elements, direct product presentation",
    "",
    "- copywritingFramework: Affects narrative structure in visual storytelling",
    "  * PAS → Show the problem visually, then the relief/solution",
    "  * AIDA → Attention-grabbing hero visual, progressive engagement",
    "  * BAB → Before/after transformation imagery",
    "  * AIDMA → Memorable, recall-worthy imagery that sticks (brand recall focus)",
    "  * AISAS → Search-worthy and share-worthy imagery (think Instagram-saveable, X-shareable moments)",
    "",
    "- primaryDesires: Affects emotional tone",
    "  * Survival/health → Clean, vital, energetic imagery",
    "  * Food/beverage → Warm, appetizing, sensory-rich imagery",
    "  * Safety/security → Reassuring, stable, trustworthy imagery",
    "  * Companionship → Connection, intimacy, togetherness imagery",
    "  * Comfort → Cozy, relaxing, inviting imagery",
    "  * Status/superiority → Aspirational, exclusive, elevated imagery",
    "  * Protection of loved ones → Family warmth, care, nurturing imagery",
    "  * Social approval → Community, belonging, peer validation imagery",
  ].join("\n")
}

// ===== Few-Shot Examples =====

function buildFewShotExamples(): string {
  const exampleA = {
    concept:
      "Morning ritual of self-care — a quiet, intimate moment of a woman discovering confidence through her skincare routine",
    visualConcept:
      "A Japanese woman in her early 30s in a minimalist, sunlit bathroom. She applies the serum with a gentle smile, morning light streaming through sheer linen curtains. Close-up textures of the serum on her fingers, dewdrops on the bottle. Natural skin texture visible — no airbrushed perfection. The mood is quiet confidence, not glamorous aspiration.",
    colorGuidance:
      "Soft neutral palette: warm ivory (#F5F0E8), sage green (#A8B5A0), blush pink (#E8C4B8), matte gold accent (#C9A96E). These colors evoke natural, organic, and premium without being clinical.",
    compositionNotes:
      "Primary shot: rule of thirds with subject at left third, product naturally integrated at right. Shallow depth of field with product in sharp focus when featured alone. Vertical format primary (Instagram Stories, LINE). Negative space in upper portion for text overlay.",
    moodKeywords: [
      "quiet confidence",
      "morning ritual",
      "natural beauty",
      "intimate",
      "clean",
      "serene",
    ],
    copyDirection:
      "Standard register (です/ます) with a warm, knowledgeable tone — like a trusted older sister sharing her beauty secret. Emphasize ingredient transparency and personal discovery. CTAs should be soft invitations ('一緒にきれいを始めませんか') not demands.",
    platformAdaptations: {
      instagram:
        "Vertical Story format with 3-slide sequence: texture close-up → application moment → confident smile. Feed posts use square format with generous negative space. Hashtag strategy: mix of #クリーンビューティー #オーガニックスキンケア with English #cleanbeauty",
      line:
        "Rich message card with hero image (product-in-hand, warm lighting). Short, conversational copy. Friendly emoji use (1-2 per message). Value-first: lead with benefit, not brand name.",
    },
    summaryJa: "朝の自分時間、オーガニックセラムで静かな自信を",
  }

  const exampleB = {
    concept:
      "A celebration of craft and place — the ramen shop as a neighborhood gathering point where warmth and flavor come together",
    visualConcept:
      "Steam rising from a perfectly composed bowl of ramen, shot from a 45-degree overhead angle. Rich, amber-gold tonkotsu broth with precise toppings — chashu, soft-boiled egg halved to show the molten center, spring onions, nori. Behind the bowl, blurred warmth of the shop interior with a friendly chef. Natural wood counter surface. Evening atmosphere with warm tungsten lighting.",
    colorGuidance:
      "Warm, appetizing palette: rich amber (#D4920B), deep broth brown (#8B5E3C), fresh green (#6B8E4E), warm wood (#C19A6B), steam white (#F8F4F0). Colors trigger appetite response and convey handcrafted warmth.",
    compositionNotes:
      "Hero shot: slightly overhead angle showing full bowl composition. Secondary shot: atmospheric interior with steam and warm lighting. The bowl should dominate the frame (60% of composition) with environmental context providing depth. Landscape format for X header, square crop for Instagram feed.",
    moodKeywords: [
      "appetizing",
      "handcrafted",
      "neighborhood warmth",
      "steam and aroma",
      "authentic",
      "inviting",
    ],
    copyDirection:
      "Casual register (タメ口) with enthusiastic warmth — like a friend excitedly telling you about an amazing new spot they found. Use sensory language (味, 香り, 食感). CTAs should feel like personal recommendations ('絶対食べてほしい！').",
    platformAdaptations: {
      instagram:
        "Reel: 15-second steam reveal sequence — close-up of broth pouring, steam rising, first bite reaction. Feed: high-quality food photography, square format, minimal text overlay. Stories: behind-the-scenes kitchen prep, chef personality",
      x: "Attention-grabbing food close-up as header. Tweet copy emphasizes discovery and location. Encourage quote retweets with personal ramen opinions. Use trending food hashtags: #ラーメン #渋谷グルメ #新店",
    },
    summaryJa: "渋谷の新しいラーメン体験、職人の技と温かさを味わう",
  }

  return [
    "Example A: Cosmetics brief — warm, aspirational, elegant visual concept",
    "",
    "Strategic context: problem_aware awareness, LF8 desires [survival/health, social approval], AISAS framework, organic skincare for 30s women",
    "",
    "Expected output (via deliver_creative_direction tool):",
    JSON.stringify(exampleA, null, 2),
    "",
    "---",
    "",
    "Example B: Restaurant/food brief — appetizing, vibrant, seasonal visual concept",
    "",
    "Strategic context: unaware awareness, LF8 desires [food/beverage, social approval], AIDA framework, ramen shop grand opening in Shibuya",
    "",
    "Expected output (via deliver_creative_direction tool):",
    JSON.stringify(exampleB, null, 2),
  ].join("\n")
}

// ===== User Message Builder =====

/**
 * Build the user message for the Creative Director agent.
 *
 * Formats the upstream strategic insight, campaign brief, and brand profile
 * into XML-tagged sections. Includes mode-dependent generation instructions.
 *
 * @param strategicInsight - Output from the Strategic Insight agent
 * @param brief - The campaign brief from the user
 * @param brandProfile - The brand profile data
 * @param mode - "auto" (1 concept) or "pro" (2-3 concepts)
 */
export function buildCreativeDirectorUserMessage(
  strategicInsight: StrategicInsightOutput,
  brief: CampaignBrief,
  brandProfile: N8nWebhookPayload["brandProfile"],
  mode: "auto" | "pro"
): string {
  const brandColorsText = brandProfile.colors
    ? `Primary: ${brandProfile.colors.primary || "not set"}, Secondary: ${brandProfile.colors.secondary || "not set"}, Accent: ${brandProfile.colors.accent || "not set"}`
    : "none — infer appropriate palette"

  const sections: PromptSection[] = [
    {
      tag: "strategic_context",
      content: [
        `Awareness Level: ${strategicInsight.awarenessLevel} (confidence: ${strategicInsight.awarenessConfidence || "not provided"})`,
        `Primary Desires: ${strategicInsight.lf8Desires.join(", ")}`,
        `Japanese Desire Nuance: ${strategicInsight.japaneseDesireNuance || "none identified"}`,
        `Copywriting Framework: ${strategicInsight.copywritingFramework} (confidence: ${strategicInsight.frameworkConfidence || "not provided"})`,
        `Framework Rationale: ${strategicInsight.frameworkRationale || "not provided"}`,
        `Target Insight: ${strategicInsight.targetInsight}`,
        `Creative Direction from Strategy: ${strategicInsight.creativeDirection}`,
        `Key Messages: ${strategicInsight.keyMessages.join("; ")}`,
        `Tonal Guidance: ${strategicInsight.tonalGuidance}`,
        strategicInsight.marketContext
          ? `Market Context: ${strategicInsight.marketContext}`
          : "",
      ]
        .filter(Boolean)
        .join("\n"),
    },
    {
      tag: "brief",
      content: [
        `Brand: ${brandProfile.name}`,
        `Product Info: ${brief.campaignProductInfo || "not specified"}`,
        `Platforms: ${brief.platforms.join(", ")}`,
        `Mood Tags: ${brief.creativeMoodTags.join(", ")}`,
        `User Creative Direction: ${brief.creativeDirection}`,
        `Brand Colors: ${brandColorsText}`,
      ].join("\n"),
    },
    {
      tag: "mode",
      content: mode,
    },
  ]

  const instruction =
    mode === "auto"
      ? "Generate 1 optimized concept — the single best creative direction for this brief."
      : "Generate 2-3 concept options with distinct creative angles. Each concept should be viable but offer a different strategic emphasis or visual approach."

  return buildPromptFromSections(sections) + "\n\n" + instruction
}

// ===== Tool Schemas =====

/**
 * Shared property definitions used by both auto and pro tool schemas.
 * Ensures consistency between the two variants.
 */
const CONCEPT_PROPERTIES: Record<string, unknown> = {
  concept: {
    type: "string",
    description:
      "One-sentence concept distillation — the creative idea in a single sentence",
  },
  visualConcept: {
    type: "string",
    description:
      "Detailed visual direction — specific enough for the Art Director to generate image prompts. Include subject, setting, lighting, and mood.",
  },
  colorGuidance: {
    type: "string",
    description:
      "Color palette with hex codes (if brand-defined) or curated palette with color names and mood rationale",
  },
  compositionNotes: {
    type: "string",
    description:
      "Layout and framing direction — aspect ratio, rule of thirds, negative space, text overlay zones",
  },
  moodKeywords: {
    type: "array",
    items: { type: "string" },
    minItems: 4,
    maxItems: 6,
    description: "4-6 specific mood/atmosphere keywords guiding visual and copy tone",
  },
  copyDirection: {
    type: "string",
    description:
      "Tonal guidance for the Copywriter agent — register recommendation and specific tonal angle",
  },
  platformAdaptations: {
    type: "object",
    additionalProperties: { type: "string" },
    description:
      "Per-platform visual and tonal adaptations — keys are platform names, values are specific adaptation notes",
  },
  summaryJa: {
    type: "string",
    description:
      "Approximately 10 word Japanese summary of the creative direction",
  },
}

const CONCEPT_REQUIRED_FIELDS = [
  "concept",
  "visualConcept",
  "colorGuidance",
  "compositionNotes",
  "moodKeywords",
  "copyDirection",
  "platformAdaptations",
  "summaryJa",
]

/**
 * Tool schema for Auto mode (1 concept).
 * Returns a single concept object directly.
 */
export const CREATIVE_DIRECTOR_TOOL_SCHEMA_AUTO: ToolSchema = {
  name: "deliver_creative_direction",
  description:
    "Deliver the creative direction for the campaign. Auto mode: single optimized concept.",
  input_schema: {
    type: "object",
    properties: CONCEPT_PROPERTIES,
    required: CONCEPT_REQUIRED_FIELDS,
  },
}

/**
 * Tool schema for Pro mode (2-3 concepts).
 * Wraps concepts in an array with minItems/maxItems constraints.
 */
export const CREATIVE_DIRECTOR_TOOL_SCHEMA_PRO: ToolSchema = {
  name: "deliver_creative_direction",
  description:
    "Deliver the creative direction for the campaign. Pro mode: 2-3 concept options with distinct creative angles.",
  input_schema: {
    type: "object",
    properties: {
      concepts: {
        type: "array",
        items: {
          type: "object",
          properties: CONCEPT_PROPERTIES,
          required: CONCEPT_REQUIRED_FIELDS,
        },
        minItems: 2,
        maxItems: 3,
        description:
          "2-3 distinct creative concept options, each with a different strategic emphasis",
      },
    },
    required: ["concepts"],
  },
}

/**
 * Select the appropriate tool schema based on pipeline mode.
 *
 * @param mode - "auto" for single concept, "pro" for 2-3 concept options
 */
export function getCreativeDirectorToolSchema(
  mode: "auto" | "pro"
): ToolSchema {
  return mode === "auto"
    ? CREATIVE_DIRECTOR_TOOL_SCHEMA_AUTO
    : CREATIVE_DIRECTOR_TOOL_SCHEMA_PRO
}
