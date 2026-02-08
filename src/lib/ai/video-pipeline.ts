/**
 * Video/audio pipeline orchestrator.
 *
 * Coordinates all video and audio generation for a campaign in the
 * correct sequential order (cheapest first per research guidance):
 *   1. Voiceover (ElevenLabs, ~$0.05)
 *   2. Video ads (Kling via fal.ai, ~$0.70 each)
 *   3. Cinematic video (Runway Gen-4, ~$0.50)
 *   4. Avatar video (HeyGen, ~$1.00+)
 *
 * Each step is wrapped in try/catch -- individual failures are collected
 * in the errors array and do NOT halt the pipeline. This matches the
 * non-fatal pattern established in Phases 2-3.
 *
 * Designed to be called from both the direct generation fallback path
 * (campaigns/route.ts) and the n8n webhook handler.
 */

import type { CampaignBrief, CampaignProgress } from "@/types/campaign"
import { PLATFORM_ASPECT_RATIOS, FALLBACK_MAP } from "@/lib/constants/video-providers"
import { providerHealth } from "@/lib/ai/provider-health"

// ===== Types =====

export interface VideoPipelineInput {
  campaignId: string
  brief: CampaignBrief
  /** A-case headline + body text for voiceover script */
  copyText: string
  /** Composited image URLs to use as video input */
  compositedImageUrls: string[]
  /** Platforms selected in brief, used to determine required aspect ratios */
  platforms: string[]
  /** Callback to update campaign progress (partial merge) */
  updateProgress: (update: Partial<CampaignProgress>) => Promise<void>
}

export interface VideoPipelineResult {
  voiceover: { buffer: Buffer; durationEstimate: number } | null
  videos: Array<{
    url: string
    provider: string
    aspectRatio: string
    duration: number
    type: "ad" | "cinematic"
  }>
  avatarVideo: { url: string; provider: string; duration: number } | null
  errors: Array<{ stage: string; provider: string; message: string }>
}

// ===== Aspect ratio mapping: Kling format -> Runway format =====

const KLING_TO_RUNWAY_RATIO: Record<string, string> = {
  "16:9": "1280:720",
  "9:16": "720:1280",
  "1:1": "960:960",
}

// ===== Public API =====

/**
 * Run the full video/audio generation pipeline for a campaign.
 *
 * Generates voiceover, video ads, cinematic video, and avatar video
 * in sequential order. Each step has fallback routing via the provider
 * health circuit breaker.
 *
 * @returns Result containing all generated assets and any errors
 */
