import Link from "next/link"
import { redirect } from "next/navigation"
import { Plus, Megaphone } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { db } from "@/lib/db"
import { campaigns, teamMembers, brandProfiles } from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"
import { CampaignCard } from "@/components/dashboard/campaign-card"

export default async function CampaignsPage() {
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

  let campaignList: {
    id: string
    name: string | null
    status: string
    approvalStatus: string | null
    thumbnailUrl: string | null
    createdAt: Date | null
    brief: { platforms?: string[] } | null
  }[] = []

  if (membership.length > 0) {
    const results = await db
      .select({
        id: campaigns.id,
        name: campaigns.name,
        status: campaigns.status,
        approvalStatus: campaigns.approvalStatus,
        thumbnailUrl: campaigns.thumbnailUrl,
        createdAt: campaigns.createdAt,
        brief: campaigns.brief,
      })
      .from(campaigns)
      .where(eq(campaigns.teamId, membership[0].teamId))
      .orderBy(desc(campaigns.createdAt))

    campaignList = results as typeof campaignList
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-text-primary">
          キャンペーン一覧
        </h1>
        <Link
          href="/campaigns/new"
          className="inline-flex items-center gap-2 rounded-md bg-vermillion px-5 py-2.5 text-sm font-bold text-text-inverse transition-colors hover:bg-vermillion-hover"
        >
          <Plus className="size-4" />
          <span>新しいキャンペーンを作成</span>
        </Link>
      </div>

      {/* Campaign grid */}
      {campaignList.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {campaignList.map((campaign) => {
            const brief = campaign.brief as { platforms?: string[] } | null
            const platformCount = brief?.platforms?.length || 0

            return (
              <CampaignCard
                key={campaign.id}
                id={campaign.id}
                name={campaign.name || "無題のキャンペーン"}
                thumbnailUrl={campaign.thumbnailUrl}
                status={
                  campaign.status as
                    | "pending"
                    | "generating"
                    | "complete"
                    | "failed"
                    | "partial"
                    | "draft"
                }
                platformCount={platformCount}
                createdAt={
                  campaign.createdAt?.toISOString() || new Date().toISOString()
                }
                approvalStatus={campaign.approvalStatus}
              />
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-border-subtle bg-bg-card py-20">
          <Megaphone className="mb-4 size-12 text-text-muted/30" />
          <h3 className="mb-2 text-lg font-bold text-text-primary">
            まだキャンペーンがありません
          </h3>
          <p className="mb-6 text-sm text-text-muted">
            最初のキャンペーンを作成しましょう
          </p>
          <Link
            href="/campaigns/new"
            className="inline-flex items-center gap-2 rounded-md bg-vermillion px-5 py-2.5 text-sm font-bold text-text-inverse transition-colors hover:bg-vermillion-hover"
          >
            <Plus className="size-4" />
            <span>キャンペーンを作成</span>
          </Link>
        </div>
      )}
    </div>
  )
}
