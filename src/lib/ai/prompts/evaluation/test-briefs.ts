/**
 * Test brief definitions for A/B comparison between naive and optimized prompts.
 *
 * 5 standard test briefs covering Japanese small business categories:
 * cosmetics, food/restaurant, fashion, personal service (nail salon), online course.
 *
 * 3 edge case briefs testing failure modes:
 * vague brief (minimal info), conflicting brief (luxury+budget), unusual category (pet memorial).
 *
 * Each brief conforms to the CampaignBrief type from src/types/campaign.ts
 * and includes a testBrandProfile matching the N8nWebhookPayload brandProfile shape.
 *
 * @see .planning/phases/09.1-agent-prompt-engineering-photorealistic-output/09.1-RESEARCH.md#8
 */

import type { CampaignBrief } from "@/types/campaign"
import type { N8nWebhookPayload } from "@/types/pipeline"

// ===== Types =====

/**
 * Brand profile shape for test briefs, matching N8nWebhookPayload["brandProfile"].
 */
export type BrandProfileForTest = N8nWebhookPayload["brandProfile"]

/**
 * Complete test brief with campaign brief, brand profile, and test metadata.
 */
export interface TestBrief {
  /** Unique identifier for the test brief (e.g., "standard-cosmetics") */
  id: string
  /** Human-readable name */
  name: string
  /** Description of what this brief tests */
  description: string
  /** Campaign brief conforming to CampaignBrief type */
  brief: CampaignBrief
  /** Brand profile for the test brand */
  brandProfile: BrandProfileForTest
  /** What this brief specifically tests in the agent pipeline */
  testIntent: string
}

// ===== Standard Test Briefs =====

const COSMETICS_BRIEF: TestBrief = {
  id: "standard-cosmetics",
  name: "Hanasaki Organic Skincare",
  description:
    "Organic cosmetics brand targeting 30s women with a new face serum featuring Japanese botanical ingredients. Tests standard register, Instagram+LINE platforms, and natural/luxury mood.",
  brief: {
    brandProfileId: "test-cosmetics-001",
    objective: "new_product",
    targetAudience:
      "30代女性、自然志向、敏感肌で悩む都市部在住の働く女性",
    platforms: ["instagram", "line"],
    creativeMoodTags: ["natural", "luxury", "japanese"],
    creativeDirection:
      "New organic face serum launch emphasizing Japanese botanical ingredients (tsubaki oil, rice bran). Position as a natural premium skincare discovery.",
    campaignProductInfo:
      "新発売のオーガニックフェイスセラム。日本産の椿油と米ぬかエキスを配合。敏感肌にも安心の無添加処方。30mL 4,800円（税込）。",
  },
  brandProfile: {
    id: "test-cosmetics-001",
    name: "花咲 Organic",
    colors: {
      primary: "#7D9B76",
      secondary: "#F5F0E8",
      accent: "#C9A96E",
      background: "#FDFCFA",
    },
    fontPreference: "noto_sans_jp",
    defaultRegister: "standard",
    toneTags: ["natural", "trustworthy", "warm"],
    toneDescription:
      "自然体で信頼感のあるトーン。押し売り感のない、友人からのおすすめのような温かみ。",
    productCatalog: [
      {
        name: "椿オーガニックセラム",
        description:
          "日本産椿油と米ぬかエキス配合のオーガニックフェイスセラム",
        keyFeatures: [
          "国産オーガニック原料",
          "敏感肌対応",
          "無添加処方",
        ],
        priceRange: "4,800円",
        targetSegment: "30代女性・自然志向",
      },
    ],
    positioningStatement:
      "日本の自然の恵みで、素肌本来の美しさを引き出す",
    brandStory:
      "日本各地の農家と直接契約し、厳選されたオーガニック原料だけを使用。肌にも地球にもやさしいスキンケアを目指しています。",
    targetMarket: "30-40代の自然志向の都市部女性",
    brandValues: [
      "自然への敬意",
      "透明性",
      "日本の植物の力",
    ],
  },
  testIntent:
    "Standard cosmetics brief with complete information. Tests register recommendation (standard for cosmetics), AISAS framework selection for digital-first campaign, and Japanese desire nuance (bi_ishiki).",
}

