/**
 * Shared framework definitions for the 5-agent prompt engineering system.
 *
 * Centralizes classification frameworks used by Strategic Insight agent and
 * referenced by downstream agents (Creative Director, Copywriter, Art Director,
 * JP Localization). Exportable constants prevent duplication across prompts.
 *
 * Frameworks:
 * - Schwartz Awareness Levels (5 stages, universal)
 * - LF8 Life Force 8 Desires (8 hardwired desires, Whitman)
 * - Japanese Desire Nuances (3 cultural overlays from Dentsu research)
 * - Copywriting Frameworks (PAS, AIDA, BAB, AIDMA, AISAS)
 *
 * @see .planning/phases/09.1-agent-prompt-engineering-photorealistic-output/09.1-RESEARCH.md
 */

// ===== Types =====

export interface AwarenessLevel {
  id: "unaware" | "problem_aware" | "solution_aware" | "product_aware" | "most_aware"
  label: string
  labelJa: string
  description: string
  downstreamImplication: string
}

export interface Lf8Desire {
  id: number
  name: string
  nameJa: string
  description: string
}

export interface JapaneseDesireNuance {
  id: "wa" | "bi_ishiki" | "anshin"
  name: string
  nameJa: string
  description: string
  relatedLf8Ids: number[]
}

export interface CopywritingFramework {
  id: "PAS" | "AIDA" | "BAB" | "AIDMA" | "AISAS"
  name: string
  nameJa: string
  description: string
  bestFor: string
  structure: string[]
}

// ===== Schwartz Awareness Levels =====

/**
 * Eugene Schwartz's 5 Stages of Awareness from "Breakthrough Advertising" (1966).
 * Universal and not culture-specific. Each stage describes a prospect's cognitive
 * state relative to a product.
 *
 * The `downstreamImplication` field guides Creative Director and Copywriter
 * on how to adjust their output based on the classified awareness level.
 */
export const SCHWARTZ_AWARENESS_LEVELS: readonly AwarenessLevel[] = [
  {
    id: "unaware",
    label: "Unaware",
    labelJa: "無自覚",
    description:
      "The prospect does not know they have a problem or need. They are not searching for a solution and may not recognize the product category.",
    downstreamImplication:
      "Education-first creative. Lead with problem identification and emotional resonance. Avoid product-specific language. Creative Director should use curiosity and relatability. Copywriter should use storytelling and problem awareness hooks.",
  },
  {
    id: "problem_aware",
    label: "Problem Aware",
    labelJa: "問題認識",
    description:
      "The prospect knows they have a problem but does not know solutions exist. They feel the pain point but have not started searching.",
    downstreamImplication:
      "Problem-agitation creative. Amplify the pain point and introduce the possibility of a solution. Creative Director should use empathy-driven visuals. Copywriter should validate the problem before hinting at solutions.",
  },
  {
    id: "solution_aware",
    label: "Solution Aware",
    labelJa: "解決策認識",
    description:
      "The prospect knows solutions exist but does not know this specific product. They may be comparing alternatives or exploring options.",
    downstreamImplication:
      "Differentiation creative. Highlight what makes this product unique versus alternatives. Creative Director should emphasize unique value propositions visually. Copywriter should use comparison framing and benefit stacking.",
  },
  {
    id: "product_aware",
    label: "Product Aware",
    labelJa: "商品認識",
    description:
      "The prospect knows this product but has not yet purchased. They may be evaluating, hesitant, or waiting for the right moment.",
    downstreamImplication:
      "Trust-building creative. Provide social proof, testimonials, limited-time offers, and risk reduction. Creative Director should use trust signals and credibility visuals. Copywriter should address objections and reduce purchase friction.",
  },
  {
    id: "most_aware",
    label: "Most Aware",
    labelJa: "最高認識",
    description:
      "The prospect knows the product well and is ready to buy. They just need a final push — a deal, reminder, or urgency trigger.",
    downstreamImplication:
      "Offer/CTA-focused creative. Lead with deals, urgency, and clear calls-to-action. Creative Director should use direct, action-oriented visuals. Copywriter should use strong CTAs, limited-time framing, and minimal educational content.",
  },
] as const

// ===== LF8 Life Force 8 Desires =====

/**
 * Drew Eric Whitman's Life Force 8 from "Ca$hvertising".
 * Eight hardwired human desires that drive consumer behavior.
 * Universal across cultures but supplemented with Japanese cultural overlays
 * via JAPANESE_DESIRE_NUANCES.
 */
export const LF8_DESIRES: readonly Lf8Desire[] = [
  {
    id: 1,
    name: "Survival, enjoyment of life, life extension",
    nameJa: "生存・人生の楽しみ・寿命の延長",
    description:
      "The fundamental desire to survive, enjoy life, and live longer. Drives health, wellness, and lifestyle product purchases.",
  },
  {
    id: 2,
    name: "Enjoyment of food and beverages",
    nameJa: "食べ物と飲み物の楽しみ",
    description:
      "The desire for delicious food and drink experiences. Drives food, restaurant, beverage, and culinary product purchases.",
  },
  {
    id: 3,
    name: "Freedom from fear, pain, and danger",
    nameJa: "恐怖・苦痛・危険からの解放",
    description:
      "The desire for safety, security, and freedom from threats. Drives insurance, security, health, and safety product purchases.",
  },
  {
    id: 4,
    name: "Sexual companionship",
    nameJa: "性的パートナーシップ",
    description:
      "The desire for romantic and sexual connection. Drives fashion, beauty, dating, and personal care product purchases.",
  },
  {
    id: 5,
    name: "Comfortable living conditions",
    nameJa: "快適な生活環境",
    description:
      "The desire for physical comfort, convenience, and pleasant surroundings. Drives home, furniture, technology, and lifestyle product purchases.",
  },
  {
    id: 6,
    name: "Superiority, winning, keeping up",
    nameJa: "優越感・勝利・競争",
    description:
      "The desire to be better than others, to succeed, and to keep up with peers. Drives luxury, education, career, and status product purchases.",
  },
  {
    id: 7,
    name: "Care and protection of loved ones",
    nameJa: "愛する人の保護",
    description:
      "The desire to protect and provide for family and loved ones. Drives family, children, pet, insurance, and safety product purchases.",
  },
  {
    id: 8,
    name: "Social approval",
    nameJa: "社会的承認",
    description:
      "The desire to be liked, accepted, and respected by others. Drives fashion, beauty, social media, and personal brand product purchases.",
  },
] as const

