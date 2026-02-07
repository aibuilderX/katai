import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { db } from "@/lib/db"
import {
  campaigns,
  teamMembers,
  brandProfiles,
  copyVariants,
  assets,
} from "@/lib/db/schema"
import { eq, desc, and } from "drizzle-orm"
import crypto from "crypto"

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
  }

  // Find user's team
  const membership = await db
    .select({ teamId: teamMembers.teamId })
    .from(teamMembers)
    .where(eq(teamMembers.userId, user.id))
    .limit(1)

  if (membership.length === 0) {
    return NextResponse.json({ campaigns: [] })
  }

  // Fetch campaigns with brand name
  const campaignList = await db
    .select({
      id: campaigns.id,
      name: campaigns.name,
      status: campaigns.status,
      thumbnailUrl: campaigns.thumbnailUrl,
      createdAt: campaigns.createdAt,
      brandName: brandProfiles.name,
    })
    .from(campaigns)
    .leftJoin(brandProfiles, eq(campaigns.brandProfileId, brandProfiles.id))
    .where(eq(campaigns.teamId, membership[0].teamId))
    .orderBy(desc(campaigns.createdAt))

  return NextResponse.json({ campaigns: campaignList })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
  }

  const body = await request.json()

  const {
    brandProfileId,
    campaignName,
    objective,
    targetAudience,
    platforms,
    registerOverride,
    creativeMoodTags,
    creativeDirection,
    referenceImageUrl,
    campaignProductInfo,
  } = body

  // Validate required fields
  if (!brandProfileId) {
    return NextResponse.json(
      { error: "ブランドを選択してください" },
      { status: 400 }
    )
  }
  if (!objective) {
    return NextResponse.json(
      { error: "キャンペーン目的を選択してください" },
      { status: 400 }
    )
  }
  if (!platforms || platforms.length === 0) {
    return NextResponse.json(
      { error: "少なくとも1つのプラットフォームを選択してください" },
      { status: 400 }
    )
  }

  // Find user's team
  const membership = await db
    .select({ teamId: teamMembers.teamId })
    .from(teamMembers)
    .where(eq(teamMembers.userId, user.id))
    .limit(1)

  if (membership.length === 0) {
    return NextResponse.json(
      { error: "チームが見つかりません" },
      { status: 400 }
    )
  }

  const teamId = membership[0].teamId

  // Verify brand belongs to user's team
  const brand = await db
    .select()
    .from(brandProfiles)
    .where(
      and(
        eq(brandProfiles.id, brandProfileId),
        eq(brandProfiles.teamId, teamId)
      )
    )
    .limit(1)

  if (brand.length === 0) {
    return NextResponse.json(
      { error: "ブランドが見つかりません" },
      { status: 400 }
    )
  }

  const brandProfile = brand[0]

  // Build brief JSONB
  const brief = {
    brandProfileId,
    objective,
    targetAudience: targetAudience || "",
    platforms,
    registerOverride: registerOverride || brandProfile.defaultRegister,
    creativeMoodTags: creativeMoodTags || [],
    creativeDirection: creativeDirection || "",
    referenceImageUrl,
    campaignProductInfo,
  }

  // Insert campaign record
  const [campaign] = await db
    .insert(campaigns)
    .values({
      teamId,
      brandProfileId,
      createdBy: user.id,
      name: campaignName || null,
      brief,
      status: "pending",
      progress: {
        stage: "submitted",
        copyStatus: "pending",
        imageStatus: "pending",
        percentComplete: 0,
        currentStep: "キャンペーン作成済み",
      },
    })
    .returning()

  // Check if n8n webhook is configured
  const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL
  const n8nWebhookSecret = process.env.N8N_WEBHOOK_SECRET

  if (n8nWebhookUrl && n8nWebhookSecret) {
    // Trigger n8n webhook with HMAC-SHA256 signed payload
    const payload = JSON.stringify({
      campaignId: campaign.id,
      brief,
      brandProfile: {
        id: brandProfile.id,
        name: brandProfile.name,
        colors: brandProfile.colors,
        fontPreference: brandProfile.fontPreference,
        defaultRegister: brandProfile.defaultRegister,
        toneTags: brandProfile.toneTags,
        toneDescription: brandProfile.toneDescription,
        productCatalog: brandProfile.productCatalog,
        positioningStatement: brandProfile.positioningStatement,
        brandStory: brandProfile.brandStory,
        targetMarket: brandProfile.targetMarket,
        brandValues: brandProfile.brandValues,
      },
    })

    const signature = crypto
      .createHmac("sha256", n8nWebhookSecret)
      .update(payload)
      .digest("hex")

    try {
      await fetch(n8nWebhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "X-Signature": signature,
        },
        body: payload,
      })

      // Update status to generating
      await db
        .update(campaigns)
        .set({
          status: "generating",
          progress: {
            stage: "n8n_triggered",
            copyStatus: "generating",
            imageStatus: "generating",
            percentComplete: 10,
            currentStep: "AI生成パイプラインを開始しました",
          },
        })
        .where(eq(campaigns.id, campaign.id))
    } catch (error) {
      // Webhook trigger failed - log error but don't fail the request
      console.error("n8n webhook trigger failed:", error)
      await db
        .update(campaigns)
        .set({
          status: "failed",
          errorLog: [
            {
              timestamp: new Date().toISOString(),
              stage: "webhook_trigger",
              message: "n8nウェブフックの呼び出しに失敗しました",
              details:
                error instanceof Error ? error.message : "不明なエラー",
            },
          ],
        })
        .where(eq(campaigns.id, campaign.id))
    }
  } else {
    // Direct generation fallback (no n8n configured)
    // Run generation asynchronously - don't block the response
    runDirectGeneration(campaign.id, brief, brandProfile).catch((error) => {
      console.error("Direct generation failed:", error)
    })

    // Update status to generating
    await db
      .update(campaigns)
      .set({
        status: "generating",
        progress: {
          stage: "direct_generation",
          copyStatus: "generating",
          imageStatus: "generating",
          percentComplete: 10,
          currentStep: "AI生成を直接実行中",
        },
      })
      .where(eq(campaigns.id, campaign.id))
  }

  return NextResponse.json({ id: campaign.id }, { status: 201 })
}

