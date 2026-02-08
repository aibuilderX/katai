"use client"

import { useState } from "react"
import { Download, ZoomIn, ImageIcon, X, Layers } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"

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

interface ImageTabProps {
  assets: Asset[]
}

/** Map layout IDs to Japanese labels. */
const LAYOUT_LABELS: Record<string, string> = {
  A: "レイアウト A",
  B: "レイアウト B",
  C: "レイアウト C",
}

export function ImageTab({ assets }: ImageTabProps) {
  const [lightboxImage, setLightboxImage] = useState<Asset | null>(null)

  // Split assets by type
  const compositedImages = assets.filter((a) => a.type === "composited_image")
  const baseImages = assets.filter(
    (a) =>
      a.type === "image" ||
      (a.type !== "composited_image" &&
        (a.mimeType?.startsWith("image/") || a.storageKey))
  )

  const hasCompositedImages = compositedImages.length > 0
  const allImages = [...compositedImages, ...baseImages]

  if (allImages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-border-subtle bg-bg-surface py-16">
        <ImageIcon className="mb-3 size-8 text-text-muted" />
        <p className="text-sm text-text-muted">画像はまだありません</p>
      </div>
    )
  }

  function handleDownload(asset: Asset) {
    const link = document.createElement("a")
    link.href = asset.storageKey
    link.download = asset.fileName || `image-${asset.id}.png`
    link.target = "_blank"
    link.rel = "noopener noreferrer"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  function getLayoutLabel(asset: Asset): string | null {
    if (asset.type !== "composited_image") return null
    const meta = asset.metadata as { layoutId?: string } | null
    const layoutId = meta?.layoutId
    if (!layoutId) return null
    return LAYOUT_LABELS[layoutId] || `レイアウト ${layoutId}`
  }

  function renderImageCard(asset: Asset) {
    const layoutLabel = getLayoutLabel(asset)

    return (
      <div
        key={asset.id}
        className="group relative overflow-hidden rounded-lg border border-border-subtle bg-bg-card transition-all duration-200 hover:border-border"
      >
        {/* Image container (16:9) */}
        <div className="relative aspect-video w-full overflow-hidden bg-bg-surface">
          <img
            src={asset.storageKey}
            alt={asset.fileName || "生成画像"}
            className="size-full object-cover"
          />

          {/* Layout label badge */}
          {layoutLabel && (
            <div className="absolute left-3 top-3">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-bg-card/90 px-2.5 py-1 text-xs font-medium text-text-primary backdrop-blur-sm">
                <Layers className="size-3" />
                {layoutLabel}
              </span>
            </div>
          )}

          {/* Hover overlay with actions */}
          <div className="absolute inset-0 flex items-center justify-center gap-3 bg-black/60 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <button
              onClick={() => handleDownload(asset)}
              className="flex items-center gap-2 rounded-md bg-bg-card/90 px-4 py-2 text-sm font-medium text-text-primary backdrop-blur-sm transition-colors hover:bg-bg-hover"
              title="ダウンロード"
            >
              <Download className="size-4" />
              <span>ダウンロード</span>
            </button>
            <button
              onClick={() => setLightboxImage(asset)}
              className="flex items-center gap-2 rounded-md bg-bg-card/90 px-4 py-2 text-sm font-medium text-text-primary backdrop-blur-sm transition-colors hover:bg-bg-hover"
              title="拡大表示"
            >
              <ZoomIn className="size-4" />
              <span>拡大</span>
            </button>
          </div>
        </div>

        {/* Image info */}
        <div className="flex items-center justify-between px-4 py-2.5">
          <span className="text-xs text-text-muted">
            {asset.width && asset.height
              ? `${asset.width} x ${asset.height}`
              : ""}
          </span>
          {asset.modelUsed && (
            <span className="rounded-pill bg-steel-blue-subtle px-2 py-0.5 font-mono text-[10px] text-steel-blue">
              {asset.modelUsed}
            </span>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Composited images section (shown first when available) */}
      {hasCompositedImages && (
        <div className="mb-8">
          <h3 className="mb-4 text-sm font-bold text-text-primary">
            合成画像
          </h3>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {compositedImages.map(renderImageCard)}
          </div>
        </div>
      )}

      {/* Base images section */}
      {baseImages.length > 0 && (
        <div>
          {hasCompositedImages ? (
            <h3 className="mb-4 text-sm font-bold text-text-muted">
              ベース画像（AI生成）
            </h3>
          ) : null}
          <div
            className={
              hasCompositedImages
                ? "grid grid-cols-2 gap-4 sm:grid-cols-3"
                : "grid grid-cols-1 gap-6 sm:grid-cols-2"
            }
          >
            {baseImages.map(renderImageCard)}
          </div>
        </div>
      )}

      {/* Lightbox dialog */}
      <Dialog
        open={!!lightboxImage}
        onOpenChange={(open) => !open && setLightboxImage(null)}
      >
        <DialogContent className="max-w-4xl border-border bg-bg-page p-0">
          <DialogTitle className="sr-only">画像拡大表示</DialogTitle>
          {lightboxImage && (
            <div className="relative">
              <img
                src={lightboxImage.storageKey}
                alt={lightboxImage.fileName || "生成画像"}
                className="w-full rounded-lg object-contain"
              />
              <div className="absolute right-4 top-4 flex gap-2">
                <button
                  onClick={() => handleDownload(lightboxImage)}
                  className="rounded-md bg-bg-card/90 p-2 text-text-primary backdrop-blur-sm transition-colors hover:bg-bg-hover"
                >
                  <Download className="size-5" />
                </button>
              </div>
              {/* Layout label in lightbox */}
              {getLayoutLabel(lightboxImage) && (
                <div className="absolute left-4 top-4">
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-bg-card/90 px-3 py-1.5 text-sm font-medium text-text-primary backdrop-blur-sm">
                    <Layers className="size-4" />
                    {getLayoutLabel(lightboxImage)}
                  </span>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
