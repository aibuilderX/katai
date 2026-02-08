/**
 * Runway Gen-4 Turbo image-to-video client.
 *
 * Uses the official @runwayml/sdk with async submit-poll-retrieve pattern.
 * Generates cinematic video from a reference image and text prompt.
 *
 * Model: gen4_turbo (5 credits/sec = $0.05/sec)
 * Max duration: 10 seconds
 * Supported ratios: 1280:720, 720:1280, 1104:832, 832:1104, 960:960, 1584:672
 *
 * @see https://docs.dev.runwayml.com/
 */

import RunwayML from "@runwayml/sdk"

/**
 * Valid aspect ratios for Runway Gen-4 Turbo model.
 * These map to the SDK's type-checked ratio union.
 */
type RunwayRatio =
  | "1280:720"
  | "720:1280"
  | "1104:832"
  | "832:1104"
  | "960:960"
  | "1584:672"

/**
 * Generate a cinematic video from an image using Runway Gen-4 Turbo.
 *
 * Submits an image-to-video generation task, polls for completion,
 * and returns the video URL on success.
 *
 * @param imageUrl - HTTPS URL of the source image (first frame)
 * @param promptText - Text prompt describing the desired video motion/content (max 1000 chars)
 * @param options - Optional ratio and duration overrides
 * @param options.ratio - Output resolution ratio (default: "1280:720" for 16:9)
 * @param options.duration - Video duration in seconds (default: 10)
 * @returns URL to the generated video (expires in 24-48 hours -- download immediately)
 * @throws Error if RUNWAYML_API_SECRET is not set, generation fails, or times out
 */
export async function generateCinematicVideo(
  imageUrl: string,
  promptText: string,
  options?: { ratio?: RunwayRatio; duration?: number }
): Promise<string> {
  const apiSecret = process.env.RUNWAYML_API_SECRET
  if (!apiSecret) {
    throw new Error(
      "RUNWAYML_API_SECRET is not set. Get your API key from https://app.runwayml.com"
    )
  }

  const client = new RunwayML({ apiKey: apiSecret })

  // Submit image-to-video generation task
  const task = await client.imageToVideo.create({
    model: "gen4_turbo",
    promptImage: imageUrl,
    promptText,
    ratio: options?.ratio ?? "1280:720",
    duration: options?.duration ?? 10,
  })

  const taskId = task.id

  // Poll for completion (5s intervals, max 60 attempts = 5 min timeout)
  const maxAttempts = 60
  let attempts = 0

  while (attempts < maxAttempts) {
    await new Promise((resolve) => setTimeout(resolve, 5000))
    attempts++

    console.log(
      `Runway poll attempt ${attempts}/${maxAttempts} for task ${taskId}`
    )

    const result = await client.tasks.retrieve(taskId)

    if (result.status === "SUCCEEDED") {
      if (result.output?.[0]) {
        return result.output[0]
      }
      throw new Error(
        `Runway task ${taskId} marked SUCCEEDED but no output URL returned`
      )
    }

    if (result.status === "FAILED") {
      const failure =
        "failure" in result ? (result as { failure?: string }).failure : "unknown"
      throw new Error(
        `Runway generation failed for task ${taskId}: ${failure}`
      )
    }

    if (result.status === "CANCELLED") {
      throw new Error(`Runway task ${taskId} was cancelled`)
    }

    // PENDING, RUNNING, THROTTLED -- continue polling
  }

  throw new Error(
    `Runway generation timed out after ${maxAttempts * 5}s for task ${taskId}`
  )
}
