"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { JAPANESE_FONTS } from "@/lib/constants/fonts"
import type { ProductCatalogEntry, BrandColors } from "@/types/brand"

const REGISTER_OPTIONS = [
  { id: "casual" as const, label: "カジュアル" },
  { id: "standard" as const, label: "標準" },
  { id: "formal" as const, label: "敬語" },
]

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

const COLOR_SLOTS = [
  { key: "primary" as const, label: "プライマリカラー" },
  { key: "secondary" as const, label: "セカンダリカラー" },
  { key: "accent" as const, label: "アクセントカラー" },
  { key: "background" as const, label: "背景カラー" },
]

interface BrandData {
  id: string
  name: string
  logoUrl: string | null
  colors: BrandColors | null
  fontPreference: string | null
  defaultRegister: string
  toneTags: string[] | null
  toneDescription: string | null
  productCatalog: ProductCatalogEntry[] | null
  positioningStatement: string | null
  brandStory: string | null
  targetMarket: string | null
  brandValues: string[] | null
}

export function BrandEditForm({
  brand,
  isAdmin,
}: {
  brand: BrandData
  isAdmin: boolean
}) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Form state
  const [name, setName] = useState(brand.name)
  const [colors, setColors] = useState<BrandColors>(
    brand.colors || { primary: "#333333", secondary: "#555555", accent: "#777777", background: "#FFFFFF" }
  )
  const [fontPreference, setFontPreference] = useState(brand.fontPreference || "noto_sans_jp")
  const [defaultRegister, setDefaultRegister] = useState(brand.defaultRegister)
  const [toneTags, setToneTags] = useState<string[]>(brand.toneTags || [])
  const [toneDescription, setToneDescription] = useState(brand.toneDescription || "")
  const [brandStory, setBrandStory] = useState(brand.brandStory || "")
  const [targetMarket, setTargetMarket] = useState(brand.targetMarket || "")
  const [brandValues, setBrandValues] = useState<string[]>(brand.brandValues || [])
  const [positioningStatement, setPositioningStatement] = useState(brand.positioningStatement || "")
  const [productCatalog, setProductCatalog] = useState<ProductCatalogEntry[]>(brand.productCatalog || [])
  const [newValue, setNewValue] = useState("")

  const toggleTag = (tagId: string) => {
    if (toneTags.includes(tagId)) {
      setToneTags(toneTags.filter((t) => t !== tagId))
    } else {
      setToneTags([...toneTags, tagId])
    }
  }

  const handleSave = async () => {
    if (!name.trim()) return
    setIsSaving(true)

    try {
      const response = await fetch(`/api/brands/${brand.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          colors,
          fontPreference,
          defaultRegister,
          toneTags,
          toneDescription: toneDescription || null,
          brandStory: brandStory || null,
          targetMarket: targetMarket || null,
          brandValues,
          positioningStatement: positioningStatement || null,
          productCatalog,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to save")
      }

      router.refresh()
    } catch (error) {
      console.error("Save failed:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/brands/${brand.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete")
      }

      router.push("/brands")
    } catch (error) {
      console.error("Delete failed:", error)
      setShowDeleteConfirm(false)
    } finally {
      setIsDeleting(false)
    }
  }

  const addProduct = () => {
    setProductCatalog([
      ...productCatalog,
      { name: "", description: "", keyFeatures: [], priceRange: "", targetSegment: "" },
    ])
  }

  const updateProduct = (index: number, updated: ProductCatalogEntry) => {
    setProductCatalog(productCatalog.map((p, i) => (i === index ? updated : p)))
  }

  const removeProduct = (index: number) => {
    setProductCatalog(productCatalog.filter((_, i) => i !== index))
  }

  const handleAddValue = () => {
    const trimmed = newValue.trim()
    if (trimmed && !brandValues.includes(trimmed)) {
      setBrandValues([...brandValues, trimmed])
      setNewValue("")
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-text-primary">{brand.name}</h1>
        {brand.logoUrl && (
          <div className="h-12 w-12 overflow-hidden rounded-md bg-bg-surface">
            <img src={brand.logoUrl} alt={brand.name} className="h-full w-full object-contain p-1" />
          </div>
        )}
      </div>

      {/* Brand Name */}
      <div className="space-y-2">
        <Label className="text-sm font-bold text-text-primary">ブランド名</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border-border bg-bg-card text-text-primary"
        />
      </div>

      {/* Colors */}
      <div className="space-y-3">
        <Label className="text-sm font-bold text-text-primary">ブランドカラー</Label>
        <div className="grid grid-cols-2 gap-4">
          {COLOR_SLOTS.map((slot) => (
            <div key={slot.key} className="flex items-center gap-3 rounded-lg border border-border bg-bg-card p-3">
              <div className="relative">
                <div
                  className="h-8 w-8 rounded-md border border-border"
                  style={{ backgroundColor: colors[slot.key] }}
                />
                <input
                  type="color"
                  value={colors[slot.key]}
                  onChange={(e) => setColors({ ...colors, [slot.key]: e.target.value })}
                  className="absolute inset-0 h-8 w-8 cursor-pointer opacity-0"
                />
              </div>
              <div className="flex-1">
                <span className="text-xs text-text-secondary">{slot.label}</span>
                <Input
                  value={colors[slot.key]}
                  onChange={(e) => {
                    if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) {
                      setColors({ ...colors, [slot.key]: e.target.value })
                    }
                  }}
                  className="mt-1 h-7 border-0 bg-transparent p-0 font-mono text-xs text-text-primary"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <Separator className="bg-border" />

      {/* Font */}
      <div className="space-y-3">
        <Label className="text-sm font-bold text-text-primary">フォント</Label>
        <div className="grid grid-cols-2 gap-2">
          {JAPANESE_FONTS.map((font) => (
            <button
              key={font.id}
              onClick={() => setFontPreference(font.id)}
              className={`rounded-lg border p-3 text-left transition-all duration-200 ${
                fontPreference === font.id
                  ? "border-vermillion bg-vermillion-subtle"
                  : "border-border bg-bg-card hover:border-text-muted"
              }`}
            >
              <span className="text-sm text-text-primary">{font.nameJa}</span>
            </button>
          ))}
        </div>
      </div>

      <Separator className="bg-border" />

      {/* Keigo */}
      <div className="space-y-3">
        <Label className="text-sm font-bold text-text-primary">敬語レベル</Label>
        <div className="flex gap-3">
          {REGISTER_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setDefaultRegister(opt.id)}
              className={`flex-1 rounded-lg border p-3 text-center transition-all duration-200 ${
                defaultRegister === opt.id
                  ? "border-vermillion bg-vermillion-subtle"
                  : "border-border bg-bg-card hover:border-text-muted"
              }`}
            >
              <span className="text-sm font-bold text-text-primary">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      <Separator className="bg-border" />

      {/* Tone Tags */}
      <div className="space-y-3">
        <Label className="text-sm font-bold text-text-primary">トーンタグ</Label>
        <div className="flex flex-wrap gap-2">
          {TONE_TAGS.map((tag) => {
            const isSelected = toneTags.includes(tag.id)
            return (
              <button
                key={tag.id}
                onClick={() => toggleTag(tag.id)}
                className={`rounded-pill px-3 py-1.5 text-sm transition-all duration-200 ${
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

      {/* Tone Description */}
      <div className="space-y-2">
        <Label className="text-sm font-bold text-text-primary">トーン詳細</Label>
        <Textarea
          value={toneDescription}
          onChange={(e) => setToneDescription(e.target.value)}
          placeholder="ブランドのトーンや雰囲気を自由に記述してください"
          rows={3}
          className="border-border bg-bg-card text-text-primary placeholder:text-text-muted resize-none"
        />
      </div>

      <Separator className="bg-border" />

      {/* Brand Story */}
      <div className="space-y-2">
        <Label className="text-sm font-bold text-text-primary">ブランドストーリー</Label>
        <Textarea
          value={brandStory}
          onChange={(e) => setBrandStory(e.target.value)}
          placeholder="ブランドの物語や背景を記述してください"
          rows={3}
          className="border-border bg-bg-card text-text-primary placeholder:text-text-muted resize-none"
        />
      </div>

      {/* Target Market */}
      <div className="space-y-2">
        <Label className="text-sm font-bold text-text-primary">ターゲット市場</Label>
        <Textarea
          value={targetMarket}
          onChange={(e) => setTargetMarket(e.target.value)}
          placeholder="ターゲットとなる市場や顧客層を記述してください"
          rows={2}
          className="border-border bg-bg-card text-text-primary placeholder:text-text-muted resize-none"
        />
      </div>

      {/* Brand Values */}
      <div className="space-y-2">
        <Label className="text-sm font-bold text-text-primary">ブランドバリュー</Label>
        <div className="flex gap-2">
          <Input
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                handleAddValue()
              }
            }}
            placeholder="価値観を入力してエンターキーで追加"
            className="flex-1 border-border bg-bg-card text-text-primary placeholder:text-text-muted"
          />
          <Button variant="secondary" onClick={handleAddValue} disabled={!newValue.trim()}>
            追加
          </Button>
        </div>
        {brandValues.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {brandValues.map((v, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-pill bg-bg-surface px-3 py-1 text-sm text-text-secondary"
              >
                {v}
                <button onClick={() => setBrandValues(brandValues.filter((_, j) => j !== i))} className="ml-1 text-text-muted hover:text-text-primary">
                  &times;
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <Separator className="bg-border" />

      {/* Positioning */}
      <div className="space-y-2">
        <Label className="text-sm font-bold text-text-primary">ポジショニングステートメント</Label>
        <Textarea
          value={positioningStatement}
          onChange={(e) => setPositioningStatement(e.target.value)}
          placeholder="市場における自社ブランドの独自のポジションを記述してください"
          rows={3}
          className="border-border bg-bg-card text-text-primary placeholder:text-text-muted resize-none"
        />
      </div>

      <Separator className="bg-border" />

      {/* Product Catalog */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-bold text-text-primary">商品カタログ</Label>
          <Button variant="secondary" size="sm" onClick={addProduct}>
            商品を追加
          </Button>
        </div>

        {productCatalog.map((product, index) => (
          <div key={index} className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-text-primary">商品 {index + 1}</span>
              <Button variant="ghost" size="sm" onClick={() => removeProduct(index)} className="text-text-muted hover:text-error">
                <Trash2 className="mr-1 h-4 w-4" />
                削除
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-text-secondary">商品名</Label>
                <Input
                  value={product.name}
                  onChange={(e) => updateProduct(index, { ...product, name: e.target.value })}
                  className="border-border bg-bg-surface text-text-primary text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-text-secondary">価格帯</Label>
                <Input
                  value={product.priceRange}
                  onChange={(e) => updateProduct(index, { ...product, priceRange: e.target.value })}
                  className="border-border bg-bg-surface text-text-primary text-sm"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-text-secondary">商品説明</Label>
              <Textarea
                value={product.description}
                onChange={(e) => updateProduct(index, { ...product, description: e.target.value })}
                rows={2}
                className="border-border bg-bg-surface text-text-primary text-sm resize-none"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-text-secondary">主な特徴（カンマ区切り）</Label>
              <Input
                value={product.keyFeatures.join(", ")}
                onChange={(e) =>
                  updateProduct(index, {
                    ...product,
                    keyFeatures: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                  })
                }
                className="border-border bg-bg-surface text-text-primary text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-text-secondary">ターゲットセグメント</Label>
              <Input
                value={product.targetSegment}
                onChange={(e) => updateProduct(index, { ...product, targetSegment: e.target.value })}
                className="border-border bg-bg-surface text-text-primary text-sm"
              />
            </div>
          </div>
        ))}
      </div>

      <Separator className="bg-border" />

      {/* Actions */}
      <div className="flex items-center justify-between pb-8">
        {isAdmin && (
          <div>
            {showDeleteConfirm ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-error">本当に削除しますか？</span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? "削除中..." : "削除する"}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  キャンセル
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-text-muted hover:text-error"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                ブランドを削除
              </Button>
            )}
          </div>
        )}

        <Button
          onClick={handleSave}
          disabled={isSaving || !name.trim()}
          className="ml-auto bg-vermillion text-text-inverse hover:bg-vermillion-hover"
        >
          {isSaving ? "保存中..." : "保存"}
        </Button>
      </div>
    </div>
  )
}
