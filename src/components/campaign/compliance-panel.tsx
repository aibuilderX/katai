"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Shield,
  Loader2,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronRight,
} from "lucide-react"

interface ComplianceIssue {
  category: string
  field: string
  problematicText: string
  issue: string
  severity: "error" | "warning"
  suggestion: string
  legalBasis: string
  platform?: string
}

interface ComplianceReport {
  overallRisk: string
  keihyouhouResult: ComplianceIssue[]
  yakkihoResult: ComplianceIssue[]
  platformRuleResult: ComplianceIssue[]
  createdAt: string | null
}

interface CompliancePanelProps {
  campaignId: string
}

const riskLabels: Record<
  string,
  { text: string; className: string; icon: typeof CheckCircle }
> = {
  low: {
    text: "低リスク",
    className: "bg-[#4ADE801A] text-success",
    icon: CheckCircle,
  },
  medium: {
    text: "中リスク",
    className: "bg-[#FBBF241A] text-warning",
    icon: AlertTriangle,
  },
  high: {
    text: "高リスク",
    className: "bg-[#EF44441A] text-error",
    icon: XCircle,
  },
}

const categoryLabels: Record<string, string> = {
  yuryou_gonin: "優良誤認",
  yuuri_gonin: "有利誤認",
  stealth_marketing: "ステマ",
  medical_claim: "医薬品的効能",
  prohibited_expression: "禁止表現",
  safety_claim: "安全性断定",
  testimonial_efficacy: "体験談効能",
}

function SeverityBadge({ severity }: { severity: "error" | "warning" }) {
  if (severity === "error") {
    return (
      <span className="inline-flex items-center gap-1 rounded-pill bg-[#EF44441A] px-2 py-0.5 text-xs font-medium text-error">
        <XCircle className="size-3" />
        違反の可能性
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-pill bg-[#FBBF241A] px-2 py-0.5 text-xs font-medium text-warning">
      <AlertTriangle className="size-3" />
      要確認
    </span>
  )
}

function IssueSection({
  title,
  issues,
}: {
  title: string
  issues: ComplianceIssue[]
}) {
  const [expanded, setExpanded] = useState(issues.length > 0)

  if (issues.length === 0) {
    return (
      <div className="flex items-center gap-2 py-2">
        <CheckCircle className="size-4 text-success" />
        <span className="text-sm text-text-secondary">{title}</span>
        <span className="text-xs text-success">問題なし</span>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 py-1 text-left"
      >
        {expanded ? (
          <ChevronDown className="size-3.5 text-text-muted" />
        ) : (
          <ChevronRight className="size-3.5 text-text-muted" />
        )}
        <span className="text-sm font-medium text-text-secondary">
          {title}
        </span>
        <span className="rounded-pill bg-[#EF44441A] px-2 py-0.5 text-xs font-medium text-error">
          {issues.length}件
        </span>
      </button>

      {expanded && (
        <div className="space-y-2 pl-5">
          {issues.map((issue, i) => (
            <div
              key={i}
              className="rounded-md border border-border-subtle bg-bg-primary p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs text-text-muted">
                  {issue.platform
                    ? issue.platform
                    : categoryLabels[issue.category] || issue.category}
                </span>
                <SeverityBadge severity={issue.severity} />
              </div>
              {issue.problematicText && (
                <p className="mt-1.5 rounded bg-bg-hover px-2 py-1 text-xs text-text-primary">
                  &ldquo;{issue.problematicText}&rdquo;
                </p>
              )}
              <p className="mt-1.5 text-sm text-text-primary">{issue.issue}</p>
              {issue.suggestion && (
                <p className="mt-1 text-xs text-text-muted">
                  提案: {issue.suggestion}
                </p>
              )}
              {issue.legalBasis && (
                <p className="mt-0.5 text-xs text-text-muted">
                  根拠: {issue.legalBasis}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function CompliancePanel({ campaignId }: CompliancePanelProps) {
  const [report, setReport] = useState<ComplianceReport | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch existing report on mount
  useEffect(() => {
    async function fetchReport() {
      setIsLoading(true)
      try {
        const response = await fetch(
          `/api/campaigns/${campaignId}/compliance`
        )
        if (!response.ok) throw new Error("Failed to fetch")
        const data = await response.json()
        if (data.report) {
          setReport(data.report)
        }
      } catch {
        // No existing report -- that's fine
      } finally {
        setIsLoading(false)
      }
    }
    fetchReport()
  }, [campaignId])

  const handleCheck = async () => {
    setIsChecking(true)
    setError(null)
    try {
      const response = await fetch(
        `/api/campaigns/${campaignId}/compliance`,
        { method: "POST" }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(
          data.error || "コンプライアンスチェックに失敗しました"
        )
      }

      const data = await response.json()
      setReport(data.report)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "コンプライアンスチェックに失敗しました"
      )
    } finally {
      setIsChecking(false)
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border-subtle bg-bg-card p-4">
        <div className="flex items-center gap-2">
          <Shield className="size-4 text-text-secondary" />
          <h3 className="text-sm font-bold text-text-primary">
            コンプライアンス
          </h3>
        </div>
        <div className="mt-3 flex justify-center">
          <Loader2 className="size-5 animate-spin text-text-muted" />
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border-subtle bg-bg-card p-4">
      <div className="flex items-center gap-2">
        <Shield className="size-4 text-text-secondary" />
        <h3 className="text-sm font-bold text-text-primary">
          コンプライアンス
        </h3>
      </div>

      {!report ? (
        <div className="mt-3">
          <p className="mb-3 text-xs text-text-muted">
            景品表示法・薬機法・プラットフォーム規約に基づくコンプライアンスチェックを実行します
          </p>
          <Button
            onClick={handleCheck}
            disabled={isChecking}
            variant="outline"
            size="sm"
            className="w-full"
          >
            {isChecking ? (
              <>
                <Loader2 className="mr-2 size-3.5 animate-spin" />
                チェック中...
              </>
            ) : (
              "コンプライアンスチェック"
            )}
          </Button>
          {error && <p className="mt-2 text-xs text-error">{error}</p>}
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          {/* Risk badge */}
          {riskLabels[report.overallRisk] && (
            <div className="flex items-center gap-2">
              {(() => {
                const RiskIcon = riskLabels[report.overallRisk].icon
                return <RiskIcon className="size-4" />
              })()}
              <span
                className={cn(
                  "inline-flex items-center rounded-pill px-3 py-0.5 text-xs font-medium",
                  riskLabels[report.overallRisk].className
                )}
              >
                {riskLabels[report.overallRisk].text}
              </span>
            </div>
          )}

          {/* Issue sections */}
          <IssueSection
            title="景品表示法"
            issues={report.keihyouhouResult || []}
          />
          <IssueSection
            title="薬機法"
            issues={report.yakkihoResult || []}
          />
          <IssueSection
            title="プラットフォーム規約"
            issues={report.platformRuleResult || []}
          />

          {/* Re-check button */}
          <Button
            onClick={handleCheck}
            disabled={isChecking}
            variant="outline"
            size="sm"
            className="mt-2 w-full"
          >
            {isChecking ? (
              <>
                <Loader2 className="mr-2 size-3.5 animate-spin" />
                再チェック中...
              </>
            ) : (
              "再チェック"
            )}
          </Button>
          {error && <p className="mt-2 text-xs text-error">{error}</p>}
        </div>
      )}
    </div>
  )
}
