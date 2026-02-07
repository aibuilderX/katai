/**
 * Brand color palette extracted from logo or manually set.
 */
export interface BrandColors {
  primary: string
  secondary: string
  accent: string
  background: string
}

/**
 * Product catalog entry within a brand profile.
 * Brand-level product information injected into every generation prompt.
 */
export interface ProductCatalogEntry {
  name: string
  description: string
  keyFeatures: string[]
  priceRange: string
  targetSegment: string
}

/**
 * Keigo register options for copy generation.
 */
export type KeigoRegister = "casual" | "standard" | "formal"

/**
 * Brand profile data shape for the wizard and display.
 */
export interface BrandProfileData {
  name: string
  logoUrl?: string
  colors?: BrandColors
  fontPreference: string
  defaultRegister: KeigoRegister
  toneTags: string[]
  toneDescription?: string
  productCatalog?: ProductCatalogEntry[]
  positioningStatement?: string
  brandStory?: string
  targetMarket?: string
  brandValues?: string[]
}
