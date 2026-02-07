"use client"

import { PLATFORMS } from "@/lib/constants/platforms"
import {
  Instagram,
  Twitter,
  MessageCircle,
  Globe,
  ShoppingBag,
  Music,
  Youtube,
  LayoutGrid,
  Monitor,
  Mail,
  Store,
} from "lucide-react"
import { cn } from "@/lib/utils"

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Instagram,
  Twitter,
  MessageCircle,
  Globe,
  ShoppingBag,
  Music,
  Youtube,
  LayoutGrid,
  Monitor,
  Mail,
  Store,
}

interface PlatformGridProps {
  selected: string[]
  onChange: (platforms: string[]) => void
}

export function PlatformGrid({ selected, onChange }: PlatformGridProps) {
  const togglePlatform = (platformId: string) => {
    if (selected.includes(platformId)) {
      onChange(selected.filter((id) => id !== platformId))
    } else {
      onChange([...selected, platformId])
    }
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4">
      {PLATFORMS.map((platform) => {
        const isSelected = selected.includes(platform.id)
        const IconComponent = ICON_MAP[platform.icon]

        return (
          <button
            key={platform.id}
            type="button"
            onClick={() => togglePlatform(platform.id)}
            className={cn(
              "flex flex-col items-center gap-2 rounded-md border p-4 transition-all duration-200",
              "hover:bg-bg-hover cursor-pointer",
              isSelected
                ? "border-vermillion bg-vermillion-subtle"
                : "border-border-subtle bg-bg-card"
            )}
          >
            {IconComponent && (
              <IconComponent
                className={cn(
                  "h-6 w-6",
                  isSelected ? "text-vermillion" : "text-text-secondary"
                )}
              />
            )}
            <span
              className={cn(
                "text-sm font-medium",
                isSelected ? "text-text-primary" : "text-text-secondary"
              )}
            >
              {platform.nameJa}
            </span>
          </button>
        )
      })}
    </div>
  )
}
