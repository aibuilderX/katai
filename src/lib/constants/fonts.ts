export interface JapaneseFontDefinition {
  id: string
  nameJa: string
  nameEn: string
  category: "gothic" | "mincho" | "rounded"
  googleFontsId: string
}

/**
 * Curated list of pre-approved Japanese-safe fonts.
 * All are available via Google Fonts and are open source.
 * No custom font upload in Phase 1.
 */
export const JAPANESE_FONTS: JapaneseFontDefinition[] = [
  {
    id: "noto_sans_jp",
    nameJa: "Noto Sans JP",
    nameEn: "Noto Sans JP",
    category: "gothic",
    googleFontsId: "Noto+Sans+JP",
  },
  {
    id: "noto_serif_jp",
    nameJa: "Noto Serif JP",
    nameEn: "Noto Serif JP",
    category: "mincho",
    googleFontsId: "Noto+Serif+JP",
  },
  {
    id: "m_plus_rounded_1c",
    nameJa: "M PLUS Rounded 1c",
    nameEn: "M PLUS Rounded 1c",
    category: "rounded",
    googleFontsId: "M+PLUS+Rounded+1c",
  },
  {
    id: "m_plus_1p",
    nameJa: "M PLUS 1p",
    nameEn: "M PLUS 1p",
    category: "gothic",
    googleFontsId: "M+PLUS+1p",
  },
  {
    id: "sawarabi_gothic",
    nameJa: "さわらびゴシック",
    nameEn: "Sawarabi Gothic",
    category: "gothic",
    googleFontsId: "Sawarabi+Gothic",
  },
  {
    id: "sawarabi_mincho",
    nameJa: "さわらび明朝",
    nameEn: "Sawarabi Mincho",
    category: "mincho",
    googleFontsId: "Sawarabi+Mincho",
  },
  {
    id: "kosugi_maru",
    nameJa: "小杉丸ゴシック",
    nameEn: "Kosugi Maru",
    category: "rounded",
    googleFontsId: "Kosugi+Maru",
  },
] as const

/**
 * Get a font definition by ID.
 */
export function getFontById(id: string): JapaneseFontDefinition | undefined {
  return JAPANESE_FONTS.find((f) => f.id === id)
}

/**
 * Get fonts by category.
 */
export function getFontsByCategory(
  category: "gothic" | "mincho" | "rounded"
): JapaneseFontDefinition[] {
  return JAPANESE_FONTS.filter((f) => f.category === category)
}
