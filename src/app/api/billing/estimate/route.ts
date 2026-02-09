import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { db } from "@/lib/db"
import { teamMembers } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { estimateCampaignCost } from "@/lib/billing/estimate"
import { checkBalance } from "@/lib/billing/credits"

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
  }

  const body = await request.json()
  const { platforms, includeVideo, includeVoiceover, includeAvatar } = body as {
    platforms: string[]
    includeVideo?: boolean
    includeVoiceover?: boolean
    includeAvatar?: boolean
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

  // Calculate estimate and check balance
  const estimate = estimateCampaignCost({
    platforms,
    includeVideo,
    includeVoiceover,
    includeAvatar,
  })

  const balance = await checkBalance(teamId)

  return NextResponse.json({
    estimate,
    currentBalance: balance,
    canAfford: balance >= estimate.totalCredits,
  })
}
