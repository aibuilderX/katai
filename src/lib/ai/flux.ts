/**
 * Flux 1.1 Pro Ultra API client for image generation.
 *
 * Uses async submit + poll pattern:
 * 1. POST to /flux-pro-1.1-ultra to submit generation request
 * 2. Poll GET /get_result?id={id} every 2 seconds until Ready
 *
 * API: https://api.bfl.ml/v1
 * Cost: ~$0.06 per image
 */

import {
  buildImagePrompt,
  buildImagePromptVariations,
} from "./prompts/image-generation"
import type { CampaignBrief } from "@/types/campaign"

const BFL_API_BASE = "https://api.bfl.ml/v1"

interface FluxSubmitResponse {
  id: string
}

interface FluxResultResponse {
  id: string
  status: "Pending" | "Ready" | "Error" | "Request Moderated" | "Content Moderated" | "Task not found"
  result?: {
    sample: string // URL to generated image
    prompt: string
    seed: number
  }
}

interface GenerateImageOptions {
  width?: number
  height?: number
  raw?: boolean
  seed?: number
}

/**
 * Generate a single image using Flux 1.1 Pro Ultra.
 *
 * @param prompt - Image generation prompt (English, no Japanese text)
 * @param options - Width, height, raw mode, seed
 * @returns URL to generated image
 * @throws Error on generation failure or timeout
 */
export async function generateImage(
  prompt: string,
  options: GenerateImageOptions = {}
): Promise<string> {
  const apiKey = process.env.BFL_API_KEY
  if (!apiKey) {
    throw new Error("BFL_API_KEY environment variable is not set")
  }

  // Submit generation request
  const submitResponse = await fetch(`${BFL_API_BASE}/flux-pro-1.1-ultra`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Key": apiKey,
    },
    body: JSON.stringify({
      prompt,
      width: options.width ?? 1024,
      height: options.height ?? 1024,
      prompt_upsampling: true,
      raw: options.raw ?? false,
      ...(options.seed !== undefined ? { seed: options.seed } : {}),
    }),
  })

  if (!submitResponse.ok) {
    const errorText = await submitResponse.text()
    throw new Error(
      `Flux API submit failed (${submitResponse.status}): ${errorText}`
    )
  }

  const submitResult: FluxSubmitResponse = await submitResponse.json()
  const taskId = submitResult.id

  if (!taskId) {
    throw new Error("Flux API did not return a task ID")
  }

  // Poll for result (Flux generation is asynchronous)
  const maxAttempts = 30 // 30 * 2s = 60s timeout
  let attempts = 0

  while (attempts < maxAttempts) {
    await new Promise((resolve) => setTimeout(resolve, 2000))
    attempts++

    const statusResponse = await fetch(
      `${BFL_API_BASE}/get_result?id=${taskId}`,
      {
        headers: {
          "X-Key": apiKey,
        },
      }
    )

    if (!statusResponse.ok) {
      // Transient error - retry
      continue
    }

    const result: FluxResultResponse = await statusResponse.json()

    switch (result.status) {
      case "Ready":
        if (result.result?.sample) {
          return result.result.sample
        }
        throw new Error(
          `Flux task ${taskId} marked Ready but no sample URL returned`
        )

      case "Error":
        throw new Error(`Flux generation failed for task ${taskId}`)

      case "Request Moderated":
      case "Content Moderated":
        throw new Error(
          `Flux generation moderated for task ${taskId}: ${result.status}`
        )

      case "Task not found":
        throw new Error(`Flux task ${taskId} not found`)

      case "Pending":
        // Still processing - continue polling
        break

      default:
        // Unknown status - continue polling
        break
    }
  }

  throw new Error(
    `Flux generation timed out after ${maxAttempts * 2}s for task ${taskId}`
  )
}

interface BrandProfileForImages {
  name: string
  colors?: { primary: string; secondary: string; accent: string; background: string } | null
  toneTags?: string[] | null
  targetMarket?: string | null
}

/**
 * Generate multiple campaign images with prompt variations.
 *
 * Each image uses a slightly different prompt variation to provide
 * diverse visual options while maintaining brand consistency.
 *
 * @param brief - Campaign brief with creative direction
 * @param brand - Brand profile with colors and tone
 * @param count - Number of images to generate (default 4)
 * @returns Array of image URLs
 */
export async function generateCampaignImages(
  brief: CampaignBrief | Record<string, unknown>,
  brand: BrandProfileForImages | Record<string, unknown>,
  count: number = 4
): Promise<string[]> {
  const typedBrief = brief as CampaignBrief
  const typedBrand = brand as BrandProfileForImages

  const prompts = buildImagePromptVariations(typedBrief, typedBrand, count)

  // Generate images sequentially to avoid rate limiting
  const imageUrls: string[] = []

  for (const prompt of prompts) {
    try {
      const url = await generateImage(prompt, {
        width: 1024,
        height: 1024,
      })
      imageUrls.push(url)
    } catch (error) {
      console.error("Flux image generation failed for one image:", error)
      // Continue generating remaining images even if one fails
    }
  }

  if (imageUrls.length === 0) {
    throw new Error("All image generations failed")
  }

  return imageUrls
}
