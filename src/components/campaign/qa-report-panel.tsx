"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ShieldCheck, Loader2, CheckCircle, AlertTriangle, XCircle } from "lucide-react"

interface QAIssue {
  field: string
  issue: string
  severity: "error" | "warning"
  suggestion: string
}

interface QAReport {
  overallScore: number
  keigoConsistency: {
    passed: boolean
    issues: QAIssue[]
  }
  brandCompliance: {
    passed: boolean
    issues: QAIssue[]
  }
}

interface QAReportPanelProps {
  campaignId: string
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? "text-success border-success/30 bg-[#4ADE801A]"
      : score >= 60
        ? "text-warning border-warning/30 bg-[#FBBF241A]"
        : "text-error border-error/30 bg-[#EF44441A]"

  return (
    <div
      className={cn(
        "flex size-16 items-center justify-center rounded-full border-2 text-xl font-black",
        color
      )}
    >
      {score}
    </div>
  )
}

function SeverityBadge({ severity }: { severity: "error" | "warning" }) {
  if (severity === "error") {
    return (
      <span className="inline-flex items-center gap-1 rounded-pill bg-[#EF44441A] px-2 py-0.5 text-xs font-medium text-error">
        <XCircle className="size-3" />
        エラー
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-pill bg-[#FBBF241A] px-2 py-0.5 text-xs font-medium text-warning">
      <AlertTriangle className="size-3" />
      警告
    </span>
  )
}

function IssueList({ issues, label }: { issues: QAIssue[]; label: string }) {
  if (issues.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-success">
        <CheckCircle className="size-4" />
        <span>問題なし</span>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-text-secondary">{label}</h4>
      {issues.map((issue, i) => (
        <div
          key={i}
          className="rounded-md border border-border-subtle bg-bg-primary p-3"
        >
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs text-text-muted">{issue.field}</span>
            <SeverityBadge severity={issue.severity} />
          </div>
          <p className="mt-1 text-sm text-text-primary">{issue.issue}</p>
          <p className="mt-1 text-xs text-text-muted">
            提案: {issue.suggestion}
          </p>
        </div>
      ))}
    </div>
  )
}

export function QAReportPanel({ campaignId }: QAReportPanelProps) {
  const [qaReport, setQaReport] = useState<QAReport | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasRun, setHasRun] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRunQA = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/qa`, {
        method: "POST",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "QA検証に失敗しました")
      }

      const data = await response.json()
      setQaReport(data.report)
      setHasRun(true)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "QA検証に失敗しました"
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="rounded-lg border border-border-subtle bg-bg-card p-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="size-4 text-text-secondary" />
        <h3 className="text-sm font-bold text-text-primary">QA検証</h3>
      </div>

      {!hasRun ? (
        <div className="mt-3">
          <p className="mb-3 text-xs text-text-muted">
            コピーの敬語一貫性とブランド準拠を自動検証します
          </p>
          <Button
            onClick={handleRunQA}
            disabled={isLoading}
            variant="outline"
            size="sm"
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 size-3.5 animate-spin" />
                検証中...
              </>
            ) : (
              "QA検証を実行"
            )}
          </Button>
          {error && (
            <p className="mt-2 text-xs text-error">{error}</p>
          )}
        </div>
      ) : qaReport ? (
        <div className="mt-4 space-y-4">
          {/* Score */}
          <div className="flex items-center gap-4">
            <ScoreBadge score={qaReport.overallScore} />
            <div>
              <p className="text-sm font-medium text-text-primary">
                品質スコア
              </p>
              <p className="text-xs text-text-muted">
                {qaReport.overallScore >= 80
                  ? "品質良好"
                  : qaReport.overallScore >= 60
                    ? "一部修正推奨"
                    : "要修正"}
              </p>
            </div>
          </div>

          {/* Keigo Issues */}
          <IssueList
            issues={qaReport.keigoConsistency.issues}
            label="敬語の一貫性"
          />

          {/* Brand Compliance Issues */}
          <IssueList
            issues={qaReport.brandCompliance.issues}
            label="ブランド準拠"
          />

          {/* Re-run button */}
          <Button
            onClick={handleRunQA}
            disabled={isLoading}
            variant="outline"
            size="sm"
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 size-3.5 animate-spin" />
                再検証中...
              </>
            ) : (
              "再検証"
            )}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
