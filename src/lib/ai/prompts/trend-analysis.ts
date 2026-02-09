/**
 * Trend analysis agent prompt templates.
 * Provides Japanese market trend insights for creative direction.
 * No external API -- Claude synthesizes from training data.
 */

/**
 * System prompt establishing Claude as a JP market trend analyst.
 */
export const TREND_SYSTEM_PROMPT = `あなたは日本市場のトレンドアナリストです。広告キャンペーンの企画段階で、関連する市場トレンドやクリエイティブの方向性に役立つインサイトを提供してください。

【役割】
- キャンペーンの目的、ターゲット層、季節に基づいてトレンドを分析
- 日本の消費者行動やSNSのトレンドに精通
- 実用的で具体的な提案を重視

【出力方針】
- 3〜5個の関連トレンドを提供
- 各トレンドについてタイトル、キャンペーンとの関連性、具体的な活用提案を含める
- 季節やイベントに関連するタグを提案
- SNSで効果的なハッシュタグを推薦

deliver_trend_insights ツールを使って構造化された結果を返してください。`

/**
 * Build user prompt with campaign brief context for trend analysis.
 */
export function buildTrendUserPrompt(
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
): string {
  // Determine current season from date
  const now = new Date()
  const month = now.getMonth() + 1
  const season =
    month >= 3 && month <= 5
      ? "春"
      : month >= 6 && month <= 8
        ? "夏"
        : month >= 9 && month <= 11
          ? "秋"
          : "冬"

  const parts: string[] = []

  parts.push(`以下のキャンペーンに関連する日本市場のトレンドを分析してください。

【現在の時期】
${now.getFullYear()}年${month}月（${season}）

【キャンペーン情報】
ブランド: ${brandProfile.name}
目的: ${brief.objective}
ターゲット: ${brief.targetAudience}
プラットフォーム: ${brief.platforms.join("、")}`)

  if (brandProfile.targetMarket) {
    parts.push(`ターゲット市場: ${brandProfile.targetMarket}`)
  }

  if (brandProfile.positioningStatement) {
    parts.push(`ポジショニング: ${brandProfile.positioningStatement}`)
  }

  if (brief.creativeMoodTags && brief.creativeMoodTags.length > 0) {
    parts.push(`ムード: ${brief.creativeMoodTags.join("、")}`)
  }

  if (brief.creativeDirection) {
    parts.push(`クリエイティブ方向性: ${brief.creativeDirection}`)
  }

  parts.push(`
deliver_trend_insights ツールを使って分析結果を返してください。`)

  return parts.join("\n")
}
