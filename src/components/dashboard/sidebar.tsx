"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import {
  LayoutDashboard,
  Palette,
  Megaphone,
  CreditCard,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useUIStore } from "@/stores/ui-store"

const navItems = [
  { key: "dashboard" as const, href: "/", icon: LayoutDashboard },
  { key: "brands" as const, href: "/brands", icon: Palette },
  { key: "campaigns" as const, href: "/campaigns", icon: Megaphone },
  { key: "billing" as const, href: "/billing", icon: CreditCard },
  { key: "settings" as const, href: "/settings", icon: Settings },
]

interface SidebarProps {
  userEmail?: string
  userAvatarUrl?: string | null
  userDisplayName?: string | null
}

export function Sidebar({
  userEmail,
  userAvatarUrl,
  userDisplayName,
}: SidebarProps) {
  const pathname = usePathname()
  const t = useTranslations("nav")
  const { sidebarCollapsed, toggleSidebar } = useUIStore()

  function isActive(href: string) {
    if (href === "/") {
      return pathname === "/"
    }
    return pathname.startsWith(href)
  }

  const initials = userDisplayName
    ? userDisplayName.charAt(0).toUpperCase()
    : userEmail
      ? userEmail.charAt(0).toUpperCase()
      : "U"

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-border-subtle bg-bg-surface transition-[width] duration-200 ease-out",
        sidebarCollapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo / Brand */}
      <div className="flex h-16 items-center border-b border-border-subtle px-4">
        <Link href="/" className="flex items-center gap-3 overflow-hidden">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-vermillion text-sm font-black text-text-inverse">
            AI
          </div>
          {!sidebarCollapsed && (
            <span className="truncate text-sm font-bold text-text-primary">
              Content Studio
            </span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {navItems.map((item) => {
          const active = isActive(item.href)
          const Icon = item.icon

          return (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                "group relative flex h-12 items-center gap-3 rounded-sm px-3 text-sm font-medium transition-colors duration-200",
                active
                  ? "bg-vermillion-subtle text-text-primary"
                  : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
              )}
            >
              {/* Vermillion left border accent for active state */}
              {active && (
                <div className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-vermillion" />
              )}
              <Icon className="size-5 shrink-0" />
              {!sidebarCollapsed && (
                <span className="truncate">{t(item.key)}</span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* User Avatar */}
      <div className="border-t border-border-subtle p-3">
        <div
          className={cn(
            "flex items-center gap-3 rounded-sm px-3 py-2",
            sidebarCollapsed ? "justify-center px-0" : ""
          )}
        >
          {userAvatarUrl ? (
            <img
              src={userAvatarUrl}
              alt=""
              className="size-8 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-bg-hover text-xs font-bold text-text-secondary">
              {initials}
            </div>
          )}
          {!sidebarCollapsed && (
            <div className="min-w-0 flex-1">
              {userDisplayName && (
                <p className="truncate text-xs font-medium text-text-primary">
                  {userDisplayName}
                </p>
              )}
              <p className="truncate text-xs text-text-muted">
                {userEmail}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Collapse toggle */}
      <div className="border-t border-border-subtle p-3">
        <button
          onClick={toggleSidebar}
          className="flex h-8 w-full items-center justify-center rounded-sm text-text-muted transition-colors hover:bg-bg-hover hover:text-text-secondary"
          aria-label={sidebarCollapsed ? "サイドバーを展開" : "サイドバーを折りたたむ"}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="size-4" />
          ) : (
            <ChevronLeft className="size-4" />
          )}
        </button>
      </div>
    </aside>
  )
}
