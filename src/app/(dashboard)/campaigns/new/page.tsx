"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { BriefForm, type BriefFormInitialValues } from "@/components/brief/brief-form"
import { TemplatePicker } from "@/components/brief/template-picker"
import type { CampaignTemplate } from "@/lib/templates/jp-campaign-templates"
import { ArrowLeft } from "lucide-react"

export default function NewCampaignPage() {
  const searchParams = useSearchParams()
  const cloneId = searchParams.get("clone")

  const [showForm, setShowForm] = useState(false)
  const [initialValues, setInitialValues] = useState<BriefFormInitialValues | undefined>()
  const [cloneLoading, setCloneLoading] = useState(!!cloneId)

  // If cloneId present, fetch parent campaign brief
  useEffect(() => {
    if (!cloneId) return

    async function fetchCloneData() {
      try {
        const response = await fetch(`/api/campaigns/${cloneId}/clone`, {
          method: "POST",
        })
        if (response.ok) {
          const data = await response.json()
          const brief = data.brief
          setInitialValues({
            objective: brief.objective,
            targetAudience: brief.targetAudience,
            platforms: brief.platforms,
            registerOverride: brief.registerOverride,
            creativeMoodTags: brief.creativeMoodTags,
            creativeDirection: brief.creativeDirection,
            brandProfileId: brief.brandProfileId,
            parentCampaignId: data.parentCampaignId,
            campaignName: data.name ? `${data.name} (コピー)` : "",
          })
          setShowForm(true)
        }
      } catch {
        // Failed to fetch clone data, fall through to template picker
      } finally {
        setCloneLoading(false)
      }
    }
    fetchCloneData()
  }, [cloneId])

  const handleTemplateSelect = useCallback((template: CampaignTemplate | null) => {
    if (template) {
      setInitialValues({
        objective: template.defaults.objective,
        targetAudience: template.defaults.targetAudience,
        platforms: template.defaults.platforms,
        creativeMoodTags: template.defaults.creativeMoodTags,
        creativeDirection: template.defaults.creativeDirection,
        registerOverride: template.defaults.registerOverride,
      })
    } else {
      setInitialValues(undefined)
    }
    setShowForm(true)
  }, [])

  const handleBackToTemplates = useCallback(() => {
    setShowForm(false)
    setInitialValues(undefined)
  }, [])

  if (cloneLoading) {
    return (
      <div className="mx-auto max-w-3xl">
        <nav className="mb-6 text-sm text-text-muted">
          <span className="hover:text-text-secondary cursor-pointer">
            キャンペーン
          </span>
          <span className="mx-2">/</span>
          <span className="text-text-primary">新規作成</span>
        </nav>
        <div className="flex items-center justify-center py-20 text-sm text-text-muted">
          キャンペーンデータを読み込み中...
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-text-muted">
        <span className="hover:text-text-secondary cursor-pointer">
          キャンペーン
        </span>
        <span className="mx-2">/</span>
        <span className="text-text-primary">新規作成</span>
      </nav>

      {/* Title */}
      <h1 className="mb-8 text-2xl font-black text-text-primary">
        キャンペーンブリーフ
      </h1>

      {!showForm ? (
        <TemplatePicker onSelect={handleTemplateSelect} />
      ) : (
        <>
          {/* Back to template picker link (not shown for clone) */}
          {!cloneId && (
            <button
              type="button"
              onClick={handleBackToTemplates}
              className="mb-6 inline-flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-vermillion"
            >
              <ArrowLeft className="size-3.5" />
              テンプレートを変更
            </button>
          )}

          <BriefForm key={JSON.stringify(initialValues)} initialValues={initialValues} />
        </>
      )}
    </div>
  )
}
