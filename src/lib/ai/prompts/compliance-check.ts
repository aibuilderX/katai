/**
 * Compliance check prompt templates.
 * Checks advertising copy against Japanese advertising regulations
 * (Keihyouhou / Yakki Ho) and platform-specific rules.
 */

/**
 * System prompt establishing Claude as a Japanese advertising law compliance agent.
 */
export const COMPLIANCE_SYSTEM_PROMPT = `あなたは日本の広告法令コンプライアンス検証エージェントです。広告コピーを以下の法令・規制に照らしてチェックしてください。

【検証項目】

1. 景品表示法（けいひんひょうじほう）
   不当景品類及び不当表示防止法に基づく表示規制を確認します。

   a) 優良誤認（第5条第1号）
      商品やサービスの品質・性能について、実際よりも著しく優良であると誤認させる表示を検出します。
      - 最上級表現の根拠の有無（「No.1」「最高」「最大」「唯一」「日本初」「業界最安値」）
      - 客観的根拠のない性能・効果の主張
      - 根拠のない比較広告

   b) 有利誤認（第5条第2号）
      取引条件について、実際よりも著しく有利であると誤認させる表示を検出します。
      - 根拠のない二重価格表示（「通常価格○○円→今だけ△△円」）
      - 事実に基づかない緊急性表現（「限定」「今だけ」「残りわずか」「先着○名」）
      - 根拠のない数量・期間限定表示

   c) ステルスマーケティング規制
      広告であることが明示されていない表示を検出します。
      - 広告であることの明示がない場合は指摘する

2. 薬機法（やっきほう）
   医薬品医療機器等法に基づく広告規制を確認します。

   - 化粧品・健康食品が医薬品的な効能効果を標榜していないか
   - 禁止表現の使用:「治る」「改善する」「痩せる」「若返る」「効く」「予防する」
   - 断定的な安全性表現:「安心・安全」「副作用なし」「100%安全」
   - 体験談を効能の保証として使用していないか

3. プラットフォーム広告ポリシー
   各プラットフォームの広告コンテンツポリシー違反の可能性をチェックします。

【重要な注意事項】
- AI生成コピーは誇大表現になりやすい傾向があります。特に注意して検証してください。
- 法令違反の可能性が高いものは severity を "error" にしてください。グレーゾーンは "warning" にしてください。
- 各問題には必ず legalBasis（法的根拠）を記載してください。
- ブランド名や製品名を最上級表現として誤検出しないでください。
- 業界標準的な表現（例:「美味しい」「楽しい」）を過度にフラグしないでください。

deliver_compliance_report ツールを使って構造化された検証結果を返してください。
問題が見つからない場合は overallRisk を "low" にし、空の配列を返してください。`

/**
 * Build user prompt with brand context, copy variants, and target platforms.
 */
export function buildComplianceUserPrompt(
  brand: {
    name: string
    productCatalog?: Array<{ name: string; description: string; keyFeatures: string[]; priceRange: string; targetSegment: string }> | null
    positioningStatement?: string | null
  },
  variants: {
    platform: string
    variantLabel: string
    headline: string
    bodyText: string
    ctaText: string
  }[],
  platforms: string[]
): string {
  const parts: string[] = []

  parts.push(`以下の広告コピーについて、景品表示法・薬機法・プラットフォームポリシーの観点からコンプライアンスチェックを実施してください。

【ブランド情報】
ブランド名: ${brand.name}`)

  if (brand.productCatalog && brand.productCatalog.length > 0) {
    parts.push(`取扱商品:`)
    for (const product of brand.productCatalog) {
      parts.push(`  - ${product.name}（${product.description}、ターゲット: ${product.targetSegment}）`)
    }
  }

  if (brand.positioningStatement) {
    parts.push(`ポジショニング: ${brand.positioningStatement}`)
  }

  parts.push(`\n対象プラットフォーム: ${platforms.join("、")}`)

  parts.push(`\n【検証対象コピー】`)

  for (const variant of variants) {
    parts.push(`
--- ${variant.platform} / ${variant.variantLabel} ---
見出し: ${variant.headline}
本文: ${variant.bodyText}
CTA: ${variant.ctaText}`)
  }

  parts.push(`
deliver_compliance_report ツールを使って検証結果を返してください。`)

  return parts.join("\n")
}
