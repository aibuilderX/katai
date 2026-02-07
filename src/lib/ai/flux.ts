/**
 * Flux 1.1 Pro Ultra API client for image generation.
 * Stub: full implementation in Task 2.
 */

/**
 * Generate a single image using Flux 1.1 Pro Ultra.
 * Uses async submit + poll pattern.
 */
export async function generateImage(
  _prompt: string,
  _options?: { width?: number; height?: number; raw?: boolean }
): Promise<string> {
  throw new Error("Flux image generation not yet implemented - see Task 2")
}

/**
 * Generate multiple campaign images with prompt variations.
 */
export async function generateCampaignImages(
  _brief: Record<string, unknown>,
  _brandProfile: Record<string, unknown>,
  _count?: number
): Promise<string[]> {
  throw new Error("Flux image generation not yet implemented - see Task 2")
}
