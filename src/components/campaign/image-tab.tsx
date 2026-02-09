"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Download, ZoomIn, ImageIcon, X, Layers, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { RegenerateDialog } from "./regenerate-dialog"

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
  campaignId: string
  assets: Asset[]
}

/** Map layout IDs to Japanese labels. */
const LAYOUT_LABELS: Record<string, string> = {
  A: "レイアウト A",
  B: "レイアウト B",
  C: "レイアウト C",
}

export function ImageTab({ campaignId, assets }: ImageTabProps) {
  const router = useRouter()
  const [lightboxImage, setLightboxImage] = useState<Asset | null>(null)
  const [regenerateAssetId, setRegenerateAssetId] = useState<string | null>(
    null
  )
  const [isRegenerating, setIsRegenerating] = useState(false)

  async function handleRegenerateConfirm() {
    if (!regenerateAssetId) return
    setIsRegenerating(true)

    try {
      const res = await fetch(`/api/campaigns/${campaignId}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "image",
          assetId: regenerateAssetId,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "再生成に失敗しました")
      }

      toast.success("画像を再生成しました")
      setRegenerateAssetId(null)
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "再生成に失敗しました"
      )
    } finally {
      setIsRegenerating(false)
    }
  }

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

          {/* Regenerate button for base images */}
          {asset.type === "image" && (
            <button
              onClick={() => setRegenerateAssetId(asset.id)}
              className="absolute bottom-3 right-3 z-10 rounded-md bg-bg-card/80 p-2 text-text-muted backdrop-blur-sm transition-colors hover:bg-bg-hover hover:text-text-primary"
              title="この画像を再生成"
            >
              <RefreshCw className="size-4" />
            </button>
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

      {/* Regenerate confirmation dialog */}
      <RegenerateDialog
        open={!!regenerateAssetId}
        onOpenChange={(open) => !open && setRegenerateAssetId(null)}
        title="画像を再生成しますか？"
        description="この画像を再生成すると、合成画像とリサイズ画像も更新されます。現在の画像は上書きされます。"
        onConfirm={handleRegenerateConfirm}
        isLoading={isRegenerating}
      />
    </>
  )
}
