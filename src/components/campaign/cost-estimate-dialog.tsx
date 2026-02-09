"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Loader2, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface CreditEstimate {
  copyCredits: number
  imageCredits: number
  videoCredits: number
  voiceoverCredits: number
  avatarCredits: number
  totalCredits: number
}

interface CostEstimateDialogProps {
  brief: {
    platforms: string[]
    includeVideo?: boolean
    includeVoiceover?: boolean
    includeAvatar?: boolean
  }
  onConfirm: () => void
  onCancel: () => void
}

export function CostEstimateDialog({
  brief,
  onConfirm,
  onCancel,
}: CostEstimateDialogProps) {
  const [estimate, setEstimate] = useState<CreditEstimate | null>(null)
  const [currentBalance, setCurrentBalance] = useState<number>(0)
  const [canAfford, setCanAfford] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchEstimate() {
      try {
        const response = await fetch("/api/billing/estimate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            platforms: brief.platforms,
            includeVideo: brief.includeVideo,
            includeVoiceover: brief.includeVoiceover,
            includeAvatar: brief.includeAvatar,
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || "見積もりに失敗しました")
        }

        const data = await response.json()
        setEstimate(data.estimate)
        setCurrentBalance(data.currentBalance)
        setCanAfford(data.canAfford)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "見積もりに失敗しました"
        )
      } finally {
        setIsLoading(false)
      }
    }
    fetchEstimate()
  }, [brief])

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="w-full max-w-md rounded-lg bg-bg-card p-6 shadow-lg">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-6 animate-spin text-text-muted" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="w-full max-w-md rounded-lg bg-bg-card p-6 shadow-lg">
          <p className="text-sm text-error">{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4 w-full"
            onClick={onCancel}
          >
            閉じる
          </Button>
        </div>
      </div>
    )
  }

  const breakdownItems = [
    { label: "コピー生成", credits: estimate?.copyCredits || 0 },
    { label: "画像生成", credits: estimate?.imageCredits || 0 },
    ...(estimate?.videoCredits
      ? [{ label: "動画生成", credits: estimate.videoCredits }]
      : []),
    ...(estimate?.voiceoverCredits
      ? [{ label: "ナレーション", credits: estimate.voiceoverCredits }]
      : []),
    ...(estimate?.avatarCredits
      ? [{ label: "アバター", credits: estimate.avatarCredits }]
      : []),
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-bg-card p-6 shadow-lg">
        <h2 className="text-lg font-bold text-text-primary">
          クレジット消費の見積もり
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          このキャンペーン生成に必要なクレジット数
        </p>

        {/* Breakdown table */}
        <div className="mt-4 space-y-2">
          {breakdownItems.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-text-secondary">{item.label}</span>
              <span className="font-medium text-text-primary">
                {item.credits} クレジット
              </span>
            </div>
          ))}

          <div className="border-t border-border-subtle pt-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-text-primary">
                合計
              </span>
              <span className="text-lg font-black text-text-primary">
                {estimate?.totalCredits || 0} クレジット
              </span>
            </div>
          </div>
        </div>

        {/* Balance display */}
        <div
          className={cn(
            "mt-4 rounded-md p-3",
            canAfford
              ? "bg-[#4ADE801A] border border-success/20"
              : "bg-[#EF44441A] border border-error/20"
          )}
        >
          <div className="flex items-center justify-between text-sm">
            <span
              className={cn(
                "font-medium",
                canAfford ? "text-success" : "text-error"
              )}
            >
              現在の残高
            </span>
            <span
              className={cn(
                "font-bold",
                canAfford ? "text-success" : "text-error"
              )}
            >
              {currentBalance.toLocaleString()} クレジット
            </span>
          </div>
        </div>

        {/* Insufficient balance warning */}
        {!canAfford && (
          <div className="mt-3 flex items-start gap-2 text-sm text-error">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <div>
              <p>クレジットが不足しています。プランのアップグレードをご検討ください。</p>
              <Link
                href="/billing"
                className="mt-1 inline-block text-xs font-medium underline"
              >
                課金管理ページへ
              </Link>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onCancel}>
            キャンセル
          </Button>
          <Button
            className="flex-1 bg-vermillion hover:bg-vermillion-hover"
            disabled={!canAfford}
            onClick={onConfirm}
          >
            生成を開始
          </Button>
        </div>
      </div>
    </div>
  )
}