export async function runVideoPipeline(
  params: VideoPipelineInput
): Promise<VideoPipelineResult> {
  const { brief, copyText, compositedImageUrls, platforms, updateProgress } =
    params

  const result: VideoPipelineResult = {
    voiceover: null,
    videos: [],
    avatarVideo: null,
    errors: [],
  }

  // Determine required aspect ratios from selected platforms
  const requiredRatios = new Set<string>()
  for (const platform of platforms) {
    const ratios = PLATFORM_ASPECT_RATIOS[platform]
    if (ratios) {
      for (const ratio of ratios) {
        requiredRatios.add(ratio)
      }
    }
  }

  // If no video-capable platforms selected, skip entire pipeline
  if (requiredRatios.size === 0) {
    await updateProgress({
      voiceoverStatus: "skipped",
      videoStatus: "skipped",
      avatarStatus: "skipped",
      currentStep: "動画対応プラットフォームが未選択",
    })
    return result
  }

  // ---------------------------------------------------------------------------
  // Step 1: Voiceover (ElevenLabs, ~$0.05)
  // ---------------------------------------------------------------------------
  let voiceoverFailed = false

  try {
    await updateProgress({
      voiceoverStatus: "generating",
      currentStep: "ナレーション生成中...",
    })

    const { generateJapaneseVoiceover } = await import(
      "@/lib/ai/elevenlabs"
    )

    const voiceId =
      process.env.ELEVENLABS_VOICE_ID_JP_FEMALE || "default-voice-id"

    const voiceoverResult = await generateJapaneseVoiceover(copyText, voiceId)

    result.voiceover = voiceoverResult
    providerHealth.recordSuccess("elevenlabs")

    await updateProgress({ voiceoverStatus: "complete" })
  } catch (error) {
    voiceoverFailed = true
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("Video pipeline [voiceover] failed:", error)
    providerHealth.recordFailure("elevenlabs")
    result.errors.push({ stage: "voiceover", provider: "elevenlabs", message })

    await updateProgress({ voiceoverStatus: "failed" })
    // Continue -- voiceover failure does NOT halt video generation
    // But we skip avatar step (avatar needs voiceover for lip-sync)
  }

  // ---------------------------------------------------------------------------
  // Step 2: Video ads (Kling via fal.ai, ~$0.70 each)
  // ---------------------------------------------------------------------------
  try {
    await updateProgress({
      videoStatus: "generating",
      currentStep: "動画広告生成中...",
    })

    const { generateKlingVideo } = await import("@/lib/ai/kling")
    const { generateCinematicVideo } = await import("@/lib/ai/runway")

    const firstImage = compositedImageUrls[0]
    if (!firstImage) {
      throw new Error("No composited images available for video generation")
    }

    const videoPrompt =
      brief.creativeDirection ||
      `${brief.objective} - Professional Japanese advertising video`

    // Generate aspect ratios sequentially (not parallel) per research guidance
    for (const ratio of requiredRatios) {
      try {
        let videoUrl: string
        let provider: string

        const klingHealthy = providerHealth.shouldUseProvider("kling")

        if (klingHealthy) {
          // Try Kling first (primary for video ads)
          try {
            videoUrl = await generateKlingVideo(videoPrompt, {
              imageUrl: firstImage,
              aspectRatio: ratio as "16:9" | "9:16" | "1:1",
              duration: 10,
            })
            provider = "kling"
            providerHealth.recordSuccess("kling")
          } catch (klingError) {
            // Kling failed -- fallback to Runway
            console.error(
              `Video pipeline [video-ad] Kling failed for ${ratio}:`,
              klingError
            )
            providerHealth.recordFailure("kling")

            const runwayRatio = KLING_TO_RUNWAY_RATIO[ratio] || "1280:720"
            videoUrl = await generateCinematicVideo(firstImage, videoPrompt, {
              ratio: runwayRatio as "1280:720" | "720:1280" | "960:960",
              duration: 10,
            })
            provider = "runway"
            providerHealth.recordSuccess("runway")
          }
        } else {
          // Kling circuit open -- go directly to Runway fallback
          const runwayRatio = KLING_TO_RUNWAY_RATIO[ratio] || "1280:720"
          videoUrl = await generateCinematicVideo(firstImage, videoPrompt, {
            ratio: runwayRatio as "1280:720" | "720:1280" | "960:960",
            duration: 10,
          })
          provider = "runway"
          providerHealth.recordSuccess("runway")
        }

        result.videos.push({
          url: videoUrl,
          provider,
          aspectRatio: ratio,
          duration: 10,
          type: "ad",
        })
      } catch (ratioError) {
        const message =
          ratioError instanceof Error ? ratioError.message : "Unknown error"
        console.error(
          `Video pipeline [video-ad] failed for ratio ${ratio}:`,
          ratioError
        )
        result.errors.push({
          stage: "video-ad",
          provider: "kling/runway",
          message: `${ratio}: ${message}`,
        })
        // Continue with next ratio
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("Video pipeline [video-ads] failed:", error)
    result.errors.push({
      stage: "video-ads",
      provider: "kling",
      message,
    })
  }

  // ---------------------------------------------------------------------------
  // Step 3: Cinematic video (Runway Gen-4, ~$0.50)
  // ---------------------------------------------------------------------------
  try {
    const firstImage = compositedImageUrls[0]
    if (!firstImage) {
      throw new Error("No composited images available for cinematic video")
    }

    await updateProgress({ currentStep: "シネマティック動画生成中..." })

    const { generateCinematicVideo } = await import("@/lib/ai/runway")

    const cinematicPrompt =
      brief.creativeDirection
        ? `Cinematic: ${brief.creativeDirection}`
        : `Cinematic Japanese advertisement for ${brief.objective}`

    const runwayHealthy = providerHealth.shouldUseProvider("runway")

    let videoUrl: string
    let provider: string

    if (runwayHealthy) {
      try {
        videoUrl = await generateCinematicVideo(firstImage, cinematicPrompt, {
          ratio: "1280:720",
          duration: 10,
        })
        provider = "runway"
        providerHealth.recordSuccess("runway")
      } catch (runwayError) {
        // Runway failed -- fallback to Kling
        console.error(
          "Video pipeline [cinematic] Runway failed:",
          runwayError
        )
        providerHealth.recordFailure("runway")

        const { generateKlingVideo } = await import("@/lib/ai/kling")
        videoUrl = await generateKlingVideo(cinematicPrompt, {
          imageUrl: firstImage,
          aspectRatio: "16:9",
          duration: 10,
        })
        provider = "kling"
        providerHealth.recordSuccess("kling")
      }
    } else {
      // Runway circuit open -- go directly to Kling fallback
      const { generateKlingVideo } = await import("@/lib/ai/kling")
      videoUrl = await generateKlingVideo(cinematicPrompt, {
        imageUrl: firstImage,
        aspectRatio: "16:9",
        duration: 10,
      })
      provider = "kling"
      providerHealth.recordSuccess("kling")
    }

    result.videos.push({
      url: videoUrl,
      provider,
      aspectRatio: "16:9",
      duration: 10,
      type: "cinematic",
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("Video pipeline [cinematic] failed:", error)
    result.errors.push({ stage: "cinematic", provider: "runway/kling", message })
  }

  // ---------------------------------------------------------------------------
  // Step 4: Avatar video (HeyGen, ~$1.00+)
  // ---------------------------------------------------------------------------
  if (!voiceoverFailed) {
    try {
      await updateProgress({
        avatarStatus: "generating",
        currentStep: "アバター動画生成中...",
      })

      const { generateAvatarVideo } = await import("@/lib/ai/heygen")

      const avatarId = process.env.HEYGEN_DEFAULT_AVATAR_ID
      const voiceId = process.env.HEYGEN_JP_VOICE_ID

      if (!avatarId || !voiceId) {
        throw new Error(
          "HEYGEN_DEFAULT_AVATAR_ID or HEYGEN_JP_VOICE_ID not configured"
        )
      }

      const avatarUrl = await generateAvatarVideo({
        avatarId,
        voiceId,
        script: copyText,
        dimension: { width: 1080, height: 1920 }, // 9:16 portrait
      })

      providerHealth.recordSuccess("heygen")

      result.avatarVideo = {
        url: avatarUrl,
        provider: "heygen",
        duration: 10,
      }

      await updateProgress({ avatarStatus: "complete" })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error"
      console.error("Video pipeline [avatar] failed:", error)
      providerHealth.recordFailure("heygen")
      result.errors.push({ stage: "avatar", provider: "heygen", message })

      await updateProgress({ avatarStatus: "failed" })
    }
  } else {
    // Skip avatar -- voiceover failed so no lip-sync source
    await updateProgress({ avatarStatus: "skipped" })
  }

  // ---------------------------------------------------------------------------
  // Final status update
  // ---------------------------------------------------------------------------
  const hasAnyVideo = result.videos.length > 0

  await updateProgress({
    videoStatus: hasAnyVideo ? "complete" : "failed",
    avatarStatus: result.avatarVideo
      ? "complete"
      : voiceoverFailed
        ? "skipped"
        : "failed",
    currentStep: hasAnyVideo
      ? "動画生成完了"
      : "動画生成に失敗しました",
  })

  return result
}
