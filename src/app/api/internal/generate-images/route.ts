/**
 * Internal API endpoint: Image Generation
 *
 * Wraps the existing generateCampaignImages() function from src/lib/ai/flux.ts
 * with HMAC security and circuit breaker (GENX-08) protection.
 *
 * Called by the n8n Image Generation sub-workflow, NOT by the dashboard directly.
 *
 * Security: HMAC-SHA256 signature verification using N8N_WEBHOOK_SECRET.
 *
 * Circuit Breaker (GENX-08): providerHealth tracks fal_ai consecutive failures.
 * If the circuit is open (3+ consecutive failures), the endpoint returns 503
 * instead of attempting generation (5-minute cooldown before retry).
 */

import { NextResponse } from "next/server"
import crypto from "crypto"
import { generateCampaignImages } from "@/lib/ai/flux"
import { providerHealth } from "@/lib/ai/provider-health"
import { db } from "@/lib/db"
import { assets } from "@/lib/db/schema"

export const maxDuration = 300 // Flux can take a while

// ===== HMAC Verification =====

function verifySignature(body: string, signature: string): boolean {
  const secret = process.env.N8N_WEBHOOK_SECRET
  if (!secret) {
    console.error("N8N_WEBHOOK_SECRET is not set")
    return false
  }

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex")

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSignature, "hex")
    )
  } catch {
    return false
  }
}

// ===== Request/Response Types =====

interface GenerateImagesRequest {
  campaignId: string
  imagePrompts: {
    platform: string
    prompt: string
    style: string
    aspectRatio: string
  }[]
  brandProfile: {
    name: string
    colors?: { primary: string; secondary: string; accent: string; background: string } | null
    toneTags?: string[] | null
    targetMarket?: string | null
  }
}

// ===== Route Handler =====

export async function POST(request: Request) {
  // Read raw body for signature verification
  const rawBody = await request.text()

  // Verify HMAC signature
  const signature = request.headers.get("X-Signature")
  if (!signature) {
    return NextResponse.json(
      { error: "Missing X-Signature header" },
      { status: 401 }
    )
  }

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 401 }
    )
  }

  // Parse request
  let body: GenerateImagesRequest
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 }
    )
  }

  const { campaignId, imagePrompts, brandProfile } = body

  if (!campaignId || !imagePrompts || !brandProfile) {
    return NextResponse.json(
      { error: "Missing required fields: campaignId, imagePrompts, brandProfile" },
      { status: 400 }
    )
  }

  // GENX-08: Circuit breaker check for fal.ai provider
  if (!providerHealth.shouldUseProvider("fal_ai")) {
    console.warn(
      `[generate-images] Circuit breaker OPEN for fal_ai -- skipping generation for campaign ${campaignId}`
    )
    return NextResponse.json(
      { error: "Image generation provider temporarily unavailable (circuit breaker open)" },
      { status: 503 }
    )
  }

  try {
    // Build brief-like object for generateCampaignImages
    // The existing function expects a brief with creativeDirection and a brand profile
    const brief = {
      objective: imagePrompts[0]?.style || "campaign",
      targetAudience: brandProfile.targetMarket || "",
      creativeDirection: imagePrompts.map((p) => p.prompt).join("\n\n"),
      platforms: imagePrompts.map((p) => p.platform),
      creativeMoodTags: [] as string[],
      brandProfileId: "",
      registerOverride: undefined,
      referenceImageUrl: undefined,
      campaignProductInfo: undefined,
    }

    // Generate images using Art Director prompts directly
    // Each imagePrompt.prompt is already Flux-compatible (English, no text, no negative prompts)
    const imageUrls: string[] = []

    for (const imagePrompt of imagePrompts) {
      try {
        // GENX-08: Check circuit breaker before each individual generation
        if (!providerHealth.shouldUseProvider("fal_ai")) {
          console.warn(
            `[generate-images] Circuit opened mid-batch -- stopping further generation`
          )
          break
        }

        // Use the direct generateImage function via generateCampaignImages
        // Since Art Director prompts are already Flux-formatted, pass them through
        const urls = await generateCampaignImages(
          { ...brief, creativeDirection: imagePrompt.prompt },
          brandProfile,
          1 // One image per prompt
        )

        // GENX-08: Record success
        providerHealth.recordSuccess("fal_ai")

        imageUrls.push(...urls)
      } catch (error) {
        // GENX-08: Record failure for circuit breaker
        providerHealth.recordFailure("fal_ai")

        console.error(
          `[generate-images] Failed to generate image for platform ${imagePrompt.platform}:`,
          error instanceof Error ? error.message : error
        )
        // Continue generating remaining images (partial delivery)
      }
    }

    if (imageUrls.length === 0) {
      return NextResponse.json(
        { error: "All image generations failed", imageUrls: [], assetIds: [] },
        { status: 500 }
      )
    }

    // Insert image assets into DB
    const assetIds: string[] = []
    for (let i = 0; i < imageUrls.length; i++) {
      try {
        const [inserted] = await db
          .insert(assets)
          .values({
            campaignId,
            type: "image",
            storageKey: imageUrls[i],
            fileName: `campaign-${campaignId}-image-${i + 1}.png`,
            width: "1024",
            height: "1024",
            mimeType: "image/png",
            modelUsed: "flux-1.1-pro-ultra",
          })
          .returning({ id: assets.id })

        assetIds.push(inserted.id)
      } catch (dbError) {
        console.error(
          `[generate-images] Failed to insert asset record for image ${i + 1}:`,
          dbError instanceof Error ? dbError.message : dbError
        )
      }
    }

    return NextResponse.json({
      imageUrls,
      assetIds,
    })
  } catch (error) {
    console.error(
      `[generate-images] Unexpected error for campaign ${campaignId}:`,
      error instanceof Error ? error.message : error
    )
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Image generation failed" },
      { status: 500 }
    )
  }
}
