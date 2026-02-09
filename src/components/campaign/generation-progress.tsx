"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2, CheckCircle2, AlertCircle, RefreshCw, Sparkles, MinusCircle } from "lucide-react"
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
  const voiceoverStatus = progress?.voiceoverStatus
  const videoStatus = progress?.videoStatus
  const avatarStatus = progress?.avatarStatus
  const currentStep = progress?.currentStep ?? "準備中..."
  const hasVideoStages = !!(voiceoverStatus || videoStatus || avatarStatus)

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
      case "skipped":
        return <MinusCircle className="size-5 text-text-muted" />
      default:
        return (
          <div className="size-5 rounded-full border-2 border-border bg-bg-surface" />
        )
    }
  }

  type StepType = "copy" | "image" | "voiceover" | "video" | "avatar"

  const stepLabels: Record<StepType, Record<string, string>> = {
    copy: {
      pending: "コピー生成待ち",
      generating: "コピー生成中...",
      complete: "コピー生成完了",
      failed: "コピー生成失敗",
    },
    image: {
      pending: "画像生成待ち",
      generating: "画像生成中...",
      complete: "画像生成完了",
      failed: "画像生成失敗",
    },
    voiceover: {
      pending: "ナレーション生成待ち",
      generating: "ナレーション生成中...",
      complete: "ナレーション生成完了",
      failed: "ナレーション生成失敗",
      skipped: "ナレーション（スキップ）",
    },
    video: {
      pending: "動画生成待ち",
      generating: "動画生成中...",
      complete: "動画生成完了",
      failed: "動画生成失敗",
      skipped: "動画（スキップ）",
    },
    avatar: {
      pending: "アバター動画待ち",
      generating: "アバター動画生成中...",
      complete: "アバター動画完了",
      failed: "アバター動画失敗",
      skipped: "アバター（スキップ）",
    },
  }

  function getStepLabel(type: StepType, stepStatus: string) {
    return stepLabels[type][stepStatus] || stepLabels[type].pending
  }

  function getStepTextClass(stepStatus: string) {
    switch (stepStatus) {
      case "generating":
        return "font-medium text-text-primary"
      case "complete":
        return "text-success"
      case "failed":
        return "text-error"
      case "skipped":
        return "text-text-muted"
      default:
        return "text-text-muted"
    }
  }

  function renderStep(type: StepType, stepStatus: string) {
    return (
      <div className="flex items-center gap-3">
        {getStepIcon(stepStatus)}
        <span className={cn("text-sm", getStepTextClass(stepStatus))}>
          {getStepLabel(type, stepStatus)}
        </span>
      </div>
    )
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
        {renderStep("copy", copyStatus)}
        {renderStep("image", imageStatus)}

        {/* Separator between static and video/audio stages */}
        {hasVideoStages && (
          <div className="my-2 border-t border-border-subtle" />
        )}

        {voiceoverStatus && renderStep("voiceover", voiceoverStatus)}
        {videoStatus && renderStep("video", videoStatus)}
        {avatarStatus && renderStep("avatar", avatarStatus)}
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
