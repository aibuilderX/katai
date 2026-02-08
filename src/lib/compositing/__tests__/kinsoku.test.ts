import { describe, it, expect } from "vitest"
import { breakJapaneseText, estimateTextWidth } from "../kinsoku"
import {
  KINSOKU_NOT_AT_LINE_START,
  KINSOKU_NOT_AT_LINE_END,
} from "@/lib/constants/kinsoku-chars"

describe("breakJapaneseText", () => {
  // -----------------------------------------------------------------------
  // Basic segmentation
  // -----------------------------------------------------------------------

  describe("basic segmentation", () => {
    it("returns a single line when text fits within maxWidth", () => {
      // "新春セールスタート" = 9 chars, at 40px each = 360px, fits in 400px
      const result = breakJapaneseText("新春セールスタート", 400, 40)
      expect(result.lines).toHaveLength(1)
      expect(result.lines[0]).toBe("新春セールスタート")
      expect(result.orientation).toBe("horizontal")
    })

    it("breaks long text into multiple lines", () => {
      // "新春セール開催中！今だけの特別価格でお買い求めいただけます"
      // At 400px width and 40px font, ~10 chars per line
      const result = breakJapaneseText(
        "新春セール開催中！今だけの特別価格でお買い求めいただけます",
        400,
        40
      )
      expect(result.lines.length).toBeGreaterThan(1)
      // All text must be preserved
      expect(result.lines.join("")).toBe(
        "新春セール開催中！今だけの特別価格でお買い求めいただけます"
      )
    })
  })

  // -----------------------------------------------------------------------
  // Kinsoku: line-start prohibition
  // -----------------------------------------------------------------------

  describe("kinsoku line-start prohibition", () => {
    it("does not place a period at the start of a line", () => {
      // Force a scenario where a period could end up at line start
      // "商品の紹介です。詳細はこちら" with narrow width
      const result = breakJapaneseText("商品の紹介です。詳細はこちら", 200, 40)
      // Check that no line starts with a character from KINSOKU_NOT_AT_LINE_START
      for (let i = 1; i < result.lines.length; i++) {
        const firstChar = result.lines[i][0]
        expect(
          KINSOKU_NOT_AT_LINE_START.has(firstChar),
          `Line ${i + 1} starts with prohibited character "${firstChar}": "${result.lines[i]}"`
        ).toBe(false)
      }
      // All text must be preserved
      expect(result.lines.join("")).toBe("商品の紹介です。詳細はこちら")
    })

    it("does not place an exclamation mark at the start of a line", () => {
      // "セール開催中！お見逃しなく" with narrow width
      const result = breakJapaneseText("セール開催中！お見逃しなく", 200, 40)
      for (let i = 1; i < result.lines.length; i++) {
        const firstChar = result.lines[i][0]
        expect(
          KINSOKU_NOT_AT_LINE_START.has(firstChar),
          `Line ${i + 1} starts with prohibited character "${firstChar}": "${result.lines[i]}"`
        ).toBe(false)
      }
      expect(result.lines.join("")).toBe("セール開催中！お見逃しなく")
    })
  })

  // -----------------------------------------------------------------------
  // Kinsoku: line-end prohibition
  // -----------------------------------------------------------------------

  describe("kinsoku line-end prohibition", () => {
    it("does not place an opening bracket at the end of a line", () => {
      // "今すぐ（期間限定）購入" with narrow width
      const result = breakJapaneseText("今すぐ（期間限定）購入", 200, 40)
      for (let i = 0; i < result.lines.length - 1; i++) {
        const line = result.lines[i]
        const lastChar = line[line.length - 1]
        expect(
          KINSOKU_NOT_AT_LINE_END.has(lastChar),
          `Line ${i + 1} ends with prohibited character "${lastChar}": "${line}"`
        ).toBe(false)
      }
      expect(result.lines.join("")).toBe("今すぐ（期間限定）購入")
    })
  })

  // -----------------------------------------------------------------------
  // Kinsoku: small kana
  // -----------------------------------------------------------------------

  describe("kinsoku small kana", () => {
    it("does not place small katakana at the start of a line", () => {
      // "チャンス" contains ャ (small katakana ya)
      // Use very narrow width to force a break within the word
      const result = breakJapaneseText("チャンス", 80, 40)
      for (let i = 1; i < result.lines.length; i++) {
        const firstChar = result.lines[i][0]
        expect(
          KINSOKU_NOT_AT_LINE_START.has(firstChar),
          `Line ${i + 1} starts with prohibited small kana "${firstChar}": "${result.lines[i]}"`
        ).toBe(false)
      }
      expect(result.lines.join("")).toBe("チャンス")
    })
  })

  // -----------------------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------------------

  describe("edge cases", () => {
    it("returns empty lines array for empty string", () => {
      const result = breakJapaneseText("", 400, 40)
      expect(result.lines).toEqual([])
      expect(result.orientation).toBe("horizontal")
    })

    it("handles a single character", () => {
      const result = breakJapaneseText("X", 400, 40)
      expect(result.lines).toEqual(["X"])
      expect(result.orientation).toBe("horizontal")
    })

    it("returns single line when text is shorter than maxWidth", () => {
      const result = breakJapaneseText("短い", 400, 40)
      expect(result.lines).toHaveLength(1)
      expect(result.lines[0]).toBe("短い")
    })

    it("handles very narrow width without infinite loops", () => {
      // Width less than 6 chars -- kinsoku may allow minor violations
      // but must never loop infinitely
      const result = breakJapaneseText("テスト文字列です。終了", 100, 40)
      expect(result.lines.length).toBeGreaterThan(0)
      expect(result.lines.join("")).toBe("テスト文字列です。終了")
    })
  })

  // -----------------------------------------------------------------------
  // Orientation passthrough
  // -----------------------------------------------------------------------

  describe("orientation passthrough", () => {
    it("defaults to horizontal orientation", () => {
      const result = breakJapaneseText("テスト", 400, 40)
      expect(result.orientation).toBe("horizontal")
    })

    it("passes through vertical orientation without affecting line-breaking", () => {
      const result = breakJapaneseText("テスト", 400, 40, "vertical")
      expect(result.orientation).toBe("vertical")
      expect(result.lines).toEqual(["テスト"])
    })
  })

  // -----------------------------------------------------------------------
  // Comprehensive kinsoku validation across all outputs
  // -----------------------------------------------------------------------

  describe("comprehensive kinsoku validation", () => {
    const testCases = [
      { text: "最大50%OFFセール開催中！", width: 200, size: 40 },
      { text: "新商品「プレミアム」登場！お見逃しなく", width: 240, size: 40 },
      { text: "今なら￥1,000OFF！詳しくはこちら", width: 200, size: 40 },
      { text: "春の新生活応援キャンペーン実施中です。詳細はウェブサイトをご覧ください", width: 320, size: 40 },
    ]

    testCases.forEach(({ text, width, size }) => {
      it(`enforces kinsoku for: "${text.slice(0, 20)}..."`, () => {
        const result = breakJapaneseText(text, width, size)

        // All text must be preserved
        expect(result.lines.join("")).toBe(text)

        // Check line-start prohibitions (all lines except first)
        for (let i = 1; i < result.lines.length; i++) {
          const firstChar = result.lines[i][0]
          expect(
            KINSOKU_NOT_AT_LINE_START.has(firstChar),
            `Line ${i + 1} starts with prohibited "${firstChar}" in "${result.lines[i]}"`
          ).toBe(false)
        }

        // Check line-end prohibitions (all lines except last)
        for (let i = 0; i < result.lines.length - 1; i++) {
          const line = result.lines[i]
          const lastChar = line[line.length - 1]
          expect(
            KINSOKU_NOT_AT_LINE_END.has(lastChar),
            `Line ${i + 1} ends with prohibited "${lastChar}" in "${line}"`
          ).toBe(false)
        }
      })
    })
  })
})

// ---------------------------------------------------------------------------
// estimateTextWidth
// ---------------------------------------------------------------------------

describe("estimateTextWidth", () => {
  it("estimates CJK characters as 1em wide", () => {
    // 3 CJK chars at 40px = 120px
    const width = estimateTextWidth("テスト", 40)
    expect(width).toBe(120)
  })

  it("estimates ASCII characters as 0.5em wide", () => {
    // 4 ASCII chars at 40px = 80px
    const width = estimateTextWidth("test", 40)
    expect(width).toBe(80)
  })

  it("handles mixed CJK and ASCII", () => {
    // "ABテスト" = 2 ASCII (2*20=40) + 3 CJK (3*40=120) = 160
    const width = estimateTextWidth("ABテスト", 40)
    expect(width).toBe(160)
  })

  it("returns 0 for empty string", () => {
    expect(estimateTextWidth("", 40)).toBe(0)
  })
})
