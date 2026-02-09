/**
 * Pre-built Japanese campaign brief templates.
 * Each template pre-fills the brief form with sensible defaults
 * for common JP advertising campaign types.
 */

export interface CampaignTemplate {
  id: string
  nameJa: string
  descriptionJa: string
  category: "seasonal" | "promotion" | "product_launch" | "brand_awareness"
  icon: string // lucide icon name
  defaults: {
    objective: string
    targetAudience: string
    platforms: string[]
    creativeMoodTags: string[]
    creativeDirection: string
    registerOverride?: string
  }
}

export const JP_CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  {
    id: "seasonal_launch",
    nameJa: "季節キャンペーン",
    descriptionJa: "季節のイベントやトレンドに合わせた認知拡大キャンペーン",
    category: "seasonal",
    icon: "Sun",
    defaults: {
      objective: "awareness",
      targetAudience: "20〜40代の一般消費者",
      platforms: ["instagram", "x", "line"],
      creativeMoodTags: ["seasonal", "trend", "limited"],
      creativeDirection:
        "季節感を活かした明るいビジュアルで、旬のテーマを訴求。限定感を演出しつつ親しみやすさを重視。",
    },
  },
  {
    id: "flash_sale",
    nameJa: "タイムセール",
    descriptionJa: "期間限定セールやお得なキャンペーンでコンバージョンを促進",
    category: "promotion",
    icon: "Zap",
    defaults: {
      objective: "conversion",
      targetAudience: "価格に敏感な購買層",
      platforms: ["line", "x", "yahoo", "rakuten"],
      creativeMoodTags: ["urgent", "deal", "limited"],
      creativeDirection:
        "赤やオレンジを基調とした緊急性を感じさせるビジュアル。カウントダウンや割引率を目立たせるデザイン。",
      registerOverride: "casual",
    },
  },
  {
    id: "new_product",
    nameJa: "新商品発売",
    descriptionJa: "新商品やサービスのローンチで認知と購買を同時に獲得",
    category: "product_launch",
    icon: "Sparkles",
    defaults: {
      objective: "awareness",
      targetAudience: "25〜45歳のアーリーアダプター層",
      platforms: ["instagram", "x", "tiktok", "line"],
      creativeMoodTags: ["new", "innovative", "premium"],
      creativeDirection:
        "クリーンで洗練された商品フォーカスのビジュアル。新しさと革新性を強調し、プレミアム感を演出。",
    },
  },
  {
    id: "brand_awareness",
    nameJa: "ブランド認知",
    descriptionJa: "ブランドの世界観やストーリーを伝える長期的な認知施策",
    category: "brand_awareness",
    icon: "Crown",
    defaults: {
      objective: "awareness",
      targetAudience: "20〜50代の幅広い層",
      platforms: ["instagram", "x", "youtube"],
      creativeMoodTags: ["sophisticated", "trust", "quality"],
      creativeDirection:
        "ブランドストーリーを軸にしたシネマティックなビジュアル。信頼感と品質を伝える落ち着いたトーン。",
      registerOverride: "formal",
    },
  },
]
