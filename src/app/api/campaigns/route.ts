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
 *
 * Pipeline stages:
 * 1. copy_generation   - Platform-specific copy via generatePlatformCopy
 * 2. image_generation   - Base images via Flux
 * 3. compositing        - Japanese text overlay on base images
 * 4. platform_resize    - Resize composited images to platform dimensions
 * 5. email_generation   - HTML email template (if email platform selected)
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
    // -----------------------------------------------------------------------
    // Stage 1: Generate platform-specific copy
    // -----------------------------------------------------------------------
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

    const { generatePlatformCopy } = await import("@/lib/ai/claude")
    const platformCopyResult = await generatePlatformCopy(
      brief,
      brandProfile,
      brief.platforms
    )

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

    // Insert platform-specific copy variants
    const variantLabels = ["A案", "B案", "C案", "D案"]
    for (const platformCopy of platformCopyResult.platforms) {
      for (let i = 0; i < platformCopy.variants.length; i++) {
        const variant = platformCopy.variants[i]
        await db.insert(copyVariants).values({
          campaignId,
          platform: platformCopy.platformId,
          variantLabel: variantLabels[i],
          register: brief.registerOverride || "standard",
          headline: variant.headline,
          bodyText: variant.body,
          ctaText: variant.cta,
          hashtags: variant.hashtags,
        })
      }
    }

    // -----------------------------------------------------------------------
    // Stage 2: Generate images with Flux
    // -----------------------------------------------------------------------
    const { generateCampaignImages } = await import("@/lib/ai/flux")
    const imageUrls = await generateCampaignImages(brief, brandProfile, 4)

    // Insert assets
    const insertedAssets: Array<{ id: string; storageKey: string }> = []
    for (let i = 0; i < imageUrls.length; i++) {
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
          prompt: `Campaign image ${i + 1}`,
        })
        .returning({ id: assets.id, storageKey: assets.storageKey })
      insertedAssets.push(inserted)
    }

    // -----------------------------------------------------------------------
    // Stage 3: Compositing -- overlay Japanese text onto base images
    // -----------------------------------------------------------------------
    let compositingSucceeded = false
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
      // Fetch first copy variant (A案) for compositing text
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

      if (firstVariant.length > 0) {
        const variant = firstVariant[0]
        const baseImages = insertedAssets.map((a) => ({
          assetId: a.id,
          url: a.storageKey,
          width: 1024,
          height: 1024,
        }))

        const { compositeCampaignImages } = await import("@/lib/compositing")
        await compositeCampaignImages({
          campaignId,
          baseImages,
          copyVariant: {
            headline: variant.headline,
            bodyText: variant.bodyText,
            ctaText: variant.ctaText,
          },
          brandProfile: {
            fontPreference: brandProfile.fontPreference ?? "noto_sans_jp",
            colors: brandProfile.colors,
            logoUrl: brandProfile.logoUrl,
          },
          onProgress: async (percent, step) => {
            await db
              .update(campaigns)
              .set({
                progress: {
                  stage: "compositing",
                  copyStatus: "complete",
                  imageStatus: "complete",
                  compositingStatus: "generating",
                  percentComplete: 70 + Math.round(percent * 0.1),
                  currentStep: step,
                },
              })
              .where(eq(campaigns.id, campaignId))
          },
        })
      }
      compositingSucceeded = true
    } catch (compositingError) {
      console.error("Compositing failed:", compositingError)
      // Non-fatal: continue pipeline with base images
    }

    // -----------------------------------------------------------------------
    // Stage 4: Platform resize -- resize composited images to all platform dims
    // -----------------------------------------------------------------------
    let platformResizeSucceeded = false
    await db
      .update(campaigns)
      .set({
        progress: {
          stage: "platform_resize",
          copyStatus: "complete",
          imageStatus: "complete",
          compositingStatus: compositingSucceeded ? "complete" : "failed",
          platformResizeStatus: "generating",
          percentComplete: 85,
          currentStep: "プラットフォーム別リサイズ中...",
        },
      })
      .where(eq(campaigns.id, campaignId))

    try {
      const { resizeForPlatforms, getResizeTargetsForPlatforms } = await import(
        "@/lib/platforms/image-resizer"
      )
      const { adminClient } = await import("@/lib/supabase/admin")

      const resizeTargets = getResizeTargetsForPlatforms(brief.platforms)

      if (resizeTargets.length > 0) {
        // Gather composited images (layout A variant per base image)
        const compositedAssets = await db
          .select()
          .from(assets)
          .where(
            and(
              eq(assets.campaignId, campaignId),
              eq(assets.type, "composited_image")
            )
          )

        // Deduplicate: take first composited image per base asset
        // (layout A is inserted first, so we group by baseImageAssetId)
        const seenBaseAssets = new Set<string>()
        const selectedComposited = compositedAssets.filter((a) => {
          const meta = a.metadata as Record<string, unknown> | null
          const baseId =
            (meta?.baseImageAssetId as string) || a.id
          if (seenBaseAssets.has(baseId)) return false
          seenBaseAssets.add(baseId)
          return true
        })

        // If no composited images exist, fall back to base images
        const imagesToResize =
          selectedComposited.length > 0 ? selectedComposited : insertedAssets.map((a) => ({
            id: a.id,
            storageKey: a.storageKey,
            width: "1024",
            height: "1024",
            campaignId,
            type: "image" as const,
            fileName: null,
            mimeType: null,
            modelUsed: null,
            prompt: null,
            metadata: null,
            createdAt: null,
          }))

        for (const sourceAsset of imagesToResize) {
          try {
            // Fetch source image buffer
            const imgResp = await fetch(sourceAsset.storageKey)
            if (!imgResp.ok) {
              console.warn(
                `[platform-resize] Failed to fetch image ${sourceAsset.id}: ${imgResp.status}`
              )
              continue
            }
            const sourceBuffer = Buffer.from(await imgResp.arrayBuffer())
            const sourceWidth = parseInt(sourceAsset.width || "1024", 10)
            const sourceHeight = parseInt(sourceAsset.height || "1024", 10)

            const resizedAssets = await resizeForPlatforms(
              sourceBuffer,
              sourceWidth,
              sourceHeight,
              resizeTargets,
              brandProfile.colors?.background
            )

            // Upload each resized asset
            for (const resized of resizedAssets) {
              const storagePath = `${campaignId}/${resized.platformId}/${resized.fileName}`

              const { error: uploadError } = await adminClient.storage
                .from("platform-images")
                .upload(storagePath, resized.buffer, {
                  contentType: "image/png",
                  upsert: true,
                })

              if (uploadError) {
                console.warn(
                  `[platform-resize] Upload failed for ${storagePath}:`,
                  uploadError.message
                )
                continue
              }

              const {
                data: { publicUrl },
              } = adminClient.storage
                .from("platform-images")
                .getPublicUrl(storagePath)

              await db.insert(assets).values({
                campaignId,
                type: "platform_image",
                storageKey: publicUrl,
                fileName: resized.fileName,
                width: String(resized.width),
                height: String(resized.height),
                mimeType: "image/png",
                metadata: {
                  platform: resized.platformId,
                  dimensionLabel: resized.dimensionLabel,
                  sourceAssetId: sourceAsset.id,
                },
              })
            }
          } catch (assetError) {
            console.error(
              `[platform-resize] Failed to resize asset ${sourceAsset.id}:`,
              assetError instanceof Error ? assetError.message : assetError
            )
            // Continue with other assets
          }
        }
      }

      platformResizeSucceeded = true
    } catch (resizeError) {
      console.error("Platform resize failed:", resizeError)
      // Non-fatal: campaign completes with composited images but without platform sizes
    }

    // -----------------------------------------------------------------------
    // Stage 5: Email HTML generation (if email platform selected)
    // -----------------------------------------------------------------------
    let emailSucceeded = false
    const hasEmail = brief.platforms.includes("email")

    if (hasEmail) {
      await db
        .update(campaigns)
        .set({
          progress: {
            stage: "email_generation",
            copyStatus: "complete",
            imageStatus: "complete",
            compositingStatus: compositingSucceeded ? "complete" : "failed",
            platformResizeStatus: platformResizeSucceeded
              ? "complete"
              : "failed",
            emailStatus: "generating",
            percentComplete: 93,
            currentStep: "メールテンプレート生成中...",
          },
        })
        .where(eq(campaigns.id, campaignId))

      try {
        const { buildEmailHtml } = await import(
          "@/lib/platforms/email-template"
        )
        const { adminClient } = await import("@/lib/supabase/admin")

        // Get email A案 copy variant
        const emailVariant = await db
          .select()
          .from(copyVariants)
          .where(
            and(
              eq(copyVariants.campaignId, campaignId),
              eq(copyVariants.platform, "email"),
              eq(copyVariants.variantLabel, "A案")
            )
          )
          .limit(1)

        if (emailVariant.length > 0) {
          const variant = emailVariant[0]

          // Find email header image (platform_image with platform "email" and label "ヘッダー")
          const emailHeaderAssets = await db
            .select()
            .from(assets)
            .where(
              and(
                eq(assets.campaignId, campaignId),
                eq(assets.type, "platform_image")
              )
            )

          const headerAsset = emailHeaderAssets.find((a) => {
            const meta = a.metadata as Record<string, unknown> | null
            return (
              meta?.platform === "email" &&
              meta?.dimensionLabel === "ヘッダー"
            )
          })

          const headerImageUrl = headerAsset?.storageKey || ""

          const emailHtml = buildEmailHtml({
            headline: variant.headline,
            bodyText: variant.bodyText,
            ctaText: variant.ctaText,
            ctaUrl: "#",
            headerImageUrl,
            brandName: brandProfile.name,
            brandColors: {
              primary: brandProfile.colors?.primary || "#333333",
              accent: brandProfile.colors?.accent || "#0066CC",
              background: brandProfile.colors?.background || "#f5f5f5",
            },
          })

          // Upload HTML file
          const htmlStoragePath = `${campaignId}/email/email-template.html`
          const { error: htmlUploadError } = await adminClient.storage
            .from("platform-images")
            .upload(htmlStoragePath, Buffer.from(emailHtml, "utf-8"), {
              contentType: "text/html",
              upsert: true,
            })

          if (htmlUploadError) {
            console.warn(
              `[email] HTML upload failed:`,
              htmlUploadError.message
            )
          } else {
            const {
              data: { publicUrl },
            } = adminClient.storage
              .from("platform-images")
              .getPublicUrl(htmlStoragePath)

            await db.insert(assets).values({
              campaignId,
              type: "email_html",
              storageKey: publicUrl,
              fileName: "email-template.html",
              mimeType: "text/html",
            })
          }
        }

        emailSucceeded = true
      } catch (emailError) {
        console.error("Email HTML generation failed:", emailError)
        // Non-fatal
      }
    }

    // -----------------------------------------------------------------------
    // Stage 6: Video/Audio pipeline (if video-capable platforms selected)
    // -----------------------------------------------------------------------
    let videoSucceeded = false
    let voiceoverStatus: "complete" | "failed" | "skipped" | undefined
    let videoStatus: "complete" | "failed" | "skipped" | undefined
    let avatarStatus: "complete" | "failed" | "skipped" | undefined

    // Check if any selected platform has video aspect ratios
    const { PLATFORM_ASPECT_RATIOS } = await import(
      "@/lib/constants/video-providers"
    )
    const hasVideoPlatforms = brief.platforms.some(
      (p: string) => PLATFORM_ASPECT_RATIOS[p]
    )

    if (hasVideoPlatforms) {
      try {
        // Fetch first copy variant (A案) for voiceover script
        const firstVariantForVideo = await db
          .select()
          .from(copyVariants)
          .where(
            and(
              eq(copyVariants.campaignId, campaignId),
              eq(copyVariants.variantLabel, "A案")
            )
          )
          .limit(1)

        // Gather composited images for video input
        const compositedAssets = await db
          .select()
          .from(assets)
          .where(
            and(
              eq(assets.campaignId, campaignId),
              eq(assets.type, "composited_image")
            )
          )

        const compositedImageUrls = compositedAssets.length > 0
          ? compositedAssets.map((a) => a.storageKey)
          : insertedAssets.map((a) => a.storageKey)

        const copyText = firstVariantForVideo.length > 0
          ? `${firstVariantForVideo[0].headline} ${firstVariantForVideo[0].bodyText}`
          : brief.objective

        const { runVideoPipeline } = await import("@/lib/ai/video-pipeline")
        const { adminClient: adminSupa } = await import("@/lib/supabase/admin")

        const videoResult = await runVideoPipeline({
          campaignId,
          brief: brief as import("@/types/campaign").CampaignBrief,
          copyText,
          compositedImageUrls,
          platforms: brief.platforms,
          updateProgress: async (update) => {
            const current = await db
              .select({ progress: campaigns.progress })
              .from(campaigns)
              .where(eq(campaigns.id, campaignId))
              .limit(1)
            const existing = (current[0]?.progress ?? {}) as Record<string, unknown>
            await db
              .update(campaigns)
              .set({
                progress: { ...existing, ...update } as import("@/lib/db/schema").CampaignProgress,
              })
              .where(eq(campaigns.id, campaignId))
          },
        })

        // Download video URLs to Supabase Storage and create asset records
        for (const video of videoResult.videos) {
          try {
            const storagePath = `campaigns/${campaignId}/videos/${video.provider}-${video.aspectRatio.replace(":", "x")}-${Date.now()}.mp4`

            const response = await fetch(video.url)
            if (!response.ok) {
              console.warn(`[video-pipeline] Failed to download video: HTTP ${response.status}`)
              continue
            }
            const buffer = Buffer.from(await response.arrayBuffer())

            const { error: uploadError } = await adminSupa.storage
              .from("campaign-videos")
              .upload(storagePath, buffer, {
                contentType: "video/mp4",
                upsert: true,
              })

            if (uploadError) {
              console.warn(`[video-pipeline] Upload failed: ${uploadError.message}`)
              continue
            }

            const [w, h] = video.aspectRatio.split(":").map(Number)
            const baseSize = 1080
            const width = w > h ? baseSize : Math.round(baseSize * (w / h))
            const height = h > w ? baseSize : Math.round(baseSize * (h / w))

            await db.insert(assets).values({
              campaignId,
              type: "video",
              storageKey: storagePath,
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
          } catch (videoAssetError) {
            console.error("[video-pipeline] Failed to persist video asset:", videoAssetError)
          }
        }

        // Upload voiceover buffer to Supabase Storage
        if (videoResult.voiceover) {
          try {
            const audioPath = `campaigns/${campaignId}/audio/voiceover-${Date.now()}.mp3`
            const { error: audioUploadError } = await adminSupa.storage
              .from("campaign-audio")
              .upload(audioPath, videoResult.voiceover.buffer, {
                contentType: "audio/mpeg",
                upsert: true,
              })

            if (!audioUploadError) {
              await db.insert(assets).values({
                campaignId,
                type: "audio",
                storageKey: audioPath,
                fileName: "voiceover.mp3",
                mimeType: "audio/mpeg",
                modelUsed: "elevenlabs",
                metadata: {
                  provider: "elevenlabs",
                  duration: videoResult.voiceover.durationEstimate,
                },
              })
            } else {
              console.warn("[video-pipeline] Audio upload failed:", audioUploadError.message)
            }
          } catch (audioError) {
            console.error("[video-pipeline] Failed to persist audio:", audioError)
          }
        }

        // Handle avatar video
        if (videoResult.avatarVideo) {
          try {
            const avatarPath = `campaigns/${campaignId}/videos/avatar-${Date.now()}.mp4`
            const avatarResp = await fetch(videoResult.avatarVideo.url)
            if (avatarResp.ok) {
              const avatarBuf = Buffer.from(await avatarResp.arrayBuffer())
              const { error: avatarUploadError } = await adminSupa.storage
                .from("campaign-videos")
                .upload(avatarPath, avatarBuf, {
                  contentType: "video/mp4",
                  upsert: true,
                })

              if (!avatarUploadError) {
                await db.insert(assets).values({
                  campaignId,
                  type: "video",
                  storageKey: avatarPath,
                  fileName: "avatar-9x16.mp4",
                  width: "1080",
                  height: "1920",
                  mimeType: "video/mp4",
                  modelUsed: videoResult.avatarVideo.provider,
                  metadata: {
                    provider: videoResult.avatarVideo.provider,
                    aspectRatio: "9:16",
                    duration: videoResult.avatarVideo.duration,
                    videoType: "avatar",
                  },
                })
              }
            }
          } catch (avatarError) {
            console.error("[video-pipeline] Failed to persist avatar video:", avatarError)
          }
        }

        videoSucceeded = videoResult.videos.length > 0
        voiceoverStatus = videoResult.voiceover ? "complete" : "failed"
        videoStatus = videoResult.videos.length > 0 ? "complete" : "failed"
        avatarStatus = videoResult.avatarVideo ? "complete" : !videoResult.voiceover ? "skipped" : "failed"
      } catch (videoError) {
        console.error("Video pipeline failed:", videoError)
        voiceoverStatus = "failed"
        videoStatus = "failed"
        avatarStatus = "failed"
        // Non-fatal: campaign completes with images
      }
    }

    // -----------------------------------------------------------------------
    // Final: Mark campaign as complete
    // -----------------------------------------------------------------------
    const failedStages: string[] = []
    if (!compositingSucceeded) failedStages.push("テキスト合成")
    if (!platformResizeSucceeded) failedStages.push("リサイズ")
    if (hasEmail && !emailSucceeded) failedStages.push("メール")
    if (hasVideoPlatforms && !videoSucceeded) failedStages.push("動画")

    const currentStep =
      failedStages.length > 0
        ? `生成完了（${failedStages.join("・")}失敗）`
        : "生成完了"

    await db
      .update(campaigns)
      .set({
        status: "complete",
        completedAt: new Date(),
        progress: {
          stage: "complete",
          copyStatus: "complete",
          imageStatus: "complete",
          compositingStatus: compositingSucceeded ? "complete" : "failed",
          platformResizeStatus: platformResizeSucceeded
            ? "complete"
            : "failed",
          emailStatus: hasEmail
            ? emailSucceeded
              ? "complete"
              : "failed"
            : undefined,
          voiceoverStatus: hasVideoPlatforms ? voiceoverStatus : undefined,
          videoStatus: hasVideoPlatforms ? videoStatus : undefined,
          avatarStatus: hasVideoPlatforms ? avatarStatus : undefined,
          percentComplete: 100,
          currentStep,
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
