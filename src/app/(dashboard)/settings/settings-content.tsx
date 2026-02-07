"use client"

import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { LogOut } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"

interface SettingsContentProps {
  email: string
  displayName: string | null
  avatarUrl: string | null
  teamName: string
  members: Array<{
    id: string
    email: string
    displayName: string | null
    role: string
  }>
}

export function SettingsContent({
  email,
  displayName,
  avatarUrl,
  teamName,
  members,
}: SettingsContentProps) {
  const router = useRouter()
  const t = useTranslations("settings")
  const tAuth = useTranslations("auth")

  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const initials = displayName
    ? displayName.charAt(0).toUpperCase()
    : email.charAt(0).toUpperCase()

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <h1 className="text-2xl font-black tracking-tight text-text-primary">
        {t("title")}
      </h1>

      {/* Account section */}
      <div className="rounded-radius-lg border border-border-subtle bg-bg-card p-6">
        <h2 className="mb-4 text-lg font-bold text-text-primary">
          {t("account")}
        </h2>

        <div className="flex items-center gap-4">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              className="size-16 rounded-full object-cover"
            />
          ) : (
            <div className="flex size-16 items-center justify-center rounded-full bg-bg-surface text-xl font-bold text-text-secondary">
              {initials}
            </div>
          )}

          <div className="space-y-1">
            <p className="text-sm text-text-muted">{t("displayName")}</p>
            <p className="font-medium text-text-primary">
              {displayName || "---"}
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-3 border-t border-border-subtle pt-4">
          <div>
            <p className="text-sm text-text-muted">{t("emailAddress")}</p>
            <p className="mt-1 font-mono text-sm text-text-primary">{email}</p>
          </div>
        </div>
      </div>

      {/* Team section */}
      <div className="rounded-radius-lg border border-border-subtle bg-bg-card p-6">
        <h2 className="mb-4 text-lg font-bold text-text-primary">
          {t("team")}
        </h2>

        <div className="mb-4">
          <p className="text-sm text-text-muted">{t("teamName")}</p>
          <p className="mt-1 font-medium text-text-primary">
            {teamName || "---"}
          </p>
        </div>

        <div>
          <p className="mb-3 text-sm font-medium text-text-secondary">
            {t("members")}
          </p>
          <div className="space-y-2">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-radius-sm bg-bg-surface px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    {member.displayName || member.email}
                  </p>
                  {member.displayName && (
                    <p className="text-xs text-text-muted">{member.email}</p>
                  )}
                </div>
                <span className="rounded-radius-pill bg-bg-hover px-3 py-1 text-xs font-medium text-text-muted">
                  {member.role === "admin"
                    ? t("admin")
                    : member.role === "editor"
                      ? t("editor")
                      : t("viewer")}
                </span>
              </div>
            ))}
            {members.length === 0 && (
              <p className="text-sm text-text-muted">---</p>
            )}
          </div>
        </div>
      </div>

      {/* Logout */}
      <div className="rounded-radius-lg border border-border-subtle bg-bg-card p-6">
        <Button
          onClick={handleLogout}
          variant="destructive"
          className="h-11 w-full"
        >
          <LogOut className="size-4" />
          {tAuth("logout")}
        </Button>
      </div>
    </div>
  )
}
