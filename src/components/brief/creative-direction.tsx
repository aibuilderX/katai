"use client"

import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import { Upload, X, Image as ImageIcon } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

const MOOD_TAGS = [
  { id: "bright", label: "明るい" },
  { id: "dark", label: "ダーク" },
  { id: "minimal", label: "ミニマル" },
  { id: "colorful", label: "カラフル" },
  { id: "retro", label: "レトロ" },
  { id: "modern", label: "モダン" },
  { id: "natural", label: "ナチュラル" },
  { id: "luxury", label: "ラグジュアリー" },
  { id: "pop", label: "ポップ" },
  { id: "cool", label: "クール" },
  { id: "japanese", label: "和風" },
  { id: "urban", label: "都会的" },
] as const

interface CreativeDirectionProps {
  moodTags: string[]
  direction: string
  referenceImageUrl?: string
  onMoodTagsChange: (tags: string[]) => void
  onDirectionChange: (direction: string) => void
  onReferenceImageChange: (url: string | undefined) => void
}

export function CreativeDirection({
  moodTags,
  direction,
  referenceImageUrl,
  onMoodTagsChange,
  onDirectionChange,
  onReferenceImageChange,
}: CreativeDirectionProps) {
  const [uploading, setUploading] = useState(false)

  const toggleTag = (tagId: string) => {
    if (moodTags.includes(tagId)) {
      onMoodTagsChange(moodTags.filter((t) => t !== tagId))
    } else {
      onMoodTagsChange([...moodTags, tagId])
    }
  }

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0]
      if (!file) return

      setUploading(true)
      try {
        // Create a temporary object URL for preview
        // In production, this would upload to Supabase Storage
        const objectUrl = URL.createObjectURL(file)
        onReferenceImageChange(objectUrl)
      } catch {
        // Failed to process image
      } finally {
        setUploading(false)
      }
    },
    [onReferenceImageChange]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".webp"],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: false,
  })

  return (
    <div className="space-y-5">
      {/* Mood Tags */}
      <div>
        <label className="mb-2 block text-sm font-medium text-text-primary">
          ムードタグ
        </label>
        <div className="flex flex-wrap gap-2">
          {MOOD_TAGS.map((tag) => {
            const isSelected = moodTags.includes(tag.id)
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggleTag(tag.id)}
                className={cn(
                  "rounded-pill border px-3 py-1.5 text-sm transition-all duration-200 cursor-pointer",
                  isSelected
                    ? "border-warm-gold bg-warm-gold-subtle text-warm-gold"
                    : "border-border-subtle bg-bg-card text-text-secondary hover:bg-bg-hover"
                )}
              >
                {tag.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Free text direction */}
      <div>
        <label className="mb-2 block text-sm font-medium text-text-primary">
          クリエイティブディレクション（自由記述）
        </label>
        <Textarea
          value={direction}
          onChange={(e) => onDirectionChange(e.target.value)}
          placeholder="ビジュアルの方向性やクリエイティブの指示を記述してください"
          className="min-h-[100px] resize-none bg-bg-card text-text-primary placeholder:text-text-muted"
        />
      </div>

      {/* Reference image upload */}
      <div>
        <label className="mb-2 block text-sm font-medium text-text-primary">
          参考画像（任意）
        </label>
        {referenceImageUrl ? (
          <div className="relative inline-block">
            <img
              src={referenceImageUrl}
              alt="参考画像"
              className="max-h-48 rounded-md border border-border-subtle object-cover"
            />
            <button
              type="button"
              onClick={() => onReferenceImageChange(undefined)}
              className="absolute -right-2 -top-2 rounded-full bg-bg-surface p-1 text-text-secondary hover:text-text-primary"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div
            {...getRootProps()}
            className={cn(
              "flex cursor-pointer flex-col items-center gap-2 rounded-md border-2 border-dashed p-6 transition-colors",
              isDragActive
                ? "border-vermillion bg-vermillion-subtle"
                : "border-border-subtle hover:border-text-muted"
            )}
          >
            <input {...getInputProps()} />
            {uploading ? (
              <span className="text-sm text-text-muted">
                アップロード中...
              </span>
            ) : (
              <>
                {isDragActive ? (
                  <ImageIcon className="h-8 w-8 text-vermillion" />
                ) : (
                  <Upload className="h-8 w-8 text-text-muted" />
                )}
                <span className="text-sm text-text-muted">
                  画像をドラッグ＆ドロップまたはクリックしてアップロード
                </span>
                <span className="text-xs text-text-muted">
                  PNG、JPG、WebP形式（最大10MB）
                </span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
