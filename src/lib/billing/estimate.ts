export interface CreditEstimate {
  copyCredits: number
  imageCredits: number
  videoCredits: number
  voiceoverCredits: number
  avatarCredits: number
  totalCredits: number
}

/**
 * Estimate the credit cost of a campaign based on brief parameters.
 *
 * Credit costs:
 * - Copy: 2 credits per platform
 * - Images: 4 base images x 3 credits each = 12 credits
 * - Video: 10 credits per platform (optional)
 * - Voiceover: 5 credits flat (optional)
 * - Avatar: 15 credits flat (optional)
 */
export function estimateCampaignCost(brief: {
  platforms: string[]
  includeVideo?: boolean
  includeVoiceover?: boolean
  includeAvatar?: boolean
}): CreditEstimate {
  const platformCount = brief.platforms.length

  const copyCredits = platformCount * 2
  const imageCredits = 4 * 3 // 4 base images x 3 credits each
  const videoCredits = brief.includeVideo ? platformCount * 10 : 0
  const voiceoverCredits = brief.includeVoiceover ? 5 : 0
  const avatarCredits = brief.includeAvatar ? 15 : 0

  const totalCredits =
    copyCredits + imageCredits + videoCredits + voiceoverCredits + avatarCredits

  return {
    copyCredits,
    imageCredits,
    videoCredits,
    voiceoverCredits,
    avatarCredits,
    totalCredits,
  }
}
