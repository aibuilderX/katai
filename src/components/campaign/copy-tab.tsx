"use client"

import { useState } from "react"
import { Eye, Type } from "lucide-react"
import { cn } from "@/lib/utils"
import { PlatformSelector } from "./platform-selector"
import { VariantCard } from "./variant-card"

interface CopyVariant {
  id: string
  campaignId: string
  platform: string
  variantLabel: string
  register: string
  headline: string
  bodyText: string
  ctaText: string
  hashtags: string[]
  isFavorite: boolean
}

interface CopyTabProps {
  campaignId: string
  copyVariants: CopyVariant[]
  platforms: string[]
}

export function CopyTab({ campaignId, copyVariants, platforms }: CopyTabProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<string>(
    platforms[0] || ""
  )
  const [viewMode, setViewMode] = useState<"preview" | "text">("preview")

  const filteredVariants = copyVariants.filter(
    (v) => v.platform === selectedPlatform
  )

  return (
    <div className="space-y-6">
      {/* Platform selector + view toggle row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PlatformSelector
          platforms={platforms}
          selectedPlatform={selectedPlatform}
          onChange={setSelectedPlatform}
        />

        {/* View toggle */}
        <div className="flex shrink-0 items-center rounded-lg border border-border bg-bg-surface p-0.5">
          <button
            onClick={() => setViewMode("preview")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-200",
              viewMode === "preview"
                ? "bg-bg-card text-text-primary shadow-sm"
                : "text-text-muted hover:text-text-secondary"
            )}
          >
            <Eye className="size-3.5" />
            <span>プレビュー表示</span>
          </button>
          <button
            onClick={() => setViewMode("text")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-200",
              viewMode === "text"
                ? "bg-bg-card text-text-primary shadow-sm"
                : "text-text-muted hover:text-text-secondary"
            )}
          >
            <Type className="size-3.5" />
            <span>テキスト表示</span>
          </button>
        </div>
      </div>

      {/* Variant cards grid */}
      {filteredVariants.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {filteredVariants.map((variant) => (
            <VariantCard
              key={variant.id}
              id={variant.id}
              campaignId={campaignId}
              variantLabel={variant.variantLabel}
              platform={variant.platform}
              headline={variant.headline}
              bodyText={variant.bodyText}
              ctaText={variant.ctaText}
              hashtags={variant.hashtags || []}
              isFavorite={variant.isFavorite}
              view={viewMode}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-border-subtle bg-bg-surface py-16">
          <Type className="mb-3 size-8 text-text-muted" />
          <p className="text-sm text-text-muted">
            このプラットフォームのコピーはまだありません
          </p>
        </div>
      )}
    </div>
  )
}
