import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { db } from "@/lib/db"
import { teamMembers, subscriptions } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { checkBalance, getCreditHistory } from "@/lib/billing/credits"

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
    return NextResponse.json(
      { error: "チームが見つかりません" },
      { status: 400 }
    )
  }

  const teamId = membership[0].teamId

  // Fetch balance, history, and subscription in parallel
  const [balance, history, subscriptionResult] = await Promise.all([
    checkBalance(teamId),
    getCreditHistory(teamId),
    db
      .select({
        tier: subscriptions.tier,
        status: subscriptions.status,
        stripePriceId: subscriptions.stripePriceId,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
        cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
      })
      .from(subscriptions)
      .where(eq(subscriptions.teamId, teamId))
      .limit(1),
  ])

  const subscription =
    subscriptionResult.length > 0 ? subscriptionResult[0] : null

  return NextResponse.json({ balance, history, subscription })
}
