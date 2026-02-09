/**
 * Selective asset regeneration functions.
 *
 * Provides per-asset-type regeneration (copy variant, image) instead of
 * re-running the entire campaign pipeline. Image regeneration cascades
 * to re-compositing and re-resizing downstream assets.
 */

import { db } from "@/lib/db"
import {
  campaigns,
  brandProfiles,
  copyVariants,
  assets,
} from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"

/**
 * Fetch a campaign with its associated brand profile.
 * Reusable helper for all regeneration functions.
 */
async function getCampaignWithBrand(campaignId: string) {
  const result = await db
    .select({
      campaign: campaigns,
      brand: brandProfiles,
    })
    .from(campaigns)
    .leftJoin(brandProfiles, eq(campaigns.brandProfileId, brandProfiles.id))
    .where(eq(campaigns.id, campaignId))
    .limit(1)

  if (result.length === 0) {
    throw new Error(`Campaign not found: ${campaignId}`)
  }

  const { campaign, brand } = result[0]
  if (!brand) {
    throw new Error(`Brand profile not found for campaign: ${campaignId}`)
  }

  return { campaign, brand }
}

/**
 * Regenerate a single copy variant for a specific platform and variant label.
 *
 * Calls Claude to generate new copy for the given platform, then updates
 * the matching variant row in the database.
 *
 * @param campaignId - The campaign to regenerate copy for
 * @param platform - Platform ID (e.g., "instagram", "line")
 * @param variantLabel - Variant label (e.g., "A案", "B案", "C案", "D案")
 * @returns The updated copy variant
 */
export async function regenerateCopyVariant(
  campaignId: string,
  platform: string,
  variantLabel: string
) {
  const { campaign, brand } = await getCampaignWithBrand(campaignId)
  const brief = campaign.brief

  // Generate new copy for the single platform
  const { generatePlatformCopy } = await import("@/lib/ai/claude")
  const platformCopyResult = await generatePlatformCopy(brief, brand, [platform])

  // Find the matching variant by label index (A案=0, B案=1, C案=2, D案=3)
  const variantLabelMap: Record<string, number> = {
    "A案": 0,
    "B案": 1,
    "C案": 2,
    "D案": 3,
  }
  const variantIndex = variantLabelMap[variantLabel]
  if (variantIndex === undefined) {
    throw new Error(`Invalid variant label: ${variantLabel}`)
  }

  const platformCopy = platformCopyResult.platforms.find(
    (p) => p.platformId === platform
  )
  if (!platformCopy) {
    throw new Error(
      `No copy generated for platform: ${platform}`
    )
  }

  const newVariant = platformCopy.variants[variantIndex]
  if (!newVariant) {
    throw new Error(
      `No variant at index ${variantIndex} for platform: ${platform}`
    )
  }

  // Find existing copy variant row
  const existingVariants = await db
    .select()
    .from(copyVariants)
    .where(
      and(
        eq(copyVariants.campaignId, campaignId),
        eq(copyVariants.platform, platform),
        eq(copyVariants.variantLabel, variantLabel)
      )
    )
    .limit(1)

  if (existingVariants.length === 0) {
    throw new Error(
      `Copy variant not found: campaign=${campaignId}, platform=${platform}, label=${variantLabel}`
    )
  }

  // Update the variant with new copy
  const [updated] = await db
    .update(copyVariants)
    .set({
      headline: newVariant.headline,
      bodyText: newVariant.body,
      ctaText: newVariant.cta,
      hashtags: newVariant.hashtags,
      createdAt: new Date(),
    })
    .where(eq(copyVariants.id, existingVariants[0].id))
    .returning()

  return updated
}

/**
 * Regenerate a single base image, then cascade to re-compositing and re-resizing.
 *
 * Steps:
 * 1. Generate 1 new image via Flux
 * 2. Update the existing asset row with the new storage key
 * 3. Delete all downstream composited_image assets linked to this base image
 * 4. Delete all platform_image assets linked to those composited images
 * 5. Re-run compositing for the new image
 * 6. Re-run platform resize for the new composited images
 *
 * @param campaignId - The campaign to regenerate the image for
 * @param assetId - The specific base image asset ID to regenerate
 * @returns The updated asset
 */
