import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { db } from "@/lib/db"
import { brandProfiles, teamMembers } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { ChevronRight } from "lucide-react"
import Link from "next/link"
import { BrandEditForm } from "./brand-edit-form"

export default async function BrandEditPage(
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Find user's team
  const membership = await db
    .select({ teamId: teamMembers.teamId, role: teamMembers.role })
    .from(teamMembers)
    .where(eq(teamMembers.userId, user.id))
    .limit(1)

  if (membership.length === 0) {
    notFound()
  }

  // Fetch brand and verify team ownership
  const [brand] = await db
    .select()
    .from(brandProfiles)
    .where(
      and(
        eq(brandProfiles.id, id),
        eq(brandProfiles.teamId, membership[0].teamId)
      )
    )
    .limit(1)

  if (!brand) {
    notFound()
  }

  const isAdmin = membership[0].role === "admin"

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1 text-sm text-text-muted">
        <Link
          href="/brands"
          className="hover:text-text-primary transition-colors"
        >
          ブランド
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-text-secondary">{brand.name}</span>
      </nav>

      <BrandEditForm brand={brand} isAdmin={isAdmin} />
    </div>
  )
}
