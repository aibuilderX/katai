/**
 * QA validation agent prompt templates.
 * Validates Japanese advertising copy for keigo consistency and brand compliance.
 */

import { KEIGO_REGISTERS } from "@/lib/constants/keigo"

/**
 * Build keigo register reference section from constants.
 */
function buildKeigoReference(): string {
  return KEIGO_REGISTERS.map(
    (r) =>
      `- ${r.id} (${r.nameJa}): ${r.descriptionJa}\n  語尾例: ${r.verbEndings.join("、")}\n  例文: ${r.exampleText}`
  ).join("\n")
}

/**
 * System prompt establishing Claude as a QA validation agent.
 */
export const QA_SYSTEM_PROMPT = `あなたは日本語広告コピーのQA検証エージェントです。以下の観点から広告コピーを検証してください。

【検証項目】

1. 敬語の一貫性 (keigo consistency)
   ブランドが設定した敬語レベルと、実際のコピーが一致しているか確認してください。
   語尾の揺れ（です/ます形とタメ口の混在など）は特に厳密にチェックしてください。

   【敬語レベル定義】
${buildKeigoReference()}

2. ブランドコンプライアンス (brand compliance)
   コピーがブランドのトーンタグ、ポジショニング、バリューに適合しているか確認してください。
   ブランドイメージを損なう表現がないか検証してください。

3. コピー品質 (copy quality)
   - 文が途中で切れていないか（生成アーティファクトがないか）
   - 不自然な文字の使い方がないか
   - 三種混合文字（漢字・ひらがな・カタカナ）のバランスが適切か

【出力形式】
deliver_qa_report ツールを使って構造化された検証結果を返してください。
各問題には severity（error または warning）と改善提案を含めてください。
問題が見つからない場合は空の issues 配列と高いスコアを返してください。`

/**
 * Build user prompt with brand profile and copy variants to validate.
 */
export function buildQAUserPrompt(
  brandProfile: {
    name: string
    defaultRegister: string
    toneTags?: string[] | null
    toneDescription?: string | null
    positioningStatement?: string | null
    brandValues?: string[] | null
  },
  copyVariants: {
    platform: string
    variantLabel: string
    register: string
    headline: string
    bodyText: string
    ctaText: string
  }[]
): string {
  const parts: string[] = []

  parts.push(`以下のブランドの広告コピーを検証してください。

【ブランド情報】
ブランド名: ${brandProfile.name}
デフォルト敬語レベル: ${brandProfile.defaultRegister}`)

  if (brandProfile.toneTags && brandProfile.toneTags.length > 0) {
    parts.push(`トーンタグ: ${brandProfile.toneTags.join("、")}`)
  }

  if (brandProfile.toneDescription) {
    parts.push(`トーン詳細: ${brandProfile.toneDescription}`)
  }

  if (brandProfile.positioningStatement) {
    parts.push(`ポジショニング: ${brandProfile.positioningStatement}`)
  }

  if (brandProfile.brandValues && brandProfile.brandValues.length > 0) {
    parts.push(`ブランドバリュー: ${brandProfile.brandValues.join("、")}`)
  }

  parts.push(`\n【検証対象コピー】`)

  for (const variant of copyVariants) {
    parts.push(`
--- ${variant.platform} / ${variant.variantLabel} (設定レジスター: ${variant.register}) ---
見出し: ${variant.headline}
本文: ${variant.bodyText}
CTA: ${variant.ctaText}`)
  }

  parts.push(`
deliver_qa_report ツールを使って検証結果を返してください。`)

  return parts.join("\n")
}
