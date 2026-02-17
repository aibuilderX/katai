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

import type { PipelineMilestone } from "@/types/pipeline"

/**
 * Real-time progress tracking for campaign generation.
 */
export interface CampaignProgress {
  stage: string
  copyStatus: "pending" | "generating" | "complete" | "failed"
  imageStatus: "pending" | "generating" | "complete" | "failed"
  compositingStatus?: "pending" | "generating" | "complete" | "failed"
  platformResizeStatus?: "pending" | "generating" | "complete" | "failed"
  emailStatus?: "pending" | "generating" | "complete" | "failed"
  voiceoverStatus?: "pending" | "generating" | "complete" | "failed" | "skipped"
  videoStatus?: "pending" | "generating" | "complete" | "failed" | "skipped"
  avatarStatus?: "pending" | "generating" | "complete" | "failed" | "skipped"
  percentComplete: number
  currentStep: string
  // v1.1 milestone-based progress (optional -- only present for v1.1 pipeline)
  milestones?: PipelineMilestone[]
  pipelineVersion?: "v1.0" | "v1.1"
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
