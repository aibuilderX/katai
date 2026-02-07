"use client"

import { useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { JAPANESE_FONTS, type JapaneseFontDefinition } from "@/lib/constants/fonts"
import { useBrandWizardStore } from "@/stores/brand-wizard-store"

const CATEGORY_LABELS: Record<string, string> = {
  gothic: "ゴシック",
  mincho: "明朝",
  rounded: "丸ゴシック",
}

function FontCard({
  font,
  isSelected,
  onSelect,
}: {
  font: JapaneseFontDefinition
  isSelected: boolean
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full rounded-lg border p-5 text-left transition-all duration-200 ${
        isSelected
          ? "border-vermillion bg-vermillion-subtle"
          : "border-border bg-bg-card hover:border-text-muted"
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-bold text-text-primary">
          {font.nameJa}
        </span>
        <Badge
          variant="secondary"
          className="bg-bg-surface text-text-secondary text-xs"
        >
          {CATEGORY_LABELS[font.category]}
        </Badge>
      </div>
      <p
        className="text-lg text-text-secondary leading-relaxed"
        style={{ fontFamily: `"${font.nameEn}", sans-serif` }}
      >
        あいうえお ABC 123
      </p>
    </button>
  )
}

export function FontSelectStep() {
  const { fontPreference, setField } = useBrandWizardStore()

  // Load Google Fonts CSS for preview
  useEffect(() => {
    const fontFamilies = JAPANESE_FONTS.map((f) => f.googleFontsId).join("&family=")
    const link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = `https://fonts.googleapis.com/css2?family=${fontFamilies}&display=swap`
    link.id = "brand-wizard-fonts"

    // Only add if not already present
    if (!document.getElementById("brand-wizard-fonts")) {
      document.head.appendChild(link)
    }

    return () => {
      const existing = document.getElementById("brand-wizard-fonts")
      if (existing) existing.remove()
    }
  }, [])

  return (
    <div className="space-y-4">
      <p className="text-sm font-bold text-text-primary">
        ブランドフォントを選択してください
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {JAPANESE_FONTS.map((font) => (
          <FontCard
            key={font.id}
            font={font}
            isSelected={fontPreference === font.id}
            onSelect={() => setField("fontPreference", font.id)}
          />
        ))}
      </div>
    </div>
  )
}
