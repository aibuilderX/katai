export const STRIPE_PRICE_IDS = {
  starter: process.env.STRIPE_STARTER_PRICE_ID!,
  pro: process.env.STRIPE_PRO_PRICE_ID!,
  business: process.env.STRIPE_BUSINESS_PRICE_ID!,
} as const

/**
 * Reverse-lookup tier ID from a Stripe price ID.
 * Returns undefined if no matching tier found.
 */
export function getTierIdByPriceId(priceId: string): string | undefined {
  const entries = Object.entries(STRIPE_PRICE_IDS) as [string, string][]
  const match = entries.find(([, id]) => id === priceId)
  return match?.[0]
}

export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
