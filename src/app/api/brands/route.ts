import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { db } from "@/lib/db"
import { brandProfiles, teamMembers } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

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
    return NextResponse.json({ brands: [] })
  }

  // Fetch brands for team
  const brands = await db
    .select({
      id: brandProfiles.id,
      name: brandProfiles.name,
      defaultRegister: brandProfiles.defaultRegister,
      logoUrl: brandProfiles.logoUrl,
    })
    .from(brandProfiles)
    .where(eq(brandProfiles.teamId, membership[0].teamId))

  return NextResponse.json({ brands })
}
