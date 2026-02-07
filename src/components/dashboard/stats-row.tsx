import { useTranslations } from "next-intl"

interface StatsRowProps {
  totalCampaigns: number
  activeBrands: number
  monthlyGenerations: number
}

export function StatsRow({
  totalCampaigns,
  activeBrands,
  monthlyGenerations,
}: StatsRowProps) {
  const t = useTranslations("dashboard")

  const stats = [
    { label: t("totalCampaigns"), value: totalCampaigns },
    { label: t("activeBrands"), value: activeBrands },
    { label: t("monthlyGenerations"), value: monthlyGenerations },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-md border border-border-subtle bg-bg-card p-5"
        >
          <p className="text-sm font-medium text-text-secondary">
            {stat.label}
          </p>
          <p className="mt-2 font-mono text-3xl font-black tracking-tight text-text-primary">
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  )
}
