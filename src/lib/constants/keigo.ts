export interface KeigoRegisterDefinition {
  id: "casual" | "standard" | "formal"
  nameJa: string
  descriptionJa: string
  exampleText: string
  verbEndings: string[]
}

export const KEIGO_REGISTERS: KeigoRegisterDefinition[] = [
  {
    id: "casual",
    nameJa: "カジュアル",
    descriptionJa: "親しみやすい、タメ口スタイル",
    exampleText:
      "この春の新作、めっちゃ可愛いから絶対チェックしてみて！今だけ限定カラーもあるよ。",
    verbEndings: ["だ", "よ", "ね", "な", "ぜ", "じゃん", "って", "てみて"],
  },
  {
    id: "standard",
    nameJa: "標準",
    descriptionJa: "丁寧語、です/ます形",
    exampleText:
      "この春の新作コレクションをぜひご覧ください。限定カラーもご用意しています。",
    verbEndings: ["です", "ます", "ください", "ません", "でした", "ました"],
  },
  {
    id: "formal",
    nameJa: "敬語",
    descriptionJa: "尊敬語・謙譲語、格式高い表現",
    exampleText:
      "春の新作コレクションのご案内を申し上げます。限定カラーもご用意いたしております。ぜひご高覧くださいませ。",
    verbEndings: [
      "ございます",
      "いたします",
      "申し上げます",
      "くださいませ",
      "いただけます",
      "存じます",
    ],
  },
] as const

/**
 * Get a keigo register definition by ID.
 */
export function getRegisterById(
  id: string
): KeigoRegisterDefinition | undefined {
  return KEIGO_REGISTERS.find((r) => r.id === id)
}

/**
 * Get all register IDs.
 */
export function getRegisterIds(): string[] {
  return KEIGO_REGISTERS.map((r) => r.id)
}
