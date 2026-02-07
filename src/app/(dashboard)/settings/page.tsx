import { createClient } from "@/lib/supabase/server"
import { SettingsContent } from "./settings-content"

export default async function SettingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // Fetch profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, email, avatar_url")
    .eq("id", user.id)
    .single()

  // Fetch team info
  const { data: teamMember } = await supabase
    .from("team_members")
    .select("team_id, role")
    .eq("user_id", user.id)
    .single()

  let teamName = ""
  let members: Array<{
    id: string
    email: string
    displayName: string | null
    role: string
  }> = []

  if (teamMember?.team_id) {
    const { data: team } = await supabase
      .from("teams")
      .select("name")
      .eq("id", teamMember.team_id)
      .single()

    teamName = team?.name ?? ""

    const { data: teamMembers } = await supabase
      .from("team_members")
      .select("user_id, role")
      .eq("team_id", teamMember.team_id)

    if (teamMembers) {
      const userIds = teamMembers.map((m) => m.user_id)
      const { data: memberProfiles } = await supabase
        .from("profiles")
        .select("id, email, display_name")
        .in("id", userIds)

      members = teamMembers.map((m) => {
        const memberProfile = memberProfiles?.find((p) => p.id === m.user_id)
        return {
          id: m.user_id,
          email: memberProfile?.email ?? "",
          displayName: memberProfile?.display_name ?? null,
          role: m.role,
        }
      })
    }
  }

  return (
    <SettingsContent
      email={profile?.email ?? user.email ?? ""}
      displayName={profile?.display_name ?? null}
      avatarUrl={profile?.avatar_url ?? null}
      teamName={teamName}
      members={members}
    />
  )
}
