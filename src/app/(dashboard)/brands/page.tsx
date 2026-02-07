import Link from "next/link"
import { Plus, Tag } from "lucide-react"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/server"
import { db } from "@/lib/db"
import { brandProfiles, teamMembers } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import type { BrandColors } from "@/lib/db/schema"

const REGISTER_LABELS: Record<string, string> = {
  casual: "カジュアル",
  standard: "標準",
  formal: "敬語",
}

export default async function BrandsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Find user's team
  const membership = await db
    .select({ teamId: teamMembers.teamId })
    .from(teamMembers)
    .where(eq(teamMembers.userId, user.id))
    .limit(1)

  let brands: {
    id: string
    name: string
    logoUrl: string | null
    defaultRegister: string
    toneTags: string[] | null
    colors: BrandColors | null
    productCatalog: unknown[] | null
    createdAt: Date | null
  }[] = []

  if (membership.length > 0) {
    brands = await db
      .select({
        id: brandProfiles.id,
        name: brandProfiles.name,
        logoUrl: brandProfiles.logoUrl,
        defaultRegister: brandProfiles.defaultRegister,
        toneTags: brandProfiles.toneTags,
        colors: brandProfiles.colors,
        productCatalog: brandProfiles.productCatalog,
        createdAt: brandProfiles.createdAt,
      })
      .from(brandProfiles)
      .where(eq(brandProfiles.teamId, membership[0].teamId))
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-black text-text-primary">
          ブランド一覧
        </h1>
        <Button asChild className="bg-vermillion text-text-inverse hover:bg-vermillion-hover">
          <Link href="/brands/new">
            <Plus className="mr-2 h-4 w-4" />
            新しいブランドを作成
          </Link>
        </Button>
      </div>

      {/* Brand Grid or Empty State */}
      {brands.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-bg-card py-16">
          <Tag className="mb-4 h-12 w-12 text-text-muted" />
          <h2 className="mb-2 text-lg font-bold text-text-primary">
            ブランドがありません
          </h2>
          <p className="mb-6 text-sm text-text-secondary">
            最初のブランドプロフィールを作成しましょう
          </p>
          <Button asChild className="bg-vermillion text-text-inverse hover:bg-vermillion-hover">
            <Link href="/brands/new">
              <Plus className="mr-2 h-4 w-4" />
              ブランドを作成
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {brands.map((brand) => (
            <Link
              key={brand.id}
              href={`/brands/${brand.id}`}
              className="group rounded-lg border border-border-subtle bg-bg-card p-6 transition-all duration-200 hover:border-border hover:-translate-y-1"
            >
              {/* Logo + Name */}
              <div className="mb-4 flex items-center gap-3">
                {brand.logoUrl ? (
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-bg-surface">
                    <img
                      src={brand.logoUrl}
                      alt={brand.name}
                      className="h-full w-full object-contain p-1"
                    />
                  </div>
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-bg-surface">
                    <span className="text-lg font-black text-text-muted">
                      {brand.name.charAt(0)}
                    </span>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-base font-bold text-text-primary group-hover:text-vermillion transition-colors">
                    {brand.name}
                  </h3>
                  <Badge
                    variant="secondary"
                    className="mt-1 bg-bg-surface text-text-secondary text-xs"
                  >
                    {REGISTER_LABELS[brand.defaultRegister] || brand.defaultRegister}
                  </Badge>
                </div>
              </div>

              {/* Color Swatches */}
              {brand.colors && (
                <div className="mb-3 flex gap-1.5">
                  {Object.values(brand.colors).map((color, i) => (
                    <div
                      key={i}
                      className="h-5 w-5 rounded-sm border border-border"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              )}

              {/* Tone Tags */}
              {brand.toneTags && brand.toneTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {brand.toneTags.slice(0, 4).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-pill bg-warm-gold-subtle px-2 py-0.5 text-xs text-warm-gold"
                    >
                      {tag}
                    </span>
                  ))}
                  {brand.toneTags.length > 4 && (
                    <span className="rounded-pill bg-bg-surface px-2 py-0.5 text-xs text-text-muted">
                      +{brand.toneTags.length - 4}
                    </span>
                  )}
                </div>
              )}

              {/* Meta */}
              <div className="mt-4 flex items-center justify-between text-xs text-text-muted">
                <span>
                  商品数: {Array.isArray(brand.productCatalog) ? brand.productCatalog.length : 0}
                </span>
                {brand.createdAt && (
                  <span>
                    {new Date(brand.createdAt).toLocaleDateString("ja-JP")}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
