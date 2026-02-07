"use client"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { useBrandWizardStore } from "@/stores/brand-wizard-store"

const COLOR_SLOTS = [
  { key: "primary" as const, label: "プライマリカラー" },
  { key: "secondary" as const, label: "セカンダリカラー" },
  { key: "accent" as const, label: "アクセントカラー" },
  { key: "background" as const, label: "背景カラー" },
]

export function ColorPickerStep() {
  const { selectedColors, setField } = useBrandWizardStore()

  const updateColor = (key: keyof typeof selectedColors, value: string) => {
    setField("selectedColors", { ...selectedColors, [key]: value })
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {COLOR_SLOTS.map((slot) => (
          <div key={slot.key} className="space-y-2">
            <Label className="text-sm font-bold text-text-primary">
              {slot.label}
            </Label>
            <div className="flex items-center gap-3 rounded-lg border border-border bg-bg-card p-3">
              {/* Color swatch with native picker */}
              <div className="relative">
                <div
                  className="h-10 w-10 shrink-0 cursor-pointer rounded-md border border-border"
                  style={{ backgroundColor: selectedColors[slot.key] }}
                />
                <input
                  type="color"
                  value={selectedColors[slot.key]}
                  onChange={(e) => updateColor(slot.key, e.target.value)}
                  className="absolute inset-0 h-10 w-10 cursor-pointer opacity-0"
                  title={slot.label}
                />
              </div>
              {/* Hex input */}
              <Input
                value={selectedColors[slot.key]}
                onChange={(e) => {
                  const val = e.target.value
                  if (/^#[0-9A-Fa-f]{0,6}$/.test(val) || val === "") {
                    updateColor(slot.key, val)
                  }
                }}
                onBlur={(e) => {
                  const val = e.target.value
                  if (!/^#[0-9A-Fa-f]{6}$/.test(val)) {
                    updateColor(slot.key, selectedColors[slot.key])
                  }
                }}
                placeholder="#000000"
                className="flex-1 border-0 bg-transparent text-sm text-text-primary font-mono placeholder:text-text-muted"
              />
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-text-muted">
        ロゴから抽出されたカラーが初期値として設定されています。クリックして変更できます。
      </p>
    </div>
  )
}
