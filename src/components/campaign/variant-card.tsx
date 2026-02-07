"use client"

import { useState } from "react"
import { Copy, Check, Star } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { getPlatformById } from "@/lib/constants/platforms"

interface VariantCardProps {
  id: string
  campaignId: string
  variantLabel: string
  platform: string
  headline: string
  bodyText: string
  ctaText: string
  hashtags: string[]
  isFavorite: boolean
  view: "preview" | "text"
}

// Platform-specific visual styling hints
function getPlatformStyle(platformId: string) {
  switch (platformId) {
    case "instagram":
      return {
        frame: "rounded-lg",
        accent: "bg-gradient-to-br from-purple-900/20 to-pink-900/20",
        label: "Instagram",
      }
    case "x":
      return {
        frame: "rounded-lg",
        accent: "bg-gradient-to-br from-blue-900/20 to-slate-900/20",
        label: "X",
      }
    case "line":
      return {
        frame: "rounded-lg",
        accent: "bg-gradient-to-br from-green-900/20 to-emerald-900/20",
        label: "LINE",
      }
    case "yahoo_japan":
      return {
        frame: "rounded-lg",
        accent: "bg-gradient-to-br from-red-900/20 to-orange-900/20",
        label: "Yahoo!",
      }
    case "rakuten":
      return {
        frame: "rounded-lg",
        accent: "bg-gradient-to-br from-red-900/20 to-rose-900/20",
        label: "楽天",
      }
    case "tiktok":
      return {
        frame: "rounded-lg",
        accent: "bg-gradient-to-br from-cyan-900/20 to-pink-900/20",
        label: "TikTok",
      }
    case "youtube":
      return {
        frame: "rounded-lg",
        accent: "bg-gradient-to-br from-red-900/20 to-red-800/20",
        label: "YouTube",
      }
    default:
      return {
        frame: "rounded-lg",
        accent: "bg-gradient-to-br from-slate-900/20 to-gray-900/20",
        label: platformId,
      }
  }
}

export function VariantCard({
  id,
  campaignId,
  variantLabel,
  platform,
  headline,
  bodyText,
  ctaText,
  hashtags,
  isFavorite: initialFavorite,
  view,
}: VariantCardProps) {
  const [isCopied, setIsCopied] = useState(false)
  const [isFavorite, setIsFavorite] = useState(initialFavorite)
  const [isToggling, setIsToggling] = useState(false)

  const platformStyle = getPlatformStyle(platform)
  const platformDef = getPlatformById(platform)

  async function handleCopy() {
    const allText = [
      `【${variantLabel}】`,
      `見出し: ${headline}`,
      `本文: ${bodyText}`,
      `CTA: ${ctaText}`,
      hashtags.length > 0 ? `ハッシュタグ: ${hashtags.join(" ")}` : "",
    ]
      .filter(Boolean)
      .join("\n")

    try {
      await navigator.clipboard.writeText(allText)
      setIsCopied(true)
      toast.success("コピーしました")
      setTimeout(() => setIsCopied(false), 2000)
    } catch {
      toast.error("コピーに失敗しました")
    }
  }

  async function handleFavoriteToggle() {
    if (isToggling) return
    setIsToggling(true)

    const newFavorite = !isFavorite
    setIsFavorite(newFavorite)

    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          copyVariantId: id,
          isFavorite: newFavorite,
        }),
      })

      if (!res.ok) {
        setIsFavorite(!newFavorite) // revert
        toast.error("お気に入りの更新に失敗しました")
      }
    } catch {
      setIsFavorite(!newFavorite) // revert
      toast.error("お気に入りの更新に失敗しました")
    } finally {
      setIsToggling(false)
    }
  }

  if (view === "text") {
    return (
      <div className="rounded-lg border border-border-subtle bg-bg-card p-6 transition-all duration-200 hover:border-border">
        {/* Header: variant badge + actions */}
        <div className="mb-4 flex items-center justify-between">
          <span className="inline-flex items-center rounded-pill bg-warm-gold-subtle px-3 py-1 text-xs font-bold text-warm-gold">
            {variantLabel}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-bg-hover hover:text-text-primary"
              title="コピー"
            >
              {isCopied ? (
                <Check className="size-4 text-success" />
              ) : (
                <Copy className="size-4" />
              )}
            </button>
            <button
              onClick={handleFavoriteToggle}
              className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-bg-hover hover:text-warm-gold"
              title={isFavorite ? "お気に入り解除" : "お気に入り"}
            >
              <Star
                className={cn(
                  "size-4",
                  isFavorite && "fill-warm-gold text-warm-gold"
                )}
              />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-3">
          <div>
            <span className="text-xs font-medium text-text-muted">見出し</span>
            <p className="mt-1 text-sm leading-relaxed text-text-primary">
              {headline}
            </p>
          </div>
          <div>
            <span className="text-xs font-medium text-text-muted">本文</span>
            <p className="mt-1 text-sm leading-[1.8] text-text-secondary">
              {bodyText}
            </p>
          </div>
          <div>
            <span className="text-xs font-medium text-text-muted">
              アクションボタン
            </span>
            <p className="mt-1 text-sm font-medium text-vermillion">{ctaText}</p>
          </div>
          {hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {hashtags.map((tag, i) => (
                <span
                  key={i}
                  className="rounded-pill bg-steel-blue-subtle px-2.5 py-0.5 text-xs text-steel-blue"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Preview mode: platform-adaptive visual mockup
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-border-subtle bg-bg-card transition-all duration-200 hover:border-border",
        platformStyle.frame
      )}
    >
      {/* Platform chrome header */}
      <div
        className={cn(
          "flex items-center justify-between px-4 py-2.5",
          platformStyle.accent
        )}
      >
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-pill bg-warm-gold-subtle px-3 py-1 text-xs font-bold text-warm-gold">
            {variantLabel}
          </span>
          <span className="text-xs text-text-muted">
            {platformDef?.nameJa || platform}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopy}
            className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-bg-hover/50 hover:text-text-primary"
            title="コピー"
          >
            {isCopied ? (
              <Check className="size-4 text-success" />
            ) : (
              <Copy className="size-4" />
            )}
          </button>
          <button
            onClick={handleFavoriteToggle}
            className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-bg-hover/50 hover:text-warm-gold"
            title={isFavorite ? "お気に入り解除" : "お気に入り"}
          >
            <Star
              className={cn(
                "size-4",
                isFavorite && "fill-warm-gold text-warm-gold"
              )}
            />
          </button>
        </div>
      </div>

      {/* Card body with platform-adaptive layout */}
      <div className="space-y-4 p-5">
        {/* Headline */}
        <div>
          <span className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-text-muted">
            見出し
          </span>
          <h4 className="text-base font-bold leading-snug text-text-primary">
            {headline}
          </h4>
        </div>

        {/* Body text */}
        <div>
          <span className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-text-muted">
            本文
          </span>
          <p className="text-sm leading-[1.8] text-text-secondary">{bodyText}</p>
        </div>

        {/* CTA button mockup */}
        <div>
          <span className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-text-muted">
            アクションボタン
          </span>
          <div className="mt-2 inline-flex items-center rounded-md bg-vermillion px-4 py-2 text-sm font-bold text-text-inverse">
            {ctaText}
          </div>
        </div>

        {/* Hashtags */}
        {hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {hashtags.map((tag, i) => (
              <span
                key={i}
                className="rounded-pill bg-steel-blue-subtle px-2.5 py-0.5 text-xs text-steel-blue"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
