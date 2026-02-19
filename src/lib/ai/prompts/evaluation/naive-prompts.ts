/**
 * Naive prompt baselines for A/B comparison with optimized prompts.
 *
 * These represent Phase 9 default prompts BEFORE optimization. They are
 * intentionally simple, generic LLM prompts without:
 * - XML-tagged prompt structure
 * - Framework-specific knowledge (Schwartz, LF8, AIDMA/AISAS)
 * - Few-shot examples
 * - Camera/lens/lighting specifications
 * - Self-critique checklists
 * - Japanese advertising conventions
 * - Platform-specific norms
 * - Register-by-category mapping
 *
 * The Copywriter and Art Director naive prompts mirror the actual v1.0 code
 * from copy-generation.ts and image-generation.ts respectively.
 *
 * NAIVE BASELINE -- for A/B comparison only. Not used in production pipeline.
 *
 * @see .planning/phases/09.1-agent-prompt-engineering-photorealistic-output/09.1-RESEARCH.md#8
 */

import type { CampaignBrief } from "@/types/campaign"
import type { N8nWebhookPayload } from "@/types/pipeline"

// ===== Types for naive prompts =====

/**
 * Brand profile subset needed for naive prompts.
 * Matches the shape used in copy-generation.ts and image-generation.ts.
 */
