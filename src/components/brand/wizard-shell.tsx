"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { useBrandWizardStore } from "@/stores/brand-wizard-store"
import { LogoUploadStep } from "./logo-upload-step"
import { ColorPickerStep } from "./color-picker-step"
import { FontSelectStep } from "./font-select-step"
import { KeigoSelectStep } from "./keigo-select-step"
import { ToneStep } from "./tone-step"
import { ProductInfoStep } from "./product-info-step"
import { PositioningStep } from "./positioning-step"

const STEP_LABELS = [
  "ロゴアップロード",
  "ブランドカラー",
  "フォント選択",
  "敬語レベル",
  "トーン設定",
  "商品情報",
  "ポジショニング",
]

const STEP_DESCRIPTIONS = [
  "ブランドロゴをアップロードし、ブランド名を入力してください",
  "ブランドカラーを設定してください。ロゴから自動抽出された色を編集できます",
  "ブランドに最適なフォントを選択してください",
  "コピー生成で使用するデフォルトの敬語レベルを選択してください",
  "ブランドのトーンや雰囲気を設定してください",
  "ブランドの基本情報と商品カタログを入力してください",
  "市場におけるブランドのポジションを定義してください",
]

const STEP_COMPONENTS = [
  LogoUploadStep,
  ColorPickerStep,
  FontSelectStep,
  KeigoSelectStep,
  ToneStep,
  ProductInfoStep,
  PositioningStep,
]

export function WizardShell() {
  const router = useRouter()
  const { currentStep, totalSteps, setStep, nextStep, prevStep, brandName } =
    useBrandWizardStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isVisible, setIsVisible] = useState(true)

  const progressPercent = ((currentStep + 1) / totalSteps) * 100
  const isLastStep = currentStep === totalSteps - 1
  const isFirstStep = currentStep === 0

  const StepComponent = STEP_COMPONENTS[currentStep]

  // Smooth step transition
  const changeStep = useCallback(
    (direction: "next" | "prev") => {
      setIsVisible(false)
      setTimeout(() => {
        if (direction === "next") {
          nextStep()
        } else {
          prevStep()
        }
        setIsVisible(true)
      }, 200)
    },
    [nextStep, prevStep]
  )

  const handleSave = async () => {
    if (!brandName.trim()) return
    setIsSubmitting(true)

    try {
      const state = useBrandWizardStore.getState()

      const body = {
        name: state.brandName,
        logoUrl: state.logoUrl,
        colors: state.selectedColors,
        fontPreference: state.fontPreference,
        defaultRegister: state.defaultRegister,
        toneTags: state.toneTags,
        toneDescription: state.toneDescription || null,
        productCatalog: state.productCatalog,
        positioningStatement: state.positioningStatement || null,
        brandStory: state.brandStory || null,
        targetMarket: state.targetMarket || null,
        brandValues: state.brandValues,
      }

      const response = await fetch("/api/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        throw new Error("Failed to save brand profile")
      }

      state.resetWizard()
      router.push("/brands")
    } catch (error) {
      console.error("Failed to save brand:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-2 text-2xl font-black text-text-primary">
          ブランドプロフィール設定
        </h1>
        <p className="text-sm text-text-secondary">
          ステップ {currentStep + 1}/{totalSteps}
        </p>
      </div>

      {/* Progress */}
      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-bold text-text-primary">
            {STEP_LABELS[currentStep]}
          </span>
          <span className="text-xs text-text-muted">
            {Math.round(progressPercent)}%
          </span>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      {/* Step Description */}
      <p className="mb-6 text-sm text-text-secondary">
        {STEP_DESCRIPTIONS[currentStep]}
      </p>

      {/* Step Content */}
      <div
        className="min-h-[400px] transition-opacity duration-200 ease-out"
        style={{ opacity: isVisible ? 1 : 0 }}
      >
        <StepComponent />
      </div>

      {/* Navigation */}
      <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
        <Button
          variant="secondary"
          onClick={() => changeStep("prev")}
          disabled={isFirstStep}
          className="min-w-[100px]"
        >
          戻る
        </Button>

        {isLastStep ? (
          <Button
            onClick={handleSave}
            disabled={isSubmitting || !brandName.trim()}
            className="min-w-[100px] bg-vermillion text-text-inverse hover:bg-vermillion-hover"
          >
            {isSubmitting ? "保存中..." : "保存"}
          </Button>
        ) : (
          <Button
            onClick={() => changeStep("next")}
            className="min-w-[100px] bg-vermillion text-text-inverse hover:bg-vermillion-hover"
          >
            次へ
          </Button>
        )}
      </div>
    </div>
  )
}
