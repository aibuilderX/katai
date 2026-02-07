"use client"

import Link from "next/link"
import { RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  PLATFORMS,
  type PlatformDefinition,
} from "@/lib/constants/platforms"
import { getRegisterById } from "@/lib/constants/keigo"
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

interface CampaignSidebarProps {
  brandName: string
  targetAudience: string
  platforms: string[]
  toneTags: string[]
  register: string
  generationTime?: string | null
  variantCount: number
  campaignId: string
}

export function CampaignSidebar({
  brandName,
  targetAudience,
  platforms,
  toneTags,
  register,
  generationTime,
  variantCount,
  campaignId,
}: CampaignSidebarProps) {
  const registerDef = getRegisterById(register)

  const platformDefs = PLATFORMS.filter((p) => platforms.includes(p.id))

  return (
    <aside className="sticky top-8 w-full shrink-0 space-y-6 lg:w-[300px]">
      {/* Brief summary section */}
      <div className="rounded-lg border border-border-subtle bg-bg-card p-5">
        <h3 className="mb-4 text-sm font-bold text-text-primary">
          ブリーフ概要
        </h3>

        <div className="space-y-4">
          {/* Brand name */}
          <div>
            <span className="text-xs font-medium text-text-muted">
              ブランド名
            </span>
            <p className="mt-0.5 text-sm text-text-primary">{brandName}</p>
          </div>

          {/* Target audience */}
          {targetAudience && (
            <div>
              <span className="text-xs font-medium text-text-muted">
                ターゲット
              </span>
              <p className="mt-0.5 text-sm leading-relaxed text-text-secondary">
                {targetAudience}
              </p>
            </div>
          )}

          {/* Platforms */}
          <div>
            <span className="text-xs font-medium text-text-muted">
              プラットフォーム
            </span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {platformDefs.map((p) => {
                const Icon = PLATFORM_ICONS[p.icon]
                return (
                  <span
                    key={p.id}
                    className="inline-flex items-center gap-1 rounded-pill bg-bg-surface px-2 py-0.5 text-xs text-text-secondary"
                  >
                    {Icon && <Icon className="size-3" />}
                    <span>{p.nameJa}</span>
                  </span>
                )
              })}
            </div>
          </div>

          {/* Tone tags */}
          {toneTags.length > 0 && (
            <div>
              <span className="text-xs font-medium text-text-muted">
                トーン
              </span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {toneTags.map((tag, i) => (
                  <span
                    key={i}
                    className="rounded-pill bg-warm-gold-subtle px-2 py-0.5 text-xs text-warm-gold"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Keigo register */}
          <div>
            <span className="text-xs font-medium text-text-muted">
              敬語レベル
            </span>
            <p className="mt-0.5 text-sm text-text-primary">
              {registerDef?.nameJa || register}
            </p>
          </div>
        </div>
      </div>

      {/* Generation metadata */}
      <div className="rounded-lg border border-border-subtle bg-bg-card p-5">
        <h3 className="mb-4 text-sm font-bold text-text-primary">
          生成情報
        </h3>

        <div className="space-y-3">
          {/* Generation time */}
          {generationTime && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted">生成時間</span>
              <span className="font-mono text-xs text-text-secondary">
                {generationTime}
              </span>
            </div>
          )}

          {/* Models used */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted">使用モデル</span>
            <div className="flex gap-1.5">
              <span className="rounded-pill bg-steel-blue-subtle px-2 py-0.5 font-mono text-[10px] text-steel-blue">
                Claude
              </span>
              <span className="rounded-pill bg-steel-blue-subtle px-2 py-0.5 font-mono text-[10px] text-steel-blue">
                Flux
              </span>
            </div>
          </div>

          {/* Variant count */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted">バリエーション数</span>
            <span className="font-mono text-xs text-text-secondary">
              {variantCount}
            </span>
          </div>
        </div>
      </div>

      {/* Re-edit action */}
      <Link
        href={`/campaigns/new`}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-bg-surface px-4 py-3 text-sm font-medium text-text-primary transition-colors hover:bg-bg-hover"
      >
        <RefreshCw className="size-4" />
        <span>ブリーフを編集して再生成</span>
      </Link>
    </aside>
  )
}