const FOOD_RESTAURANT_BRIEF: TestBrief = {
  id: "standard-food",
  name: "Mendou Kiwami Ramen",
  description:
    "Ramen shop grand opening in Shibuya with limited opening special. Tests casual register, X+Instagram platforms, and bold/urban mood.",
  brief: {
    brandProfileId: "test-food-001",
    objective: "awareness",
    targetAudience:
      "渋谷エリアの20-40代のラーメン好き、仕事帰りのサラリーマン",
    platforms: ["x", "instagram"],
    creativeMoodTags: ["warm", "bold", "urban"],
    creativeDirection:
      "Grand opening campaign for a tonkotsu ramen shop in Shibuya. Emphasize the rich, handcrafted broth and limited opening specials.",
    campaignProductInfo:
      "渋谷に新オープンの豚骨ラーメン専門店。24時間じっくり煮込んだ濃厚豚骨スープが自慢。オープン記念で替え玉1杯無料キャンペーン実施中。",
  },
  brandProfile: {
    id: "test-food-001",
    name: "麺道 極",
    colors: null,
    fontPreference: "noto_sans_jp",
    defaultRegister: "casual",
    toneTags: ["bold", "warm", "energetic"],
    toneDescription:
      "元気で親しみやすいトーン。友達に「あそこのラーメン美味いよ」と勧めるような自然さ。",
    productCatalog: [
      {
        name: "極・濃厚豚骨ラーメン",
        description:
          "24時間煮込んだ豚骨スープのラーメン",
        keyFeatures: [
          "24時間煮込み",
          "自家製麺",
          "替え玉対応",
        ],
        priceRange: "850-1,200円",
        targetSegment: "ラーメン好き全般",
      },
    ],
    positioningStatement: null,
    brandStory: null,
    targetMarket: "渋谷エリアの20-40代",
    brandValues: null,
  },
  testIntent:
    "Food/restaurant brief with minimal brand profile (no colors, no positioning). Tests casual register recommendation, AIDA framework for awareness, and Art Director food photography conventions.",
}

const FASHION_BRIEF: TestBrief = {
  id: "standard-fashion",
  name: "Atelier SORA",
  description:
    "Young professional fashion brand launching a spring collection with a 10% first-purchase discount. Tests standard register, Instagram+X+LINE multi-platform, and modern/minimal mood.",
  brief: {
    brandProfileId: "test-fashion-001",
    objective: "promotion",
    targetAudience:
      "25-35歳の若手社会人女性、オフィスカジュアルからプライベートまで",
    platforms: ["instagram", "x", "line"],
    creativeMoodTags: ["modern", "bright", "minimal"],
    creativeDirection:
      "Spring collection launch with a fresh, confident vibe. Highlight the versatility of office-to-evening wear. First purchase 10% off promotion.",
    campaignProductInfo:
      "春の新作コレクション発売。オフィスからプライベートまで使えるワンピース・ブラウス・テーラードパンツのラインナップ。初回購入10%OFF。オンラインストア限定。",
  },
  brandProfile: {
    id: "test-fashion-001",
    name: "Atelier SORA",
    colors: {
      primary: "#C4A0B9",
      secondary: "#2C3E6B",
      accent: "#F0E0D6",
      background: "#FFFFFF",
    },
    fontPreference: "noto_sans_jp",
    defaultRegister: "standard",
    toneTags: ["modern", "confident", "approachable"],
    toneDescription:
      "モダンで自信に満ちたトーン。トレンドに敏感だけど、押しつけがましくない。等身大のおしゃれを楽しむ姿勢。",
    productCatalog: [
      {
        name: "春の新作コレクション",
        description:
          "オフィスカジュアルからプライベートまで使えるアイテム",
        keyFeatures: [
          "オフィス対応",
          "イージーケア素材",
          "日本人体型フィット",
        ],
        priceRange: "8,000-18,000円",
        targetSegment: "25-35歳の若手社会人女性",
      },
    ],
    positioningStatement:
      "等身大のおしゃれを、もっと自由に",
    brandStory:
      "日本の若手デザイナーが手がける、働く女性のためのリアルクローズ。",
    targetMarket: "25-35歳の都市部在住の社会人女性",
    brandValues: [
      "自由",
      "自信",
      "サステナビリティ",
    ],
  },
  testIntent:
    "Fashion brief with full brand profile and 3 platforms. Tests multi-platform adaptation (Instagram visual-first, X concise, LINE conversational), standard register, and seasonal awareness (spring).",
}

