/**
 * Kling video generation client via fal.ai proxy.
 *
 * Uses fal.ai as a proxy to access Kling models with simple API key auth
 * instead of JWT token management. Supports both text-to-video and
 * image-to-video generation.
 *
 * Model: Kling v2.6 Pro (via fal.ai)
 * Max duration: 10 seconds (5 or 10)
 * Supported ratios: 16:9, 9:16, 1:1
 * Cost: ~$0.07/sec via fal.ai
 *
 * @see https://fal.ai/models/fal-ai/kling-video
 */

const FAL_API_BASE = "https://queue.fal.run"

interface FalSubmitResponse {
  request_id: string
}

interface FalStatusResponse {
  status: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED" | "FAILED"
  error?: string
}

interface FalResultResponse {
  video?: { url: string }
  output?: { url: string }
}

/**
 * Generate a video using Kling via the fal.ai proxy.
 *
 * Supports both text-to-video (prompt only) and image-to-video (prompt + imageUrl).
 * Uses async submit-poll-retrieve pattern with fal.ai queue API.
 *
 * @param prompt - Text prompt describing the desired video content
 * @param options - Generation options
 * @param options.imageUrl - Source image URL for image-to-video mode
 * @param options.duration - Video duration: 5 or 10 seconds (default: 5)
 * @param options.aspectRatio - Output aspect ratio (default: "16:9")
 * @param options.withAudio - Enable native audio generation (default: false)
 * @returns URL to the generated video
 * @throws Error if FAL_KEY is not set, generation fails, or times out
 */
export async function generateKlingVideo(
  prompt: string,
  options?: {
    imageUrl?: string
    duration?: 5 | 10
    aspectRatio?: "16:9" | "9:16" | "1:1"
    withAudio?: boolean
  }
): Promise<string> {
  const apiKey = process.env.FAL_KEY
  if (!apiKey) {
    throw new Error(
      "FAL_KEY is not set. Get your API key from https://fal.ai/dashboard/keys"
    )
  }

  // Select endpoint based on whether an image is provided
  const endpoint = options?.imageUrl
    ? "fal-ai/kling-video/v2.6/pro/image-to-video"
    : "fal-ai/kling-video/v2.6/pro/text-to-video"

  // Submit generation request
  const submitRes = await fetch(`${FAL_API_BASE}/${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      ...(options?.imageUrl ? { image_url: options.imageUrl } : {}),
      duration: String(options?.duration ?? 5),
      aspect_ratio: options?.aspectRatio ?? "16:9",
      ...(options?.withAudio ? { enable_audio: true } : {}),
    }),
  })

  if (!submitRes.ok) {
    const errorText = await submitRes.text()
    throw new Error(
      `Kling submit failed (${submitRes.status}): ${errorText}`
    )
  }

  const { request_id }: FalSubmitResponse = await submitRes.json()

  if (!request_id) {
    throw new Error("Kling/fal.ai did not return a request_id")
  }

  // Poll for completion (5s intervals, max 60 attempts = 5 min timeout)
  const maxAttempts = 60
  let attempts = 0

  while (attempts < maxAttempts) {
    await new Promise((resolve) => setTimeout(resolve, 5000))
    attempts++

    console.log(
      `Kling poll attempt ${attempts}/${maxAttempts} for request ${request_id}`
    )

    const statusRes = await fetch(
      `${FAL_API_BASE}/${endpoint}/requests/${request_id}/status`,
      {
        headers: { Authorization: `Key ${apiKey}` },
      }
    )

    if (!statusRes.ok) {
      // Transient error -- retry
      continue
    }

    const status: FalStatusResponse = await statusRes.json()

    if (status.status === "COMPLETED") {
      // Fetch the result
      const resultRes = await fetch(
        `${FAL_API_BASE}/${endpoint}/requests/${request_id}`,
        {
          headers: { Authorization: `Key ${apiKey}` },
        }
      )

      if (!resultRes.ok) {
        throw new Error(
          `Kling result fetch failed (${resultRes.status}) for request ${request_id}`
        )
      }

      const result: FalResultResponse = await resultRes.json()
      const videoUrl = result.video?.url ?? result.output?.url

      if (!videoUrl) {
        throw new Error(
          `Kling request ${request_id} completed but no video URL in result`
        )
      }

      return videoUrl
    }

    if (status.status === "FAILED") {
      throw new Error(
        `Kling generation failed for request ${request_id}: ${status.error ?? "unknown error"}`
      )
    }

    // IN_QUEUE or IN_PROGRESS -- continue polling
  }

  throw new Error(
    `Kling generation timed out after ${maxAttempts * 5}s for request ${request_id}`
  )
}
