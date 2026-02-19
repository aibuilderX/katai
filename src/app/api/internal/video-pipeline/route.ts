/**
 * Internal API endpoint: Video Pipeline
 *
 * Wraps the existing runVideoPipeline() function from src/lib/ai/video-pipeline.ts
 * with HMAC security. Generates voiceover, video ads, cinematic video, and avatar
 * video for a campaign.
 *
 * Called by the n8n Video Pipeline sub-workflow ASYNCHRONOUSLY after the main
 * pipeline marks the campaign as complete with copy + images. Video assets
 * arrive later via Supabase Realtime.
 *
 * Security: HMAC-SHA256 signature verification using N8N_WEBHOOK_SECRET.
 *
 * Provider health circuit breaker (GENX-08): Already integrated in
 * runVideoPipeline() via src/lib/ai/provider-health.ts. The circuit breaker
 * operates in-memory in the Next.js server, checking provider health before
 * each call (3 consecutive failures = circuit open, 5-minute cooldown).
 */

import { NextResponse } from "next/server"
import crypto from "crypto"
import { runVideoPipeline } from "@/lib/ai/video-pipeline"
import type { VideoPipelineResult } from "@/lib/ai/video-pipeline"
import { db } from "@/lib/db"
import { campaigns, assets } from "@/lib/db/schema"
import type { CampaignProgress, CampaignBrief } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { adminClient } from "@/lib/supabase/admin"

export const maxDuration = 300 // Video generation is slow (voiceover + video + avatar)

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

// ===== Request Types =====

interface VideoPipelineRequest {
  campaignId: string
  brief: CampaignBrief
  copyText: string
  compositedImageUrls: string[]
  platforms: string[]
}

// ===== Helper: Download URL to Supabase Storage =====

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

// ===== Helper: Update campaign progress (merge pattern) =====

async function updateCampaignProgress(
  campaignId: string,
  update: Partial<CampaignProgress>
): Promise<void> {
  const current = await db
    .select({ progress: campaigns.progress })
    .from(campaigns)
    .where(eq(campaigns.id, campaignId))
    .limit(1)

  const existing = (current[0]?.progress ?? {}) as Partial<CampaignProgress>

  await db
    .update(campaigns)
    .set({
      progress: { ...existing, ...update } as CampaignProgress,
    })
    .where(eq(campaigns.id, campaignId))
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
  let body: VideoPipelineRequest
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 }
    )
  }

  const { campaignId, brief, copyText, compositedImageUrls, platforms } = body

  if (!campaignId || !brief || !copyText || !platforms) {
    return NextResponse.json(
      { error: "Missing required fields: campaignId, brief, copyText, platforms" },
      { status: 400 }
    )
  }

  try {
    // Run the full video pipeline (voiceover, video ads, cinematic, avatar)
    // The pipeline handles circuit breaker checks internally via providerHealth
    const result: VideoPipelineResult = await runVideoPipeline({
      campaignId,
      brief,
      copyText,
      compositedImageUrls: compositedImageUrls || [],
      platforms,
      updateProgress: (update) => updateCampaignProgress(campaignId, update),
    })

    // Persist voiceover to Supabase Storage and insert asset record
    if (result.voiceover) {
      try {
        const storagePath = `campaigns/${campaignId}/audio/voiceover-elevenlabs-${Date.now()}.mp3`

        const { error } = await adminClient.storage
          .from("campaign-audio")
          .upload(storagePath, result.voiceover.buffer, {
            contentType: "audio/mpeg",
            upsert: true,
          })

        if (error) {
          console.error("[video-pipeline] Failed to upload voiceover:", error.message)
        } else {
          await db.insert(assets).values({
            campaignId,
            type: "audio",
            storageKey: storagePath,
            fileName: `voiceover-elevenlabs.mp3`,
            mimeType: "audio/mpeg",
            modelUsed: "elevenlabs",
            metadata: {
              provider: "elevenlabs",
              duration: result.voiceover.durationEstimate,
            },
          })
        }
      } catch (voiceoverError) {
        console.error(
          "[video-pipeline] Failed to persist voiceover:",
          voiceoverError instanceof Error ? voiceoverError.message : voiceoverError
        )
      }
    }

    // Persist video assets to Supabase Storage and insert asset records
    for (const video of result.videos) {
      try {
        const storagePath = `campaigns/${campaignId}/videos/${video.provider}-${video.aspectRatio.replace(":", "x")}-${Date.now()}.mp4`
        const storageKey = await downloadToStorage(
          video.url,
          "campaign-videos",
          storagePath,
          "video/mp4"
        )

        // Derive width/height from aspect ratio
        const [w, h] = video.aspectRatio.split(":").map(Number)
        const baseSize = 1080
        const width = w > h ? baseSize : Math.round(baseSize * (w / h))
        const height = h > w ? baseSize : Math.round(baseSize * (h / w))

        await db.insert(assets).values({
          campaignId,
          type: "video",
          storageKey,
          fileName: `${video.type}-${video.aspectRatio.replace(":", "x")}.mp4`,
          width: String(width),
          height: String(height),
          mimeType: "video/mp4",
          modelUsed: video.provider,
          metadata: {
            provider: video.provider,
            aspectRatio: video.aspectRatio,
            duration: video.duration,
            videoType: video.type,
          },
        })
      } catch (videoError) {
        console.error(
          `[video-pipeline] Failed to persist video from ${video.provider}:`,
          videoError instanceof Error ? videoError.message : videoError
        )
        // Non-fatal: continue with other videos
      }
    }

    // Persist avatar video to Supabase Storage and insert asset record
    if (result.avatarVideo) {
      try {
        const storagePath = `campaigns/${campaignId}/videos/avatar-heygen-${Date.now()}.mp4`
        const storageKey = await downloadToStorage(
          result.avatarVideo.url,
          "campaign-videos",
          storagePath,
          "video/mp4"
        )

        await db.insert(assets).values({
          campaignId,
          type: "video",
          storageKey,
          fileName: `avatar-heygen.mp4`,
          width: "1080",
          height: "1920",
          mimeType: "video/mp4",
          modelUsed: "heygen",
          metadata: {
            provider: "heygen",
            duration: result.avatarVideo.duration,
            videoType: "avatar",
          },
        })
      } catch (avatarError) {
        console.error(
          "[video-pipeline] Failed to persist avatar video:",
          avatarError instanceof Error ? avatarError.message : avatarError
        )
      }
    }

    // Return summary
    return NextResponse.json({
      videos: result.videos.map((v) => ({
        provider: v.provider,
        aspectRatio: v.aspectRatio,
        type: v.type,
      })),
      voiceover: result.voiceover
        ? { durationEstimate: result.voiceover.durationEstimate }
        : null,
      avatarVideo: result.avatarVideo
        ? { provider: result.avatarVideo.provider }
        : null,
      errors: result.errors,
    })
  } catch (error) {
    console.error(
      `[video-pipeline] Unexpected error for campaign ${campaignId}:`,
      error instanceof Error ? error.message : error
    )
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Video pipeline failed" },
      { status: 500 }
    )
  }
}
