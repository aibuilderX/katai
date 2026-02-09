"use client"

import { Film, Download, Music } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { VideoPlayer } from "@/components/campaign/video-player"

interface VideoAsset {
  id: string
  storageKey: string
  fileName: string | null
  mimeType: string | null
  modelUsed: string | null
  metadata?: Record<string, unknown> | null
}

interface VideoTabProps {
  videos: VideoAsset[]
  audioAssets: VideoAsset[]
}

/** Map provider model name to display label. */
function getProviderLabel(modelUsed: string | null): string | null {
  if (!modelUsed) return null
  const lower = modelUsed.toLowerCase()
  if (lower.includes("kling")) return "Kling"
  if (lower.includes("runway")) return "Runway"
  if (lower.includes("heygen")) return "HeyGen"
  if (lower.includes("elevenlabs")) return "ElevenLabs"
  return modelUsed
}

/** Map video type metadata to Japanese label. */
function getVideoTypeLabel(metadata: Record<string, unknown> | null | undefined): string | null {
  if (!metadata) return null
  const videoType = metadata.videoType as string | undefined
  switch (videoType) {
    case "ad":
      return "広告"
    case "cinematic":
      return "シネマ"
    case "avatar":
      return "アバター"
    default:
      return videoType || null
  }
}

/** Get aspect ratio from metadata. */
function getAspectRatio(metadata: Record<string, unknown> | null | undefined): string | null {
  if (!metadata) return null
  return (metadata.aspectRatio as string) || null
}

/** Get duration from metadata. */
function getDuration(metadata: Record<string, unknown> | null | undefined): string | null {
  if (!metadata) return null
  const duration = metadata.duration as number | undefined
  if (!duration) return null
  return `${duration}秒`
}

/**
 * Video gallery tab displaying video and audio assets.
 * Audio section shows playable voiceover. Video section shows a responsive
 * grid of video cards with provider/type/ratio badges and download buttons.
 */
export function VideoTab({ videos, audioAssets }: VideoTabProps) {
  if (videos.length === 0 && audioAssets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-border-subtle bg-bg-surface py-16">
        <Film className="mb-3 size-8 text-text-muted" />
        <p className="text-sm text-text-muted">
          動画・音声アセットはありません
        </p>
        <p className="mt-1 text-xs text-text-muted">
          動画対応のプラットフォームを選択すると、動画アセットが生成されます
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Audio / narration section */}
      {audioAssets.length > 0 && (
        <div>
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-text-primary">
            <Music className="size-4" />
            ナレーション
          </h3>
          <div className="space-y-4">
            {audioAssets.map((asset) => (
              <div
                key={asset.id}
                className="overflow-hidden rounded-lg border border-border-subtle bg-bg-card p-4"
              >
                <audio
                  src={asset.storageKey}
                  controls
                  preload="metadata"
                  className="mb-3 w-full"
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getProviderLabel(asset.modelUsed) && (
                      <Badge
                        variant="secondary"
                        className="bg-steel-blue-subtle text-steel-blue"
                      >
                        {getProviderLabel(asset.modelUsed)}
                      </Badge>
                    )}
                    {getDuration(asset.metadata) && (
                      <span className="text-xs text-text-muted">
                        {getDuration(asset.metadata)}
                      </span>
                    )}
                  </div>
                  <a
                    href={asset.storageKey}
                    download={asset.fileName || `audio-${asset.id}.mp3`}
                    className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-bg-hover hover:text-text-primary"
                  >
                    <Download className="size-3.5" />
                    ダウンロード
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Video section */}
      {videos.length > 0 && (
        <div>
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-text-primary">
            <Film className="size-4" />
            動画
          </h3>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {videos.map((video) => {
              const provider = getProviderLabel(video.modelUsed)
              const videoType = getVideoTypeLabel(video.metadata)
              const ratio = getAspectRatio(video.metadata)
              const duration = getDuration(video.metadata)

              return (
                <div
                  key={video.id}
                  className="group overflow-hidden rounded-lg border border-border-subtle bg-bg-card transition-all duration-200 hover:border-border"
                >
                  {/* Video player */}
                  <VideoPlayer
                    src={video.storageKey}
                    aspectRatio={ratio || undefined}
                  />

                  {/* Video info */}
                  <div className="space-y-2 px-4 py-3">
                    {/* Badges row */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {provider && (
                        <Badge
                          variant="secondary"
                          className="bg-steel-blue-subtle text-steel-blue"
                        >
                          {provider}
                        </Badge>
                      )}
                      {videoType && (
                        <Badge
                          variant="secondary"
                          className="bg-vermillion-subtle text-vermillion"
                        >
                          {videoType}
                        </Badge>
                      )}
                      {ratio && (
                        <Badge variant="outline" className="text-text-muted">
                          {ratio}
                        </Badge>
                      )}
                    </div>

                    {/* Duration + download */}
                    <div className="flex items-center justify-between">
                      {duration && (
                        <span className="text-xs text-text-muted">
                          {duration}
                        </span>
                      )}
                      <a
                        href={video.storageKey}
                        download={
                          video.fileName || `video-${video.id}.mp4`
                        }
                        className="ml-auto inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-bg-hover hover:text-text-primary"
                      >
                        <Download className="size-3.5" />
                        ダウンロード
                      </a>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
