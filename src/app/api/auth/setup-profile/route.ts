import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { userId, email, displayName, avatarUrl } = await request.json()

    if (!userId || !email) {
      return NextResponse.json(
        { error: "userId and email are required" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .single()

    if (existingProfile) {
      return NextResponse.json({ message: "Profile already exists" })
    }

    // Create profile
    const { error: profileError } = await supabase.from("profiles").insert({
      id: userId,
      email,
      display_name: displayName || null,
      avatar_url: avatarUrl || null,
    })

    if (profileError) {
      console.error("Profile creation error:", profileError)
      return NextResponse.json(
        { error: "Failed to create profile" },
        { status: 500 }
      )
    }

    // Create default team
    const { error: teamError } = await supabase.from("teams").insert({
      name: "マイチーム",
      owner_id: userId,
    })

    if (teamError) {
      console.error("Team creation error:", teamError)
      // Profile was created successfully, team creation is non-critical
    }

    // Add user as admin of their own team
    const { data: team } = await supabase
      .from("teams")
      .select("id")
      .eq("owner_id", userId)
      .single()

    if (team) {
      await supabase.from("team_members").insert({
        team_id: team.id,
        user_id: userId,
        role: "admin",
      })
    }

    return NextResponse.json({ message: "Profile and team created" })
  } catch (error) {
    console.error("Setup profile error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
