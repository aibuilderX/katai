import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { db } from "@/lib/db"
import { campaigns, brandProfiles, teamMembers } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { runQAValidation } from "@/lib/ai/qa-agent"
import { analyzeTrends } from "@/lib/ai/trend-agent"

/**
 * POST /api/campaigns/[id]/qa
 * Triggers QA validation on all copy variants for the campaign.
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

    const report = await runQAValidation(campaignId)

    return NextResponse.json({ report })
  } catch (error) {
    console.error("[qa] Error:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "QA検証に失敗しました",
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/campaigns/[id]/qa?action=trends
 * Triggers trend analysis for the campaign.
 */
export async function GET(
  request: Request,
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

    // Fetch campaign with team verification
    const campaignResult = await db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.id, campaignId), eq(campaigns.teamId, teamId)))
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

    if (brandResult.length === 0) {
      return NextResponse.json(
        { error: "ブランドプロフィールが見つかりません" },
        { status: 404 }
      )
    }

    const brand = brandResult[0]
    const brief = campaign.brief

    const insights = await analyzeTrends(
      {
        objective: brief.objective,
        targetAudience: brief.targetAudience,
        platforms: brief.platforms,
        creativeMoodTags: brief.creativeMoodTags,
        creativeDirection: brief.creativeDirection,
      },
      {
        name: brand.name,
        targetMarket: brand.targetMarket,
        positioningStatement: brand.positioningStatement,
      }
    )

    return NextResponse.json({ insights })
  } catch (error) {
    console.error("[trends] Error:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "トレンド分析に失敗しました",
      },
      { status: 500 }
    )
  }
}
