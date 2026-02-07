"use client"

import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import { Upload, ImageIcon, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useBrandWizardStore } from "@/stores/brand-wizard-store"

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ACCEPTED_TYPES = {
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/svg+xml": [".svg"],
}

export function LogoUploadStep() {
  const {
    brandName,
    logoPreviewUrl,
    extractedColors,
    setField,
    setExtractedColors,
  } = useBrandWizardStore()
  const [isExtracting, setIsExtracting] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0]
      if (!file) return

      setUploadError(null)

      if (file.size > MAX_FILE_SIZE) {
        setUploadError("ファイルサイズは5MB以下にしてください")
        return
      }

      // Set preview
      const previewUrl = URL.createObjectURL(file)
      setField("logoFile", file)
      setField("logoPreviewUrl", previewUrl)

      // Upload to Supabase Storage via API
      setIsExtracting(true)
      try {
        const formData = new FormData()
        formData.append("logo", file)

        const uploadRes = await fetch("/api/brands/logo-upload", {
          method: "POST",
          body: formData,
        })

        if (!uploadRes.ok) {
          throw new Error("ロゴのアップロードに失敗しました")
        }

        const uploadData = await uploadRes.json()
        setField("logoUrl", uploadData.url)

        // Extract colors from the uploaded image
        if (uploadData.extractedColors) {
          setExtractedColors(uploadData.extractedColors)
        }
      } catch (error) {
        console.error("Logo upload/extraction failed:", error)
        setUploadError("ロゴの処理中にエラーが発生しました")
      } finally {
        setIsExtracting(false)
      }
    },
    [setField, setExtractedColors]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_FILE_SIZE,
    multiple: false,
  })

  const removeLogo = () => {
    setField("logoFile", null)
    setField("logoPreviewUrl", null)
    setField("logoUrl", null)
    setExtractedColors([])
  }

  return (
    <div className="space-y-6">
      {/* Brand Name */}
      <div className="space-y-2">
        <Label htmlFor="brandName" className="text-sm font-bold text-text-primary">
          ブランド名 <span className="text-vermillion">*</span>
        </Label>
        <Input
          id="brandName"
          value={brandName}
          onChange={(e) => setField("brandName", e.target.value)}
          placeholder="ブランド名を入力してください"
          className="border-border bg-bg-card text-text-primary placeholder:text-text-muted focus:border-vermillion"
        />
      </div>

      {/* Logo Upload */}
      <div className="space-y-2">
        <Label className="text-sm font-bold text-text-primary">
          ロゴ
        </Label>

        {logoPreviewUrl ? (
          <div className="relative rounded-lg border border-border bg-bg-card p-6">
            <div className="flex items-center gap-6">
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md bg-bg-surface">
                <img
                  src={logoPreviewUrl}
                  alt="ロゴプレビュー"
                  className="h-full w-full object-contain p-2"
                />
              </div>
              <div className="flex-1">
                {isExtracting ? (
                  <p className="text-sm text-text-secondary">
                    カラーを抽出中...
                  </p>
                ) : extractedColors.length > 0 ? (
                  <div>
                    <p className="mb-2 text-sm text-text-secondary">
                      ロゴから抽出されたカラー
                    </p>
                    <div className="flex gap-2">
                      {extractedColors.map((color, i) => (
                        <div
                          key={i}
                          className="h-8 w-8 rounded-md border border-border"
                          style={{ backgroundColor: color.hex }}
                          title={color.hex}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-text-muted">
                    ロゴがアップロードされました
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={removeLogo}
                className="absolute right-2 top-2 text-text-muted hover:text-text-primary"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div
            {...getRootProps()}
            className={`cursor-pointer rounded-lg border-2 border-dashed p-12 text-center transition-colors duration-200 ${
              isDragActive
                ? "border-vermillion bg-vermillion-subtle"
                : "border-border bg-bg-card hover:border-text-muted"
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-3">
              {isDragActive ? (
                <Upload className="h-10 w-10 text-vermillion" />
              ) : (
                <ImageIcon className="h-10 w-10 text-text-muted" />
              )}
              <p className="text-sm text-text-secondary">
                ロゴをドラッグ＆ドロップ または クリックして選択
              </p>
              <p className="text-xs text-text-muted">
                PNG、JPG、SVG形式（最大5MB）
              </p>
            </div>
          </div>
        )}

        {uploadError && (
          <p className="text-sm text-error">{uploadError}</p>
        )}
      </div>
    </div>
  )
}