const NAIL_SALON_BRIEF: TestBrief = {
  id: "standard-nail-salon",
  name: "nail atelier nico",
  description:
    "Omotesando nail salon promoting seasonal nail art and a reservation campaign. Tests standard register, Instagram+LINE platforms, and pop/colorful mood.",
  brief: {
    brandProfileId: "test-nail-001",
    objective: "engagement",
    targetAudience:
      "表参道エリアの20-30代女性、トレンドに敏感、SNS発信が好き",
    platforms: ["instagram", "line"],
    creativeMoodTags: ["pop", "colorful", "japanese"],
    creativeDirection:
      "Promote new seasonal nail art designs and a reservation campaign. Encourage SNS sharing of nail art photos.",
    campaignProductInfo:
      "春の新作ネイルアートデザイン10種類。LINE予約で初回500円OFF。ネイル写真をInstagramに投稿すると次回ケア無料キャンペーン。",
  },
  brandProfile: {
    id: "test-nail-001",
    name: "nail atelier nico",
    colors: {
      primary: "#F5A5B8",
      secondary: "#FFFFFF",
      accent: "#FFD700",
      background: "#FFF5F7",
    },
    fontPreference: "noto_sans_jp",
    defaultRegister: "standard",
    toneTags: ["pop", "friendly", "trendy"],
    toneDescription:
      "可愛くてフレンドリーなトーン。お客様との距離が近い、親しみやすい雰囲気。",
    productCatalog: [
      {
        name: "春の新作ネイルアート",
        description: "10種類の春をテーマにしたネイルアートデザイン",
        keyFeatures: [
          "桜モチーフ",
          "パステルカラー",
          "トレンドデザイン",
        ],
        priceRange: "5,500-8,500円",
        targetSegment: "20-30代のトレンド敏感層",
      },
    ],
    positioningStatement:
      "指先から始まる、あなたらしい表現",
    brandStory:
      "表参道の隠れ家サロン。一人ひとりの個性を大切にしたオーダーメイドネイル。",
    targetMarket: "表参道・原宿エリアの20-30代女性",
    brandValues: ["個性", "トレンド", "丁寧な施術"],
  },
  testIntent:
    "Personal service (nail salon) brief with engagement objective. Tests AISAS framework selection (SNS sharing focus), standard register for service category, and personal service visual conventions.",
}

