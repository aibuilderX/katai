"use client"

import { useState, useEffect, useCallback } from "react"
import {
  CheckCircle2,
  XCircle,
  Send,
  RotateCcw,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  validateApprovalAction,
  APPROVAL_STATUS_LABELS,
  APPROVAL_ACTION_LABELS,
  type ApprovalStatus,
  type ApprovalAction,
} from "@/lib/workflows/approval"

interface ApprovalHistoryEntry {
  id: string
  action: string
  fromStatus: string
  toStatus: string
  actorId: string
  actorName: string
  comment: string | null
  createdAt: string | null
}

interface ApprovalWorkflow {
  id: string
  campaignId: string
  status: string
  version: number
  createdAt: string | null
  updatedAt: string | null
}

interface ApprovalPanelProps {
  campaignId: string
  approvalStatus: string
  userRole: string
}

const actionIcons: Record<ApprovalAction, typeof Send> = {
  submit: Send,
  approve: CheckCircle2,
  reject: XCircle,
  request_revision: RotateCcw,
}

const actionStyles: Record<ApprovalAction, string> = {
  submit:
    "bg-vermillion text-text-inverse hover:bg-vermillion-hover",
  approve: "bg-success/90 text-white hover:bg-success",
  reject: "bg-error/90 text-white hover:bg-error",
  request_revision:
    "bg-vermillion-subtle text-vermillion hover:bg-vermillion/20",
}

export function ApprovalPanel({
  campaignId,
  approvalStatus,
  userRole,
}: ApprovalPanelProps) {
  const [currentStatus, setCurrentStatus] = useState<ApprovalStatus>(
    (approvalStatus as ApprovalStatus) || "draft"
  )
  const [history, setHistory] = useState<ApprovalHistoryEntry[]>([])
  const [comment, setComment] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isFetchingHistory, setIsFetchingHistory] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  // Fetch workflow and history
  const fetchWorkflow = useCallback(async () => {
    setIsFetchingHistory(true)
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/approve`)
      if (res.ok) {
        const data = await res.json()
        if (data.workflow) {
          setCurrentStatus(data.workflow.status as ApprovalStatus)
        }
        setHistory(data.history || [])
      }
    } catch {
      // Silent fail on fetch -- show current status from props
    } finally {
      setIsFetchingHistory(false)
    }
  }, [campaignId])

  useEffect(() => {
    fetchWorkflow()
  }, [fetchWorkflow])

  // Determine available actions based on role and status
  const availableActions: ApprovalAction[] = []
  const allActions: ApprovalAction[] = [
    "submit",
    "approve",
    "reject",
    "request_revision",
  ]

  for (const action of allActions) {
    const result = validateApprovalAction(currentStatus, action, userRole)
    if (result.allowed) {
      availableActions.push(action)
    }
  }

  const handleAction = async (action: ApprovalAction) => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, comment: comment || undefined }),
      })

      if (res.status === 409) {
        toast.warning(
          "承認状態が変更されています。ページを更新してください。"
        )
        window.location.reload()
        return
      }

      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || "承認処理に失敗しました")
        return
      }

      const data = await res.json()
      setCurrentStatus(data.workflow.status as ApprovalStatus)
      setHistory(data.history || [])
      setComment("")

      const actionLabel = APPROVAL_ACTION_LABELS[action]
      toast.success(`${actionLabel}しました`)
    } catch {
      toast.error("承認処理に失敗しました")
    } finally {
      setIsLoading(false)
    }
  }

  const statusLabel = APPROVAL_STATUS_LABELS[currentStatus]

  return (
    <div className="rounded-lg border border-border-subtle bg-bg-card p-4">
      <h3 className="mb-3 text-sm font-bold text-text-primary">
        承認ワークフロー
      </h3>

      {/* Current status */}
      <div className="mb-4">
        <p className="mb-1 text-xs text-text-muted">現在のステータス</p>
        <div className="flex items-center gap-2">
          <StatusDot status={currentStatus} />
          <span className="text-sm font-medium text-text-primary">
            {statusLabel?.labelJa || currentStatus}
          </span>
        </div>
      </div>

      {/* Action buttons */}
      {availableActions.length > 0 && (
        <div className="mb-4 space-y-2">
          {/* Comment input */}
          <textarea
            className="w-full resize-none rounded-md border border-border-subtle bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-vermillion focus:outline-none focus:ring-1 focus:ring-vermillion"
            rows={2}
            placeholder="コメントを追加..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={isLoading}
          />

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            {availableActions.map((action) => {
              const Icon = actionIcons[action]
              const label = APPROVAL_ACTION_LABELS[action]
              const style = actionStyles[action]

              return (
                <button
                  key={action}
                  onClick={() => handleAction(action)}
                  disabled={isLoading}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50",
                    style
                  )}
                >
                  <Icon className="size-3.5" />
                  <span>{label}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* No actions available message for viewers */}
      {availableActions.length === 0 && userRole === "viewer" && (
        <p className="mb-4 text-xs text-text-muted">
          閲覧者は承認アクションを実行できません
        </p>
      )}

      {/* History section */}
      {history.length > 0 && (
        <div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex w-full items-center justify-between text-xs font-medium text-text-muted hover:text-text-primary transition-colors"
          >
            <span>承認履歴 ({history.length})</span>
            {showHistory ? (
              <ChevronUp className="size-3.5" />
            ) : (
              <ChevronDown className="size-3.5" />
            )}
          </button>

          {showHistory && (
            <div className="mt-2 space-y-3">
              {history.map((entry) => (
                <HistoryEntry key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Loading state for initial fetch */}
      {isFetchingHistory && history.length === 0 && (
        <p className="text-xs text-text-muted">読み込み中...</p>
      )}
    </div>
  )
}

// --- Sub-components ---

function StatusDot({ status }: { status: ApprovalStatus }) {
  const dotColors: Record<ApprovalStatus, string> = {
    draft: "bg-text-muted",
    pending_review: "bg-warning",
    pending_approval: "bg-vermillion",
    approved: "bg-success",
    rejected: "bg-error",
    revision_requested: "bg-[#A855F7]",
  }

  return (
    <span
      className={cn("inline-block size-2 rounded-full", dotColors[status])}
    />
  )
}

function HistoryEntry({ entry }: { entry: ApprovalHistoryEntry }) {
  const actionLabel =
    APPROVAL_ACTION_LABELS[entry.action as ApprovalAction] || entry.action

  const formattedTime = entry.createdAt
    ? new Date(entry.createdAt).toLocaleString("ja-JP", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : ""

  return (
    <div className="relative border-l-2 border-border-subtle pl-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-text-primary">
            {actionLabel}
          </p>
          <p className="text-xs text-text-muted">{entry.actorName}</p>
        </div>
        <div className="flex items-center gap-1 text-xs text-text-muted">
          <Clock className="size-3" />
          <span>{formattedTime}</span>
        </div>
      </div>
      {entry.comment && (
        <p className="mt-1 text-xs text-text-secondary">{entry.comment}</p>
      )}
    </div>
  )
}
