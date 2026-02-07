import { createClient } from "@/lib/supabase/server"
import { DashboardContent } from "./dashboard-content"

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // Get user's team
  const { data: teamMember } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", user.id)
    .single()

  const teamId = teamMember?.team_id

  // Fetch stats
  let totalCampaigns = 0
  let activeBrands = 0
  let monthlyGenerations = 0
  let hasBrands = false

  if (teamId) {
    const [campaignsResult, brandsResult] = await Promise.all([
      supabase
        .from("campaigns")
        .select("id", { count: "exact", head: true })
        .eq("team_id", teamId),
      supabase
        .from("brand_profiles")
        .select("id", { count: "exact", head: true })
        .eq("team_id", teamId),
    ])

    totalCampaigns = campaignsResult.count ?? 0
    activeBrands = brandsResult.count ?? 0
    hasBrands = activeBrands > 0

    // Monthly generations: campaigns created this month
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { count: monthlyCount } = await supabase
      .from("campaigns")
      .select("id", { count: "exact", head: true })
      .eq("team_id", teamId)
      .gte("created_at", startOfMonth.toISOString())

    monthlyGenerations = monthlyCount ?? 0
  }

  // Fetch recent campaigns
  let campaigns: Array<{
    id: string
    name: string | null
    thumbnail_url: string | null
    status: string
    brief: Record<string, unknown>
    created_at: string
  }> = []

  if (teamId) {
    const { data } = await supabase
      .from("campaigns")
      .select("id, name, thumbnail_url, status, brief, created_at")
      .eq("team_id", teamId)
      .order("created_at", { ascending: false })
      .limit(9)

    campaigns = data ?? []
  }

  return (
    <DashboardContent
      totalCampaigns={totalCampaigns}
      activeBrands={activeBrands}
      monthlyGenerations={monthlyGenerations}
      campaigns={campaigns.map((c) => ({
        id: c.id,
        name: c.name || "無題のキャンペーン",
        thumbnailUrl: c.thumbnail_url,
        status: c.status as "pending" | "generating" | "complete" | "failed" | "partial" | "draft",
        platformCount: Array.isArray((c.brief as Record<string, unknown>)?.platforms)
          ? ((c.brief as Record<string, unknown>).platforms as string[]).length
          : 0,
        createdAt: c.created_at,
      }))}
      hasBrands={hasBrands}
    />
  )
}
