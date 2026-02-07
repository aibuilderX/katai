"use client"

import { Sidebar } from "@/components/dashboard/sidebar"

interface DashboardShellProps {
  children: React.ReactNode
  userEmail: string
  userDisplayName?: string | null
  userAvatarUrl?: string | null
}

export function DashboardShell({
  children,
  userEmail,
  userDisplayName,
  userAvatarUrl,
}: DashboardShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-bg-page">
      <Sidebar
        userEmail={userEmail}
        userAvatarUrl={userAvatarUrl}
        userDisplayName={userDisplayName}
      />
      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  )
}
