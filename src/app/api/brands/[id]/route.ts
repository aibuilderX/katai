import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { db } from "@/lib/db"
import { brandProfiles, teamMembers } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"

/**
 * Helper: verify the user is authenticated and belongs to a team
 * that owns the brand profile.
 */
async function verifyAccess(brandId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "認証が必要です", status: 401, user: null, membership: null }
  }

  // Find user's team membership
  const membership = await db
    .select({ teamId: teamMembers.teamId, role: teamMembers.role })
    .from(teamMembers)
    .where(eq(teamMembers.userId, user.id))
    .limit(1)

  if (membership.length === 0) {
    return { error: "チームが見つかりません", status: 404, user, membership: null }
  }

  // Verify the brand belongs to the user's team
  const [brand] = await db
    .select()
    .from(brandProfiles)
    .where(
      and(
        eq(brandProfiles.id, brandId),
        eq(brandProfiles.teamId, membership[0].teamId)
      )
    )
    .limit(1)

  if (!brand) {
    return { error: "ブランドが見つかりません", status: 404, user, membership: membership[0] }
  }

  return { error: null, status: 200, user, membership: membership[0], brand }
}

/**
 * GET /api/brands/[id]
 * Fetch a single brand profile by ID.
 */
export async function GET(
  _request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params

  const access = await verifyAccess(id)
  if (access.error) {
    return NextResponse.json({ error: access.error }, { status: access.status })
  }

  return NextResponse.json({ brand: access.brand })
}

/**
 * PUT /api/brands/[id]
 * Update a brand profile.
 */
export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params

  const access = await verifyAccess(id)
  if (access.error) {
    return NextResponse.json({ error: access.error }, { status: access.status })
  }

  const body = await request.json()

  // Validate required fields
  if (body.name !== undefined && !body.name?.trim()) {
    return NextResponse.json(
      { error: "ブランド名は必須です" },
      { status: 400 }
    )
  }

  if (
    body.defaultRegister !== undefined &&
    !["casual", "standard", "formal"].includes(body.defaultRegister)
  ) {
    return NextResponse.json(
      { error: "無効な敬語レベルです" },
      { status: 400 }
    )
  }

  // Build update object (only update provided fields)
  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  }

  const allowedFields = [
    "name",
    "logoUrl",
    "colors",
    "fontPreference",
    "defaultRegister",
    "toneTags",
    "toneDescription",
    "productCatalog",
    "positioningStatement",
    "brandStory",
    "targetMarket",
    "brandValues",
  ] as const

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updateData[field] = body[field]
    }
  }

  const [updated] = await db
    .update(brandProfiles)
    .set(updateData)
    .where(eq(brandProfiles.id, id))
    .returning()

  return NextResponse.json({ brand: updated })
}

/**
 * DELETE /api/brands/[id]
 * Delete a brand profile. Requires admin role.
 */
export async function DELETE(
  _request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params

  const access = await verifyAccess(id)
  if (access.error) {
    return NextResponse.json({ error: access.error }, { status: access.status })
  }

  // Check admin role
  if (access.membership?.role !== "admin") {
    return NextResponse.json(
      { error: "削除には管理者権限が必要です" },
      { status: 403 }
    )
  }

  await db.delete(brandProfiles).where(eq(brandProfiles.id, id))

  return NextResponse.json({ success: true })
}
