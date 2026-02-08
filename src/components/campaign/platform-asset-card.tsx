"use client"

import { Download, AlertTriangle } from "lucide-react"

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

interface PlatformAssetCardProps {
  asset: Asset
  platformName: string
  dimensionLabel: string
  needsAdjustment?: boolean
}

export function PlatformAssetCard({
  asset,
  platformName,
  dimensionLabel,
  needsAdjustment = false,
}: PlatformAssetCardProps) {
  const w = asset.width ? Number(asset.width) : null
  const h = asset.height ? Number(asset.height) : null

  // Compute aspect ratio for the container
  // For extreme aspect ratios (e.g., 728x90, 160x600), constrain the card
  const aspectRatio = w && h ? w / h : 16 / 9
  const isExtremeRatio = aspectRatio > 3 || aspectRatio < 1 / 3

  function handleDownload() {
    const link = document.createElement("a")
    link.href = asset.storageKey
    link.download = asset.fileName || `${platformName}-${dimensionLabel}-${asset.id}.png`
    link.target = "_blank"
    link.rel = "noopener noreferrer"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="group relative overflow-hidden rounded-lg border border-border-subtle bg-bg-card transition-all duration-200 hover:border-border">
      {/* Image container with aspect ratio */}
      <div
        className="relative w-full overflow-hidden bg-bg-surface"
        style={
          isExtremeRatio
            ? { height: "200px" }
            : { aspectRatio: `${w || 16} / ${h || 9}` }
        }
      >
        <img
          src={asset.storageKey}
          alt={`${platformName} ${dimensionLabel}`}
          className={
            isExtremeRatio
              ? "absolute inset-0 m-auto max-h-full max-w-full object-contain"
              : "size-full object-cover"
          }
          style={
            isExtremeRatio
              ? { aspectRatio: `${w || 16} / ${h || 9}` }
              : undefined
          }
        />

        {/* Dimension badge overlay */}
        <div className="absolute left-3 top-3 flex items-center gap-2">
          <span className="inline-flex items-center rounded-md bg-bg-card/90 px-2.5 py-1 text-xs font-medium text-text-primary backdrop-blur-sm">
            {w && h ? `${w}x${h}` : ""}
          </span>
          {needsAdjustment && (
            <span className="inline-flex items-center gap-1 rounded-md bg-warning/20 px-2 py-1 text-xs font-medium text-warning backdrop-blur-sm">
              <AlertTriangle className="size-3" />
              要調整
            </span>
          )}
        </div>

        {/* Hover overlay with download */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 rounded-md bg-bg-card/90 px-4 py-2 text-sm font-medium text-text-primary backdrop-blur-sm transition-colors hover:bg-bg-hover"
            title="ダウンロード"
          >
            <Download className="size-4" />
            <span>ダウンロード</span>
          </button>
        </div>
      </div>

      {/* Label below image */}
      <div className="px-4 py-2.5">
        <span className="text-xs text-text-muted">{dimensionLabel}</span>
      </div>
    </div>
  )
}
