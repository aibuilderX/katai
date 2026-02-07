"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"
import { Plus, Megaphone, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StatsRow } from "@/components/dashboard/stats-row"
import { CampaignCard } from "@/components/dashboard/campaign-card"

interface Campaign {
  id: string
  name: string
  thumbnailUrl: string | null
  status: "pending" | "generating" | "complete" | "failed" | "partial" | "draft"
  platformCount: number
  createdAt: string
}

interface DashboardContentProps {
  totalCampaigns: number
  activeBrands: number
  monthlyGenerations: number
  campaigns: Campaign[]
  hasBrands: boolean
}

export function DashboardContent({
  totalCampaigns,
  activeBrands,
  monthlyGenerations,
  campaigns,
  hasBrands,
}: DashboardContentProps) {
  const t = useTranslations("dashboard")
  const tOnboarding = useTranslations("onboarding")

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Onboarding banner for first-time users */}
      {!hasBrands && (
        <div className="rounded-radius-lg border border-warm-gold/20 bg-warm-gold-subtle p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-text-primary">
                {tOnboarding("setupBrand")}
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                {tOnboarding("step1Desc")}
              </p>
            </div>
            <Button asChild variant="outline" className="shrink-0 border-warm-gold/30 text-warm-gold hover:bg-warm-gold-subtle">
              <Link href="/brands/new">
                <ArrowRight className="size-4" />
                {tOnboarding("step1Title")}
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* Hero CTA area */}
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-6 flex size-16 items-center justify-center rounded-full bg-vermillion-subtle">
          <Megaphone className="size-8 text-vermillion" />
        </div>
        <h1 className="text-3xl font-black tracking-tight text-text-primary">
          {t("createCampaign")}
        </h1>
        <p className="mt-3 max-w-md text-sm text-text-secondary">
          ブリーフを提出して、AIがキャンペーンキットを生成します
        </p>
        <Button
          asChild
          className="mt-8 h-14 rounded-radius-md bg-vermillion px-10 text-lg font-bold text-text-inverse hover:bg-vermillion-hover transition-colors duration-200"
        >
          <Link href="/campaigns/new">
            <Plus className="size-5" />
            {t("createCampaign")}
          </Link>
        </Button>
      </div>

      {/* Stats row */}
      <StatsRow
        totalCampaigns={totalCampaigns}
        activeBrands={activeBrands}
        monthlyGenerations={monthlyGenerations}
      />

      {/* Recent campaigns */}
      <div>
        <h2 className="mb-6 text-xl font-bold text-text-primary">
          {t("recentCampaigns")}
        </h2>

        {campaigns.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((campaign) => (
              <CampaignCard
                key={campaign.id}
                id={campaign.id}
                name={campaign.name}
                thumbnailUrl={campaign.thumbnailUrl}
                status={campaign.status}
                platformCount={campaign.platformCount}
                createdAt={campaign.createdAt}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-radius-lg border border-border-subtle bg-bg-card py-16">
            <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-bg-surface">
              <Megaphone className="size-8 text-text-muted" />
            </div>
            <p className="text-lg font-medium text-text-secondary">
              {t("noCampaigns")}
            </p>
            <p className="mt-2 text-sm text-text-muted">
              最初のキャンペーンを作成してみましょう
            </p>
            <Button
              asChild
              variant="outline"
              className="mt-6 border-border text-text-secondary hover:bg-bg-hover hover:text-text-primary"
            >
              <Link href="/campaigns/new">
                <Plus className="size-4" />
                {t("createCampaign")}
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
