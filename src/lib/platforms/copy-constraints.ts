/**
 * Platform copy constraint registry with character limits for all Phase 3 platforms.
 * Provides validation utilities for Japanese character counting and length enforcement.
 *
 * Character counting uses [...str].length (codepoint-accurate) instead of .length
 * which double-counts surrogate pairs in JavaScript strings.
 */

/**
 * Copy constraints for a single platform field (headline, body, CTA).
 */
export interface CopyFieldConstraint {
  maxChars: number
  label: string
}

/**
 * Complete copy constraints for a single advertising platform.
 */
export interface PlatformCopyConstraints {
  platformId: string
  headline: CopyFieldConstraint
  body: CopyFieldConstraint
  cta: CopyFieldConstraint
  hashtags: { max: number; required: boolean }
  formatNotes: string[] // Platform-specific formatting rules in Japanese
}

/**
 * Result of copy length validation.
 */
export interface CopyLengthValidation {
  valid: boolean
  actual: number
  truncated?: string
}

/**
 * Platform copy constraints registry covering all 7 Phase 3 platforms.
 * Character limits sourced from platform research documentation.
 */
export const PLATFORM_COPY_CONSTRAINTS: Record<string, PlatformCopyConstraints> = {
  line: {
    platformId: "line",
    headline: { maxChars: 20, label: "タイトル" },
    body: { maxChars: 60, label: "テキスト" },
    cta: { maxChars: 15, label: "アクションラベル" },
    hashtags: { max: 0, required: false },
    formatNotes: [
      "LINE広告はテキストが短いため、一文で訴求ポイントを伝える",
      "友だち追加を意識したCTAが効果的",
      "絵文字は1〜2個まで（使いすぎ注意）",
    ],
  },

  yahoo_japan: {
    platformId: "yahoo_japan",
    headline: { maxChars: 15, label: "タイトル" },
    body: { maxChars: 39, label: "説明文" },
    cta: { maxChars: 15, label: "アクションラベル" },
    hashtags: { max: 0, required: false },
    formatNotes: [
      "Yahoo!検索広告は文字数が非常に限られる",
      "キーワードを含む簡潔な見出しが重要",
      "説明文は39文字以内で商品の特徴を端的に伝える",
    ],
  },

  rakuten: {
    platformId: "rakuten",
    headline: { maxChars: 30, label: "タイトル" },
    body: { maxChars: 87, label: "テキスト" },
    cta: { maxChars: 15, label: "アクションラベル" },
    hashtags: { max: 0, required: false },
    formatNotes: [
      "楽天ユーザーはお得感・ポイント訴求に反応しやすい",
      "セール・キャンペーン情報を前面に出す",
      "商品スペックよりベネフィットを強調",
    ],
  },

  instagram: {
    platformId: "instagram",
    headline: { maxChars: 30, label: "見出し" },
    body: { maxChars: 125, label: "キャプション" },
    cta: { maxChars: 20, label: "アクションボタン" },
    hashtags: { max: 5, required: true },
    formatNotes: [
      "Instagramはビジュアル重視、テキストは補助的役割",
      "ハッシュタグは3〜5個が最適（多すぎるとスパム判定）",
      "改行を活用して読みやすくする",
      "ストーリーズ広告は短文が効果的",
    ],
  },

  tiktok: {
    platformId: "tiktok",
    headline: { maxChars: 25, label: "見出し" },
    body: { maxChars: 100, label: "テキスト" },
    cta: { maxChars: 15, label: "アクションラベル" },
    hashtags: { max: 3, required: true },
    formatNotes: [
      "TikTokは若年層向け、カジュアルな表現が好まれる",
      "トレンドワードやチャレンジ名を活用",
      "ハッシュタグは1〜3個に絞る",
      "動画との連動を意識したコピー",
    ],
  },

  x: {
    platformId: "x",
    headline: { maxChars: 25, label: "見出し" },
    body: { maxChars: 280, label: "ポスト本文" },
    cta: { maxChars: 15, label: "アクションラベル" },
    hashtags: { max: 3, required: true },
    formatNotes: [
      "X（旧Twitter）は280文字以内で完結させる",
      "ハッシュタグは1〜3個が最適",
      "リツイートされやすい短文・キャッチーな表現を心がける",
      "URLは自動短縮されるためCTAリンクの文字数は考慮不要",
    ],
  },

  email: {
    platformId: "email",
    headline: { maxChars: 50, label: "件名" },
    body: { maxChars: 500, label: "本文プレビュー" },
    cta: { maxChars: 20, label: "CTAボタン" },
    hashtags: { max: 0, required: false },
    formatNotes: [
      "メール件名は50文字以内（モバイルで途切れないため）",
      "プレヘッダーテキストを意識した本文冒頭",
      "CTAボタンは明確なアクションを示す",
      "開封率を上げるため件名に具体的な数字やベネフィットを含める",
    ],
  },
}

/**
 * Count characters in a string using codepoint-accurate counting.
 * Uses [...str].length which correctly handles surrogate pairs (emoji, rare kanji)
 * instead of String.prototype.length which counts UTF-16 code units.
 *
 * @param str - Input string to count
 * @returns Number of Unicode codepoints in the string
 */
export function countJapaneseChars(str: string): number {
  return [...str].length
}

/**
 * Validate that text does not exceed the maximum character limit.
 * If over limit, provides a truncated version with "..." suffix.
 *
 * @param text - Text to validate
 * @param maxChars - Maximum allowed characters
 * @returns Validation result with actual count and optional truncated string
 */
export function validateCopyLength(
  text: string,
  maxChars: number
): CopyLengthValidation {
  const actual = countJapaneseChars(text)

  if (actual <= maxChars) {
    return { valid: true, actual }
  }

  // Truncate to maxChars - 1 codepoints, then append "..."
  const codepoints = [...text]
  const truncated = codepoints.slice(0, maxChars - 1).join("") + "…"

  return { valid: false, actual, truncated }
}

/**
 * Get copy constraints for a list of platform IDs.
 * Unknown platform IDs are silently skipped.
 *
 * @param platformIds - Array of platform identifiers
 * @returns Array of constraints for recognized platforms
 */
export function getConstraintsForPlatforms(
  platformIds: string[]
): PlatformCopyConstraints[] {
  return platformIds
    .map((id) => PLATFORM_COPY_CONSTRAINTS[id])
    .filter((c): c is PlatformCopyConstraints => c !== undefined)
}
