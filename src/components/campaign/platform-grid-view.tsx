"use client"

import { useState } from "react"
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
  ChevronDown,
  ChevronUp,
  ImageIcon,
} from "lucide-react"
import { getPlatformById } from "@/lib/constants/platforms"
import { PlatformAssetCard } from "./platform-asset-card"

interface Asset {
  id: string
  type: string
  storageKey: string
  fileName: string | null
  width: string | null
  height: string | null
  mimeType: string | null
  modelUsed: string | null
  prompt: string | null
  metadata?: Record<string, unknown> | null
}

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

interface PlatformGridViewProps {
  assets: Asset[]
  copyVariants: CopyVariant[]
}

const VARIANT_LABELS = ["A案", "B案", "C案", "D案"]

const PLATFORM_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
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

/**
 * Determine if an asset has an extreme aspect ratio that may need manual adjustment.
 * Compares the asset's own aspect ratio against a "normal" range.
 * Threshold: aspect ratio > 3 or < 1/3 (e.g., 728x90 or 160x600).
 */
function isExtremeAspectRatio(asset: Asset): boolean {
  const w = asset.width ? Number(asset.width) : null
  const h = asset.height ? Number(asset.height) : null
  if (!w || !h) return false
  const ratio = w / h
  return ratio > 3 || ratio < 1 / 3
}

/**
 * Group platform_image assets by their metadata.platform field.
 * Also groups email_html assets under "email".
 */
function groupAssetsByPlatform(
  assets: Asset[]
): Record<string, Asset[]> {
  const groups: Record<string, Asset[]> = {}

  for (const asset of assets) {
    if (asset.type === "platform_image") {
      const meta = asset.metadata as {
        platform?: string
        dimensionLabel?: string
      } | null
      const platformId = meta?.platform || "unknown"
      if (!groups[platformId]) groups[platformId] = []
      groups[platformId].push(asset)
    } else if (asset.type === "email_html") {
      if (!groups["email"]) groups["email"] = []
      groups["email"].push(asset)
    }
  }

  return groups
}

function CopySection({
  variants,
}: {
  variants: CopyVariant[]
}) {
  const [isOpen, setIsOpen] = useState(false)

  if (variants.length === 0) return null

  return (
    <div className="mt-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
      >
        {isOpen ? (
          <ChevronUp className="size-4" />
        ) : (
          <ChevronDown className="size-4" />
        )}
        <span>コピーを表示 ({variants.length}件)</span>
      </button>

      {isOpen && (
        <div className="mt-3 space-y-4 rounded-lg border border-border-subtle bg-bg-surface p-4">
          {variants.map((variant) => {
            const label =
              VARIANT_LABELS[
                parseInt(variant.variantLabel.replace(/[^0-9]/g, "")) - 1
              ] || variant.variantLabel

            return (
              <div
                key={variant.id}
                className="space-y-2 border-b border-border-subtle pb-4 last:border-0 last:pb-0"
              >
                <span className="inline-flex items-center rounded-pill bg-warm-gold-subtle px-2.5 py-0.5 text-xs font-bold text-warm-gold">
                  {label}
                </span>
                <div className="space-y-1.5">
                  <div>
                    <span className="text-[10px] font-medium text-text-muted">
                      見出し
                    </span>
                    <p className="text-sm font-medium text-text-primary">
                      {variant.headline}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-medium text-text-muted">
                      本文
                    </span>
                    <p className="text-sm leading-relaxed text-text-secondary">
                      {variant.bodyText}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-medium text-text-muted">
                      CTA
                    </span>
                    <p className="text-sm font-medium text-vermillion">
                      {variant.ctaText}
                    </p>
                  </div>
                  {variant.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {variant.hashtags.map((tag, i) => (
                        <span
                          key={i}
                          className="rounded-pill bg-steel-blue-subtle px-2 py-0.5 text-[10px] text-steel-blue"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function PlatformGridView({
  assets,
  copyVariants,
}: PlatformGridViewProps) {
  const grouped = groupAssetsByPlatform(assets)
  const platformIds = Object.keys(grouped)

  if (platformIds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-border-subtle bg-bg-surface py-16">
        <ImageIcon className="mb-3 size-8 text-text-muted" />
        <p className="text-sm text-text-muted">
          プラットフォーム別のアセットはまだ生成されていません
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-10">
      {platformIds.map((platformId) => {
        const platformDef = getPlatformById(platformId)
        const platformAssets = grouped[platformId]
        const platformCopy = copyVariants.filter(
          (v) => v.platform === platformId
        )

        const iconName = platformDef?.icon || "LayoutGrid"
        const Icon = PLATFORM_ICONS[iconName] || LayoutGrid
        const platformName = platformDef?.nameJa || platformId

        return (
          <section key={platformId}>
            {/* Section header */}
            <div className="mb-4 flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Icon className="size-5 text-text-secondary" />
                <h3 className="text-sm font-bold text-text-primary">
                  {platformName}
                </h3>
              </div>
              <span className="inline-flex items-center rounded-pill bg-bg-surface px-2 py-0.5 text-xs text-text-muted">
                {platformAssets.length}件
              </span>
            </div>

            {/* Asset grid */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {platformAssets.map((asset) => {
                const meta = asset.metadata as {
                  platform?: string
                  dimensionLabel?: string
                } | null
                const dimensionLabel = meta?.dimensionLabel || ""

                return (
                  <PlatformAssetCard
                    key={asset.id}
                    asset={asset}
                    platformName={platformName}
                    dimensionLabel={dimensionLabel}
                    needsAdjustment={isExtremeAspectRatio(asset)}
                  />
                )
              })}
            </div>

            {/* Copy section (collapsed by default) */}
            <CopySection variants={platformCopy} />
          </section>
        )
      })}
    </div>
  )
}