// ===== Japanese Desire Nuances =====

/**
 * Three Japanese cultural overlays that supplement LF8 desires.
 * Derived from Dentsu DESIRE DESIGN research and Japanese consumer
 * psychology studies. These capture desire dimensions that LF8 misses
 * or underweights for the Japanese market.
 */
export const JAPANESE_DESIRE_NUANCES: readonly JapaneseDesireNuance[] = [
  {
    id: "wa",
    name: "Social Harmony",
    nameJa: "和・調和",
    description:
      "Goes beyond LF8's social approval. In Japan, not standing out negatively is as important as being positively approved. The desire for group harmony, fitting in appropriately, and maintaining social balance. Drives choices that demonstrate consideration for others and social awareness.",
    relatedLf8Ids: [8],
  },
  {
    id: "bi_ishiki",
    name: "Aesthetic Refinement",
    nameJa: "美意識",
    description:
      "Japanese consumer culture places elevated importance on aesthetics, craftsmanship, attention to detail, and the pursuit of refined beauty. This goes beyond comfortable living and status — it is an intrinsic appreciation for quality and artistry. Drives premium product choices, packaging expectations, and brand presentation standards.",
    relatedLf8Ids: [5, 6],
  },
  {
    id: "anshin",
    name: "Security and Reliability",
    nameJa: "安心・安全",
    description:
      "Stronger emphasis than LF8's freedom from fear. Japanese consumers prioritize brand reliability, safety signals, proven track records, and institutional trust. The desire for anshin (peace of mind) drives preference for established brands, certifications, user reviews, and longevity claims.",
    relatedLf8Ids: [3],
  },
] as const

// ===== Copywriting Frameworks =====

/**
 * Five copywriting frameworks for the Strategic Insight agent to select from.
 * Includes traditional Western frameworks (PAS, AIDA, BAB) and Japanese-market
 * frameworks (AIDMA, AISAS). SB7 StoryBrand was dropped — it is narrative-focused
 * and poorly suited for short-form platform-specific advertising copy.
 */
export const COPYWRITING_FRAMEWORKS: readonly CopywritingFramework[] = [
  {
    id: "PAS",
    name: "Problem-Agitation-Solution",
    nameJa: "問題・煽り・解決",
    description:
      "Identifies a pain point, amplifies the emotional impact, then presents the product as the solution. Most effective for pain-point-driven products where the audience has a clear problem.",
    bestFor:
      "Pain-point products, health/wellness, problem-solving services, insurance, security products",
    structure: ["Problem", "Agitation", "Solution"],
  },
  {
    id: "AIDA",
    name: "Attention-Interest-Desire-Action",
    nameJa: "注意・興味・欲求・行動",
    description:
      "The classic advertising framework. Grabs attention, builds interest with features/benefits, creates desire through emotional appeal, then drives action with a CTA. Works broadly across product types.",
    bestFor:
      "General awareness campaigns, new product launches, broad audience targeting, e-commerce",
    structure: ["Attention", "Interest", "Desire", "Action"],
  },
  {
    id: "BAB",
    name: "Before-After-Bridge",
    nameJa: "ビフォー・アフター・ブリッジ",
    description:
      "Paints the current situation (before), shows the desired outcome (after), then positions the product as the bridge between them. Highly effective for transformation-focused messaging.",
    bestFor:
      "Transformation products, coaching/courses, beauty/fitness, lifestyle improvements, personal services",
    structure: ["Before", "After", "Bridge"],
  },
  {
    id: "AIDMA",
    name: "Attention-Interest-Desire-Memory-Action",
    nameJa: "注意・興味・欲求・記憶・行動",
    description:
      "The dominant traditional advertising model in Japan. Adds Memory between Desire and Action, reflecting the Japanese consumer pattern of building trust through repeated exposure before purchasing. Critical for brand recall campaigns.",
    bestFor:
      "Traditional Japanese campaigns, brand recall, TV/print cross-media, luxury products, repeat-purchase categories",
    structure: ["Attention", "Interest", "Desire", "Memory", "Action"],
  },
  {
    id: "AISAS",
    name: "Attention-Interest-Search-Action-Share",
    nameJa: "注意・興味・検索・行動・共有",
    description:
      "Created by Dentsu in 2005 for the digital era. Replaces passive Desire-Memory with Search-Share, reflecting Japanese consumers' intense pre-purchase research behavior and post-purchase sharing (especially on X/Twitter Japan). The standard digital marketing framework in Japan.",
    bestFor:
      "Digital Japanese campaigns, social media marketing, e-commerce, products with strong word-of-mouth potential, youth-targeted campaigns",
    structure: ["Attention", "Interest", "Search", "Action", "Share"],
  },
] as const
