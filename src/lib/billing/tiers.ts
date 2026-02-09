import { STRIPE_PRICE_IDS, getTierIdByPriceId } from "@/lib/stripe/config"

export interface TierConfig {
  id: string
  nameJa: string
  nameEn: string
  monthlyPriceJpy: number
  monthlyCredits: number
  maxBrands: number // -1 = unlimited
  maxTeamMembers: number // -1 = unlimited
  features: string[]
}

export const TIERS: TierConfig[] = [
  {
    id: "free",
    nameJa: "フリー",
    nameEn: "Free",
    monthlyPriceJpy: 0,
    monthlyCredits: 10,
    maxBrands: 1,
    maxTeamMembers: 1,
    features: ["copy_generation", "image_generation"],
  },
  {
    id: "starter",
    nameJa: "スターター",
    nameEn: "Starter",
    monthlyPriceJpy: 5000,
    monthlyCredits: 100,
    maxBrands: 3,
    maxTeamMembers: 2,
    features: ["copy_generation", "image_generation", "basic_qa"],
  },
  {
    id: "pro",
    nameJa: "プロ",
    nameEn: "Pro",
    monthlyPriceJpy: 15000,
    monthlyCredits: 500,
    maxBrands: 10,
    maxTeamMembers: 5,
    features: [
      "copy_generation",
      "image_generation",
      "basic_qa",
      "video",
      "qa",
      "compliance",
      "approval",
    ],
  },
  {
    id: "business",
    nameJa: "ビジネス",
    nameEn: "Business",
    monthlyPriceJpy: 50000,
    monthlyCredits: 2000,
    maxBrands: -1,
    maxTeamMembers: -1,
    features: [
      "copy_generation",
      "image_generation",
      "basic_qa",
      "video",
      "qa",
      "compliance",
      "approval",
      "avatar",
      "priority_support",
    ],
  },
]

/**
 * Look up a tier by its ID (free, starter, pro, business).
 */
export function getTierById(id: string): TierConfig | undefined {
  return TIERS.find((t) => t.id === id)
}

/**
 * Look up a tier by its Stripe price ID.
 * Uses the price-to-tier reverse mapping from config.
 */
export function getTierByPriceId(priceId: string): TierConfig | undefined {
  const tierId = getTierIdByPriceId(priceId)
  if (!tierId) return undefined
  return getTierById(tierId)
}

/**
 * Format a number as Japanese Yen currency string.
 */
export function formatJPY(amount: number): string {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
  }).format(amount)
}
