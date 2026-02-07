/**
 * Campaign brief submitted by the user.
 * Combines brand-level and campaign-level context for generation.
 */
export interface CampaignBrief {
  brandProfileId: string
  objective: string
  targetAudience: string
  platforms: string[]
  registerOverride?: string
  creativeMoodTags: string[]
  creativeDirection: string
  referenceImageUrl?: string
  campaignProductInfo?: string
}

/**
 * Real-time progress tracking for campaign generation.
 */
export interface CampaignProgress {
  stage: string
  copyStatus: "pending" | "generating" | "complete" | "failed"
  imageStatus: "pending" | "generating" | "complete" | "failed"
  percentComplete: number
  currentStep: string
}

/**
 * Individual copy variant generated for a specific platform.
 */
export interface CopyVariantData {
  headline: string
  bodyText: string
  ctaText: string
  hashtags: string[]
  platform: string
  variantLabel: string
  register: string
}

/**
 * Error entry in campaign error log.
 */
export interface ErrorEntry {
  timestamp: string
  stage: string
  message: string
  details?: string
}

/**
 * Campaign status options.
 */
export type CampaignStatus =
  | "pending"
  | "generating"
  | "complete"
  | "failed"
  | "partial"