export async function regenerateImage(
  campaignId: string,
  assetId: string
) {
  const { campaign, brand } = await getCampaignWithBrand(campaignId)
  const brief = campaign.brief

  // Verify the asset exists and belongs to this campaign
  const existingAsset = await db
    .select()
    .from(assets)
    .where(and(eq(assets.id, assetId), eq(assets.campaignId, campaignId)))
    .limit(1)

  if (existingAsset.length === 0) {
    throw new Error(`Asset not found: ${assetId} in campaign ${campaignId}`)
  }

  // Generate 1 new image
  const { generateCampaignImages } = await import("@/lib/ai/flux")
  const imageUrls = await generateCampaignImages(brief, brand, 1)

  if (imageUrls.length === 0) {
    throw new Error("Image generation failed: no images returned")
  }

  // Update the existing asset with the new image URL
  const [updatedAsset] = await db
    .update(assets)
    .set({
      storageKey: imageUrls[0],
      createdAt: new Date(),
    })
    .where(eq(assets.id, assetId))
    .returning()

  // --- Cascade: clean up downstream assets ---

  // Find composited images that reference this base image
  const allCompositedAssets = await db
    .select()
    .from(assets)
    .where(
      and(
        eq(assets.campaignId, campaignId),
        eq(assets.type, "composited_image")
      )
    )

  const compositedToDelete = allCompositedAssets.filter((a) => {
    const meta = a.metadata as Record<string, unknown> | null
    return meta?.baseImageAssetId === assetId
  })

  const compositedIdsToDelete = compositedToDelete.map((a) => a.id)

  // Find platform images that reference the composited images being deleted
  if (compositedIdsToDelete.length > 0) {
    const allPlatformAssets = await db
      .select()
      .from(assets)
      .where(
        and(
          eq(assets.campaignId, campaignId),
          eq(assets.type, "platform_image")
        )
      )

    const platformToDelete = allPlatformAssets.filter((a) => {
      const meta = a.metadata as Record<string, unknown> | null
      return compositedIdsToDelete.includes(meta?.sourceAssetId as string)
    })

    // Delete platform images first (referential integrity)
    for (const pa of platformToDelete) {
      await db.delete(assets).where(eq(assets.id, pa.id))
    }

    // Delete composited images
    for (const ca of compositedToDelete) {
      await db.delete(assets).where(eq(assets.id, ca.id))
    }
  }

  // --- Cascade: re-composit and re-resize ---

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
      const baseImages = [
        {
          assetId: updatedAsset.id,
          url: updatedAsset.storageKey,
          width: 1024,
          height: 1024,
        },
      ]

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
          fontPreference: brand.fontPreference ?? "noto_sans_jp",
          colors: brand.colors,
          logoUrl: brand.logoUrl,
        },
      })

      // Re-run platform resize for the new composited images
      try {
        const { resizeForPlatforms, getResizeTargetsForPlatforms } =
          await import("@/lib/platforms/image-resizer")
        const { adminClient } = await import("@/lib/supabase/admin")

        const platforms = brief.platforms || []
        const resizeTargets = getResizeTargetsForPlatforms(platforms)

        if (resizeTargets.length > 0) {
          // Get the newly created composited images for this base image
          const newComposited = await db
            .select()
            .from(assets)
            .where(
              and(
                eq(assets.campaignId, campaignId),
                eq(assets.type, "composited_image")
              )
            )

          // Filter to only composited images for this base image
          const relevantComposited = newComposited.filter((a) => {
            const meta = a.metadata as Record<string, unknown> | null
            return meta?.baseImageAssetId === updatedAsset.id
          })

          // Deduplicate: take first composited image per base asset (layout A)
          const seenBaseAssets = new Set<string>()
          const selectedComposited = relevantComposited.filter((a) => {
            const meta = a.metadata as Record<string, unknown> | null
            const baseId = (meta?.baseImageAssetId as string) || a.id
            if (seenBaseAssets.has(baseId)) return false
            seenBaseAssets.add(baseId)
            return true
          })

          for (const sourceAsset of selectedComposited) {
            try {
              const imgResp = await fetch(sourceAsset.storageKey)
              if (!imgResp.ok) continue
              const sourceBuffer = Buffer.from(await imgResp.arrayBuffer())
              const sourceWidth = parseInt(sourceAsset.width || "1024", 10)
              const sourceHeight = parseInt(sourceAsset.height || "1024", 10)

              const resizedAssets = await resizeForPlatforms(
                sourceBuffer,
                sourceWidth,
                sourceHeight,
                resizeTargets,
                brand.colors?.background
              )

              for (const resized of resizedAssets) {
                const storagePath = `${campaignId}/${resized.platformId}/${resized.fileName}`

                const { error: uploadError } = await adminClient.storage
                  .from("platform-images")
                  .upload(storagePath, resized.buffer, {
                    contentType: "image/png",
                    upsert: true,
                  })

                if (uploadError) continue

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
                `[regeneration] Failed to resize asset ${sourceAsset.id}:`,
                assetError instanceof Error ? assetError.message : assetError
              )
            }
          }
        }
      } catch (resizeError) {
        console.error("[regeneration] Platform resize failed:", resizeError)
        // Non-fatal: composited images exist but platform sizes may not
      }
    }
  } catch (compositingError) {
    console.error("[regeneration] Compositing cascade failed:", compositingError)
    // Non-fatal: base image updated but compositing failed
  }

  return updatedAsset
}