const ONLINE_COURSE_BRIEF: TestBrief = {
  id: "standard-online-course",
  name: "Global Bridge Business English",
  description:
    "Business English coaching program targeting Japanese corporate professionals. Tests standard-to-formal register, LINE+X platforms, and modern/professional mood.",
  brief: {
    brandProfileId: "test-course-001",
    objective: "conversion",
    targetAudience:
      "30-45歳の日本企業勤務ビジネスパーソン、英語でのプレゼン・会議に苦手意識",
    platforms: ["line", "x"],
    creativeMoodTags: ["modern", "professional"],
    creativeDirection:
      "Position the 3-month program as a practical solution for business English anxiety. Emphasize the bilingual instructor and online convenience.",
    campaignProductInfo:
      "3ヶ月集中ビジネス英語プログラム。オンライン完結。バイリンガル講師によるマンツーマン指導。プレゼン・会議・メール実践形式。月額29,800円（税込）。初月半額キャンペーン中。",
  },
  brandProfile: {
    id: "test-course-001",
    name: "Global Bridge",
    colors: null,
    fontPreference: "noto_sans_jp",
    defaultRegister: "standard",
    toneTags: ["professional", "supportive", "results-oriented"],
    toneDescription:
      "プロフェッショナルで信頼感があり、かつ寄り添うようなトーン。「一緒に頑張りましょう」という姿勢。",
    productCatalog: [
      {
        name: "ビジネス英語集中プログラム",
        description:
          "3ヶ月のオンラインビジネス英語コーチング",
        keyFeatures: [
          "マンツーマン指導",
          "バイリンガル講師",
          "実践形式",
          "オンライン完結",
        ],
        priceRange: "月額29,800円",
        targetSegment: "30-45歳のビジネスパーソン",
      },
    ],
    positioningStatement:
      "ビジネス英語の壁を、あなたの強みに変える",
    brandStory: null,
    targetMarket: "30-45歳の日本企業勤務ビジネスパーソン",
    brandValues: [
      "実践力",
      "伴走型サポート",
      "結果コミット",
    ],
  },
  testIntent:
    "Online course brief with conversion objective. Tests BAB or PAS framework selection (transformation/pain-point product), standard register for coaching category, and LINE conversion-focused copy.",
}

// ===== Edge Case Briefs =====

const VAGUE_BRIEF: TestBrief = {
  id: "edge-vague",
  name: "Vague Brief (My Business)",
  description:
    "Minimal information brief with empty target audience, no mood tags, no brand colors. Tests agents' ability to infer confidently from sparse input.",
  brief: {
    brandProfileId: "test-vague-001",
    objective: "awareness",
    targetAudience: "",
    platforms: ["instagram"],
    creativeMoodTags: [],
    creativeDirection: "",
    campaignProductInfo: "うちのお店の宣伝をしたい",
  },
  brandProfile: {
    id: "test-vague-001",
    name: "マイビジネス",
    colors: null,
    fontPreference: null,
    defaultRegister: "standard",
    toneTags: null,
    toneDescription: null,
    productCatalog: null,
    positioningStatement: null,
    brandStory: null,
    targetMarket: null,
    brandValues: null,
  },
  testIntent:
    "Strategic Insight must still classify confidently with low confidence scores. Creative Director must infer visual direction from minimal context. Art Director must generate prompts without brand colors or product specifics (GENX-09). Agents must never request more information or output 'unclear'.",
}

const CONFLICTING_BRIEF: TestBrief = {
  id: "edge-conflicting",
  name: "Conflicting Brief (LUXE BUDGET)",
  description:
    "Brief with contradictory signals: luxury positioning but budget pricing, luxury+casual mood tags, casual register override on a luxury brand. Tests graceful contradiction handling.",
  brief: {
    brandProfileId: "test-conflicting-001",
    objective: "conversion",
    targetAudience: "高級志向の20代",
    platforms: ["instagram", "x"],
    registerOverride: "casual",
    creativeMoodTags: ["luxury", "casual"],
    creativeDirection:
      "Premium materials at affordable prices. Make luxury accessible to young consumers.",
    campaignProductInfo:
      "最高級素材を使用した商品を1000円から。高品質×低価格を実現。",
  },
  brandProfile: {
    id: "test-conflicting-001",
    name: "LUXE BUDGET",
    colors: {
      primary: "#1A1A1A",
      secondary: "#D4AF37",
      accent: "#FFFFFF",
      background: "#F8F8F8",
    },
    fontPreference: "noto_sans_jp",
    defaultRegister: "formal",
    toneTags: ["luxury", "exclusive", "premium"],
    toneDescription:
      "高級感と特別感を演出するトーン。",
    productCatalog: [
      {
        name: "プレミアムライン",
        description: "最高級素材のアクセサリー",
        keyFeatures: [
          "高級素材",
          "職人技",
          "限定生産",
        ],
        priceRange: "1,000-5,000円",
        targetSegment: "高級志向の20代",
      },
    ],
    positioningStatement:
      "本物の贅沢を、手の届く価格で",
    brandStory: null,
    targetMarket: "20代の高級志向の若者",
    brandValues: ["品質", "アクセシビリティ"],
  },
  testIntent:
    "Agents must handle contradictions gracefully, not crash. Register override (casual) conflicts with luxury brand profile (formal). Mood tags (luxury+casual) are contradictory. Strategic Insight should resolve the tension and select an appropriate framework. Copywriter must honor the register override while acknowledging the luxury positioning.",
}

