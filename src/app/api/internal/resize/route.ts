/**
 * Internal API endpoint: Platform Resize
 *
 * Wraps the existing resizeForPlatforms() and getResizeTargetsForPlatforms()
 * functions from src/lib/platforms/image-resizer.ts with HMAC security.
 *
 * Produces dimension-specific images for all selected platforms using
 * smart crop (cover) or letterbox (contain) strategies based on aspect ratio.
 *
 * Called by the n8n Resize sub-workflow, NOT by the dashboard directly.
 *
 * Security: HMAC-SHA256 signature verification using N8N_WEBHOOK_SECRET.
 */

import { NextResponse } from "next/server"
import crypto from "crypto"
import {
  resizeForPlatforms,
  getResizeTargetsForPlatforms,
} from "@/lib/platforms/image-resizer"
import { db } from "@/lib/db"
import { assets } from "@/lib/db/schema"
import { adminClient } from "@/lib/supabase/admin"

export const maxDuration = 120

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

interface ResizeRequest {
  campaignId: string
  platforms: string[]
  sourceAssets: {
    id: string
    storageKey: string
    width: number
    height: number
  }[]
  brandBackgroundColor?: string
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
  let body: ResizeRequest
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 }
    )
  }

  const { campaignId, platforms, sourceAssets, brandBackgroundColor } = body

  if (!campaignId || !platforms || !sourceAssets) {
    return NextResponse.json(
      { error: "Missing required fields: campaignId, platforms, sourceAssets" },
      { status: 400 }
    )
  }

  if (platforms.length === 0) {
    return NextResponse.json(
      { error: "platforms array is empty" },
      { status: 400 }
    )
  }

  if (sourceAssets.length === 0) {
    return NextResponse.json(
      { error: "sourceAssets array is empty" },
      { status: 400 }
    )
  }

  try {
    // Build resize targets from platform IDs
    const targets = getResizeTargetsForPlatforms(platforms)

    if (targets.length === 0) {
      return NextResponse.json(
        { error: `No resize targets found for platforms: ${platforms.join(", ")}` },
        { status: 400 }
      )
    }

    const platformAssetIds: string[] = []
    const errors: string[] = []

    // Process each source asset
    for (const source of sourceAssets) {
      try {
        // Fetch source image buffer from Supabase Storage or URL
        const sourceBuffer = await fetchSourceBuffer(source.storageKey)

        // Resize to all platform dimensions
        const resizedAssets = await resizeForPlatforms(
          sourceBuffer,
          source.width,
          source.height,
          targets,
          brandBackgroundColor
        )

        // Upload each resized image and insert asset records
        for (const resized of resizedAssets) {
          try {
            const storagePath = `${campaignId}/${source.id}-${resized.fileName}`

            // Upload to Supabase Storage
            const { error: uploadError } = await adminClient.storage
              .from("platform-images")
              .upload(storagePath, resized.buffer, {
                contentType: "image/png",
                upsert: true,
              })

            if (uploadError) {
              console.error(
                `[resize] Upload failed for ${storagePath}:`,
                uploadError.message
              )
              errors.push(`Upload failed: ${storagePath}`)
              continue
            }

            // Get public URL
            const {
              data: { publicUrl },
            } = adminClient.storage
              .from("platform-images")
              .getPublicUrl(storagePath)

            // Insert platform_image asset record
            const [inserted] = await db
              .insert(assets)
              .values({
                campaignId,
                type: "platform_image",
                storageKey: publicUrl,
                fileName: resized.fileName,
                width: String(resized.width),
                height: String(resized.height),
                mimeType: "image/png",
                modelUsed: "sharp-resize",
                metadata: {
                  platformId: resized.platformId,
                  dimensionLabel: resized.dimensionLabel,
                  sourceAssetId: source.id,
                },
              })
              .returning({ id: assets.id })

            platformAssetIds.push(inserted.id)
          } catch (assetError) {
            console.error(
              `[resize] Failed to process resized asset ${resized.fileName}:`,
              assetError instanceof Error ? assetError.message : assetError
            )
            errors.push(`Asset error: ${resized.fileName}`)
          }
        }
      } catch (sourceError) {
        console.error(
          `[resize] Failed to process source asset ${source.id}:`,
          sourceError instanceof Error ? sourceError.message : sourceError
        )
        errors.push(`Source error: ${source.id}`)
      }
    }

    if (platformAssetIds.length === 0 && errors.length > 0) {
      return NextResponse.json(
        { error: `All resize operations failed. Errors: ${errors.join("; ")}`, platformAssetIds: [] },
        { status: 500 }
      )
    }

    return NextResponse.json({
      platformAssetIds,
      totalResized: platformAssetIds.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error(
      `[resize] Unexpected error for campaign ${campaignId}:`,
      error instanceof Error ? error.message : error
    )
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Resize failed" },
      { status: 500 }
    )
  }
}

// ===== Helper: Fetch source image buffer =====

/**
 * Fetch source image buffer from a URL or Supabase Storage key.
 * Handles both direct URLs (https://) and Supabase public URLs.
 */
async function fetchSourceBuffer(storageKeyOrUrl: string): Promise<Buffer> {
  const response = await fetch(storageKeyOrUrl)
  if (!response.ok) {
    throw new Error(
      `Failed to fetch source image: HTTP ${response.status} from ${storageKeyOrUrl}`
    )
  }
  return Buffer.from(await response.arrayBuffer())
}
