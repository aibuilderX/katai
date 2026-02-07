"use client"

import { useState } from "react"
import { Download, ZoomIn, ImageIcon, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"

interface Asset {
  id: string
  storageKey: string
  fileName: string | null
  width: string | null
  height: string | null
  mimeType: string | null
  modelUsed: string | null
  prompt: string | null
}

interface ImageTabProps {
  assets: Asset[]
}

export function ImageTab({ assets }: ImageTabProps) {
  const [lightboxImage, setLightboxImage] = useState<Asset | null>(null)

  const imageAssets = assets.filter((a) => a.mimeType?.startsWith("image/") || a.storageKey)

  if (imageAssets.length === 0) {
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

  return (
    <>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {imageAssets.map((asset) => (
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
        ))}
      </div>

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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
