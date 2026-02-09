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
 *   videoAssets?: VideoAssetPayload[]
 *   audioAssets?: AudioAssetPayload[]
 *   stage?: "copy" | "image" | "voiceover" | "video" | "avatar" | "complete"
 *   error?: string
 * }
 */

import { NextResponse } from "next/server"
import crypto from "crypto"

export const maxDuration = 60
import { db } from "@/lib/db"
import { campaigns, copyVariants, assets, brandProfiles } from "@/lib/db/schema"
import type { CampaignProgress } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { adminClient } from "@/lib/supabase/admin"

interface CopyVariantPayload {
  platform: string
  variantLabel: string
  register: string
  headline: string
  body: string
  cta: string
  hashtags: string[]
}

interface VideoAssetPayload {
  url: string
  provider: "kling" | "runway" | "heygen"
  aspectRatio: string
  duration: number
  type: "ad" | "cinematic" | "avatar"
  mimeType: string
}

interface AudioAssetPayload {
  url: string
  provider: "elevenlabs"
  duration: number
  mimeType: string
  voiceId: string
}

interface N8nWebhookPayload {
  campaignId: string
  status: "success" | "failure"
  copyVariants?: CopyVariantPayload[]
  imageUrls?: string[]
  videoAssets?: VideoAssetPayload[]
  audioAssets?: AudioAssetPayload[]
  stage?: "copy" | "image" | "voiceover" | "video" | "avatar" | "complete"
  error?: string
}

/**
 * Download a file from a provider URL to Supabase Storage.
 *
 * Provider-generated URLs are temporary and expire (24-48 hours).
 * This function downloads immediately and uploads to persistent storage.
 *
 * @returns The storage path (not the full URL)
 */
