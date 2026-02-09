import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { db } from "@/lib/db"
import { campaigns, teamMembers, complianceReports } from "@/lib/db/schema"
import { eq, and, desc } from "drizzle-orm"
import { runComplianceCheck } from "@/lib/ai/compliance-agent"

/**
 * POST /api/campaigns/[id]/compliance
 * Triggers compliance check on all copy variants for the campaign.
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

    // Verify team membership
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

    // Verify campaign exists and belongs to user's team
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

    const report = await runComplianceCheck(campaignId)

    return NextResponse.json({ report })
  } catch (error) {
    console.error("[compliance] Error:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "コンプライアンスチェックに失敗しました",
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/campaigns/[id]/compliance
 * Retrieves the most recent compliance report for the campaign.
 */
export async function GET(
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

    // Verify team membership
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

    // Verify campaign exists and belongs to user's team
    const campaignResult = await db
      .select({ id: campaigns.id })
      .from(campaigns)
      .where(and(eq(campaigns.id, campaignId), eq(campaigns.teamId, teamId)))
      .limit(1)

    if (campaignResult.length === 0) {
      return NextResponse.json(
        { error: "キャンペーンが見つかりません" },
        { status: 404 }
      )
    }

    // Fetch most recent compliance report
    const reportResult = await db
      .select({
        overallRisk: complianceReports.overallRisk,
        keihyouhouResult: complianceReports.keihyouhouResult,
        yakkihoResult: complianceReports.yakkihoResult,
        platformRuleResult: complianceReports.platformRuleResult,
        acknowledgedAt: complianceReports.acknowledgedAt,
        createdAt: complianceReports.createdAt,
      })
      .from(complianceReports)
      .where(eq(complianceReports.campaignId, campaignId))
      .orderBy(desc(complianceReports.createdAt))
      .limit(1)

    if (reportResult.length === 0) {
      return NextResponse.json({ report: null })
    }

    return NextResponse.json({ report: reportResult[0] })
  } catch (error) {
    console.error("[compliance] Error:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "コンプライアンスレポートの取得に失敗しました",
      },
      { status: 500 }
    )
  }
}
