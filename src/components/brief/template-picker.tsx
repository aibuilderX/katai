"use client"

import { cn } from "@/lib/utils"
import {
  JP_CAMPAIGN_TEMPLATES,
  type CampaignTemplate,
} from "@/lib/templates/jp-campaign-templates"
import { Sun, Zap, Sparkles, Crown, Plus } from "lucide-react"

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Sun,
  Zap,
  Sparkles,
  Crown,
}

const CATEGORY_LABELS: Record<string, string> = {
  seasonal: "季節",
  promotion: "販促",
  product_launch: "新商品",
  brand_awareness: "ブランド",
}

interface TemplatePickerProps {
  onSelect: (template: CampaignTemplate | null) => void
}

export function TemplatePicker({ onSelect }: TemplatePickerProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-text-primary">
          テンプレートを選択
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          よく使うキャンペーンタイプから選ぶか、白紙から作成してください
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {JP_CAMPAIGN_TEMPLATES.map((template) => {
          const IconComponent = ICON_MAP[template.icon]
          return (
            <button
              key={template.id}
              type="button"
              onClick={() => onSelect(template)}
              className={cn(
                "group flex flex-col items-start gap-3 rounded-lg border border-border-subtle bg-bg-card p-5 text-left transition-all",
                "hover:border-vermillion hover:ring-1 hover:ring-vermillion/20"
              )}
            >
              <div className="flex w-full items-start justify-between">
                {IconComponent && (
                  <div className="flex size-10 items-center justify-center rounded-md bg-bg-hover text-text-secondary transition-colors group-hover:bg-vermillion-subtle group-hover:text-vermillion">
                    <IconComponent className="size-5" />
                  </div>
                )}
                <span className="rounded-pill bg-bg-hover px-2 py-0.5 text-xs font-medium text-text-muted">
                  {CATEGORY_LABELS[template.category] || template.category}
                </span>
              </div>
              <div>
                <h3 className="font-bold text-text-primary">
                  {template.nameJa}
                </h3>
                <p className="mt-1 text-sm text-text-muted">
                  {template.descriptionJa}
                </p>
              </div>
            </button>
          )
        })}

        {/* Blank template card */}
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={cn(
            "group flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border-subtle bg-bg-card p-5 text-center transition-all",
            "hover:border-vermillion hover:ring-1 hover:ring-vermillion/20"
          )}
        >
          <div className="flex size-10 items-center justify-center rounded-md bg-bg-hover text-text-muted transition-colors group-hover:bg-vermillion-subtle group-hover:text-vermillion">
            <Plus className="size-5" />
          </div>
          <div>
            <h3 className="font-bold text-text-primary">白紙から作成</h3>
            <p className="mt-1 text-sm text-text-muted">
              テンプレートを使わず自由に設定
            </p>
          </div>
        </button>
      </div>
    </div>
  )
}
