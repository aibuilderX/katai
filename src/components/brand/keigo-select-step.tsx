"use client"

import { KEIGO_REGISTERS, type KeigoRegisterDefinition } from "@/lib/constants/keigo"
import { useBrandWizardStore } from "@/stores/brand-wizard-store"

const KEIGO_CARD_DATA: {
  id: "casual" | "standard" | "formal"
  name: string
  description: string
  example: string
}[] = [
  {
    id: "casual",
    name: "カジュアル",
    description: "親しみやすい、タメ口スタイル",
    example: "新商品出たよ！チェックしてみて！",
  },
  {
    id: "standard",
    name: "標準",
    description: "丁寧語、です/ます形",
    example: "新商品が登場しました。ぜひご覧ください。",
  },
  {
    id: "formal",
    name: "敬語",
    description: "尊敬語・謙譲語、格式高い表現",
    example:
      "新商品のご案内を申し上げます。何卒ご高覧賜りますようお願い申し上げます。",
  },
]

function KeigoCard({
  data,
  isSelected,
  onSelect,
}: {
  data: (typeof KEIGO_CARD_DATA)[0]
  isSelected: boolean
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full rounded-lg border p-6 text-left transition-all duration-200 ${
        isSelected
          ? "border-vermillion bg-vermillion-subtle"
          : "border-border bg-bg-card hover:border-text-muted"
      }`}
    >
      <div className="mb-3">
        <h3 className="text-lg font-black text-text-primary">{data.name}</h3>
        <p className="text-sm text-text-secondary">{data.description}</p>
      </div>
      <div className="rounded-md bg-bg-surface p-4">
        <p className="text-sm leading-relaxed text-text-primary" style={{ lineHeight: 1.8 }}>
          {data.example}
        </p>
      </div>
    </button>
  )
}

export function KeigoSelectStep() {
  const { defaultRegister, setField } = useBrandWizardStore()

  return (
    <div className="space-y-4">
      <p className="text-sm font-bold text-text-primary">
        デフォルトの敬語レベルを選択してください
      </p>
      <p className="text-xs text-text-muted">
        この設定はAIが生成するコピーの丁寧さのレベルを決定します。キャンペーンごとに変更することも可能です。
      </p>

      <div className="grid grid-cols-1 gap-4">
        {KEIGO_CARD_DATA.map((data) => (
          <KeigoCard
            key={data.id}
            data={data}
            isSelected={defaultRegister === data.id}
            onSelect={() => setField("defaultRegister", data.id)}
          />
        ))}
      </div>
    </div>
  )
}
