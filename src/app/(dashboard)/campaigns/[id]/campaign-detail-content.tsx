"use client"

import Link from "next/link"
import {
  ChevronRight,
  RefreshCw,
  AlertCircle,
  Film,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CopyTab } from "@/components/campaign/copy-tab"
import { ImageTab } from "@/components/campaign/image-tab"
import { PlatformGridView } from "@/components/campaign/platform-grid-view"
import { VideoTab } from "@/components/campaign/video-tab"
import { DownloadButton } from "@/components/campaign/download-button"
import { CampaignSidebar } from "@/components/campaign/campaign-sidebar"
import { GenerationProgress } from "@/components/campaign/generation-progress"
import type { CampaignBrief, CampaignProgress } from "@/lib/db/schema"

interface CampaignDetailContentProps {
  campaign: {
    id: string
    name: string | null
    status: string
    brief: CampaignBrief
    progress: CampaignProgress | null
    createdAt: string | null
    completedAt: string | null
  }
  brand: {
    name: string
    toneTags: string[] | null
    defaultRegister: string
  } | null
  copyVariants: {
    id: string
    campaignId: string
    platform: string
    variantLabel: string
    register: string
    headline: string
    bodyText: string
    ctaText: string
    hashtags: string[]
    isFavorite: boolean
    createdAt: string | null
  }[]
  assets: {
    id: string
    type: string
    storageKey: string
    fileName: string | null
    width: string | null
    height: string | null
    mimeType: string | null
    modelUsed: string | null
    prompt: string | null
    metadata?: Record<string, unknown> | null
    createdAt: string | null
  }[]
  generationTime: string | null
}

const statusLabels: Record<string, { text: string; className: string }> = {
  complete: {
    text: "生成完了",
    className: "bg-[#4ADE801A] text-success",
  },
  generating: {
    text: "生成中",
    className: "bg-vermillion-subtle text-vermillion",
  },
  pending: {
    text: "待機中",
    className: "bg-bg-hover text-text-muted",
  },
  failed: {
    text: "エラー",
    className: "bg-[#EF44441A] text-error",
  },
  partial: {
    text: "一部完了",
    className: "bg-[#FBBF241A] text-warning",
  },
}

export function CampaignDetailContent({
  campaign,
  brand,
  copyVariants,
  assets,
  generationTime,
}: CampaignDetailContentProps) {
  const brief = campaign.brief
  const statusInfo = statusLabels[campaign.status] || statusLabels.pending

  const formattedDate = campaign.createdAt
    ? new Date(campaign.createdAt).toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : ""

  // Filter video and audio assets for the video tab
  const videoAssets = assets.filter((a) => a.type === "video")
  const audioAssets = assets.filter((a) => a.type === "audio")

  // Show progress UI when generating
  if (campaign.status === "generating" || campaign.status === "pending") {
    return (
      <div className="space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-text-muted">
          <Link href="/campaigns" className="hover:text-text-primary transition-colors">
            キャンペーン一覧
          </Link>
          <ChevronRight className="size-3.5" />
          <span className="text-text-secondary">
            {campaign.name || "無題のキャンペーン"}
          </span>
        </nav>

        <GenerationProgress
          campaignId={campaign.id}
          initialProgress={campaign.progress}
          initialStatus={campaign.status}
        />
      </div>
    )
  }

  // Show error state
  if (campaign.status === "failed") {
    return (
      <div className="space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-text-muted">
          <Link href="/campaigns" className="hover:text-text-primary transition-colors">
            キャンペーン一覧
          </Link>
          <ChevronRight className="size-3.5" />
          <span className="text-text-secondary">
            {campaign.name || "無題のキャンペーン"}
          </span>
        </nav>

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
      </div>
    )
  }

  // Results view (complete or partial)
  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-text-muted">
        <Link href="/campaigns" className="hover:text-text-primary transition-colors">
          キャンペーン一覧
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="text-text-secondary">
          {campaign.name || "無題のキャンペーン"}
        </span>
      </nav>

      {/* Campaign header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-text-primary">
              {campaign.name || "無題のキャンペーン"}
            </h1>
            <span
              className={cn(
                "inline-flex items-center rounded-pill px-3 py-1 text-xs font-medium",
                statusInfo.className
              )}
            >
              {statusInfo.text}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-3 text-sm text-text-muted">
            {brand && <span>{brand.name}</span>}
            {formattedDate && (
              <>
                <span className="text-border">|</span>
                <span>{formattedDate}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/campaigns/new"
            className="inline-flex items-center gap-2 rounded-md border border-border bg-transparent px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-hover"
          >
            <RefreshCw className="size-4" />
            <span>再生成</span>
          </Link>
        </div>
      </div>

      {/* Main content + sidebar layout */}
      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Main content area */}
        <div className="min-w-0 flex-1">
          <Tabs defaultValue="copy" className="w-full">
            <TabsList variant="line" className="mb-6 w-full justify-start border-b border-border-subtle">
              <TabsTrigger
                value="copy"
                className="data-[state=active]:after:bg-warm-gold"
              >
                コピー
              </TabsTrigger>
              <TabsTrigger
                value="images"
                className="data-[state=active]:after:bg-warm-gold"
              >
                画像
              </TabsTrigger>
              <TabsTrigger
                value="platforms"
                className="data-[state=active]:after:bg-warm-gold"
              >
                プラットフォーム
              </TabsTrigger>
              <TabsTrigger
                value="videos"
                className="data-[state=active]:after:bg-warm-gold"
              >
                <Film className="mr-1 size-4" />
                動画
                {videoAssets.length > 0 && (
                  <span className="ml-1 text-xs text-text-muted">
                    ({videoAssets.length})
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="copy">
              <CopyTab
                campaignId={campaign.id}
                copyVariants={copyVariants}
                platforms={brief.platforms || []}
              />
            </TabsContent>

            <TabsContent value="images">
              <ImageTab assets={assets} />
            </TabsContent>

            <TabsContent value="platforms">
              <PlatformGridView assets={assets} copyVariants={copyVariants} />
            </TabsContent>

            <TabsContent value="videos">
              <VideoTab videos={videoAssets} audioAssets={audioAssets} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right sidebar */}
        <div className="flex w-full shrink-0 flex-col gap-6 lg:w-[300px]">
          {(campaign.status === "complete" || campaign.status === "partial") && (
            <DownloadButton campaignId={campaign.id} />
          )}
          <CampaignSidebar
            brandName={brand?.name || "不明"}
            targetAudience={brief.targetAudience || ""}
            platforms={brief.platforms || []}
            toneTags={brand?.toneTags || []}
            register={brief.registerOverride || brand?.defaultRegister || "standard"}
            generationTime={generationTime}
            variantCount={copyVariants.length}
            campaignId={campaign.id}
          />
        </div>
      </div>
    </div>
  )
}