interface NaiveBrandProfile {
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

interface NaiveImageBrandProfile {
  name: string
  colors?: { primary: string; secondary: string; accent: string; background: string } | null
  toneTags?: string[] | null
  targetMarket?: string | null
}

// ===== Naive Strategic Insight =====

/**
 * NAIVE BASELINE -- for A/B comparison only. Not used in production pipeline.
 *
 * Simple generic marketing analyst prompt without:
 * - Schwartz awareness level framework
 * - LF8 desire classification
 * - Japanese desire nuances (wa, bi_ishiki, anshin)
 * - AIDMA/AISAS Japanese frameworks
 * - Confidence scores
 * - XML-tagged structure
 * - Few-shot examples
 *
 * Returns { systemPrompt, userMessage } for the naive Strategic Insight agent.
 */
export function buildNaiveStrategicInsightPrompt(
  brief: CampaignBrief,
  brandProfile: N8nWebhookPayload["brandProfile"]
): { systemPrompt: string; userMessage: string } {
  const systemPrompt = `You are a marketing analyst. Analyze the following campaign brief and provide a strategic analysis. Include:
- Target audience awareness level
- Key consumer desires/motivations
- Recommended copywriting approach
- Target insight
- Creative direction
- Key messages
- Tone recommendation

Return your analysis as structured JSON.`

  const userMessage = `Campaign Brief:
Brand: ${brandProfile.name}
Objective: ${brief.objective}
Target Audience: ${brief.targetAudience}
Platforms: ${brief.platforms.join(", ")}
Product Info: ${brief.campaignProductInfo || "Not specified"}
Creative Direction: ${brief.creativeDirection}
Mood: ${brief.creativeMoodTags.join(", ")}

Analyze this brief and provide your strategic recommendations.`

  return { systemPrompt, userMessage }
}

// ===== Naive Creative Director =====

/**
 * NAIVE BASELINE -- for A/B comparison only. Not used in production pipeline.
 *
 * Simple generic creative director prompt without:
 * - Japanese creative conventions (indirectness, seasonal sensitivity, wa)
 * - Upstream context awareness (awareness level to visual approach mapping)
 * - Mode-dependent behavior (auto/pro)
 * - XML-tagged structure
 * - Few-shot examples
 * - Specific composition guidance
 *
 * Returns { systemPrompt, userMessage } for the naive Creative Director agent.
 */
export function buildNaiveCreativeDirectorPrompt(
  brief: CampaignBrief,
  brandProfile: N8nWebhookPayload["brandProfile"],
  strategicContext?: { targetInsight: string; creativeDirection: string }
): { systemPrompt: string; userMessage: string } {
  const systemPrompt = `You are a creative director. Generate a creative concept for an advertising campaign. Include:
- Visual concept description
- Color guidance
- Composition notes
- Mood keywords
- Copy direction
- Platform adaptations

Return your concept as structured JSON.`

  const userMessage = `Campaign Brief:
Brand: ${brandProfile.name}
Objective: ${brief.objective}
Target Audience: ${brief.targetAudience}
Platforms: ${brief.platforms.join(", ")}
Product Info: ${brief.campaignProductInfo || "Not specified"}
Creative Direction: ${brief.creativeDirection}
Mood: ${brief.creativeMoodTags.join(", ")}
${strategicContext ? `\nStrategic Insight: ${strategicContext.targetInsight}\nCreative Direction: ${strategicContext.creativeDirection}` : ""}

Generate a creative concept for this campaign.`

  return { systemPrompt, userMessage }
}

// ===== Naive Copywriter =====

/**
 * NAIVE BASELINE -- for A/B comparison only. Not used in production pipeline.
 *
 * Mirrors the actual v1.0 prompts from src/lib/ai/prompts/copy-generation.ts.
 * This IS the v1.0 prompt, serving as the baseline. The v1.0 prompt:
 * - Is entirely in Japanese (no English system prompt)
 * - Has register instructions but no category-based register mapping
 * - Has platform awareness but no platform-specific norms database
 * - Has no copywriting framework application (PAS/AIDA/BAB/AIDMA/AISAS)
 * - Has no upstream context parsing (strategic insight, creative direction)
 * - Has no rationale notes
 * - Has no few-shot examples
 *
 * Returns { systemPrompt, userMessage } for the naive Copywriter agent.
 */
export function buildNaiveCopywriterPrompt(
  brief: CampaignBrief,
  brand: NaiveBrandProfile
): { systemPrompt: string; userMessage: string } {
  // Mirror of copy-generation.ts buildSystemPrompt
  const systemParts: string[] = []

  systemParts.push(`あなたは日本の広告コピーライターです。日本市場向けの広告コピーを作成する専門家として、以下のブランドのためにコピーを生成してください。

【ブランド情報】
ブランド名: ${brand.name}`)

  if (brand.brandStory) {
    systemParts.push(`ブランドストーリー: ${brand.brandStory}`)
  }

  if (brand.brandValues && brand.brandValues.length > 0) {
    systemParts.push(`ブランドバリュー: ${brand.brandValues.join("、")}`)
  }

  if (brand.targetMarket) {
    systemParts.push(`ターゲット市場: ${brand.targetMarket}`)
  }

  if (brand.positioningStatement) {
    systemParts.push(`ポジショニング: ${brand.positioningStatement}`)
  }

  if (brand.productCatalog && brand.productCatalog.length > 0) {
    systemParts.push(`\n【商品カタログ】`)
    brand.productCatalog.forEach((product, i) => {
      systemParts.push(`${i + 1}. ${product.name}: ${product.description}`)
      if (product.keyFeatures.length > 0) {
        systemParts.push(`   特徴: ${product.keyFeatures.join("、")}`)
      }
      if (product.priceRange) {
        systemParts.push(`   価格帯: ${product.priceRange}`)
      }
    })
  }

  if (brand.toneTags && brand.toneTags.length > 0) {
    systemParts.push(`\nトーン: ${brand.toneTags.join("、")}`)
  }

  if (brand.toneDescription) {
    systemParts.push(`トーン詳細: ${brand.toneDescription}`)
  }

  systemParts.push(`
【日本語コピーライティング規則】
1. 三種混合文字の使い分け:
   - 漢字: 名詞、動詞の語幹に使用（読みやすさを優先し、難読漢字は避ける）
   - ひらがな: 助詞、活用語尾、やわらかい印象を与えたい場合に使用
   - カタカナ: 外来語、強調、ブランド固有の用語に使用

2. リズムと韻: 日本語の広告コピーは5-7音のリズムを意識する

3. 一貫性: 4つのバリエーション全体で敬語レベルを統一する。語尾の揺れは絶対に許されません。

4. 文化的配慮: 日本の広告慣行に従い、控えめな表現を心がける`)

  const systemPrompt = systemParts.join("\n")

  // Mirror of copy-generation.ts buildCopyPrompt
  const REGISTER_INSTRUCTIONS: Record<string, string> = {
    casual: `【敬語レベル: カジュアル（タメ口）】
あなたはフレンドリーで親しみやすい文体で書いてください。
- 語尾: だよ、だね、してみて、じゃん、ってば
- 敬語禁止: です/ます形は使わないでください
- 雰囲気: 友達に話しかけるような自然なトーン
- 絵文字やスラングは控えめに（広告であることを忘れずに）`,

    standard: `【敬語レベル: 標準（です/ます形）】
あなたは丁寧で信頼感のある文体で書いてください。
- 語尾: です、ます、ください、ません、でした、ました
- 丁寧語を基本とし、尊敬語・謙譲語は使わない
- 雰囲気: プロフェッショナルだが堅すぎない`,

    formal: `【敬語レベル: 敬語（尊敬語・謙譲語）】
あなたは格式高い文体で書いてください。
- 語尾: ございます、いたします、申し上げます、くださいませ、いただけます
- 尊敬語と謙譲語を適切に使い分けてください
- 雰囲気: 高級感があり、上品で格式の高いトーン
- 二重敬語は避けてください`,
  }

  const OBJECTIVE_LABELS: Record<string, string> = {
    awareness: "認知拡大",
    conversion: "コンバージョン",
    engagement: "エンゲージメント",
    branding: "ブランディング",
    promotion: "プロモーション",
    new_product: "新商品発売",
  }

  const register = brief.registerOverride || brand.defaultRegister
  const registerInstructions =
    REGISTER_INSTRUCTIONS[register] || REGISTER_INSTRUCTIONS["standard"]
  const objectiveLabel = OBJECTIVE_LABELS[brief.objective] || brief.objective

  const userParts: string[] = []

  userParts.push(`以下のキャンペーンブリーフに基づいて、日本語の広告コピーを生成してください。

【キャンペーン概要】
目的: ${objectiveLabel}`)

  if (brief.targetAudience) {
    userParts.push(`ターゲットオーディエンス: ${brief.targetAudience}`)
  }

  userParts.push(`対象プラットフォーム: ${brief.platforms.join("、")}`)

  if (brief.campaignProductInfo) {
    userParts.push(`\n【キャンペーン固有の商品情報】\n${brief.campaignProductInfo}`)
  }

  if (brief.creativeMoodTags && brief.creativeMoodTags.length > 0) {
    userParts.push(`\nムード: ${brief.creativeMoodTags.join("、")}`)
  }

  if (brief.creativeDirection) {
    userParts.push(`クリエイティブ方向性: ${brief.creativeDirection}`)
  }

  userParts.push(`\n${registerInstructions}`)

  userParts.push(`
【出力要件】
正確に4つのバリエーション（A案〜D案）を生成してください。

各バリエーションに含めるもの:
- headline (見出し): 短く印象的な見出し（15〜30文字程度）
- body (本文): キャンペーンの詳細を伝える本文（50〜100文字程度）
- cta (アクションボタン): 行動を促すCTAテキスト（5〜15文字程度）
- hashtags (ハッシュタグ): 3〜5個の関連ハッシュタグ

重要:
- 全てのバリエーションで同一の敬語レベルを維持すること
- 各バリエーションは異なるアプローチ（感情訴求、機能訴求、緊急性訴求、ストーリー訴求など）を取ること
- プラットフォームの特性を考慮した文字数にすること
- deliver_copy_variants ツールを使って結果を返してください`)

  const userMessage = userParts.join("\n")

  return { systemPrompt, userMessage }
}

// ===== Naive Art Director =====

/**
 * NAIVE BASELINE -- for A/B comparison only. Not used in production pipeline.
 *
 * Mirrors the actual v1.0 prompts from src/lib/ai/prompts/image-generation.ts.
 * This IS the v1.0 prompt, serving as the baseline. The v1.0 prompt:
 * - Has no camera/lens specifications
 * - Has no Raw Mode mention
 * - Has no self-critique checklist
 * - Has no category awareness (cosmetics vs food vs fashion)
 * - Has no skin realism keywords
 * - Has no Japanese demographic default
 * - Has no composition guidance beyond "clean composition"
 * - Has no text safe zone awareness
 * - Uses simple mood tag to visual description mapping
 *
 * Returns the image prompt string (not system/user split -- v1.0 is a single prompt).
 */
export function buildNaiveArtDirectorPrompt(
  brief: CampaignBrief,
  brand: NaiveImageBrandProfile
): string {
  // Mirror of image-generation.ts buildImagePrompt
  const MOOD_TAG_TO_VISUAL: Record<string, string> = {
    bright: "bright, well-lit, high-key lighting",
    dark: "dark, moody, low-key lighting, dramatic shadows",
    minimal: "minimalist composition, clean lines, negative space",
    colorful: "vibrant colors, rich saturation, colorful palette",
    retro: "retro aesthetic, vintage film look, nostalgic tones",
    modern: "contemporary design, sleek, cutting-edge",
    natural: "organic textures, earthy tones, natural materials",
    luxury: "luxurious, premium materials, gold accents, elegant",
    pop: "pop art inspired, bold graphics, eye-catching",
    cool: "cool tones, blue and silver palette, sophisticated",
    japanese: "Japanese design sensibility, wabi-sabi, subtle elegance",
    urban: "urban setting, city backdrop, metropolitan atmosphere",
  }

  const OBJECTIVE_TO_VISUAL: Record<string, string> = {
    awareness: "eye-catching, attention-grabbing, bold visual impact",
    conversion: "product-focused, clear value proposition, compelling",
    engagement: "inviting, interactive-looking, warm and approachable",
    branding: "brand identity, consistent visual language, memorable",
    promotion: "promotional, sale-oriented, urgency, excitement",
    new_product: "product reveal, fresh, innovative, spotlight on product",
  }

  const parts: string[] = []

  parts.push("Professional advertising photography for a Japanese market campaign.")

  const objectiveVisual = OBJECTIVE_TO_VISUAL[brief.objective]
  if (objectiveVisual) {
    parts.push(objectiveVisual)
  }

  if (brief.creativeMoodTags && brief.creativeMoodTags.length > 0) {
    const moodDescriptions = brief.creativeMoodTags
      .map((tag) => MOOD_TAG_TO_VISUAL[tag])
      .filter(Boolean)
    if (moodDescriptions.length > 0) {
      parts.push(moodDescriptions.join(", "))
    }
  }

  if (brand.colors) {
    parts.push(
      `Color palette emphasizing ${brand.colors.primary} as primary color with ${brand.colors.secondary} and ${brand.colors.accent} as accent colors.`
    )
  }

  if (brief.creativeDirection) {
    parts.push(`Creative direction: ${brief.creativeDirection}`)
  }

  if (brief.targetAudience) {
    parts.push(`Target audience context: ${brief.targetAudience}`)
  }

  parts.push(
    "High-resolution, studio quality, 8K, professional commercial photography. No text or typography in the image. Clean composition suitable for ad campaign overlay."
  )

  return parts.join(" ")
}

// ===== Naive JP Localization =====

/**
 * NAIVE BASELINE -- for A/B comparison only. Not used in production pipeline.
 *
 * Simple generic copy editor prompt without:
 * - Weighted evaluation criteria (naturalness 30%, register 25%, etc.)
 * - Structured issue format (platform/variant/field specificity)
 * - Severity levels (critical/moderate/minor)
 * - Compliance flagging (yakuhinhou, keihinhou)
 * - Common LLM error patterns knowledge
 * - Max 5 issues limit
 * - Quality score methodology
 * - Few-shot examples
 * - XML-tagged structure
 *
 * Returns { systemPrompt, userMessage } for the naive JP Localization agent.
 */
export function buildNaiveJpLocalizationPrompt(
  copyVariants: Array<{
    platform: string
    variantLabel: string
    headline: string
    body: string
    cta: string
    hashtags: string[]
    register: string
  }>
): { systemPrompt: string; userMessage: string } {
  const systemPrompt = `You are a Japanese copy editor. Review the following advertising copy for quality. Check for:
- Natural Japanese language
- Consistent tone and register
- Grammatical correctness
- Cultural appropriateness

Provide feedback on any issues you find and suggest improvements. Rate the overall quality on a scale of 0-100.`

  const variantsText = copyVariants
    .map(
      (v) =>
        `[${v.platform} / ${v.variantLabel}]
Register: ${v.register}
Headline: ${v.headline}
Body: ${v.body}
CTA: ${v.cta}
Hashtags: ${v.hashtags.join(", ") || "None"}`
    )
    .join("\n\n")

  const userMessage = `Please review the following Japanese advertising copy:

${variantsText}

Evaluate the copy quality and provide your feedback.`

  return { systemPrompt, userMessage }
}
