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
import { eq, and } from "drizzle-orm"

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params

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
    return NextResponse.json(
      { error: "チームが見つかりません" },
      { status: 403 }
    )
  }

  const teamId = membership[0].teamId

  // Fetch campaign with team verification
  const campaignResult = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.id, id), eq(campaigns.teamId, teamId)))
    .limit(1)

  if (campaignResult.length === 0) {
    return NextResponse.json(
      { error: "キャンペーンが見つかりません" },
      { status: 404 }
    )
  }

  const campaign = campaignResult[0]

  // Fetch brand profile
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

  return NextResponse.json({
    campaign,
    brand,
    copyVariants: variants,
    assets: campaignAssets,
  })
}

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params

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
    return NextResponse.json(
      { error: "チームが見つかりません" },
      { status: 403 }
    )
  }

  const teamId = membership[0].teamId

  // Verify campaign belongs to user's team
  const campaignResult = await db
    .select({ id: campaigns.id })
    .from(campaigns)
    .where(and(eq(campaigns.id, id), eq(campaigns.teamId, teamId)))
    .limit(1)

  if (campaignResult.length === 0) {
    return NextResponse.json(
      { error: "キャンペーンが見つかりません" },
      { status: 404 }
    )
  }

  const body = await request.json()

  // Handle favorite toggle on copy variants
  if (body.copyVariantId && typeof body.isFavorite === "boolean") {
    await db
      .update(copyVariants)
      .set({ isFavorite: body.isFavorite })
      .where(
        and(
          eq(copyVariants.id, body.copyVariantId),
          eq(copyVariants.campaignId, id)
        )
      )

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: "無効なリクエスト" }, { status: 400 })
}
