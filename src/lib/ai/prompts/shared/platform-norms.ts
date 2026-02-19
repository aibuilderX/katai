/**
 * Japanese platform advertising norms for LINE, Instagram, and X.
 *
 * Centralizes platform-specific conventions that the Copywriter agent uses
 * to generate platform-appropriate advertising copy. Each platform has distinct
 * tone, format, CTA style, and audience expectations in the Japanese market.
 *
 * All string content in English (system prompts are English per research
 * recommendation). Japanese labels provided as separate fields where needed.
 *
 * @see .planning/phases/09.1-agent-prompt-engineering-photorealistic-output/09.1-RESEARCH.md#4.3
 */

// ===== Types =====

export interface PlatformNorm {
  id: "line" | "instagram" | "x"
  name: string
  nameJa: string
  userBase: string
  tone: string
  format: string
  ctaStyle: string
  characterLimits: {
    title: number | null
    description: number | null
    body: number | null
  }
  hashtagStrategy: string
  keyInsight: string
  keyInsightJa: string
}

// ===== Platform Norms =====

/**
 * Japanese platform advertising norms keyed by platform ID.
 * LINE (96M+ users), Instagram (56M+ users), X (67M+ users).
 */
export const PLATFORM_NORMS: Record<string, PlatformNorm> = {
  line: {
    id: "line",
    name: "LINE",
    nameJa: "LINE",
    userBase: "96M+ users, Japan's #1 messaging platform",
    tone: "Friendly and conversational, like messaging a friend. Warm, approachable, value-first. Emoji acceptable but controlled — avoid overuse. Awareness of sticker culture.",
    format:
      "Short messages optimized for mobile chat interface. Rich message format with title + description + image. Concise and scannable — users scroll quickly through message feeds.",
    ctaStyle:
      "Soft CTAs preferred. Use invitational language: 'Check it out' style rather than hard sell commands. Examples: 'Learn more here', 'Give it a try'. Hard promotional CTAs cause users to block the account quickly.",
    characterLimits: {
      title: 20,
      description: 50,
      body: 500,
    },
    hashtagStrategy:
      "Not applicable for LINE messages. Hashtags are not part of LINE advertising conventions.",
    keyInsight:
      "LINE users expect value-first messaging. Overly promotional content gets blocked quickly. The platform is personal — treat it like a trusted friend sharing a recommendation, not a billboard.",
    keyInsightJa:
      "LINEユーザーは価値提供を期待。過度な宣伝はブロックされやすい。信頼できる友人からのおすすめのように伝えること。",
  },
  instagram: {
    id: "instagram",
    name: "Instagram",
    nameJa: "インスタグラム",
    userBase: "56M+ users in Japan",
    tone: "Visual-first, aspirational but authentic. Balance between polished aesthetics and genuine relatability. Japanese Instagram users value both beauty and honesty.",
    format:
      "Longer captions acceptable (up to 2200 characters). Image/Reel-first with supporting caption. Stories and Reels drive high engagement in Japan. Caption quality matters more than on Western Instagram.",
    ctaStyle:
      "Engagement-focused CTAs. Encourage likes, saves, comments, and sharing. Use participatory language: 'Tell us in the comments', 'Like and save for later'. Community-building over direct sales.",
    characterLimits: {
      title: null,
      description: null,
      body: 2200,
    },
    hashtagStrategy:
      "Mix of Japanese and English hashtags, 3-10 per post. Include niche community tags alongside broader category tags. Japanese hashtag culture is strong — relevant tags significantly increase discovery. Avoid generic English-only hashtags.",
    keyInsight:
      "Japanese Instagram users are highly engaged with Stories and Reels. Caption quality matters more than on Western Instagram — users actually read captions. Visual aesthetics are expected to be high, but overly perfect content is losing ground to authentic content.",
    keyInsightJa:
      "日本のInstagramユーザーはストーリーズとリールに高い関心。キャプションの質が重要。ビジュアルの美しさは期待されるが、本物感も求められる。",
  },
  x: {
    id: "x",
    name: "X (Twitter)",
    nameJa: "X（旧Twitter）",
    userBase: "67M+ users, one of the world's largest X markets",
    tone: "Informational, witty, or trend-riding. Can be more direct and opinionated than other platforms. Anonymous culture means users are more candid and responsive to bold statements.",
    format:
      "140 character limit (Japanese characters convey more meaning per character than English). Thread culture for longer content. Single tweet must be self-contained and impactful. Quote tweets and replies extend reach.",
    ctaStyle:
      "Retweet-oriented CTAs. Encourage sharing and engagement through questions, polls, and relatable statements. Use participatory language and trending formats. Direct purchase CTAs work when combined with urgency.",
    characterLimits: {
      title: null,
      description: null,
      body: 140,
    },
    hashtagStrategy:
      "Trending topic hashtags drive massive engagement in Japan. Seasonal and event hashtags are critical. Keep hashtags concise (1-3 per tweet) to maximize character space. Japanese-language hashtags outperform English ones for local reach.",
    keyInsight:
      "Japan has one of the world's largest X user bases. Anonymous culture means users are more opinionated and responsive. Trending topics matter enormously — riding trends with relevant content generates outsized engagement. Seasonal and event hashtags drive massive spikes.",
    keyInsightJa:
      "日本はX利用者数が世界トップクラス。匿名文化で率直な反応が多い。トレンドトピックの活用が非常に重要。季節・イベントのハッシュタグが大きなエンゲージメントを生む。",
  },
} as const
