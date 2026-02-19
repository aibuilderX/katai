"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  MinusCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useCampaignProgress } from "@/hooks/use-campaign-progress"
import type { CampaignProgress } from "@/lib/db/schema"
import type { AgentStep } from "@/types/pipeline"

interface GenerationProgressProps {
  campaignId: string
  initialProgress: CampaignProgress | null
  initialStatus: string
}

// Agent step groupings for v1.1 timeline sections
const STRATEGY_CONTENT_AGENTS: AgentStep["agentName"][] = [
  "strategic_insight",
  "creative_director",
  "copywriter",
  "art_director",
  "jp_localization",
]

const ASSET_GENERATION_AGENTS: AgentStep["agentName"][] = [
  "image_generation",
  "compositing",
  "platform_resize",
  "video_pipeline",
]

/**
 * Elapsed timer component for active agent steps.
 * Counts up from startedAt using a 1-second interval.
 */
function ElapsedTimer({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const startTime = new Date(startedAt).getTime()

    function updateElapsed() {
      const now = Date.now()
      setElapsed(Math.floor((now - startTime) / 1000))
    }

    updateElapsed()
    intervalRef.current = setInterval(updateElapsed, 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [startedAt])

  const minutes = Math.floor(elapsed / 60)
  const seconds = elapsed % 60

  return (
    <span className="font-mono text-xs text-text-muted">
      {minutes}:{seconds.toString().padStart(2, "0")}
    </span>
  )
}

/**
 * Generation progress UI component.
 * Subscribes to Supabase Realtime via useCampaignProgress hook for live updates.
 *
 * v1.1 pipeline: Per-agent vertical timeline with Japanese labels and summaries.
 * v1.0 fallback: Flat step indicators (copy/image/voiceover/video/avatar).
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

  // Auto-refresh page when generation completes to show results
  useEffect(() => {
    if (isComplete) {
      const timer = setTimeout(() => {
        router.refresh()
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [isComplete, router])

  // Detect v1.1 pipeline (agentSteps present)
  const agentSteps = progress?.agentSteps
  const isV11 = !!agentSteps && agentSteps.length > 0

  // Calculate progress from agent steps for v1.1
  const v11PercentComplete = isV11
    ? Math.round(
        (agentSteps.filter((s) => s.status === "complete").length /
          agentSteps.length) *
          100
      )
    : 0
  const percentComplete = isV11
    ? v11PercentComplete
    : progress?.percentComplete ?? 0

  // v1.0 state
  const copyStatus = progress?.copyStatus ?? "pending"
  const imageStatus = progress?.imageStatus ?? "pending"
  const voiceoverStatus = progress?.voiceoverStatus
  const videoStatus = progress?.videoStatus
  const avatarStatus = progress?.avatarStatus
  const currentStep = progress?.currentStep ?? "\u6e96\u5099\u4e2d..."
  const hasVideoStages = !!(voiceoverStatus || videoStatus || avatarStatus)

  // ===== v1.0 Step Rendering Helpers =====

  function getV10StepIcon(stepStatus: string) {
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
      pending: "\u30b3\u30d4\u30fc\u751f\u6210\u5f85\u3061",
      generating: "\u30b3\u30d4\u30fc\u751f\u6210\u4e2d...",
      complete: "\u30b3\u30d4\u30fc\u751f\u6210\u5b8c\u4e86",
      failed: "\u30b3\u30d4\u30fc\u751f\u6210\u5931\u6557",
    },
    image: {
      pending: "\u753b\u50cf\u751f\u6210\u5f85\u3061",
      generating: "\u753b\u50cf\u751f\u6210\u4e2d...",
      complete: "\u753b\u50cf\u751f\u6210\u5b8c\u4e86",
      failed: "\u753b\u50cf\u751f\u6210\u5931\u6557",
    },
    voiceover: {
      pending: "\u30ca\u30ec\u30fc\u30b7\u30e7\u30f3\u751f\u6210\u5f85\u3061",
      generating: "\u30ca\u30ec\u30fc\u30b7\u30e7\u30f3\u751f\u6210\u4e2d...",
      complete: "\u30ca\u30ec\u30fc\u30b7\u30e7\u30f3\u751f\u6210\u5b8c\u4e86",
      failed: "\u30ca\u30ec\u30fc\u30b7\u30e7\u30f3\u751f\u6210\u5931\u6557",
      skipped:
        "\u30ca\u30ec\u30fc\u30b7\u30e7\u30f3\uff08\u30b9\u30ad\u30c3\u30d7\uff09",
    },
    video: {
      pending: "\u52d5\u753b\u751f\u6210\u5f85\u3061",
      generating: "\u52d5\u753b\u751f\u6210\u4e2d...",
      complete: "\u52d5\u753b\u751f\u6210\u5b8c\u4e86",
      failed: "\u52d5\u753b\u751f\u6210\u5931\u6557",
      skipped:
        "\u52d5\u753b\uff08\u30b9\u30ad\u30c3\u30d7\uff09",
    },
    avatar: {
      pending:
        "\u30a2\u30d0\u30bf\u30fc\u52d5\u753b\u5f85\u3061",
      generating:
        "\u30a2\u30d0\u30bf\u30fc\u52d5\u753b\u751f\u6210\u4e2d...",
      complete:
        "\u30a2\u30d0\u30bf\u30fc\u52d5\u753b\u5b8c\u4e86",
      failed:
        "\u30a2\u30d0\u30bf\u30fc\u52d5\u753b\u5931\u6557",
      skipped:
        "\u30a2\u30d0\u30bf\u30fc\uff08\u30b9\u30ad\u30c3\u30d7\uff09",
    },
  }

  function getV10StepLabel(type: StepType, stepStatus: string) {
    return stepLabels[type][stepStatus] || stepLabels[type].pending
  }

  function getV10StepTextClass(stepStatus: string) {
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

  function renderV10Step(type: StepType, stepStatus: string) {
    return (
      <div className="flex items-center gap-3">
        {getV10StepIcon(stepStatus)}
        <span className={cn("text-sm", getV10StepTextClass(stepStatus))}>
          {getV10StepLabel(type, stepStatus)}
        </span>
      </div>
    )
  }

  // ===== v1.1 Agent Step Rendering =====

  function getAgentStepIcon(step: AgentStep) {
    switch (step.status) {
      case "complete":
        return <CheckCircle2 className="size-5 text-success" />
      case "active":
        return <Loader2 className="size-5 animate-spin text-vermillion" />
      case "failed":
        return <AlertCircle className="size-5 text-error" />
      case "flagged":
        return <AlertTriangle className="size-5 text-amber-500" />
      default:
        return (
          <div className="size-5 rounded-full border-2 border-border bg-bg-surface" />
        )
    }
  }

  function renderAgentStep(step: AgentStep) {
    const isActive = step.status === "active"
    const isComplete = step.status === "complete"
    const isPending = step.status === "pending"

    return (
      <div
        key={step.agentName}
        className={cn(
          "flex items-start gap-3 py-2 transition-opacity duration-300",
          isPending && "opacity-50"
        )}
      >
        {/* Status icon */}
        <div className="mt-0.5 flex-shrink-0">{getAgentStepIcon(step)}</div>

        {/* Center: label and summary */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-sm transition-all duration-300",
                isActive && "font-medium text-text-primary",
                isComplete && "text-success",
                step.status === "failed" && "text-error",
                step.status === "flagged" && "text-amber-500",
                isPending && "text-text-muted"
              )}
            >
              {step.labelJa}
            </span>

            {/* Elapsed timer for active steps */}
            {isActive && step.startedAt && (
              <ElapsedTimer startedAt={step.startedAt} />
            )}
          </div>

          {/* Summary text for completed steps */}
          {isComplete && step.summaryJa && (
            <p className="mt-0.5 truncate text-xs text-text-muted">
              {step.summaryJa}
            </p>
          )}
        </div>
      </div>
    )
  }

  function renderAgentSection(
    title: string,
    agentNames: AgentStep["agentName"][]
  ) {
    if (!agentSteps) return null

    const sectionSteps = agentSteps.filter((s) =>
      agentNames.includes(s.agentName)
    )
    if (sectionSteps.length === 0) return null

    return (
      <div>
        <h3
          className="mb-2 text-xs font-semibold uppercase tracking-wider"
          style={{ color: "#6B8FA3" }}
        >
          {title}
        </h3>
        <div className="border-l-2 border-border-subtle pl-4">
          {sectionSteps.map(renderAgentStep)}
        </div>
      </div>
    )
  }

  // ===== Shared States =====

  // Failed state
  if (isFailed) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-border-subtle bg-bg-card py-20">
        <AlertCircle className="mb-4 size-12 text-error" />
        <h3 className="mb-2 text-lg font-bold text-text-primary">
          {"\u751f\u6210\u306b\u5931\u6557\u3057\u307e\u3057\u305f"}
        </h3>
        <p className="mb-6 text-sm text-text-muted">
          {"\u30a8\u30e9\u30fc\u304c\u767a\u751f\u3057\u307e\u3057\u305f\u3002\u3082\u3046\u4e00\u5ea6\u304a\u8a66\u3057\u304f\u3060\u3055\u3044\u3002"}
        </p>
        <Link
          href="/campaigns/new"
          className="inline-flex items-center gap-2 rounded-md bg-vermillion px-5 py-2.5 text-sm font-bold text-text-inverse transition-colors hover:bg-vermillion-hover"
        >
          <RefreshCw className="size-4" />
          <span>{"\u518d\u8a66\u884c"}</span>
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
            {"\u751f\u6210\u5b8c\u4e86\uff01"}
          </h2>
          <p className="text-sm text-text-muted">
            {"\u7d50\u679c\u3092\u8868\u793a\u3057\u3066\u3044\u307e\u3059..."}
          </p>
        </div>
      </div>
    )
  }

  // ===== Generating State =====
  return (
    <div className="mx-auto max-w-lg rounded-lg border border-border-subtle bg-bg-card p-8">
      <div className="text-center">
        <h2 className="mb-2 text-xl font-bold text-text-primary">
          {"\u30ad\u30e3\u30f3\u30da\u30fc\u30f3\u3092\u751f\u6210\u4e2d"}
        </h2>
        {!isV11 && (
          <p className="mb-8 text-sm text-text-muted">{currentStep}</p>
        )}
        {isV11 && <div className="mb-8" />}
      </div>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs text-text-muted">
            {"\u9032\u6357"}
          </span>
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

      {/* v1.1 Per-agent timeline */}
      {isV11 && (
        <div className="space-y-6">
          {renderAgentSection(
            "\u6226\u7565\u30fb\u30b3\u30f3\u30c6\u30f3\u30c4",
            STRATEGY_CONTENT_AGENTS
          )}
          {renderAgentSection(
            "\u30a2\u30bb\u30c3\u30c8\u751f\u6210",
            ASSET_GENERATION_AGENTS
          )}
        </div>
      )}

      {/* v1.0 Flat step indicators (fallback) */}
      {!isV11 && (
        <div className="space-y-4">
          {renderV10Step("copy", copyStatus)}
          {renderV10Step("image", imageStatus)}

          {hasVideoStages && (
            <div className="my-2 border-t border-border-subtle" />
          )}

          {voiceoverStatus && renderV10Step("voiceover", voiceoverStatus)}
          {videoStatus && renderV10Step("video", videoStatus)}
          {avatarStatus && renderV10Step("avatar", avatarStatus)}
        </div>
      )}

      {/* Realtime indicator */}
      <div className="mt-8 flex items-center justify-center gap-2">
        <div className="size-1.5 animate-pulse rounded-full bg-vermillion" />
        <p className="text-xs text-text-muted">
          {"\u30ea\u30a2\u30eb\u30bf\u30a4\u30e0\u3067\u66f4\u65b0\u4e2d"}
        </p>
      </div>
    </div>
  )
}
