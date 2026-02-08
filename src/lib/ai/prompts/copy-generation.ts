/**
 * Prompt templates for Claude-based Japanese advertising copy generation.
 * Includes keigo register control, tri-script mixing guidelines, and few-shot examples.
 */

import type { CampaignBrief } from "@/types/campaign"
import type { PlatformCopyConstraints } from "@/lib/platforms/copy-constraints"

export interface BrandProfileForPrompt {
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

const REGISTER_INSTRUCTIONS: Record<string, string> = {
  casual: `【敬語レベル: カジュアル（タメ口）】
あなたはフレンドリーで親しみやすい文体で書いてください。
- 語尾: だよ、だね、してみて、じゃん、ってば
- 敬語禁止: です/ます形は使わないでください
- 雰囲気: 友達に話しかけるような自然なトーン
- 絵文字やスラングは控えめに（広告であることを忘れずに）

【例文】
見出し: 新商品出たよ！
本文: この春の新作、めっちゃ可愛いから絶対チェックしてみて！今だけ限定カラーもあるよ。
CTA: チェックしてみて！`,

  standard: `【敬語レベル: 標準（です/ます形）】
あなたは丁寧で信頼感のある文体で書いてください。
- 語尾: です、ます、ください、ません、でした、ました
- 丁寧語を基本とし、尊敬語・謙譲語は使わない
- 雰囲気: プロフェッショナルだが堅すぎない

【例文】
見出し: 新商品が登場しました
本文: この春の新作コレクションをぜひご覧ください。限定カラーもご用意しています。
CTA: ぜひご覧ください`,

  formal: `【敬語レベル: 敬語（尊敬語・謙譲語）】
あなたは格式高い文体で書いてください。
- 語尾: ございます、いたします、申し上げます、くださいませ、いただけます
- 尊敬語と謙譲語を適切に使い分けてください
- 雰囲気: 高級感があり、上品で格式の高いトーン
- 二重敬語は避けてください

【例文】
見出し: 新商品のご案内を申し上げます
本文: 春の新作コレクションのご案内を申し上げます。限定カラーもご用意いたしております。ぜひご高覧くださいませ。
CTA: 詳細はこちらをご覧くださいませ`,
}

const OBJECTIVE_LABELS: Record<string, string> = {
  awareness: "認知拡大",
  conversion: "コンバージョン",
  engagement: "エンゲージメント",
  branding: "ブランディング",
  promotion: "プロモーション",
  new_product: "新商品発売",
}

/**
 * Build the system prompt establishing Claude as a Japanese advertising copywriter.
 */
export function buildSystemPrompt(brand: BrandProfileForPrompt): string {
  const parts: string[] = []

  parts.push(`あなたは日本の広告コピーライターです。日本市場向けの広告コピーを作成する専門家として、以下のブランドのためにコピーを生成してください。

【ブランド情報】
ブランド名: ${brand.name}`)

  if (brand.brandStory) {
    parts.push(`ブランドストーリー: ${brand.brandStory}`)
  }

  if (brand.brandValues && brand.brandValues.length > 0) {
    parts.push(`ブランドバリュー: ${brand.brandValues.join("、")}`)
  }

  if (brand.targetMarket) {
    parts.push(`ターゲット市場: ${brand.targetMarket}`)
  }

  if (brand.positioningStatement) {
    parts.push(`ポジショニング: ${brand.positioningStatement}`)
  }

  if (brand.productCatalog && brand.productCatalog.length > 0) {
    parts.push(`\n【商品カタログ】`)
    brand.productCatalog.forEach((product, i) => {
      parts.push(`${i + 1}. ${product.name}: ${product.description}`)
      if (product.keyFeatures.length > 0) {
        parts.push(`   特徴: ${product.keyFeatures.join("、")}`)
      }
      if (product.priceRange) {
        parts.push(`   価格帯: ${product.priceRange}`)
      }
    })
  }

  if (brand.toneTags && brand.toneTags.length > 0) {
    parts.push(`\nトーン: ${brand.toneTags.join("、")}`)
  }

  if (brand.toneDescription) {
    parts.push(`トーン詳細: ${brand.toneDescription}`)
  }

  parts.push(`
【日本語コピーライティング規則】
1. 三種混合文字の使い分け:
   - 漢字: 名詞、動詞の語幹に使用（読みやすさを優先し、難読漢字は避ける）
   - ひらがな: 助詞、活用語尾、やわらかい印象を与えたい場合に使用
   - カタカナ: 外来語、強調、ブランド固有の用語に使用

2. リズムと韻: 日本語の広告コピーは5-7音のリズムを意識する

3. 一貫性: 4つのバリエーション全体で敬語レベルを統一する。語尾の揺れは絶対に許されません。

4. 文化的配慮: 日本の広告慣行に従い、控えめな表現を心がける`)

  return parts.join("\n")
}

/**
 * Build the user prompt for copy generation with specific campaign brief context.
 */
export function buildCopyPrompt(
  brief: CampaignBrief,
  brand: BrandProfileForPrompt
): string {
  const register = brief.registerOverride || brand.defaultRegister
  const registerInstructions =
    REGISTER_INSTRUCTIONS[register] || REGISTER_INSTRUCTIONS["standard"]

  const objectiveLabel = OBJECTIVE_LABELS[brief.objective] || brief.objective

  const parts: string[] = []

  parts.push(`以下のキャンペーンブリーフに基づいて、日本語の広告コピーを生成してください。

【キャンペーン概要】
目的: ${objectiveLabel}`)

  if (brief.targetAudience) {
    parts.push(`ターゲットオーディエンス: ${brief.targetAudience}`)
  }

  parts.push(`対象プラットフォーム: ${brief.platforms.join("、")}`)

  if (brief.campaignProductInfo) {
    parts.push(`\n【キャンペーン固有の商品情報】\n${brief.campaignProductInfo}`)
  }

  if (brief.creativeMoodTags && brief.creativeMoodTags.length > 0) {
    parts.push(`\nムード: ${brief.creativeMoodTags.join("、")}`)
  }

  if (brief.creativeDirection) {
    parts.push(`クリエイティブ方向性: ${brief.creativeDirection}`)
  }

  parts.push(`\n${registerInstructions}`)

  parts.push(`
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

  return parts.join("\n")
}

/**
 * Build a platform-aware copy generation prompt with explicit per-platform character limits.
 * Instructs Claude to generate 4 variants PER PLATFORM with enforced constraints.
 *
 * @param brief - Campaign brief with objectives, audience, platforms
 * @param brand - Brand profile with identity, tone, product info
 * @param constraints - Platform copy constraints for each selected platform
 * @returns User prompt string for platform-specific copy generation
 */
export function buildPlatformCopyPrompt(
  brief: CampaignBrief,
  brand: BrandProfileForPrompt,
  constraints: PlatformCopyConstraints[]
): string {
  const register = brief.registerOverride || brand.defaultRegister
  const registerInstructions =
    REGISTER_INSTRUCTIONS[register] || REGISTER_INSTRUCTIONS["standard"]

  const objectiveLabel = OBJECTIVE_LABELS[brief.objective] || brief.objective

  const parts: string[] = []

  parts.push(`以下のキャンペーンブリーフに基づいて、プラットフォーム別に最適化された日本語の広告コピーを生成してください。

【キャンペーン概要】
目的: ${objectiveLabel}`)

  if (brief.targetAudience) {
    parts.push(`ターゲットオーディエンス: ${brief.targetAudience}`)
  }

  if (brief.campaignProductInfo) {
    parts.push(`\n【キャンペーン固有の商品情報】\n${brief.campaignProductInfo}`)
  }

  if (brief.creativeMoodTags && brief.creativeMoodTags.length > 0) {
    parts.push(`\nムード: ${brief.creativeMoodTags.join("、")}`)
  }

  if (brief.creativeDirection) {
    parts.push(`クリエイティブ方向性: ${brief.creativeDirection}`)
  }

  parts.push(`\n${registerInstructions}`)

  // Add per-platform character limit instructions
  parts.push(`\n【プラットフォーム別文字数制限】
以下の各プラットフォームに対して、それぞれ正確に4つのバリエーション（A案〜D案）を生成してください。
文字数制限を厳守してください。`)

  for (const constraint of constraints) {
    const hashtagNote =
      constraint.hashtags.required && constraint.hashtags.max > 0
        ? `ハッシュタグ: ${constraint.hashtags.max}個（必須）`
        : constraint.hashtags.max > 0
          ? `ハッシュタグ: 最大${constraint.hashtags.max}個（任意）`
          : "ハッシュタグ: なし"

    parts.push(`
■ ${constraint.platformId.toUpperCase()}
  ${constraint.headline.label}: 最大${constraint.headline.maxChars}文字
  ${constraint.body.label}: 最大${constraint.body.maxChars}文字
  ${constraint.cta.label}: 最大${constraint.cta.maxChars}文字
  ${hashtagNote}`)

    if (constraint.formatNotes.length > 0) {
      parts.push(`  注意事項:`)
      for (const note of constraint.formatNotes) {
        parts.push(`    - ${note}`)
      }
    }
  }

  parts.push(`
【出力要件】
各プラットフォームに対して正確に4つのバリエーション（A案〜D案）を生成してください。

各バリエーションに含めるもの:
- headline: プラットフォーム別の文字数制限に従った見出し
- body: プラットフォーム別の文字数制限に従った本文
- cta: プラットフォーム別の文字数制限に従ったCTAテキスト
- hashtags: プラットフォームの要件に従ったハッシュタグ配列（不要な場合は空配列）

重要:
- 全てのバリエーションで同一の敬語レベルを維持すること
- 各バリエーションは異なるアプローチ（感情訴求、機能訴求、緊急性訴求、ストーリー訴求など）を取ること
- 文字数制限を厳守すること（制限を超えないよう注意）
- deliver_platform_copy ツールを使って結果を返してください`)

  return parts.join("\n")
}
