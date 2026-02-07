"use client"

import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useBrandWizardStore } from "@/stores/brand-wizard-store"

const TONE_TAGS = [
  { id: "sophisticated", label: "洗練" },
  { id: "friendly", label: "親しみやすい" },
  { id: "bold", label: "大胆" },
  { id: "trustworthy", label: "信頼感" },
  { id: "innovative", label: "革新的" },
  { id: "traditional", label: "伝統的" },
  { id: "humorous", label: "ユーモア" },
  { id: "luxurious", label: "高級感" },
  { id: "energetic", label: "エネルギッシュ" },
  { id: "minimal", label: "ミニマル" },
  { id: "warm", label: "温かみ" },
  { id: "professional", label: "プロフェッショナル" },
  { id: "elegant", label: "エレガント" },
  { id: "playful", label: "遊び心" },
  { id: "natural", label: "ナチュラル" },
]

export function ToneStep() {
  const { toneTags, toneDescription, setField } = useBrandWizardStore()

  const toggleTag = (tagId: string) => {
    if (toneTags.includes(tagId)) {
      setField(
        "toneTags",
        toneTags.filter((t) => t !== tagId)
      )
    } else {
      setField("toneTags", [...toneTags, tagId])
    }
  }

  return (
    <div className="space-y-6">
      {/* Tone Tags */}
      <div className="space-y-3">
        <Label className="text-sm font-bold text-text-primary">
          トーンタグ
        </Label>
        <p className="text-xs text-text-muted">
          ブランドの雰囲気に合うタグを選択してください（複数選択可）
        </p>
        <div className="flex flex-wrap gap-2">
          {TONE_TAGS.map((tag) => {
            const isSelected = toneTags.includes(tag.id)
            return (
              <button
                key={tag.id}
                onClick={() => toggleTag(tag.id)}
                className={`rounded-pill px-4 py-2 text-sm font-medium transition-all duration-200 ${
                  isSelected
                    ? "bg-warm-gold text-text-inverse"
                    : "border border-border bg-bg-card text-text-secondary hover:border-text-muted"
                }`}
              >
                {tag.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Free text description */}
      <div className="space-y-2">
        <Label
          htmlFor="toneDescription"
          className="text-sm font-bold text-text-primary"
        >
          詳細な説明（任意）
        </Label>
        <Textarea
          id="toneDescription"
          value={toneDescription}
          onChange={(e) => setField("toneDescription", e.target.value)}
          placeholder="ブランドのトーンや雰囲気を自由に記述してください"
          rows={4}
          className="border-border bg-bg-card text-text-primary placeholder:text-text-muted focus:border-vermillion resize-none"
        />
      </div>
    </div>
  )
}
