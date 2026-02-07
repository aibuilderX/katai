export interface PlatformDimension {
  label: string
  width: number
  height: number
}

export interface PlatformDefinition {
  id: string
  nameJa: string
  icon: string // Lucide icon name
  dimensions: PlatformDimension[]
  category: "social" | "ad" | "other"
  previewFormat: string
}

export const PLATFORMS: PlatformDefinition[] = [
  {
    id: "instagram",
    nameJa: "Instagram",
    icon: "Instagram",
    category: "social",
    previewFormat: "Story 9:16 / Feed 1:1",
    dimensions: [
      { label: "フィード", width: 1080, height: 1080 },
      { label: "ストーリー", width: 1080, height: 1920 },
      { label: "リール", width: 1080, height: 1920 },
    ],
  },
  {
    id: "x",
    nameJa: "X (Twitter)",
    icon: "Twitter",
    category: "social",
    previewFormat: "Card 16:9",
    dimensions: [
      { label: "カード", width: 1200, height: 675 },
      { label: "ヘッダー", width: 1500, height: 500 },
    ],
  },
  {
    id: "line",
    nameJa: "LINE",
    icon: "MessageCircle",
    category: "social",
    previewFormat: "Rich Message 1:1 (1040x1040)",
    dimensions: [
      { label: "リッチメッセージ", width: 1040, height: 1040 },
      { label: "リッチメニュー", width: 2500, height: 1686 },
    ],
  },
  {
    id: "yahoo_japan",
    nameJa: "Yahoo! JAPAN",
    icon: "Globe",
    category: "ad",
    previewFormat: "Display banner variants",
    dimensions: [
      { label: "バナー 横長", width: 600, height: 500 },
      { label: "バナー レクタングル", width: 300, height: 250 },
      { label: "バナー ワイド", width: 728, height: 90 },
      { label: "バナー スカイスクレイパー", width: 160, height: 600 },
    ],
  },
  {
    id: "rakuten",
    nameJa: "楽天",
    icon: "ShoppingBag",
    category: "ad",
    previewFormat: "Product square 1:1 (700x700)",
    dimensions: [
      { label: "商品画像", width: 700, height: 700 },
      { label: "バナー", width: 1200, height: 400 },
    ],
  },
  {
    id: "tiktok",
    nameJa: "TikTok",
    icon: "Music",
    category: "social",
    previewFormat: "Vertical 9:16",
    dimensions: [
      { label: "動画サムネイル", width: 1080, height: 1920 },
    ],
  },
  {
    id: "youtube",
    nameJa: "YouTube",
    icon: "Youtube",
    category: "social",
    previewFormat: "Pre-roll 16:9",
    dimensions: [
      { label: "サムネイル", width: 1280, height: 720 },
      { label: "バナー", width: 2560, height: 1440 },
      { label: "ショート", width: 1080, height: 1920 },
    ],
  },
  {
    id: "gdn",
    nameJa: "GDN",
    icon: "LayoutGrid",
    category: "ad",
    previewFormat: "Display banner variants",
    dimensions: [
      { label: "レスポンシブ", width: 1200, height: 628 },
      { label: "レクタングル", width: 300, height: 250 },
      { label: "リーダーボード", width: 728, height: 90 },
      { label: "スカイスクレイパー", width: 160, height: 600 },
    ],
  },
  {
    id: "dooh",
    nameJa: "DOOH",
    icon: "Monitor",
    category: "other",
    previewFormat: "Large format 16:9",
    dimensions: [
      { label: "横型", width: 1920, height: 1080 },
      { label: "縦型", width: 1080, height: 1920 },
    ],
  },
  {
    id: "email",
    nameJa: "メール",
    icon: "Mail",
    category: "other",
    previewFormat: "Narrow vertical (600px)",
    dimensions: [
      { label: "ヘッダー", width: 600, height: 200 },
      { label: "バナー", width: 600, height: 300 },
    ],
  },
  {
    id: "instore_pop",
    nameJa: "店頭POP",
    icon: "Store",
    category: "other",
    previewFormat: "Print format",
    dimensions: [
      { label: "A4 縦", width: 2480, height: 3508 },
      { label: "A4 横", width: 3508, height: 2480 },
      { label: "B5 縦", width: 2150, height: 3035 },
    ],
  },
] as const

/**
 * Get a platform definition by ID.
 */
export function getPlatformById(id: string): PlatformDefinition | undefined {
  return PLATFORMS.find((p) => p.id === id)
}

/**
 * Get all platform IDs.
 */
export function getPlatformIds(): string[] {
  return PLATFORMS.map((p) => p.id)
}

/**
 * Get platforms by category.
 */
export function getPlatformsByCategory(
  category: "social" | "ad" | "other"
): PlatformDefinition[] {
  return PLATFORMS.filter((p) => p.category === category)
}
