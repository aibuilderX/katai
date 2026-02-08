/**
 * HeyGen AI avatar video generation client.
 *
 * Uses HeyGen REST API to generate avatar presenter videos
 * with Japanese lip-sync. The avatar reads the provided script
 * with the specified voice.
 *
 * Auth: X-Api-Key header
 * Cost: ~$0.50/credit, 1 credit/min (Photo Avatar), 6 credits/min (Avatar IV)
 * Max duration: 60 seconds (Scale plan)
 *
 * @see https://docs.heygen.com/reference/create-an-avatar-video-v2
 */

const HEYGEN_API_BASE = "https://api.heygen.com"

interface HeyGenGenerateResponse {
  error: string | null
  data: {
    video_id: string
  }
}

interface HeyGenStatusResponse {
  error: string | null
  data: {
    status: "pending" | "processing" | "completed" | "failed"
    video_url?: string
    error?: string
  }
}

/**
 * Generate an AI avatar presenter video using HeyGen.
 *
 * Creates a video of a selected avatar reading the provided script
 * with the specified voice. Supports Japanese lip-sync and custom
 * output dimensions.
 *
 * @param params - Avatar video configuration
 * @param params.avatarId - HeyGen avatar ID (from dashboard or GET /v2/avatars)
 * @param params.voiceId - HeyGen voice ID (from dashboard or GET /v2/voices)
 * @param params.script - Text for the avatar to speak (Japanese supported)
 * @param params.dimension - Output dimensions (default: 1920x1080 for 16:9)
 * @returns URL to the generated video
 * @throws Error if HEYGEN_API_KEY is not set, generation fails, or times out (10 min)
 */
export async function generateAvatarVideo(params: {
  avatarId: string
  voiceId: string
  script: string
  dimension?: { width: number; height: number }
}): Promise<string> {
  const apiKey = process.env.HEYGEN_API_KEY
  if (!apiKey) {
    throw new Error(
      "HEYGEN_API_KEY is not set. Get your API key from https://app.heygen.com/settings"
    )
  }

  // Submit video generation request
  const genRes = await fetch(`${HEYGEN_API_BASE}/v2/video/generate`, {
    method: "POST",
    headers: {
      "X-Api-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      video_inputs: [
        {
          character: {
            type: "avatar",
            avatar_id: params.avatarId,
            avatar_style: "normal",
          },
          voice: {
            type: "text",
            voice_id: params.voiceId,
            input_text: params.script,
            speed: 1.0,
          },
        },
      ],
      dimension: params.dimension ?? { width: 1920, height: 1080 },
    }),
  })

  if (!genRes.ok) {
    const errorText = await genRes.text()
    throw new Error(
      `HeyGen submit failed (${genRes.status}): ${errorText}`
    )
  }

  const genData: HeyGenGenerateResponse = await genRes.json()

  if (genData.error) {
    throw new Error(`HeyGen generation error: ${genData.error}`)
  }

  const videoId = genData.data?.video_id
  if (!videoId) {
    throw new Error("HeyGen did not return a video_id")
  }

  // Poll for completion (5s intervals, max 120 attempts = 10 min timeout)
  // Avatar videos typically take 2-5 minutes
  const maxAttempts = 120
  let attempts = 0

  while (attempts < maxAttempts) {
    await new Promise((resolve) => setTimeout(resolve, 5000))
    attempts++

    console.log(
      `HeyGen poll attempt ${attempts}/${maxAttempts} for video ${videoId}`
    )

    const statusRes = await fetch(
      `${HEYGEN_API_BASE}/v1/video_status.get?video_id=${videoId}`,
      {
        headers: { "X-Api-Key": apiKey },
      }
    )

    if (!statusRes.ok) {
      // Transient error -- retry
      continue
    }

    const statusData: HeyGenStatusResponse = await statusRes.json()

    if (statusData.data?.status === "completed") {
      const videoUrl = statusData.data.video_url
      if (!videoUrl) {
        throw new Error(
          `HeyGen video ${videoId} completed but no video_url returned`
        )
      }
      return videoUrl
    }

    if (statusData.data?.status === "failed") {
      throw new Error(
        `HeyGen video generation failed for ${videoId}: ${statusData.data.error ?? "unknown error"}`
      )
    }

    // pending or processing -- continue polling
  }

  throw new Error(
    `HeyGen generation timed out after ${maxAttempts * 5}s for video ${videoId}`
  )
}
