import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { db } from "@/lib/db"
import {
  campaigns,
  teamMembers,
  brandProfiles,
  copyVariants,
  assets,
} from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { CampaignDetailContent } from "./campaign-detail-content"

export default async function CampaignDetailPage(
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Find user's team and role
  const membership = await db
    .select({ teamId: teamMembers.teamId, role: teamMembers.role })
    .from(teamMembers)
    .where(eq(teamMembers.userId, user.id))
    .limit(1)

  if (membership.length === 0) {
    redirect("/")
  }

  const teamId = membership[0].teamId
  const userRole = membership[0].role

  // Fetch campaign
  const campaignResult = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.id, id), eq(campaigns.teamId, teamId)))
    .limit(1)

  if (campaignResult.length === 0) {
    notFound()
  }

  const campaign = campaignResult[0]

  // Fetch brand
  const brandResult = await db
    .select()
    .from(brandProfiles)
    .where(eq(brandProfiles.id, campaign.brandProfileId))
    .limit(1)

  const brand = brandResult[0] || null

  // Fetch copy variants
  const variants = await db
    .select()
    .from(copyVariants)
    .where(eq(copyVariants.campaignId, id))

  // Fetch assets
  const campaignAssets = await db
    .select()
    .from(assets)
    .where(eq(assets.campaignId, id))

  // Calculate generation time
  let generationTime: string | null = null
  if (campaign.createdAt && campaign.completedAt) {
    const diff = campaign.completedAt.getTime() - campaign.createdAt.getTime()
    const seconds = Math.floor(diff / 1000)
    if (seconds < 60) {
      generationTime = `${seconds}秒`
    } else {
      const minutes = Math.floor(seconds / 60)
      const remainingSeconds = seconds % 60
      generationTime = `${minutes}分${remainingSeconds}秒`
    }
  }

  // Serialize dates for client component
  const serializedCampaign = {
    ...campaign,
    createdAt: campaign.createdAt?.toISOString() || null,
    completedAt: campaign.completedAt?.toISOString() || null,
  }

  const serializedVariants = variants.map((v) => ({
    ...v,
    hashtags: (v.hashtags as string[]) || [],
    isFavorite: v.isFavorite ?? false,
    createdAt: v.createdAt?.toISOString() || null,
  }))

  const serializedAssets = campaignAssets.map((a) => ({
    ...a,
    metadata: (a.metadata as Record<string, unknown> | null) ?? null,
    createdAt: a.createdAt?.toISOString() || null,
  }))

  return (
    <CampaignDetailContent
      campaign={serializedCampaign}
      brand={brand}
      copyVariants={serializedVariants}
      assets={serializedAssets}
      generationTime={generationTime}
      approvalStatus={campaign.approvalStatus || "none"}
      userRole={userRole}
    />
  )
}
