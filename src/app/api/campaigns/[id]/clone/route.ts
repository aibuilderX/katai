import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { db } from "@/lib/db"
import { campaigns, teamMembers } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"

/**
 * POST /api/campaigns/[id]/clone
 *
 * Returns the parent campaign's brief data for cloning.
 * The client uses this to pre-fill the brief form for a new campaign.
 * Actual campaign creation happens via the existing POST /api/campaigns.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

    const { id: campaignId } = await params

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

    // Fetch parent campaign with team verification
    const campaignResult = await db
      .select({
        id: campaigns.id,
        name: campaigns.name,
        brief: campaigns.brief,
      })
      .from(campaigns)
      .where(and(eq(campaigns.id, campaignId), eq(campaigns.teamId, teamId)))
      .limit(1)

    if (campaignResult.length === 0) {
      return NextResponse.json(
        { error: "キャンペーンが見つかりません" },
        { status: 404 }
      )
    }

    const parentCampaign = campaignResult[0]

    return NextResponse.json({
      brief: parentCampaign.brief,
      parentCampaignId: parentCampaign.id,
      name: parentCampaign.name,
    })
  } catch (error) {
    console.error("[clone] Error:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "キャンペーンの複製に失敗しました",
      },
      { status: 500 }
    )
  }
}
