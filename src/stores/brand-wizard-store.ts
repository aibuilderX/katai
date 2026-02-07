"use client"

import { create } from "zustand"
import type { BrandColors, ProductCatalogEntry } from "@/types/brand"

export interface BrandWizardState {
  // Navigation
  currentStep: number
  totalSteps: number

  // Step 0: Logo + Brand Name
  brandName: string
  logoFile: File | null
  logoPreviewUrl: string | null
  extractedColors: { hex: string; area: number }[]

  // Step 1: Brand Colors
  selectedColors: BrandColors

  // Step 2: Font Selection
  fontPreference: string

  // Step 3: Keigo Register
  defaultRegister: "casual" | "standard" | "formal"

  // Step 4: Tone
  toneTags: string[]
  toneDescription: string

  // Step 5: Product Info
  brandStory: string
  productCatalog: ProductCatalogEntry[]
  targetMarket: string
  brandValues: string[]

  // Step 6: Positioning
  positioningStatement: string

  // Logo URL from Supabase Storage
  logoUrl: string | null

  // Actions
  setStep: (step: number) => void
  nextStep: () => void
  prevStep: () => void
  setField: <K extends keyof BrandWizardState>(
    key: K,
    value: BrandWizardState[K]
  ) => void
  resetWizard: () => void
  setExtractedColors: (colors: { hex: string; area: number }[]) => void
  addProduct: () => void
  removeProduct: (index: number) => void
  updateProduct: (index: number, product: ProductCatalogEntry) => void
  addBrandValue: (value: string) => void
  removeBrandValue: (index: number) => void
}

const defaultColors: BrandColors = {
  primary: "#333333",
  secondary: "#555555",
  accent: "#777777",
  background: "#FFFFFF",
}

const emptyProduct: ProductCatalogEntry = {
  name: "",
  description: "",
  keyFeatures: [],
  priceRange: "",
  targetSegment: "",
}

export const useBrandWizardStore = create<BrandWizardState>((set) => ({
  // Navigation
  currentStep: 0,
  totalSteps: 7,

  // Step 0
  brandName: "",
  logoFile: null,
  logoPreviewUrl: null,
  extractedColors: [],

  // Step 1
  selectedColors: { ...defaultColors },

  // Step 2
  fontPreference: "noto_sans_jp",

  // Step 3
  defaultRegister: "standard",

  // Step 4
  toneTags: [],
  toneDescription: "",

  // Step 5
  brandStory: "",
  productCatalog: [],
  targetMarket: "",
  brandValues: [],

  // Step 6
  positioningStatement: "",

  // Logo URL
  logoUrl: null,

  // Actions
  setStep: (step) => set({ currentStep: step }),
  nextStep: () =>
    set((state) => ({
      currentStep: Math.min(state.currentStep + 1, state.totalSteps - 1),
    })),
  prevStep: () =>
    set((state) => ({
      currentStep: Math.max(state.currentStep - 1, 0),
    })),
  setField: (key, value) => set({ [key]: value }),
  resetWizard: () =>
    set({
      currentStep: 0,
      brandName: "",
      logoFile: null,
      logoPreviewUrl: null,
      extractedColors: [],
      selectedColors: { ...defaultColors },
      fontPreference: "noto_sans_jp",
      defaultRegister: "standard",
      toneTags: [],
      toneDescription: "",
      brandStory: "",
      productCatalog: [],
      targetMarket: "",
      brandValues: [],
      positioningStatement: "",
      logoUrl: null,
    }),
  setExtractedColors: (colors) =>
    set((state) => {
      const newColors: BrandColors = {
        primary: colors[0]?.hex || state.selectedColors.primary,
        secondary: colors[1]?.hex || state.selectedColors.secondary,
        accent: colors[2]?.hex || state.selectedColors.accent,
        background: colors[3]?.hex || state.selectedColors.background,
      }
      return { extractedColors: colors, selectedColors: newColors }
    }),
  addProduct: () =>
    set((state) => ({
      productCatalog: [...state.productCatalog, { ...emptyProduct }],
    })),
  removeProduct: (index) =>
    set((state) => ({
      productCatalog: state.productCatalog.filter((_, i) => i !== index),
    })),
  updateProduct: (index, product) =>
    set((state) => ({
      productCatalog: state.productCatalog.map((p, i) =>
        i === index ? product : p
      ),
    })),
  addBrandValue: (value) =>
    set((state) => ({
      brandValues: [...state.brandValues, value],
    })),
  removeBrandValue: (index) =>
    set((state) => ({
      brandValues: state.brandValues.filter((_, i) => i !== index),
    })),
}))
