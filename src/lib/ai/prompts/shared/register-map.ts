/**
 * Product category to keigo register mapping for the Copywriter agent.
 *
 * Maps product categories to recommended Japanese register levels based on
 * Japanese advertising norms research (section 4.1 of RESEARCH.md).
 * The Copywriter prompt uses this as a lookup table; brief.registerOverride
 * takes precedence when set.
 *
 * Register levels:
 * - "casual" (タメ口): Friendly, no keigo
 * - "standard" (です/ます): Polite, professional
 * - "formal" (尊敬語/謙譲語): Honorific, premium
 *
 * @see .planning/phases/09.1-agent-prompt-engineering-photorealistic-output/09.1-RESEARCH.md#4.1
 */

// ===== Types =====

export type RegisterLevel = "casual" | "standard" | "formal"

export interface RegisterRecommendation {
  category: string
  recommendedRegister: RegisterLevel
  registerRange: [RegisterLevel, RegisterLevel]
  rationale: string
  rationaleJa: string
}

// ===== Register by Category Mapping =====

/**
 * Maps product category strings to register recommendations.
 * Covers 8 product categories identified in research.
 */
export const REGISTER_BY_CATEGORY: Record<string, RegisterRecommendation> = {
  cosmetics: {
    category: "cosmetics",
    recommendedRegister: "standard",
    registerRange: ["standard", "formal"],
    rationale:
      "Cosmetics and beauty products require a premium feel with trust and sophistication. Standard register provides warmth while maintaining professionalism. Formal register for luxury/premium lines.",
    rationaleJa:
      "化粧品は信頼感と上品さが求められる。標準語（です/ます）で温かみと専門性を両立。高級ラインには敬語を推奨。",
  },
  food: {
    category: "food",
    recommendedRegister: "casual",
    registerRange: ["casual", "standard"],
    rationale:
      "Food and restaurant advertising benefits from warmth and approachability. Casual register creates appetite appeal and friendly invitation. Standard for more upscale dining.",
    rationaleJa:
      "飲食店・食品広告は親しみやすさと食欲訴求が重要。カジュアル（タメ口）で友達のような自然な誘い。高級店には標準語。",
  },
  fashion: {
    category: "fashion",
    recommendedRegister: "casual",
    registerRange: ["casual", "standard"],
    rationale:
      "Fashion advertising is trend-driven, targeting younger audiences who value relatability. Casual register matches the aspirational-yet-accessible tone of Japanese fashion marketing.",
    rationaleJa:
      "ファッション広告はトレンド重視で若年層向け。カジュアルな語り口が親近感と共感を生む。ビジネスファッションには標準語。",
  },
  personal_service: {
    category: "personal_service",
    recommendedRegister: "standard",
    registerRange: ["standard", "standard"],
    rationale:
      "Personal services (salons, spas, coaching) need a balance of professional trust and warmth. Standard register achieves this — professional enough to be credible, warm enough to be inviting.",
    rationaleJa:
      "パーソナルサービス（サロン、スパ等）は信頼感と温かみのバランスが重要。標準語（です/ます）で専門性と親しみを両立。",
  },
  online_course: {
    category: "online_course",
    recommendedRegister: "standard",
    registerRange: ["standard", "formal"],
    rationale:
      "Online courses and coaching need to signal authority and expertise. Standard register conveys professionalism; formal register for executive/corporate programs.",
    rationaleJa:
      "オンライン講座は権威性と専門性が必要。標準語で信頼感を確保。法人向け・エグゼクティブ向けには敬語を推奨。",
  },
  tech: {
    category: "tech",
    recommendedRegister: "standard",
    registerRange: ["standard", "standard"],
    rationale:
      "Tech and electronics advertising requires reliability, precision, and trust signaling. Standard register communicates competence without being stiff.",
    rationaleJa:
      "テクノロジー・電子機器は正確性と信頼性が重要。標準語（です/ます）で安心感と専門性を表現。",
  },
  luxury: {
    category: "luxury",
    recommendedRegister: "formal",
    registerRange: ["formal", "formal"],
    rationale:
      "Luxury products demand formal register to convey exclusivity, premium positioning, and respect for the customer. Honorific language is expected in Japanese luxury advertising.",
    rationaleJa:
      "ラグジュアリー製品は尊敬語・謙譲語による格式と特別感が不可欠。高級ブランドとして顧客への敬意を表現。",
  },
  kids_family: {
    category: "kids_family",
    recommendedRegister: "casual",
    registerRange: ["casual", "casual"],
    rationale:
      "Kids and family products need warmth, fun, and approachability. Casual register creates a friendly, accessible tone that parents and families respond to.",
    rationaleJa:
      "子供・ファミリー向け商品は温かみと楽しさが重要。カジュアルな語り口で親しみやすく、家族に響くトーンを実現。",
  },
} as const

// ===== Helper Function =====

/**
 * Returns the recommended register for a given product category.
 *
 * @param category - Product category string (e.g., "cosmetics", "food")
 * @param override - Optional register override from brief.registerOverride
 * @returns The register to use: override if provided, category recommendation, or "standard" for unknown categories
 */
export function getRegisterForCategory(
  category: string,
  override?: string
): RegisterLevel {
  if (
    override &&
    (override === "casual" || override === "standard" || override === "formal")
  ) {
    return override
  }

  const recommendation = REGISTER_BY_CATEGORY[category.toLowerCase()]
  if (recommendation) {
    return recommendation.recommendedRegister
  }

  // Default to standard for unknown categories
  return "standard"
}
