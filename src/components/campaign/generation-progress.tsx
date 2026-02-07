"use client"

import { useState, useEffect } from "react"
import { Loader2, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import type { CampaignProgress } from "@/lib/db/schema"

interface GenerationProgressProps {
  campaignId: string
  initialProgress: CampaignProgress | null
  initialStatus: string
}

/**
 * Generation progress UI component.
 * Shows step-by-step progress during campaign generation.
 * Full real-time implementation in Task 2 with useCampaignProgress hook.
 */
export function GenerationProgress({
  campaignId,
  initialProgress,
  initialStatus,
}: GenerationProgressProps) {
  const [progress, setProgress] = useState(initialProgress)
  const [status, setStatus] = useState(initialStatus)

  const percentComplete = progress?.percentComplete ?? 0
  const copyStatus = progress?.copyStatus ?? "pending"
  const imageStatus = progress?.imageStatus ?? "pending"
  const currentStep = progress?.currentStep ?? "準備中..."

  function getStepIcon(stepStatus: string) {
    switch (stepStatus) {
      case "complete":
        return <CheckCircle2 className="size-5 text-success" />
      case "generating":
        return <Loader2 className="size-5 animate-spin text-vermillion" />
      case "failed":
        return <AlertCircle className="size-5 text-error" />
      default:
        return (
          <div className="size-5 rounded-full border-2 border-border bg-bg-surface" />
        )
    }
  }

  if (status === "failed") {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-border-subtle bg-bg-card py-20">
        <AlertCircle className="mb-4 size-12 text-error" />
        <h3 className="mb-2 text-lg font-bold text-text-primary">
          生成に失敗しました
        </h3>
        <p className="mb-6 text-sm text-text-muted">
          エラーが発生しました。もう一度お試しください。
        </p>
        <Link
          href="/campaigns/new"
          className="inline-flex items-center gap-2 rounded-md bg-vermillion px-5 py-2.5 text-sm font-bold text-text-inverse transition-colors hover:bg-vermillion-hover"
        >
          <RefreshCw className="size-4" />
          <span>再試行</span>
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg rounded-lg border border-border-subtle bg-bg-card p-8">
      <div className="text-center">
        <h2 className="mb-2 text-xl font-bold text-text-primary">
          キャンペーンを生成中
        </h2>
        <p className="mb-8 text-sm text-text-muted">{currentStep}</p>
      </div>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs text-text-muted">進捗</span>
          <span className="font-mono text-sm font-medium text-text-primary">
            {percentComplete}%
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-pill bg-bg-surface">
          <div
            className="h-full rounded-pill bg-vermillion transition-all duration-500 ease-out"
            style={{ width: `${percentComplete}%` }}
          />
        </div>
      </div>

      {/* Step indicators */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          {getStepIcon(copyStatus)}
          <span
            className={cn(
              "text-sm",
              copyStatus === "generating"
                ? "font-medium text-text-primary"
                : copyStatus === "complete"
                  ? "text-success"
                  : "text-text-muted"
            )}
          >
            コピー生成中...
          </span>
        </div>
        <div className="flex items-center gap-3">
          {getStepIcon(imageStatus)}
          <span
            className={cn(
              "text-sm",
              imageStatus === "generating"
                ? "font-medium text-text-primary"
                : imageStatus === "complete"
                  ? "text-success"
                  : "text-text-muted"
            )}
          >
            画像生成中...
          </span>
        </div>
      </div>

      {/* Note about real-time updates */}
      <p className="mt-8 text-center text-xs text-text-muted">
        ページを更新すると最新の状態を確認できます
      </p>
    </div>
  )
}
