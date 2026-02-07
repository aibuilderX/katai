import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DashboardShell } from "./dashboard-shell"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // Belt-and-suspenders auth check (proxy.ts also redirects)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Fetch user profile for sidebar display
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .single()

  return (
    <DashboardShell
      userEmail={user.email || ""}
      userDisplayName={profile?.display_name}
      userAvatarUrl={profile?.avatar_url}
    >
      {children}
    </DashboardShell>
  )
}