async function downloadToStorage(
  url: string,
  bucket: string,
  path: string,
  mimeType: string
): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download from provider: HTTP ${response.status}`)
  }

  const buffer = Buffer.from(await response.arrayBuffer())

  const { error } = await adminClient.storage
    .from(bucket)
    .upload(path, buffer, { contentType: mimeType, upsert: true })

  if (error) {
    throw new Error(`Supabase Storage upload failed: ${error.message}`)
  }

  return path
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
    const insertedAssets: Array<{ id: string; storageKey: string }> = []
    if (payload.imageUrls && payload.imageUrls.length > 0) {
      for (let i = 0; i < payload.imageUrls.length; i++) {
        const imageUrl = payload.imageUrls[i]

        const [inserted] = await db.insert(assets).values({
          campaignId,
          type: "image",
          storageKey: imageUrl,
          fileName: `campaign-${campaignId}-image-${i + 1}.png`,
          width: "1024",
          height: "1024",
          mimeType: "image/png",
          modelUsed: "flux-1.1-pro-ultra",
        }).returning({ id: assets.id, storageKey: assets.storageKey })
        insertedAssets.push(inserted)
      }
    }

    // Compositing stage: overlay Japanese text onto base images
    if (insertedAssets.length > 0) {
      await db
        .update(campaigns)
        .set({
          progress: {
            stage: "compositing",
            copyStatus: "complete",
            imageStatus: "complete",
            compositingStatus: "generating",
            percentComplete: 70,
            currentStep: "テキスト合成中...",
          },
        })
        .where(eq(campaigns.id, campaignId))

      try {
        // Fetch campaign to get brand profile
        const campaignRow = await db
          .select({ brandProfileId: campaigns.brandProfileId })
          .from(campaigns)
          .where(eq(campaigns.id, campaignId))
          .limit(1)

        if (campaignRow.length > 0) {
          const brand = await db
            .select()
            .from(brandProfiles)
            .where(eq(brandProfiles.id, campaignRow[0].brandProfileId))
            .limit(1)

          // Fetch first copy variant (A案) for compositing
          const firstVariant = await db
            .select()
            .from(copyVariants)
            .where(
              and(
                eq(copyVariants.campaignId, campaignId),
                eq(copyVariants.variantLabel, "A案")
              )
            )
            .limit(1)

          if (firstVariant.length > 0 && brand.length > 0) {
            const variant = firstVariant[0]
            const brandProfile = brand[0]
            const baseImages = insertedAssets.map((a) => ({
              assetId: a.id,
              url: a.storageKey,
              width: 1024,
              height: 1024,
            }))

            const { compositeCampaignImages } = await import(
              "@/lib/compositing"
            )
            await compositeCampaignImages({
              campaignId,
              baseImages,
              copyVariant: {
                headline: variant.headline,
                bodyText: variant.bodyText,
                ctaText: variant.ctaText,
              },
              brandProfile: {
                fontPreference:
                  brandProfile.fontPreference ?? "noto_sans_jp",
                colors: brandProfile.colors,
                logoUrl: brandProfile.logoUrl,
              },
            })
          }
        }
      } catch (compositingError) {
        console.error(
          "Compositing failed after n8n webhook:",
          compositingError
        )
        // Compositing failure is non-fatal -- base images still available
      }
    }

    // Process video assets -- download provider URLs to Supabase Storage
    if (payload.videoAssets && payload.videoAssets.length > 0) {
      // Update progress for video stage (merge pattern to avoid race conditions)
      const currentProgress = await db
        .select({ progress: campaigns.progress })
        .from(campaigns)
        .where(eq(campaigns.id, campaignId))
        .limit(1)
      const existingProgress = (currentProgress[0]?.progress ?? {}) as Partial<CampaignProgress>

      await db
        .update(campaigns)
        .set({
          progress: {
            ...existingProgress,
            stage: "video",
            videoStatus: "generating",
            currentStep: "動画アセット保存中...",
          } as CampaignProgress,
        })
        .where(eq(campaigns.id, campaignId))

      for (const videoAsset of payload.videoAssets) {
        try {
          const storagePath = `campaigns/${campaignId}/videos/${videoAsset.provider}-${videoAsset.aspectRatio.replace(":", "x")}-${Date.now()}.mp4`
          const storageKey = await downloadToStorage(
            videoAsset.url,
            "campaign-videos",
            storagePath,
            videoAsset.mimeType || "video/mp4"
          )

          // Derive width/height from aspect ratio
          const [w, h] = videoAsset.aspectRatio.split(":").map(Number)
          const baseSize = 1080
          const width = w > h ? baseSize : Math.round(baseSize * (w / h))
          const height = h > w ? baseSize : Math.round(baseSize * (h / w))

          await db.insert(assets).values({
            campaignId,
            type: "video",
            storageKey,
            fileName: `${videoAsset.type}-${videoAsset.aspectRatio.replace(":", "x")}.mp4`,
            width: String(width),
            height: String(height),
            mimeType: videoAsset.mimeType || "video/mp4",
            modelUsed: videoAsset.provider,
            metadata: {
              provider: videoAsset.provider,
              aspectRatio: videoAsset.aspectRatio,
              duration: videoAsset.duration,
              videoType: videoAsset.type,
            },
          })
        } catch (videoError) {
          console.error(
            `[n8n-webhook] Failed to persist video asset from ${videoAsset.provider}:`,
            videoError
          )
          // Non-fatal: continue with other assets
        }
      }
    }

    // Process audio assets -- download provider URLs to Supabase Storage
    if (payload.audioAssets && payload.audioAssets.length > 0) {
      for (const audioAsset of payload.audioAssets) {
        try {
          const storagePath = `campaigns/${campaignId}/audio/${audioAsset.provider}-${Date.now()}.mp3`
          const storageKey = await downloadToStorage(
            audioAsset.url,
            "campaign-audio",
            storagePath,
            audioAsset.mimeType || "audio/mpeg"
          )

          await db.insert(assets).values({
            campaignId,
            type: "audio",
            storageKey,
            fileName: `voiceover-${audioAsset.provider}.mp3`,
            mimeType: "audio/mpeg",
            modelUsed: audioAsset.provider,
            metadata: {
              provider: audioAsset.provider,
              duration: audioAsset.duration,
              voiceId: audioAsset.voiceId,
            },
          })
        } catch (audioError) {
          console.error(
            `[n8n-webhook] Failed to persist audio asset from ${audioAsset.provider}:`,
            audioError
          )
          // Non-fatal: continue with other assets
        }
      }
    }

    // Stage-specific progress merge (avoids full replacement race condition)
    if (payload.stage && payload.stage !== "complete") {
      const currentProg = await db
        .select({ progress: campaigns.progress })
        .from(campaigns)
        .where(eq(campaigns.id, campaignId))
        .limit(1)
      const existing = (currentProg[0]?.progress ?? {}) as Partial<CampaignProgress>

      const stageUpdate: Partial<CampaignProgress> = {}
      if (payload.stage === "voiceover") stageUpdate.voiceoverStatus = "complete"
      if (payload.stage === "video") stageUpdate.videoStatus = "complete"
      if (payload.stage === "avatar") stageUpdate.avatarStatus = "complete"

      await db
        .update(campaigns)
        .set({
          progress: { ...existing, ...stageUpdate } as CampaignProgress,
        })
        .where(eq(campaigns.id, campaignId))
    }

    // Update campaign status to complete
    // Build final progress including video/audio statuses
    const finalProgress = await db
      .select({ progress: campaigns.progress })
      .from(campaigns)
      .where(eq(campaigns.id, campaignId))
      .limit(1)
    const prevProgress = (finalProgress[0]?.progress ?? {}) as Partial<CampaignProgress>

    await db
      .update(campaigns)
      .set({
        status: "complete",
        completedAt: new Date(),
        progress: {
          ...prevProgress,
          stage: "complete",
          copyStatus: "complete",
          imageStatus: "complete",
          compositingStatus: prevProgress.compositingStatus ?? "complete",
          voiceoverStatus: prevProgress.voiceoverStatus ?? (payload.audioAssets?.length ? "complete" : undefined),
          videoStatus: prevProgress.videoStatus ?? (payload.videoAssets?.length ? "complete" : undefined),
          avatarStatus: prevProgress.avatarStatus,
          percentComplete: 100,
          currentStep: "生成完了",
        } as CampaignProgress,
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
