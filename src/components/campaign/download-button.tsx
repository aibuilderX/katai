"use client"

import { useState } from "react"
import { Download, Loader2, CheckCircle, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

type DownloadState = "idle" | "downloading" | "success" | "error"

interface DownloadButtonProps {
  campaignId: string
  disabled?: boolean
}

export function DownloadButton({ campaignId, disabled }: DownloadButtonProps) {
  const [state, setState] = useState<DownloadState>("idle")

  async function handleDownload() {
    if (state === "downloading") return

    setState("downloading")

    try {
      const res = await fetch(`/api/campaigns/${campaignId}/download`, {
        credentials: "include",
      })

      if (!res.ok) {
        throw new Error(`Download failed: ${res.status}`)
      }

      // Extract filename from Content-Disposition header
      const disposition = res.headers.get("Content-Disposition")
      const filenameMatch = disposition?.match(/filename="?([^"]+)"?/)
      const filename = filenameMatch?.[1] || `campaign-${campaignId}.zip`

      // Create blob and trigger download
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      setState("success")
      setTimeout(() => setState("idle"), 3000)
    } catch {
      setState("error")
      toast.error("ダウンロードに失敗しました")
      setTimeout(() => setState("idle"), 3000)
    }
  }

  const buttonConfig = {
    idle: {
      icon: <Download className="size-4" />,
      label: "キャンペーンキットをダウンロード",
      variant: "default" as const,
      isDisabled: disabled,
    },
    downloading: {
      icon: <Loader2 className="size-4 animate-spin" />,
      label: "ダウンロード中...",
      variant: "default" as const,
      isDisabled: true,
    },
    success: {
      icon: <CheckCircle className="size-4" />,
      label: "完了",
      variant: "default" as const,
      isDisabled: false,
    },
    error: {
      icon: <AlertCircle className="size-4" />,
      label: "再試行",
      variant: "destructive" as const,
      isDisabled: false,
    },
  }

  const config = buttonConfig[state]

  return (
    <Button
      onClick={handleDownload}
      disabled={config.isDisabled}
      variant={config.variant}
      className={
        state === "success"
          ? "w-full bg-success text-text-inverse hover:bg-success/90"
          : "w-full"
      }
    >
      {config.icon}
      <span>{config.label}</span>
    </Button>
  )
}
