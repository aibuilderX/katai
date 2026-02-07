"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2, CheckCircle2, AlertCircle, RefreshCw, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useCampaignProgress } from "@/hooks/use-campaign-progress"
import type { CampaignProgress } from "@/lib/db/schema"

interface GenerationProgressProps {
  campaignId: string
  initialProgress: CampaignProgress | null
  initialStatus: string
}

/**
 * Generation progress UI component.
 * Subscribes to Supabase Realtime via useCampaignProgress hook for live updates.
 * Shows step-by-step progress during campaign generation with animated progress bar.
 *
 * NOTE: For Realtime to deliver updates, the campaigns table needs:
 *   ALTER TABLE campaigns REPLICA IDENTITY FULL;
 * Without this, the fallback polling (every 5s) still works.
 */
export function GenerationProgress({
  campaignId,
  initialProgress,
  initialStatus,
}: GenerationProgressProps) {
  const router = useRouter()
  const { progress, status, isComplete, isFailed } = useCampaignProgress(
    campaignId,
    initialProgress,
    initialStatus
  )

  const percentComplete = progress?.percentComplete ?? 0
  const copyStatus = progress?.copyStatus ?? "pending"
  const imageStatus = progress?.imageStatus ?? "pending"
  const currentStep = progress?.currentStep ?? "準備中..."

  // Auto-refresh page when generation completes to show results
  useEffect(() => {
    if (isComplete) {
      // Brief delay to show the success state before refreshing
      const timer = setTimeout(() => {
        router.refresh()
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [isComplete, router])

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

  function getStepLabel(type: "copy" | "image", stepStatus: string) {
    if (type === "copy") {
      switch (stepStatus) {
        case "complete":
          return "コピー生成完了"
        case "generating":
          return "コピー生成中..."
        case "failed":
          return "コピー生成失敗"
        default:
          return "コピー生成待ち"
      }
    }
    switch (stepStatus) {
      case "complete":
        return "画像生成完了"
      case "generating":
        return "画像生成中..."
      case "failed":
        return "画像生成失敗"
      default:
        return "画像生成待ち"
    }
  }

  // Failed state
  if (isFailed) {
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

  // Complete state (brief flash before redirect)
  if (isComplete) {
    return (
      <div className="mx-auto max-w-lg rounded-lg border border-border-subtle bg-bg-card p-8">
        <div className="flex flex-col items-center text-center">
          <Sparkles className="mb-4 size-12 text-success" />
          <h2 className="mb-2 text-xl font-bold text-text-primary">
            生成完了！
          </h2>
          <p className="text-sm text-text-muted">
            結果を表示しています...
          </p>
        </div>
      </div>
    )
  }

  // Generating state
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
                  : copyStatus === "failed"
                    ? "text-error"
                    : "text-text-muted"
            )}
          >
            {getStepLabel("copy", copyStatus)}
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
                  : imageStatus === "failed"
                    ? "text-error"
                    : "text-text-muted"
            )}
          >
            {getStepLabel("image", imageStatus)}
          </span>
        </div>
      </div>

      {/* Realtime indicator */}
      <div className="mt-8 flex items-center justify-center gap-2">
        <div className="size-1.5 animate-pulse rounded-full bg-vermillion" />
        <p className="text-xs text-text-muted">
          リアルタイムで更新中
        </p>
      </div>
    </div>
  )
}
