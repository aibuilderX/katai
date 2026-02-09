"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, Type, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { PlatformSelector } from "./platform-selector"
import { VariantCard } from "./variant-card"
import { RegenerateDialog } from "./regenerate-dialog"

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
  const router = useRouter()
  const [selectedPlatform, setSelectedPlatform] = useState<string>(
    platforms[0] || ""
  )
  const [viewMode, setViewMode] = useState<"preview" | "text">("preview")
  const [regenerateTarget, setRegenerateTarget] = useState<{
    platform: string
    variantLabel: string
  } | null>(null)
  const [isRegenerating, setIsRegenerating] = useState(false)

  const filteredVariants = copyVariants.filter(
    (v) => v.platform === selectedPlatform
  )

  async function handleRegenerateConfirm() {
    if (!regenerateTarget) return
    setIsRegenerating(true)

    try {
      const res = await fetch(`/api/campaigns/${campaignId}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "copy_variant",
          platform: regenerateTarget.platform,
          variantLabel: regenerateTarget.variantLabel,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "再生成に失敗しました")
      }

      toast.success("コピーを再生成しました")
      setRegenerateTarget(null)
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "再生成に失敗しました"
      )
    } finally {
      setIsRegenerating(false)
    }
  }

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
            <div key={variant.id} className="relative">
              {/* Regenerate button */}
              <button
                onClick={() =>
                  setRegenerateTarget({
                    platform: variant.platform,
                    variantLabel: variant.variantLabel,
                  })
                }
                className="absolute right-2 top-2 z-10 rounded-md bg-bg-card/90 p-1.5 text-text-muted backdrop-blur-sm transition-colors hover:bg-bg-hover hover:text-text-primary"
                title="このバリエーションを再生成"
              >
                <RefreshCw className="size-3.5" />
              </button>
              <VariantCard
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
            </div>
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

      {/* Regenerate confirmation dialog */}
      <RegenerateDialog
        open={!!regenerateTarget}
        onOpenChange={(open) => !open && setRegenerateTarget(null)}
        title="コピーを再生成しますか？"
        description={
          regenerateTarget
            ? `${regenerateTarget.platform} の ${regenerateTarget.variantLabel} を新しいコピーで再生成します。現在のコピーは上書きされます。`
            : ""
        }
        onConfirm={handleRegenerateConfirm}
        isLoading={isRegenerating}
      />
    </div>
  )
}
