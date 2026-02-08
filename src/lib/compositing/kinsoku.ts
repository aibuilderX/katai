/**
 * Kinsoku Shori (禁則処理) Line-Breaking Engine
 *
 * Implements Japanese line-breaking rules per JIS X 4051 standard.
 * Uses BudouX for semantic phrase segmentation, then enforces kinsoku
 * character placement rules on top of the phrase boundaries.
 *
 * The algorithm:
 * 1. BudouX segments text into semantic phrases (e.g. "新春セール開催中！" stays together)
 * 2. Phrases are assembled into lines respecting maxWidth / fontSize constraints
 * 3. Kinsoku shori post-processing ensures no prohibited characters at line boundaries
 * 4. Pushforward/pullback cascades are capped at 3 iterations to prevent infinite loops
 */

import { loadDefaultJapaneseParser } from "budoux"
import {
  KINSOKU_NOT_AT_LINE_START,
  KINSOKU_NOT_AT_LINE_END,
} from "@/lib/constants/kinsoku-chars"
import type { LineBreakResult, TextOrientation } from "./types"

// Singleton parser -- loaded once at module level
const parser = loadDefaultJapaneseParser()

/**
 * Estimate the pixel width of a text string based on character type.
 * CJK characters are approximately 1em wide; ASCII characters ~0.5em.
 */
export function estimateTextWidth(text: string, fontSize: number): number {
  let width = 0
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0
    if (isFullWidthChar(code)) {
      width += fontSize
    } else {
      width += fontSize * 0.5
    }
  }
  return width
}

/**
 * Check if a character code point is full-width (CJK, fullwidth forms, etc.).
 */
function isFullWidthChar(code: number): boolean {
  return (
    // CJK Unified Ideographs
    (code >= 0x4e00 && code <= 0x9fff) ||
    // CJK Extension A
    (code >= 0x3400 && code <= 0x4dbf) ||
    // Hiragana
    (code >= 0x3040 && code <= 0x309f) ||
    // Katakana
    (code >= 0x30a0 && code <= 0x30ff) ||
    // Fullwidth forms
    (code >= 0xff00 && code <= 0xffef) ||
    // CJK Symbols and Punctuation
    (code >= 0x3000 && code <= 0x303f) ||
    // CJK Compatibility Ideographs
    (code >= 0xf900 && code <= 0xfaff) ||
    // Halfwidth and Fullwidth Forms (fullwidth part)
    (code >= 0xffe0 && code <= 0xffe6)
  )
}

/**
 * Break Japanese text into lines that respect maxWidth and kinsoku shori rules.
 *
 * @param text - Japanese text to break
 * @param maxWidthPx - Maximum line width in pixels
 * @param fontSize - Font size in pixels (used for width estimation)
 * @param orientation - Text orientation (default: 'horizontal'). Passed through to result.
 * @returns LineBreakResult with broken lines and orientation
 */
export function breakJapaneseText(
  text: string,
  maxWidthPx: number,
  fontSize: number,
  orientation: TextOrientation = "horizontal"
): LineBreakResult {
  // Handle empty input
  if (!text || text.length === 0) {
    return { lines: [], orientation }
  }

  // Step 1: BudouX phrase segmentation
  const phrases = parser.parse(text)

  // Step 2: Assemble lines from phrases
  const lines = assembleLinesFromPhrases(phrases, maxWidthPx, fontSize)

  // Step 3: Apply kinsoku post-processing (max 3 iterations)
  const corrected = resolveKinsoku(lines, maxWidthPx, fontSize)

  return { lines: corrected, orientation }
}

/**
 * Assemble phrases into lines respecting maxWidth.
 * When a single phrase is too long for a line, split it character-by-character.
 */
function assembleLinesFromPhrases(
  phrases: string[],
  maxWidthPx: number,
  fontSize: number
): string[] {
  const lines: string[] = []
  let currentLine = ""

  for (const phrase of phrases) {
    const combinedWidth = estimateTextWidth(currentLine + phrase, fontSize)

    if (combinedWidth <= maxWidthPx) {
      // Phrase fits on current line
      currentLine += phrase
    } else if (currentLine.length === 0) {
      // Phrase is too long for a single line -- split character by character
      const chars = [...phrase]
      for (const char of chars) {
        const lineWithChar = currentLine + char
        if (estimateTextWidth(lineWithChar, fontSize) <= maxWidthPx && currentLine.length > 0) {
          currentLine += char
        } else if (currentLine.length === 0) {
          // First character of a new line always goes on
          currentLine = char
        } else if (estimateTextWidth(lineWithChar, fontSize) <= maxWidthPx) {
          currentLine += char
        } else {
          lines.push(currentLine)
          currentLine = char
        }
      }
    } else {
      // Start a new line with this phrase
      lines.push(currentLine)
      // Check if the phrase itself is too long
      if (estimateTextWidth(phrase, fontSize) > maxWidthPx) {
        // Split the phrase character by character
        currentLine = ""
        const chars = [...phrase]
        for (const char of chars) {
          const lineWithChar = currentLine + char
          if (currentLine.length === 0) {
            currentLine = char
          } else if (estimateTextWidth(lineWithChar, fontSize) <= maxWidthPx) {
            currentLine += char
          } else {
            lines.push(currentLine)
            currentLine = char
          }
        }
      } else {
        currentLine = phrase
      }
    }
  }

  if (currentLine.length > 0) {
    lines.push(currentLine)
  }

  return lines
}

/**
 * Post-processing pass that enforces kinsoku shori rules.
 *
 * For each line boundary:
 * - If the first char of the next line is in KINSOKU_NOT_AT_LINE_START, pull it back
 * - If the last char of the current line is in KINSOKU_NOT_AT_LINE_END, push it forward
 *
 * Max 3 iterations to prevent infinite cascades.
 */
function resolveKinsoku(
  lines: string[],
  _maxWidthPx: number,
  _fontSize: number
): string[] {
  if (lines.length <= 1) return lines

  let result = [...lines]
  const MAX_ITERATIONS = 3

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    let changed = false

    for (let i = 0; i < result.length - 1; i++) {
      const currentLine = result[i]
      const nextLine = result[i + 1]

      if (!currentLine || !nextLine) continue

      const currentChars = [...currentLine]
      const nextChars = [...nextLine]

      // Check line-end prohibition: last char of current line must not be line-end-prohibited
      if (currentChars.length > 0) {
        const lastChar = currentChars[currentChars.length - 1]
        if (KINSOKU_NOT_AT_LINE_END.has(lastChar)) {
          // Pushforward: move last char of current line to start of next line
          currentChars.pop()
          nextChars.unshift(lastChar)
          result[i] = currentChars.join("")
          result[i + 1] = nextChars.join("")
          changed = true
          continue
        }
      }

      // Check line-start prohibition: first char of next line must not be line-start-prohibited
      if (nextChars.length > 0) {
        const firstChar = nextChars[0]
        if (KINSOKU_NOT_AT_LINE_START.has(firstChar)) {
          // Pullback: move first char of next line to end of current line
          nextChars.shift()
          currentChars.push(firstChar)
          result[i] = currentChars.join("")
          result[i + 1] = nextChars.join("")
          changed = true
          continue
        }
      }
    }

    // Remove any empty lines that resulted from corrections
    result = result.filter((line) => line.length > 0)

    if (!changed) break
  }

  return result
}
