import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/"

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // After OAuth, ensure profile and team exist
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        try {
          const baseUrl = request.nextUrl.origin
          await fetch(`${baseUrl}/api/auth/setup-profile`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: user.id,
              email: user.email,
              displayName:
                user.user_metadata?.full_name ||
                user.user_metadata?.name ||
                null,
              avatarUrl: user.user_metadata?.avatar_url || null,
            }),
          })
        } catch {
          // Profile setup can be retried later; don't block login
          console.error("Profile setup after OAuth failed")
        }
      }

      const forwardedHost = request.headers.get("x-forwarded-host")
      const isLocalEnv = process.env.NODE_ENV === "development"

      if (isLocalEnv) {
        return NextResponse.redirect(new URL(next, request.url))
      } else if (forwardedHost) {
        return NextResponse.redirect(
          new URL(next, `https://${forwardedHost}`)
        )
      } else {
        return NextResponse.redirect(new URL(next, request.url))
      }
    }
  }

  // Return to login with error if code exchange failed
  return NextResponse.redirect(new URL("/login", request.url))
}