/**
 * Direct generation fallback when N8N_WEBHOOK_URL is not set.
 * Calls Claude and Flux directly from the API route.
 */
async function runDirectGeneration(
  campaignId: string,
  brief: {
    brandProfileId: string
    objective: string
    targetAudience: string
    platforms: string[]
    registerOverride: string
    creativeMoodTags: string[]
    creativeDirection: string
    referenceImageUrl?: string
    campaignProductInfo?: string
  },
  brandProfile: typeof brandProfiles.$inferSelect
) {
  try {
    // Update progress: generating copy
    await db
      .update(campaigns)
      .set({
        progress: {
          stage: "copy_generation",
          copyStatus: "generating",
          imageStatus: "pending",
          percentComplete: 20,
          currentStep: "コピーを生成中...",
        },
      })
      .where(eq(campaigns.id, campaignId))

    // Generate copy with Claude
    const { generateCopy } = await import("@/lib/ai/claude")
    const copyResult = await generateCopy(brief, brandProfile)

    // Update progress: copy done, generating images
    await db
      .update(campaigns)
      .set({
        progress: {
          stage: "image_generation",
          copyStatus: "complete",
          imageStatus: "generating",
          percentComplete: 50,
          currentStep: "画像を生成中...",
        },
      })
      .where(eq(campaigns.id, campaignId))

    // Insert copy variants
    const variantLabels = ["A案", "B案", "C案", "D案"]
    for (const platform of brief.platforms) {
      for (let i = 0; i < copyResult.variants.length; i++) {
        const variant = copyResult.variants[i]
        await db.insert(copyVariants).values({
          campaignId,
          platform,
          variantLabel: variantLabels[i],
          register: brief.registerOverride || "standard",
          headline: variant.headline,
          bodyText: variant.body,
          ctaText: variant.cta,
          hashtags: variant.hashtags,
        })
      }
    }

    // Generate images with Flux
    const { generateCampaignImages } = await import("@/lib/ai/flux")
    const imageUrls = await generateCampaignImages(brief, brandProfile, 4)

    // Insert assets
    for (let i = 0; i < imageUrls.length; i++) {
      await db.insert(assets).values({
        campaignId,
        type: "image",
        storageKey: imageUrls[i],
        fileName: `campaign-${campaignId}-image-${i + 1}.png`,
        width: "1024",
        height: "1024",
        mimeType: "image/png",
        modelUsed: "flux-1.1-pro-ultra",
        prompt: `Campaign image ${i + 1}`,
      })
    }

    // Mark campaign as complete
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
  } catch (error) {
    console.error("Direct generation error:", error)
    await db
      .update(campaigns)
      .set({
        status: "failed",
        errorLog: [
          {
            timestamp: new Date().toISOString(),
            stage: "direct_generation",
            message: "AI生成に失敗しました",
            details:
              error instanceof Error ? error.message : "不明なエラー",
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
  }
}
