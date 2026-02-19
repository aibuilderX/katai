/**
 * Internal API endpoint: Text Compositing
 *
 * Wraps the existing compositeCampaignImages() function from src/lib/compositing/index.ts
 * with HMAC security. Overlays Japanese text (headline, CTA, tagline) onto generated images
 * using Sharp + node-canvas + BudouX.
 *
 * Called by the n8n Compositing sub-workflow, NOT by the dashboard directly.
 *
 * Security: HMAC-SHA256 signature verification using N8N_WEBHOOK_SECRET.
 */

import { NextResponse } from "next/server"
import crypto from "crypto"
import { compositeCampaignImages } from "@/lib/compositing"

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

interface CompositeRequest {
  campaignId: string
  imageAssets: {
    assetId: string
    url: string
    width: number
    height: number
  }[]
  copyVariant: {
    headline: string
    bodyText: string
    ctaText: string
  }
  brandProfile: {
    fontPreference: string
    colors: { primary: string; secondary: string; accent: string; background: string } | null
    logoUrl: string | null
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
  let body: CompositeRequest
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 }
    )
  }

  const { campaignId, imageAssets, copyVariant, brandProfile } = body

  if (!campaignId || !imageAssets || !copyVariant || !brandProfile) {
    return NextResponse.json(
      { error: "Missing required fields: campaignId, imageAssets, copyVariant, brandProfile" },
      { status: 400 }
    )
  }

  if (imageAssets.length === 0) {
    return NextResponse.json(
      { error: "imageAssets array is empty" },
      { status: 400 }
    )
  }

  try {
    // Call existing compositing pipeline
    // compositeCampaignImages handles: layout analysis, kinsoku line-breaking,
    // contrast analysis, SVG rendering, Sharp compositing, Supabase upload, asset insert
    const results = await compositeCampaignImages({
      campaignId,
      baseImages: imageAssets,
      copyVariant,
      brandProfile: {
        fontPreference: brandProfile.fontPreference || "noto_sans_jp",
        colors: brandProfile.colors,
        logoUrl: brandProfile.logoUrl,
      },
    })

    // Collect composited asset IDs from the results
    // The compositeCampaignImages function already inserts assets into the DB
    // Return the count of successful composites for progress tracking
    const totalComposites = results.reduce(
      (sum, r) => sum + r.composites.length,
      0
    )

    return NextResponse.json({
      compositedCount: totalComposites,
      imageCount: results.length,
    })
  } catch (error) {
    console.error(
      `[composite] Error compositing images for campaign ${campaignId}:`,
      error instanceof Error ? error.message : error
    )
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Compositing failed" },
      { status: 500 }
    )
  }
}
