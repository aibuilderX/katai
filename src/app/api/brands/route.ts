import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { db } from "@/lib/db"
import { brandProfiles, teamMembers } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

/**
 * GET /api/brands
 * Fetch all brand profiles for the authenticated user's team.
 */
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

  // Fetch all brands for team with full fields
  const brands = await db
    .select()
    .from(brandProfiles)
    .where(eq(brandProfiles.teamId, membership[0].teamId))

  return NextResponse.json({ brands })
}

/**
 * POST /api/brands
 * Create a new brand profile for the authenticated user's team.
 */
export async function POST(request: Request) {
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
      { status: 404 }
    )
  }

  const body = await request.json()

  // Validate required fields
  if (!body.name?.trim()) {
    return NextResponse.json(
      { error: "ブランド名は必須です" },
      { status: 400 }
    )
  }

  if (!body.defaultRegister || !["casual", "standard", "formal"].includes(body.defaultRegister)) {
    body.defaultRegister = "standard"
  }

  // Insert brand profile
  const [brand] = await db
    .insert(brandProfiles)
    .values({
      teamId: membership[0].teamId,
      name: body.name.trim(),
      logoUrl: body.logoUrl || null,
      colors: body.colors || null,
      fontPreference: body.fontPreference || "noto_sans_jp",
      defaultRegister: body.defaultRegister,
      toneTags: body.toneTags || [],
      toneDescription: body.toneDescription || null,
      productCatalog: body.productCatalog || [],
      positioningStatement: body.positioningStatement || null,
      brandStory: body.brandStory || null,
      targetMarket: body.targetMarket || null,
      brandValues: body.brandValues || [],
    })
    .returning()

  return NextResponse.json({ brand }, { status: 201 })
}
