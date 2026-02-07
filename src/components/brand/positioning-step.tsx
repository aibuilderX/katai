"use client"

import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useBrandWizardStore } from "@/stores/brand-wizard-store"

const POSITIONING_TEMPLATES = [
  {
    title: "テンプレート1: 標準フォーマット",
    text: "【ターゲット】にとって、【ブランド名】は【カテゴリー】の中で最も【差別化ポイント】なブランドです。なぜなら【根拠】だからです。",
  },
  {
    title: "テンプレート2: バリュープロポジション型",
    text: "私たちは【ターゲット】が抱える【課題】を、【独自のアプローチ】で解決します。他社にはない【強み】が、お客様に【ベネフィット】をお届けします。",
  },
  {
    title: "テンプレート3: ビジョン型",
    text: "【ブランド名】は「【ビジョン】」を掲げ、【ターゲット市場】において【目指す姿】を実現するブランドです。",
  },
]

export function PositioningStep() {
  const { positioningStatement, setField } = useBrandWizardStore()

  return (
    <div className="space-y-6">
      {/* Positioning Statement */}
      <div className="space-y-2">
        <Label
          htmlFor="positioning"
          className="text-sm font-bold text-text-primary"
        >
          ポジショニングステートメント
        </Label>
        <Textarea
          id="positioning"
          value={positioningStatement}
          onChange={(e) => setField("positioningStatement", e.target.value)}
          placeholder="市場における自社ブランドの独自のポジションを記述してください"
          rows={5}
          className="border-border bg-bg-card text-text-primary placeholder:text-text-muted focus:border-vermillion resize-none"
        />
      </div>

      {/* Template Examples */}
      <div className="space-y-3">
        <Label className="text-sm font-bold text-text-primary">
          テンプレート例
        </Label>
        <p className="text-xs text-text-muted">
          以下のテンプレートを参考に、ポジショニングステートメントを作成してください。
        </p>

        <div className="space-y-3">
          {POSITIONING_TEMPLATES.map((template, i) => (
            <div
              key={i}
              className="rounded-lg border border-border-subtle bg-bg-surface p-4"
            >
              <h4 className="mb-2 text-xs font-bold text-text-secondary">
                {template.title}
              </h4>
              <p className="text-sm text-text-muted leading-relaxed" style={{ lineHeight: 1.8 }}>
                {template.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
