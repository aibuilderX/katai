/**
 * Claude API client for structured Japanese copy generation.
 * Stub: full implementation in Task 2.
 */

export interface CopyVariant {
  headline: string
  body: string
  cta: string
  hashtags: string[]
}

export interface CopyGenerationResult {
  variants: CopyVariant[]
}

/**
 * Generate structured copy with 4 A/B variants using Claude API.
 * Uses tool-based structured output for guaranteed schema.
 */
export async function generateCopy(
  _brief: Record<string, unknown>,
  _brandProfile: Record<string, unknown>
): Promise<CopyGenerationResult> {
  throw new Error("Claude AI generation not yet implemented - see Task 2")
}
