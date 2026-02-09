import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { db } from "@/lib/db"
import { teamMembers } from "@/lib/db/schema"
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

  // Fetch balance and history in parallel
  const [balance, history] = await Promise.all([
    checkBalance(teamId),
    getCreditHistory(teamId),
  ])

  return NextResponse.json({ balance, history })
}
