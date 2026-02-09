"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { TrendingUp, Loader2, Hash, Tag } from "lucide-react"

interface TrendInsight {
  title: string
  relevance: string
  suggestion: string
}

interface TrendInsightsResult {
  trends: TrendInsight[]
  seasonalTags: string[]
  recommendedHashtags: string[]
}

interface TrendInsightsCardProps {
  campaignId: string
}

export function TrendInsightsCard({ campaignId }: TrendInsightsCardProps) {
  const [insights, setInsights] = useState<TrendInsightsResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAnalyze = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/qa`)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "トレンド分析に失敗しました")
      }

      const data = await response.json()
      setInsights(data.insights)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "トレンド分析に失敗しました"
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="rounded-lg border border-border-subtle bg-bg-card p-4">
      <div className="flex items-center gap-2">
        <TrendingUp className="size-4 text-text-secondary" />
        <h3 className="text-sm font-bold text-text-primary">トレンド分析</h3>
      </div>

      {!insights ? (
        <div className="mt-3">
          <p className="mb-3 text-xs text-text-muted">
            日本市場のトレンドからクリエイティブの方向性を分析します
          </p>
          <Button
            onClick={handleAnalyze}
            disabled={isLoading}
            variant="outline"
            size="sm"
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 size-3.5 animate-spin" />
                分析中...
              </>
            ) : (
              "トレンド分析"
            )}
          </Button>
          {error && (
            <p className="mt-2 text-xs text-error">{error}</p>
          )}
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {/* Trend insights */}
          {insights.trends.map((trend, i) => (
            <div key={i} className="space-y-1">
              <h4 className="text-sm font-medium text-text-primary">
                {trend.title}
              </h4>
              <p className="text-xs text-text-muted">{trend.relevance}</p>
              <p className="text-xs text-text-secondary">
                {trend.suggestion}
              </p>
            </div>
          ))}

          {/* Seasonal tags */}
          {insights.seasonalTags.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1 text-xs text-text-muted">
                <Tag className="size-3" />
                <span>季節タグ</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {insights.seasonalTags.map((tag, i) => (
                  <span
                    key={i}
                    className="rounded-pill bg-bg-hover px-2 py-0.5 text-xs text-text-secondary"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Hashtags */}
          {insights.recommendedHashtags.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1 text-xs text-text-muted">
                <Hash className="size-3" />
                <span>おすすめハッシュタグ</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {insights.recommendedHashtags.map((tag, i) => (
                  <span
                    key={i}
                    className="rounded-pill bg-vermillion-subtle px-2 py-0.5 text-xs text-vermillion"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Re-run button */}
          <Button
            onClick={handleAnalyze}
            disabled={isLoading}
            variant="outline"
            size="sm"
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 size-3.5 animate-spin" />
                再分析中...
              </>
            ) : (
              "再分析"
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
