"use client"

import { useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { useBrandWizardStore } from "@/stores/brand-wizard-store"
import type { ProductCatalogEntry } from "@/types/brand"

function ProductEntry({
  product,
  index,
  onUpdate,
  onRemove,
}: {
  product: ProductCatalogEntry
  index: number
  onUpdate: (index: number, product: ProductCatalogEntry) => void
  onRemove: (index: number) => void
}) {
  const updateField = (field: keyof ProductCatalogEntry, value: string | string[]) => {
    onUpdate(index, { ...product, [field]: value })
  }

  return (
    <div className="rounded-lg border border-border bg-bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-text-primary">
          商品 {index + 1}
        </h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRemove(index)}
          className="text-text-muted hover:text-error"
        >
          <Trash2 className="mr-1 h-4 w-4" />
          削除
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs text-text-secondary">商品名</Label>
          <Input
            value={product.name}
            onChange={(e) => updateField("name", e.target.value)}
            placeholder="商品名を入力"
            className="border-border bg-bg-surface text-text-primary placeholder:text-text-muted text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-text-secondary">価格帯</Label>
          <Input
            value={product.priceRange}
            onChange={(e) => updateField("priceRange", e.target.value)}
            placeholder="例: 3,000円〜5,000円"
            className="border-border bg-bg-surface text-text-primary placeholder:text-text-muted text-sm"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-text-secondary">商品説明</Label>
        <Textarea
          value={product.description}
          onChange={(e) => updateField("description", e.target.value)}
          placeholder="商品の説明を入力"
          rows={2}
          className="border-border bg-bg-surface text-text-primary placeholder:text-text-muted text-sm resize-none"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-text-secondary">
          主な特徴（カンマ区切り）
        </Label>
        <Input
          value={product.keyFeatures.join(", ")}
          onChange={(e) =>
            updateField(
              "keyFeatures",
              e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            )
          }
          placeholder="例: オーガニック, 無添加, 国産"
          className="border-border bg-bg-surface text-text-primary placeholder:text-text-muted text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-text-secondary">
          ターゲットセグメント
        </Label>
        <Input
          value={product.targetSegment}
          onChange={(e) => updateField("targetSegment", e.target.value)}
          placeholder="例: 20代〜30代女性、美容意識が高い層"
          className="border-border bg-bg-surface text-text-primary placeholder:text-text-muted text-sm"
        />
      </div>
    </div>
  )
}

export function ProductInfoStep() {
  const {
    brandStory,
    productCatalog,
    targetMarket,
    brandValues,
    setField,
    addProduct,
    removeProduct,
    updateProduct,
    addBrandValue,
    removeBrandValue,
  } = useBrandWizardStore()

  const [newValue, setNewValue] = useState("")

  const handleAddValue = () => {
    const trimmed = newValue.trim()
    if (trimmed && !brandValues.includes(trimmed)) {
      addBrandValue(trimmed)
      setNewValue("")
    }
  }

  const handleValueKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddValue()
    }
  }

  return (
    <div className="space-y-6">
      {/* Brand Story */}
      <div className="space-y-2">
        <Label className="text-sm font-bold text-text-primary">
          ブランドストーリー
        </Label>
        <Textarea
          value={brandStory}
          onChange={(e) => setField("brandStory", e.target.value)}
          placeholder="ブランドの物語や背景を記述してください"
          rows={3}
          className="border-border bg-bg-card text-text-primary placeholder:text-text-muted resize-none"
        />
      </div>

      {/* Target Market */}
      <div className="space-y-2">
        <Label className="text-sm font-bold text-text-primary">
          ターゲット市場
        </Label>
        <Textarea
          value={targetMarket}
          onChange={(e) => setField("targetMarket", e.target.value)}
          placeholder="ターゲットとなる市場や顧客層を記述してください"
          rows={2}
          className="border-border bg-bg-card text-text-primary placeholder:text-text-muted resize-none"
        />
      </div>

      {/* Brand Values */}
      <div className="space-y-2">
        <Label className="text-sm font-bold text-text-primary">
          ブランドバリュー
        </Label>
        <div className="flex gap-2">
          <Input
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={handleValueKeyDown}
            placeholder="ブランドの核となる価値観を入力してください"
            className="flex-1 border-border bg-bg-card text-text-primary placeholder:text-text-muted"
          />
          <Button
            variant="secondary"
            onClick={handleAddValue}
            disabled={!newValue.trim()}
          >
            追加
          </Button>
        </div>
        {brandValues.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {brandValues.map((value, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-pill bg-bg-surface px-3 py-1 text-sm text-text-secondary"
              >
                {value}
                <button
                  onClick={() => removeBrandValue(i)}
                  className="ml-1 text-text-muted hover:text-text-primary"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <Separator className="bg-border" />

      {/* Product Catalog */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-bold text-text-primary">
            商品カタログ
          </Label>
          <Button
            variant="secondary"
            size="sm"
            onClick={addProduct}
          >
            <Plus className="mr-1 h-4 w-4" />
            商品を追加
          </Button>
        </div>

        {productCatalog.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-bg-card p-6 text-center">
            <p className="text-sm text-text-muted">
              まだ商品が登録されていません
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-3"
              onClick={addProduct}
            >
              <Plus className="mr-1 h-4 w-4" />
              最初の商品を追加
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {productCatalog.map((product, index) => (
              <ProductEntry
                key={index}
                product={product}
                index={index}
                onUpdate={updateProduct}
                onRemove={removeProduct}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
