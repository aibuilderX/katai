/**
 * JIS X 4051 Kinsoku Shori Character Sets
 *
 * Kinsoku shori (禁則処理) defines line-breaking rules for Japanese typesetting.
 * These character sets specify which characters are prohibited from appearing
 * at the start or end of a line, per the JIS X 4051 standard.
 *
 * Used by the kinsoku line-breaking engine (src/lib/compositing/kinsoku.ts)
 * to enforce professional-quality Japanese typography in composited ad creatives.
 */

/**
 * Characters that must NOT appear at the start of a line (行頭禁則文字).
 *
 * Includes: closing brackets, periods/commas, question/exclamation marks,
 * small kana, iteration marks, prolonged sound mark, percent/degree symbols.
 */
export const KINSOKU_NOT_AT_LINE_START = new Set<string>([
  // Closing brackets (閉じ括弧類)
  "\uFF09", // ）fullwidth right parenthesis
  "\u3015", // 〕 right tortoise shell bracket
  "\u3009", // 〉 right angle bracket
  "\u300B", // 》 right double angle bracket
  "\u300D", // 」 right corner bracket
  "\u300F", // 』 right white corner bracket
  "\u3011", // 】 right black lenticular bracket
  "\u3017", // 〗 right white lenticular bracket
  "\u301F", // 〟 low double prime quotation mark
  ")",      // right parenthesis
  "]",      // right square bracket
  "}",      // right curly bracket
  ">",      // greater-than sign (as closing bracket)

  // Periods and commas (句読点)
  "\u3002", // 。 ideographic full stop
  "\uFF0E", // ． fullwidth full stop
  "\u3001", // 、 ideographic comma
  "\uFF0C", // ， fullwidth comma
  ".",      // full stop
  ",",      // comma

  // Question and exclamation marks
  "\uFF1A", // ： fullwidth colon
  "\uFF1B", // ； fullwidth semicolon
  "\uFF1F", // ？ fullwidth question mark
  "\uFF01", // ！ fullwidth exclamation mark
  ":",      // colon
  ";",      // semicolon
  "?",      // question mark
  "!",      // exclamation mark

  // Small kana (捨て仮名 / 小書き仮名)
  "\u30FC", // ー prolonged sound mark (katakana-hiragana)
  "\u3041", // ぁ small hiragana a
  "\u3043", // ぃ small hiragana i
  "\u3045", // ぅ small hiragana u
  "\u3047", // ぇ small hiragana e
  "\u3049", // ぉ small hiragana o
  "\u3063", // っ small hiragana tsu
  "\u3083", // ゃ small hiragana ya
  "\u3085", // ゅ small hiragana yu
  "\u3087", // ょ small hiragana yo
  "\u308E", // ゎ small hiragana wa
  "\u30A1", // ァ small katakana a
  "\u30A3", // ィ small katakana i
  "\u30A5", // ゥ small katakana u
  "\u30A7", // ェ small katakana e
  "\u30A9", // ォ small katakana o
  "\u30C3", // ッ small katakana tsu
  "\u30E3", // ャ small katakana ya
  "\u30E5", // ュ small katakana yu
  "\u30E7", // ョ small katakana yo
  "\u30EE", // ヮ small katakana wa
  "\u30F5", // ヵ small katakana ka
  "\u30F6", // ヶ small katakana ke

  // Iteration marks (繰り返し記号)
  "\u3005", // 々 ideographic iteration mark
  "\u303B", // 〻 vertical ideographic iteration mark
  "\u30FD", // ヽ katakana iteration mark
  "\u30FE", // ヾ katakana voiced iteration mark
  "\u309D", // ゝ hiragana iteration mark
  "\u309E", // ゞ hiragana voiced iteration mark

  // Percentage, degree, and similar
  "%",      // percent sign
  "\uFF05", // ％ fullwidth percent sign
  "\u00B0", // ° degree sign
  "\u2103", // ℃ degree celsius
])

/**
 * Characters that must NOT appear at the end of a line (行末禁則文字).
 *
 * Includes: opening brackets and currency symbols.
 */
export const KINSOKU_NOT_AT_LINE_END = new Set<string>([
  // Opening brackets (開き括弧類)
  "\uFF08", // （ fullwidth left parenthesis
  "\u3014", // 〔 left tortoise shell bracket
  "\u3008", // 〈 left angle bracket
  "\u300A", // 《 left double angle bracket
  "\u300C", // 「 left corner bracket
  "\u300E", // 『 left white corner bracket
  "\u3010", // 【 left black lenticular bracket
  "\u3016", // 〖 left white lenticular bracket
  "\u301D", // 〝 reversed double prime quotation mark
  "(",      // left parenthesis
  "[",      // left square bracket
  "{",      // left curly bracket
  "<",      // less-than sign (as opening bracket)

  // Currency symbols (通貨記号)
  "\u00A5", // ¥ yen sign
  "\uFFE5", // ￥ fullwidth yen sign
  "$",      // dollar sign
  "\uFF04", // ＄ fullwidth dollar sign
  "\u00A3", // £ pound sign
  "\uFFE1", // ￡ fullwidth pound sign
])
