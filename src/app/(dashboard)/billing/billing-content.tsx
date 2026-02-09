"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  CreditCard,
  Loader2,
  CheckCircle,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
  Crown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { TIERS, formatJPY, type TierConfig } from "@/lib/billing/tiers"
import { STRIPE_PRICE_IDS } from "@/lib/stripe/config"

interface SubscriptionInfo {
  tier: string
  status: string
  stripePriceId: string
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean | null
}

interface CreditHistoryEntry {
  id: string
  amount: number
  balanceAfter: number
  type: string
  description: string
  createdAt: string | null
}

const statusLabels: Record<string, { text: string; className: string }> = {
  active: {
    text: "有効",
    className: "bg-[#4ADE801A] text-success",
  },
  canceled: {
    text: "解約済み",
    className: "bg-[#EF44441A] text-error",
  },
  past_due: {
    text: "支払い遅延",
    className: "bg-[#FBBF241A] text-warning",
  },
  trialing: {
    text: "トライアル中",
    className: "bg-vermillion-subtle text-vermillion",
  },
  incomplete: {
    text: "未完了",
    className: "bg-bg-hover text-text-muted",
  },
}

export function BillingContent() {
  const searchParams = useSearchParams()
  const [balance, setBalance] = useState<number>(0)
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(
    null
  )
  const [history, setHistory] = useState<CreditHistoryEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)

  // Handle success/cancel URL params
  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast.success("サブスクリプションの登録が完了しました")
    }
    if (searchParams.get("canceled") === "true") {
      toast.info("サブスクリプションの登録がキャンセルされました")
    }
  }, [searchParams])

  // Fetch billing data on mount
  useEffect(() => {
    async function fetchBillingData() {
      try {
        const response = await fetch("/api/billing/credits")
        if (!response.ok) throw new Error("Failed to fetch billing data")
        const data = await response.json()
        setBalance(data.balance)
        setSubscription(data.subscription)
        setHistory(data.history || [])
      } catch (error) {
        console.error("Failed to fetch billing data:", error)
        toast.error("課金情報の取得に失敗しました")
      } finally {
        setIsLoading(false)
      }
    }
    fetchBillingData()
  }, [])

  const currentTierId = subscription?.tier || "free"
  const currentTier = TIERS.find((t) => t.id === currentTierId)
  const tierOrder = ["free", "starter", "pro", "business"]

  const handleSubscribe = async (tierId: string) => {
    if (tierId === "free") return

    const priceId = STRIPE_PRICE_IDS[tierId as keyof typeof STRIPE_PRICE_IDS]
    if (!priceId) return

    setCheckoutLoading(tierId)
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "チェックアウトに失敗しました")
      }

      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "チェックアウトに失敗しました"
      )
    } finally {
      setCheckoutLoading(null)
    }
  }

  const handlePortal = async () => {
    setPortalLoading(true)
    try {
      const response = await fetch("/api/billing/portal", {
        method: "POST",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "ポータルの起動に失敗しました")
      }

      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "ポータルの起動に失敗しました"
      )
    } finally {
      setPortalLoading(false)
    }
  }

  function getButtonLabel(tier: TierConfig) {
    if (tier.id === currentTierId) return "現在のプラン"
    if (tier.id === "free") return "フリープラン"
    const currentIndex = tierOrder.indexOf(currentTierId)
    const targetIndex = tierOrder.indexOf(tier.id)
    return targetIndex > currentIndex ? "アップグレード" : "ダウングレード"
  }

  function isCurrentTier(tierId: string) {
    return tierId === currentTierId
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-text-muted" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-text-primary">課金管理</h1>
        <p className="mt-1 text-sm text-text-muted">
          サブスクリプションとクレジットの管理
        </p>
      </div>

      {/* Current plan card */}
      <div className="rounded-lg border border-border-subtle bg-bg-card p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Crown className="size-5 text-warm-gold" />
              <h2 className="text-lg font-bold text-text-primary">
                {currentTier?.nameJa || "フリープラン"}
              </h2>
              {subscription?.status && statusLabels[subscription.status] ? (
                <span
                  className={cn(
                    "inline-flex items-center rounded-pill px-3 py-0.5 text-xs font-medium",
                    statusLabels[subscription.status].className
                  )}
                >
                  {statusLabels[subscription.status].text}
                </span>
              ) : (
                <span className="inline-flex items-center rounded-pill bg-bg-hover px-3 py-0.5 text-xs font-medium text-text-muted">
                  無料
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-text-muted">
              {currentTier
                ? `${formatJPY(currentTier.monthlyPriceJpy)}/月`
                : "無料"}
              {subscription?.cancelAtPeriodEnd && (
                <span className="ml-2 text-warning">
                  (期間終了時に解約予定)
                </span>
              )}
            </p>
          </div>
          {subscription && (
            <Button
              variant="outline"
              size="sm"
              onClick={handlePortal}
              disabled={portalLoading}
            >
              {portalLoading ? (
                <Loader2 className="mr-2 size-3.5 animate-spin" />
              ) : (
                <ArrowUpRight className="mr-2 size-3.5" />
              )}
              プランを管理
            </Button>
          )}
        </div>
      </div>

      {/* Tier comparison cards */}
      <div>
        <h2 className="mb-4 text-lg font-bold text-text-primary">
          プラン比較
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {TIERS.map((tier) => {
            const isCurrent = isCurrentTier(tier.id)
            const buttonLabel = getButtonLabel(tier)

            return (
              <div
                key={tier.id}
                className={cn(
                  "relative flex flex-col rounded-lg border bg-bg-card p-5",
                  isCurrent
                    ? "border-vermillion shadow-sm"
                    : "border-border-subtle"
                )}
              >
                {isCurrent && (
                  <div className="absolute -top-3 left-4 rounded-pill bg-vermillion px-3 py-0.5 text-xs font-bold text-text-inverse">
                    現在のプラン
                  </div>
                )}

                <h3 className="text-base font-bold text-text-primary">
                  {tier.nameJa}
                </h3>

                <div className="mt-2">
                  <span className="text-2xl font-black text-text-primary">
                    {formatJPY(tier.monthlyPriceJpy)}
                  </span>
                  <span className="text-sm text-text-muted">/月</span>
                </div>

                <p className="mt-2 text-sm font-medium text-vermillion">
                  {tier.monthlyCredits.toLocaleString()} クレジット/月
                </p>

                <ul className="mt-4 flex-1 space-y-2">
                  <li className="text-xs text-text-secondary">
                    ブランド数:{" "}
                    {tier.maxBrands === -1 ? "無制限" : `${tier.maxBrands}件`}
                  </li>
                  <li className="text-xs text-text-secondary">
                    チームメンバー:{" "}
                    {tier.maxTeamMembers === -1
                      ? "無制限"
                      : `${tier.maxTeamMembers}人`}
                  </li>
                  {tier.features.includes("video") && (
                    <li className="text-xs text-text-secondary">
                      <CheckCircle className="mr-1 inline-block size-3 text-success" />
                      動画生成
                    </li>
                  )}
                  {tier.features.includes("compliance") && (
                    <li className="text-xs text-text-secondary">
                      <CheckCircle className="mr-1 inline-block size-3 text-success" />
                      コンプライアンスチェック
                    </li>
                  )}
                  {tier.features.includes("approval") && (
                    <li className="text-xs text-text-secondary">
                      <CheckCircle className="mr-1 inline-block size-3 text-success" />
                      稟議ワークフロー
                    </li>
                  )}
                  {tier.features.includes("avatar") && (
                    <li className="text-xs text-text-secondary">
                      <CheckCircle className="mr-1 inline-block size-3 text-success" />
                      アバター動画
                    </li>
                  )}
                  {tier.features.includes("priority_support") && (
                    <li className="text-xs text-text-secondary">
                      <CheckCircle className="mr-1 inline-block size-3 text-success" />
                      優先サポート
                    </li>
                  )}
                </ul>

                <Button
                  variant={isCurrent ? "outline" : "default"}
                  size="sm"
                  className={cn("mt-4 w-full", !isCurrent && "bg-vermillion hover:bg-vermillion-hover")}
                  disabled={isCurrent || tier.id === "free" || checkoutLoading !== null}
                  onClick={() => handleSubscribe(tier.id)}
                >
                  {checkoutLoading === tier.id ? (
                    <Loader2 className="mr-2 size-3.5 animate-spin" />
                  ) : null}
                  {buttonLabel}
                </Button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Credit balance section */}
      <div className="rounded-lg border border-border-subtle bg-bg-card p-6">
        <div className="flex items-center gap-2">
          <CreditCard className="size-5 text-text-secondary" />
          <h2 className="text-lg font-bold text-text-primary">
            クレジット残高
          </h2>
        </div>

        <div className="mt-4 flex items-end gap-2">
          <span className="text-4xl font-black text-text-primary">
            {balance.toLocaleString()}
          </span>
          <span className="mb-1 text-sm text-text-muted">クレジット</span>
        </div>

        {currentTier && currentTier.monthlyCredits > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-text-muted">
              <span>使用状況</span>
              <span>
                {balance.toLocaleString()} /{" "}
                {currentTier.monthlyCredits.toLocaleString()}
              </span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-bg-hover">
              <div
                className="h-full rounded-full bg-vermillion transition-all"
                style={{
                  width: `${Math.min(
                    (balance / currentTier.monthlyCredits) * 100,
                    100
                  )}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Usage history table */}
      <div className="rounded-lg border border-border-subtle bg-bg-card p-6">
        <h2 className="text-lg font-bold text-text-primary">利用履歴</h2>

        {history.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle text-left text-xs text-text-muted">
                  <th className="pb-2 font-medium">日時</th>
                  <th className="pb-2 font-medium">内容</th>
                  <th className="pb-2 text-right font-medium">クレジット</th>
                  <th className="pb-2 text-right font-medium">残高</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {history.slice(0, 20).map((entry) => (
                  <tr key={entry.id}>
                    <td className="py-2.5 text-text-secondary">
                      {entry.createdAt
                        ? new Date(entry.createdAt).toLocaleDateString(
                            "ja-JP",
                            {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )
                        : "-"}
                    </td>
                    <td className="py-2.5 text-text-primary">
                      {entry.description}
                    </td>
                    <td className="py-2.5 text-right">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 font-medium",
                          entry.amount > 0 ? "text-success" : "text-error"
                        )}
                      >
                        {entry.amount > 0 ? (
                          <TrendingUp className="size-3" />
                        ) : (
                          <TrendingDown className="size-3" />
                        )}
                        {entry.amount > 0 ? "+" : ""}
                        {entry.amount.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-2.5 text-right text-text-muted">
                      {entry.balanceAfter.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-6 flex flex-col items-center py-8 text-center">
            <CreditCard className="mb-3 size-10 text-text-muted/30" />
            <p className="text-sm text-text-muted">
              まだ利用履歴がありません
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
