import Link from "next/link"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"

interface CampaignCardProps {
  id: string
  name: string
  thumbnailUrl?: string | null
  status: "pending" | "generating" | "complete" | "failed" | "partial" | "draft"
  platformCount: number
  createdAt: string
}

const statusConfig = {
  pending: { labelKey: "pending" as const, className: "bg-bg-hover text-text-muted" },
  generating: {
    labelKey: "generating" as const,
    className: "bg-vermillion-subtle text-vermillion",
  },
  complete: {
    labelKey: "complete" as const,
    className: "bg-[#4ADE801A] text-success",
  },
  failed: { labelKey: "error" as const, className: "bg-[#EF44441A] text-error" },
  partial: {
    labelKey: "partial" as const,
    className: "bg-[#FBBF241A] text-warning",
  },
  draft: { labelKey: "draft" as const, className: "bg-bg-hover text-text-muted" },
} as const

export function CampaignCard({
  id,
  name,
  thumbnailUrl,
  status,
  platformCount,
  createdAt,
}: CampaignCardProps) {
  const t = useTranslations("campaign.status")

  const statusInfo = statusConfig[status]
  const formattedDate = new Date(createdAt).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })

  return (
    <Link
      href={`/campaigns/${id}`}
      className="group block overflow-hidden rounded-radius-lg border border-border-subtle bg-bg-card transition-all duration-200 ease-out hover:-translate-y-2 hover:border-border hover:shadow-lg"
    >
      {/* Thumbnail area (16:9 aspect ratio) */}
      <div className="relative aspect-video w-full overflow-hidden bg-bg-surface">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={name}
            className="size-full object-cover transition-transform duration-200 group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <div className="text-4xl text-text-muted/30">
              <svg
                className="size-12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="m21 15-5-5L5 21" />
              </svg>
            </div>
          </div>
        )}

        {/* Gradient overlay at bottom */}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-bg-card/90 to-transparent" />

        {/* Status pill top-right */}
        <div className="absolute right-3 top-3">
          <span
            className={cn(
              "inline-flex items-center rounded-radius-pill px-3 py-1 text-xs font-medium",
              statusInfo.className
            )}
          >
            {t(statusInfo.labelKey)}
          </span>
        </div>
      </div>

      {/* Card content */}
      <div className="p-4">
        <h3 className="truncate text-base font-bold text-text-primary">
          {name}
        </h3>
        <div className="mt-2 flex items-center gap-3">
          <span className="text-xs text-text-muted">{formattedDate}</span>
          {platformCount > 0 && (
            <span className="inline-flex items-center rounded-radius-pill bg-warm-gold-subtle px-2 py-0.5 text-xs font-medium text-warm-gold">
              {platformCount} プラットフォーム
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
