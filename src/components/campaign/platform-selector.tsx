"use client"

import { cn } from "@/lib/utils"
import {
  PLATFORMS,
  type PlatformDefinition,
} from "@/lib/constants/platforms"
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

const PLATFORM_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
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

interface PlatformSelectorProps {
  platforms: string[]
  selectedPlatform: string
  onChange: (platformId: string) => void
}

export function PlatformSelector({
  platforms,
  selectedPlatform,
  onChange,
}: PlatformSelectorProps) {
  const availablePlatforms = PLATFORMS.filter((p) =>
    platforms.includes(p.id)
  )

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
      {availablePlatforms.map((platform) => {
        const Icon = PLATFORM_ICONS[platform.icon]
        const isSelected = platform.id === selectedPlatform

        return (
          <button
            key={platform.id}
            onClick={() => onChange(platform.id)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-pill px-4 py-2 text-sm font-medium transition-all duration-200",
              isSelected
                ? "border-2 border-warm-gold bg-warm-gold-subtle text-warm-gold"
                : "border border-border bg-bg-surface text-text-secondary hover:border-border hover:bg-bg-hover hover:text-text-primary"
            )}
          >
            {Icon && <Icon className="size-4" />}
            <span>{platform.nameJa}</span>
          </button>
        )
      })}
    </div>
  )
}
