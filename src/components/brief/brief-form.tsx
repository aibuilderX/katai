"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { PlatformGrid } from "./platform-grid"
import { KeigoOverride } from "./keigo-override"
import { CreativeDirection } from "./creative-direction"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

const OBJECTIVES = [
  { value: "awareness", label: "認知拡大" },
  { value: "conversion", label: "コンバージョン" },
  { value: "engagement", label: "エンゲージメント" },
  { value: "branding", label: "ブランディング" },
  { value: "promotion", label: "プロモーション" },
  { value: "new_product", label: "新商品発売" },
] as const

interface BrandOption {
  id: string
  name: string
  defaultRegister: string
}

export interface BriefFormInitialValues {
  objective?: string
  targetAudience?: string
  platforms?: string[]
  registerOverride?: string
  creativeMoodTags?: string[]
  creativeDirection?: string
  campaignName?: string
  brandProfileId?: string
  parentCampaignId?: string
}

interface BriefFormProps {
  initialValues?: BriefFormInitialValues
}

export function BriefForm({ initialValues }: BriefFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [brands, setBrands] = useState<BrandOption[]>([])
  const [brandsLoading, setBrandsLoading] = useState(true)

  // Form state -- initialized from template/clone defaults if provided
  const [brandProfileId, setBrandProfileId] = useState(initialValues?.brandProfileId || "")
  const [campaignName, setCampaignName] = useState(initialValues?.campaignName || "")
  const [objective, setObjective] = useState(initialValues?.objective || "")
  const [targetAudience, setTargetAudience] = useState(initialValues?.targetAudience || "")
  const [platforms, setPlatforms] = useState<string[]>(initialValues?.platforms || [])
  const [registerOverride, setRegisterOverride] = useState(initialValues?.registerOverride || "")
  const [moodTags, setMoodTags] = useState<string[]>(initialValues?.creativeMoodTags || [])
  const [creativeDirection, setCreativeDirection] = useState(initialValues?.creativeDirection || "")
  const [referenceImageUrl, setReferenceImageUrl] = useState<
    string | undefined
  >()
  const [campaignProductInfo, setCampaignProductInfo] = useState("")
  const [parentCampaignId] = useState(initialValues?.parentCampaignId || "")

  // Fetch user's brands
  useEffect(() => {
    async function fetchBrands() {
      try {
        const response = await fetch("/api/brands")
        if (response.ok) {
          const data = await response.json()
          setBrands(data.brands || [])
          // Auto-select if only 1 brand
          if (data.brands?.length === 1) {
            setBrandProfileId(data.brands[0].id)
            setRegisterOverride(data.brands[0].defaultRegister)
          }
        }
      } catch {
        // Failed to fetch brands
      } finally {
        setBrandsLoading(false)
      }
    }
    fetchBrands()
  }, [])

  // Update register when brand changes
  useEffect(() => {
    const selectedBrand = brands.find((b) => b.id === brandProfileId)
    if (selectedBrand && !registerOverride) {
      setRegisterOverride(selectedBrand.defaultRegister)
    }
  }, [brandProfileId, brands, registerOverride])

  const selectedBrandRegister =
    brands.find((b) => b.id === brandProfileId)?.defaultRegister || "standard"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!brandProfileId) {
      toast.error("ブランドを選択してください")
      return
    }
    if (!objective) {
      toast.error("キャンペーン目的を選択してください")
      return
    }
    if (platforms.length === 0) {
      toast.error("少なくとも1つのプラットフォームを選択してください")
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({
          brandProfileId,
          campaignName: campaignName || undefined,
          objective,
          targetAudience,
          platforms,
          registerOverride: registerOverride || undefined,
          creativeMoodTags: moodTags,
          creativeDirection,
          referenceImageUrl,
          campaignProductInfo: campaignProductInfo || undefined,
          parentCampaignId: parentCampaignId || undefined,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "キャンペーンの作成に失敗しました")
      }

      const data = await response.json()
      router.push(`/campaigns/${data.id}`)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "キャンペーンの作成に失敗しました"
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* 1. Brand Selection */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-text-primary">
          ブランド選択 <span className="text-vermillion">*</span>
        </Label>
        {brandsLoading ? (
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            読み込み中...
          </div>
        ) : brands.length === 0 ? (
          <p className="text-sm text-text-muted">
            ブランドが登録されていません。先にブランドを作成してください。
          </p>
        ) : (
          <Select value={brandProfileId} onValueChange={setBrandProfileId}>
            <SelectTrigger className="bg-bg-card text-text-primary">
              <SelectValue placeholder="キャンペーン対象のブランドを選択" />
            </SelectTrigger>
            <SelectContent>
              {brands.map((brand) => (
                <SelectItem key={brand.id} value={brand.id}>
                  {brand.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <Separator className="bg-border-subtle" />

      {/* 2. Campaign Name (optional) */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-text-primary">
          キャンペーン名
          <span className="ml-2 text-xs text-text-muted">（任意）</span>
        </Label>
        <Input
          value={campaignName}
          onChange={(e) => setCampaignName(e.target.value)}
          placeholder="空欄の場合、目的から自動生成されます"
          className="bg-bg-card text-text-primary placeholder:text-text-muted"
        />
      </div>

      <Separator className="bg-border-subtle" />

      {/* 3. Campaign Objective */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-text-primary">
          キャンペーン目的 <span className="text-vermillion">*</span>
        </Label>
        <Select value={objective} onValueChange={setObjective}>
          <SelectTrigger className="bg-bg-card text-text-primary">
            <SelectValue placeholder="目的を選択してください" />
          </SelectTrigger>
          <SelectContent>
            {OBJECTIVES.map((obj) => (
              <SelectItem key={obj.value} value={obj.value}>
                {obj.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator className="bg-border-subtle" />

      {/* 4. Target Audience */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-text-primary">
          ターゲットオーディエンス
        </Label>
        <Textarea
          value={targetAudience}
          onChange={(e) => setTargetAudience(e.target.value)}
          placeholder="ターゲットとなる顧客像を記述してください（例: 20〜30代女性、美容に関心が高い、都市部在住）"
          className="min-h-[80px] resize-none bg-bg-card text-text-primary placeholder:text-text-muted"
        />
      </div>

      <Separator className="bg-border-subtle" />

      {/* 5. Platform Selection */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-text-primary">
          プラットフォーム選択 <span className="text-vermillion">*</span>
        </Label>
        <p className="text-xs text-text-muted">
          アセットを生成するプラットフォームを選択してください
        </p>
        <PlatformGrid selected={platforms} onChange={setPlatforms} />
      </div>

      <Separator className="bg-border-subtle" />

      {/* 6. Keigo Register Override */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-text-primary">
          敬語レベル
        </Label>
        <p className="text-xs text-text-muted">
          ブランドのデフォルト設定を上書きできます
        </p>
        <KeigoOverride
          value={registerOverride || selectedBrandRegister}
          defaultRegister={selectedBrandRegister}
          onChange={setRegisterOverride}
        />
      </div>

      <Separator className="bg-border-subtle" />

      {/* 7. Creative Direction */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-text-primary">
          クリエイティブディレクション
        </Label>
        <CreativeDirection
          moodTags={moodTags}
          direction={creativeDirection}
          referenceImageUrl={referenceImageUrl}
          onMoodTagsChange={setMoodTags}
          onDirectionChange={setCreativeDirection}
          onReferenceImageChange={setReferenceImageUrl}
        />
      </div>

      <Separator className="bg-border-subtle" />

      {/* 8. Campaign Product Info */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-text-primary">
          キャンペーン商品情報
        </Label>
        <Textarea
          value={campaignProductInfo}
          onChange={(e) => setCampaignProductInfo(e.target.value)}
          placeholder="このキャンペーンで訴求する商品・サービスの詳細、季節のコンテキスト、特別オファーなど"
          className="min-h-[100px] resize-none bg-bg-card text-text-primary placeholder:text-text-muted"
        />
      </div>

      <Separator className="bg-border-subtle" />

      {/* Submit */}
      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={loading || brands.length === 0}
          className="bg-vermillion hover:bg-vermillion-hover text-white px-8 py-3 text-base font-bold"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              生成中...
            </>
          ) : (
            "キャンペーンを生成"
          )}
        </Button>
      </div>
    </form>
  )
}