const PET_MEMORIAL_BRIEF: TestBrief = {
  id: "edge-pet-memorial",
  name: "Rainbow Bridge Pet Memorial",
  description:
    "Pet memorial and cremation service. Emotionally sensitive category requiring appropriate tone -- not cheerful, not sales-y. Tests agents' emotional intelligence.",
  brief: {
    brandProfileId: "test-memorial-001",
    objective: "awareness",
    targetAudience:
      "ペットを亡くした30-60代、東京都内",
    platforms: ["line", "instagram"],
    creativeMoodTags: ["natural", "japanese"],
    creativeDirection:
      "Gentle, respectful awareness of pet memorial services. Emphasize compassion, dignity, and care during a difficult time.",
    campaignProductInfo:
      "ペットメモリアル・火葬サービス。ご自宅までお迎え。個別火葬・立ち会い可。グリーフカウンセリング付き。24時間対応。",
  },
  brandProfile: {
    id: "test-memorial-001",
    name: "にじの橋",
    colors: {
      primary: "#8B9D83",
      secondary: "#E8E0D8",
      accent: "#B8A99A",
      background: "#FAF8F5",
    },
    fontPreference: "noto_sans_jp",
    defaultRegister: "standard",
    toneTags: ["gentle", "respectful", "compassionate"],
    toneDescription:
      "穏やかで寄り添うようなトーン。悲しみに共感し、安心感を与える表現。押し売り感は絶対にNG。",
    productCatalog: [
      {
        name: "ペットメモリアルサービス",
        description:
          "ご自宅までのお迎え、個別火葬、グリーフカウンセリング",
        keyFeatures: [
          "24時間対応",
          "個別火葬",
          "ご自宅お迎え",
          "グリーフカウンセリング",
        ],
        priceRange: "15,000-45,000円",
        targetSegment: "ペットを亡くされた方",
      },
    ],
    positioningStatement:
      "大切な家族との、最後の時間を、心を込めて",
    brandStory:
      "すべてのペットは家族です。にじの橋は、大切な家族とのお別れを、尊厳と愛情をもってお手伝いします。",
    targetMarket: "東京都内のペットオーナー",
    brandValues: [
      "尊厳",
      "共感",
      "安心",
    ],
  },
  testIntent:
    "Emotionally sensitive category requires appropriate tone -- not cheerful, not sales-y. Strategic Insight must classify desires around care/protection (LF8-7) not survival. Copywriter must avoid upbeat CTAs and promotional language. Art Director must avoid bright/cheerful imagery. JP Localization must flag any inappropriate tone for a grief-related service.",
}

// ===== Exports =====

/**
 * 5 standard test briefs covering cosmetics, food/restaurant, fashion,
 * personal service (nail salon), and online course.
 */
export const STANDARD_TEST_BRIEFS: TestBrief[] = [
  COSMETICS_BRIEF,
  FOOD_RESTAURANT_BRIEF,
  FASHION_BRIEF,
  NAIL_SALON_BRIEF,
  ONLINE_COURSE_BRIEF,
]

/**
 * 3 edge case briefs testing specific failure modes:
 * vague brief (sparse input), conflicting brief (contradictions),
 * unusual category (emotional sensitivity).
 */
export const EDGE_CASE_BRIEFS: TestBrief[] = [
  VAGUE_BRIEF,
  CONFLICTING_BRIEF,
  PET_MEMORIAL_BRIEF,
]

/**
 * All 8 test briefs combined (5 standard + 3 edge cases).
 */
export const ALL_TEST_BRIEFS: TestBrief[] = [
  ...STANDARD_TEST_BRIEFS,
  ...EDGE_CASE_BRIEFS,
]
