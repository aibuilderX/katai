/**
 * n8n webhook callback handler.
 *
 * Receives generation results from n8n workflow and persists to database.
 * Requires HMAC-SHA256 signature verification for security.
 *
 * Payload format:
 * {
 *   campaignId: string
 *   status: "success" | "failure"
 *   copyVariants?: CopyVariantPayload[]
 *   imageUrls?: string[]
 *   error?: string
 * }
 */

import { NextResponse } from "next/server"
import crypto from "crypto"
import { db } from "@/lib/db"
import { campaigns, copyVariants, assets } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

interface CopyVariantPayload {
  platform: string
  variantLabel: string
  register: string
  headline: string
  body: string
  cta: string
  hashtags: string[]
}

interface N8nWebhookPayload {
  campaignId: string
  status: "success" | "failure"
  copyVariants?: CopyVariantPayload[]
  imageUrls?: string[]
  error?: string
}

/**
 * Verify HMAC-SHA256 signature of the request body.
 * Uses timing-safe comparison to prevent timing attacks.
 */
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

  // Timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSignature, "hex")
    )
  } catch {
    // Buffer length mismatch or invalid hex
    return false
  }
}

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

  // Parse payload
  let payload: N8nWebhookPayload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 }
    )
  }

  const { campaignId, status, error } = payload

  if (!campaignId) {
    return NextResponse.json(
      { error: "Missing campaignId" },
      { status: 400 }
    )
  }

  // Verify campaign exists
  const existingCampaigns = await db
    .select({ id: campaigns.id })
    .from(campaigns)
    .where(eq(campaigns.id, campaignId))
    .limit(1)

  if (existingCampaigns.length === 0) {
    return NextResponse.json(
      { error: "Campaign not found" },
      { status: 404 }
    )
  }

  if (status === "failure") {
    // Handle generation failure
    await db
      .update(campaigns)
      .set({
        status: "failed",
        errorLog: [
          {
            timestamp: new Date().toISOString(),
            stage: "n8n_callback",
            message: error || "n8nワークフローでエラーが発生しました",
          },
        ],
        progress: {
          stage: "error",
          copyStatus: "failed",
          imageStatus: "failed",
          percentComplete: 0,
          currentStep: "エラーが発生しました",
        },
      })
      .where(eq(campaigns.id, campaignId))

    return NextResponse.json({ received: true })
  }

  // Handle success: persist copy variants and assets
  try {
    // Insert copy variants
    if (payload.copyVariants && payload.copyVariants.length > 0) {
      for (const variant of payload.copyVariants) {
        await db.insert(copyVariants).values({
          campaignId,
          platform: variant.platform,
          variantLabel: variant.variantLabel,
          register: variant.register,
          headline: variant.headline,
          bodyText: variant.body,
          ctaText: variant.cta,
          hashtags: variant.hashtags,
        })
      }
    }

    // Insert image assets
    if (payload.imageUrls && payload.imageUrls.length > 0) {
      for (let i = 0; i < payload.imageUrls.length; i++) {
        const imageUrl = payload.imageUrls[i]

        // Download image and upload to Supabase Storage
        // For Phase 1, store the external URL directly
        // Full Supabase Storage upload will be implemented when needed
        await db.insert(assets).values({
          campaignId,
          type: "image",
          storageKey: imageUrl,
          fileName: `campaign-${campaignId}-image-${i + 1}.png`,
          width: "1024",
          height: "1024",
          mimeType: "image/png",
          modelUsed: "flux-1.1-pro-ultra",
        })
      }
    }

    // Update campaign status to complete
    await db
      .update(campaigns)
      .set({
        status: "complete",
        completedAt: new Date(),
        progress: {
          stage: "complete",
          copyStatus: "complete",
          imageStatus: "complete",
          percentComplete: 100,
          currentStep: "生成完了",
        },
      })
      .where(eq(campaigns.id, campaignId))
  } catch (dbError) {
    console.error("Failed to persist n8n results:", dbError)

    // Mark as partial if we got some results but failed to save all
    await db
      .update(campaigns)
      .set({
        status: "partial",
        errorLog: [
          {
            timestamp: new Date().toISOString(),
            stage: "n8n_persist",
            message: "結果の保存中にエラーが発生しました",
            details:
              dbError instanceof Error ? dbError.message : "不明なエラー",
          },
        ],
      })
      .where(eq(campaigns.id, campaignId))

    return NextResponse.json(
      { error: "Failed to persist results" },
      { status: 500 }
    )
  }

  return NextResponse.json({ received: true })
}
