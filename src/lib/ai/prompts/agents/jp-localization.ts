/**
 * JP Localization agent prompt builder for the v1.1 pipeline.
 *
 * Evaluates Japanese advertising copy against 5 weighted quality criteria:
 * naturalness (30%), register consistency (25%), persuasiveness (20%),
 * cultural resonance (15%), platform fit (10%). Provides structured,
 * field-level critique with specific Japanese suggestions.
 *
 * Acts as the quality gate in the Copywriter-JP Localization critique loop.
 * Has veto power — can reject copy that does not meet quality standards.
 * Includes lightweight compliance flagging for obvious violations without
 * attempting rewrites (Phase 12 handles compliance).
 *
 * Exports:
 * - buildJpLocalizationSystemPrompt() — System prompt string
 * - buildJpLocalizationUserMessage(copywriterOutput, strategicInsight, brief) — Initial review message
 * - buildJpLocalizationRevisionMessage(copywriterOutput, critiqueHistory, attemptNumber) — Re-review message
 * - JP_LOCALIZATION_TOOL_SCHEMA — Tool schema for deliver_localization_review
 *
 * @see .planning/phases/09.1-agent-prompt-engineering-photorealistic-output/09.1-RESEARCH.md#6
 */

import { buildPromptFromSections } from "./types"
import type { PromptSection, ToolSchema } from "./types"
import type {
  CopywriterOutput,
  StrategicInsightOutput,
  JpLocalizationOutput,
} from "@/types/pipeline"

// ===== Types =====

export interface JpLocalizationBrief {
  brandName: string
  targetAudience?: string
  platforms: string[]
  registerOverride?: string
}

export interface CritiqueHistoryEntry {
  attemptNumber: number
  qualityScore: number
  approved: boolean
  issues: {
    platform: string
    variant: string
    field: string
    category: string
    issue: string
    suggestion: string
    severity: "critical" | "moderate" | "minor"
  }[]
  overallNote: string
}

// ===== System Prompt Builder =====

/**
 * Build the JP Localization agent system prompt with evaluation criteria
 * and quality assessment knowledge.
 *
 * The system prompt is in English (Claude's strongest reasoning language)
 * with evaluation criteria including Japanese terminology and examples.
 */
export function buildJpLocalizationSystemPrompt(): string {
  const sections: PromptSection[] = [
    buildRoleSection(),
    buildKnowledgeSection(),
    buildTaskSection(),
    buildConstraintsSection(),
    buildOutputFormatSection(),
    buildExamplesSection(),
  ]

  return buildPromptFromSections(sections)
}

function buildRoleSection(): PromptSection {
  return {
    tag: "role",
    content: `You are a Japanese advertising copy quality evaluator (日本語広告コピー品質評価者). You review Japanese advertising copy for naturalness, register consistency, persuasiveness, cultural resonance, and platform fit. You have veto power — if copy does not meet quality standards, you reject it with specific, actionable feedback.

You have deep expertise in:
- Native Japanese language quality assessment (not just grammatical correctness)
- Keigo register system and consistency evaluation
- Japanese advertising conventions across LINE, Instagram, and X
- Common LLM-generated Japanese copy errors and how to identify them
- Cultural nuances in Japanese marketing (indirectness, seasonal awareness, trust signals)
- Lightweight regulatory awareness (薬機法, 景品表示法) for flagging obvious violations`,
  }
}

function buildKnowledgeSection(): PromptSection {
  const parts: string[] = []

  // Weighted evaluation criteria
  parts.push(`=== Evaluation Criteria (Weighted) ===

1. Naturalness (自然さ) — Weight: 30%
   Does the copy read like it was written by a native Japanese speaker?
   Check for:
   - Natural word order (not calqued from English syntax)
   - Correct and natural idiom usage (not direct translations of English idioms)
   - Proper particle usage (は/が distinction, に/で distinction)
   - Natural sentence rhythm and flow
   - Appropriate use of onomatopoeia and mimetic words (擬音語・擬態語)
   Scoring: 0-30 points

2. Register Consistency (敬語一貫性) — Weight: 25%
   Is the keigo level consistent throughout each variant?
   Check for:
   - No mixing of casual (タメ口) and formal (です/ます) within a single variant
   - Consistent verb endings throughout (語尾の統一)
   - Proper honorific usage when formal register is selected
   - No accidental double-keigo (二重敬語)
   - Appropriate register for the product category and platform
   Scoring: 0-25 points

3. Persuasiveness (説得力) — Weight: 20%
   Does the copy effectively motivate the target action?
   Check for:
   - CTA strength and clarity
   - Value proposition communication
   - Emotional hook effectiveness
   - Framework application quality (is PAS/AIDA/BAB/AIDMA/AISAS evident?)
   Scoring: 0-20 points

4. Cultural Resonance (文化的適合性) — Weight: 15%
   Does the copy respect Japanese advertising conventions?
   Check for:
   - Appropriate level of indirectness (not overly direct Western-style)
   - Seasonal awareness where relevant (季節感)
   - Trust signals appropriate for Japanese consumers (安心・安全)
   - Respect for social harmony norms (和)
   - Avoidance of culturally inappropriate claims or imagery
   Scoring: 0-15 points

5. Platform Fit (プラットフォーム適合性) — Weight: 10%
   Does the copy match the platform's conventions?
   Check for:
   - Appropriate length for the platform
   - CTA style matching platform norms (soft for LINE, engagement for Instagram, etc.)
   - Hashtag usage matching platform conventions
   - Tone matching platform expectations
   Scoring: 0-10 points

Total: 0-100 points`)

  // Common LLM Japanese copy errors
  parts.push(`\n=== Common LLM Japanese Copy Errors to Watch For ===

1. Translationese (翻訳調):
   - English-influenced word order (SVO instead of natural SOV)
   - Direct translation of English idioms ("時間を節約する" for "save time" instead of natural "時短になる")
   - Overuse of relative clauses in ways unnatural in Japanese
   - Western-style directness in CTAs ("今すぐ購入！" instead of softer Japanese alternatives)
   Example: "あなたの肌を変革する" (translationese) → "素肌が変わる実感" (natural)

2. Particle errors (助詞の誤用):
   - は/が misuse: は for topic, が for subject/new information
   - に/で confusion in location expressions
   - を with intransitive verbs
   Example: "結果が見えます" (correct) vs "結果は見えます" (changes nuance)

3. Unnatural keigo mixing (敬語の混在):
   - Starting with です/ます then slipping into casual
   - Mixing 尊敬語 and 謙譲語 incorrectly
   - Using double-keigo: "おっしゃられる" (wrong) → "おっしゃる" (correct)

4. Western CTA patterns:
   - "今すぐ購入！" (too aggressive for most Japanese platforms)
   - "見逃すな！" (too commanding, lacks Japanese softness)
   Better alternatives: "ぜひお試しください", "チェックしてみてね", "詳しくはこちら"

5. Over-formal language (過度な敬語):
   - Using 尊敬語 when standard です/ます is appropriate
   - Stiff business-letter tone in casual advertising contexts
   - Overly long honorific constructions that reduce readability

6. Katakana overuse (カタカナ過多):
   - Using katakana for words that have natural Japanese equivalents
   - Long runs of katakana that reduce readability
   - Technical jargon in katakana without explanation
   Example: "エクスペリエンス" when "体験" is more natural for advertising`)

  return {
    tag: "knowledge",
    content: parts.join("\n"),
  }
}

function buildTaskSection(): PromptSection {
  return {
    tag: "task",
    content: `Review all copy variants provided. For each issue found:
1. Identify the exact location: platform, variant label, and field (headline/body/cta/hashtags)
2. Categorize the issue: naturalness, register, persuasiveness, cultural, or platform
3. Explain the specific problem in Japanese (what is wrong and why)
4. Provide a specific fix in Japanese (a concrete replacement, not a vague suggestion)
5. Rate the severity: critical (must fix), moderate (should fix), minor (nice to fix)

Scoring:
- Calculate the quality score (0-100) as a weighted sum of the 5 criteria
- Score >= 70 with no critical issues: APPROVE
- Score < 70 OR any critical issues exist: REJECT
- Score >= 85: Excellent quality, note in overallNote

Focus on the 3-5 most impactful issues. Do not list every minor issue — prioritize by severity and impact on copy effectiveness.`,
  }
}

function buildConstraintsSection(): PromptSection {
  return {
    tag: "constraints",
    content: `1. Issues must be specific with exact field-level location (platform + variant + field). Vague feedback like "the register is inconsistent" is not acceptable — specify WHERE and provide the exact problematic text.

2. Suggestions must be concrete Japanese fixes, not descriptions of what to change. Provide the actual replacement text in Japanese.
   Bad: "Use a softer CTA"
   Good: suggestion: "ぜひお試しください" (replace: "今すぐ購入！")

3. Quality score: 0-100 weighted across all 5 criteria. 70+ is acceptable, 85+ is excellent.

4. Maximum 5 issues per review. Prioritize by severity (critical > moderate > minor) and impact. If there are more than 5 issues, combine related issues or drop the least impactful minor ones.

5. Compliance flags: Flag obvious regulatory violations (e.g., "肌荒れを治す" = potential 薬機法 violation for cosmetics, "絶対に痩せる" = potential 景品表示法 violation). Do NOT attempt rewrites for compliance — Phase 12 handles full compliance review. Simply flag and move on.

6. overallNote: Write in Japanese. 1-2 sentences summarizing the overall quality assessment and key recommendations.

7. summaryJa: Write in Japanese. Approximately 10 words summarizing the review outcome.

8. localizationNotes: Write in English. Technical notes about what was evaluated and key findings for the pipeline log.`,
  }
}

function buildOutputFormatSection(): PromptSection {
  return {
    tag: "output_format",
    content: `Use the deliver_localization_review tool to return your evaluation. Include:
- approved: boolean (true if score >= 70 and no critical issues)
- qualityScore: number 0-100
- issues: array of structured issues (max 5)
- complianceFlags: array of flagged compliance concerns (empty if none)
- overallNote: Japanese summary feedback
- summaryJa: ~10 word Japanese summary
- revisionsApplied: number of revision attempts (0 for first review)
- localizationNotes: English technical notes`,
  }
}

function buildExamplesSection(): PromptSection {
  return {
    tag: "examples",
    content: `=== Example A: Approval case — Quality score 85, minor issues noted ===

Context: Cosmetics brand, standard register, Instagram + LINE, AIDA framework

Tool output:
{
  "approved": true,
  "qualityScore": 85,
  "issues": [
    {
      "platform": "instagram",
      "variant": "B案",
      "field": "body",
      "category": "naturalness",
      "issue": "「あなたの肌を変える」はやや翻訳調。「あなたの」は日本語広告では省略が自然。",
      "suggestion": "素肌が変わる実感を、ぜひお試しください。",
      "severity": "minor"
    },
    {
      "platform": "line",
      "variant": "C案",
      "field": "cta",
      "category": "platform",
      "issue": "「今すぐ購入」はLINEでは攻撃的すぎる。LINEのCTAはソフトな誘導が基本。",
      "suggestion": "詳しくはこちら",
      "severity": "moderate"
    }
  ],
  "complianceFlags": [],
  "overallNote": "全体的に自然な日本語で、敬語レベルも統一されています。Instagram版のB案で翻訳調の表現が1箇所、LINE版のC案でCTAがプラットフォームに合っていない点を改善すると、さらに良くなります。",
  "summaryJa": "全体的に良好。軽微な修正で完成度向上可能。",
  "revisionsApplied": 0,
  "localizationNotes": "Copy quality is good overall. Register consistency (standard) maintained across all variants. Two minor issues identified: one translationese instance in Instagram B variant body, one CTA style mismatch in LINE C variant. Both are non-critical and copy is approved for use."
}

=== Example B: Rejection case — Quality score 55, critical issues ===

Context: Fashion brand, casual register, Instagram + X, AISAS framework

Tool output:
{
  "approved": false,
  "qualityScore": 55,
  "issues": [
    {
      "platform": "instagram",
      "variant": "A案",
      "field": "body",
      "category": "register",
      "issue": "カジュアル指定なのに「ご覧ください」「ございます」が混在。A案全体でタメ口とです/ます形が混在している。",
      "suggestion": "この春の新作、めっちゃ可愛いから見てみて！限定デザインもあるよ。",
      "severity": "critical"
    },
    {
      "platform": "x",
      "variant": "B案",
      "field": "headline",
      "category": "naturalness",
      "issue": "「あなたのスタイルを革命的に変える」は英語からの直訳調。「革命的に」は日本語の広告で不自然。",
      "suggestion": "おしゃれが変わる春。新作コレクション",
      "severity": "critical"
    },
    {
      "platform": "instagram",
      "variant": "C案",
      "field": "hashtags",
      "category": "platform",
      "issue": "ハッシュタグが全て英語。日本のInstagramでは日本語ハッシュタグが発見性に重要。",
      "suggestion": "#春コーデ #新作ファッション #おしゃれさんと繋がりたい",
      "severity": "moderate"
    }
  ],
  "complianceFlags": [],
  "overallNote": "敬語レベルの混在が深刻な問題です。カジュアル指定にもかかわらず、複数のバリエーションでです/ます形が混入しています。また、翻訳調の表現が目立ちます。敬語レベルの統一と、より自然な日本語表現への修正が必要です。",
  "summaryJa": "敬語混在と翻訳調が深刻。修正必須。",
  "revisionsApplied": 0,
  "localizationNotes": "Critical issues found: register mixing (casual/standard) in Instagram A variant, translationese in X B variant headline. Copy rejected. Quality score 55/100. Primary issues are register consistency (scored 8/25) and naturalness (scored 18/30). Copywriter must address register mixing first, then translationese."
}`,
  }
}

// ===== User Message Builder (Initial Review) =====

/**
 * Build the JP Localization user message for initial copy review.
 *
 * Formats the Copywriter's output alongside strategic context for the
 * evaluator to assess quality.
 */
export function buildJpLocalizationUserMessage(
  copywriterOutput: CopywriterOutput,
  strategicInsight: StrategicInsightOutput,
  brief: JpLocalizationBrief
): string {
  const parts: string[] = []

  // Copy to review
  parts.push(`<copy_to_review>`)
  for (const variant of copywriterOutput.variants) {
    parts.push(`--- ${variant.platform.toUpperCase()} / ${variant.variantLabel} ---
Register: ${variant.register}
Headline: ${variant.headline}
Body: ${variant.body}
CTA: ${variant.cta}
Hashtags: ${variant.hashtags.length > 0 ? variant.hashtags.join(", ") : "None"}
Rationale: ${variant.rationaleNotes || "Not provided"}`)
  }
  parts.push(`</copy_to_review>`)

  // Context
  parts.push(`<context>
Expected register: ${brief.registerOverride || strategicInsight.tonalGuidance}
Framework: ${strategicInsight.copywritingFramework}
Target audience: ${brief.targetAudience || "Not specified"}
Platforms: ${brief.platforms.join(", ")}
Key messages: ${strategicInsight.keyMessages.join("; ")}
</context>`)

  // Instruction
  parts.push(
    `Review all copy variants and deliver your quality evaluation. Assess each variant against the 5 weighted criteria. Flag any compliance concerns. Provide specific, actionable feedback for any issues found.`
  )

  return parts.join("\n\n")
}

// ===== Revision Message Builder =====

/**
 * Build the JP Localization message for re-reviewing revised copy.
 *
 * Includes the full critique history from previous attempts so the evaluator
 * can verify that previous issues were addressed and check for new issues.
 *
 * @param copywriterOutput - The revised copy from the Copywriter
 * @param critiqueHistory - Array of all previous critique results
 * @param attemptNumber - Current revision attempt number (1-based)
 */
export function buildJpLocalizationRevisionMessage(
  copywriterOutput: CopywriterOutput,
  critiqueHistory: CritiqueHistoryEntry[],
  attemptNumber: number
): string {
  const parts: string[] = []

  // Revised copy
  parts.push(`<revised_copy>`)
  for (const variant of copywriterOutput.variants) {
    parts.push(`--- ${variant.platform.toUpperCase()} / ${variant.variantLabel} ---
Register: ${variant.register}
Headline: ${variant.headline}
Body: ${variant.body}
CTA: ${variant.cta}
Hashtags: ${variant.hashtags.length > 0 ? variant.hashtags.join(", ") : "None"}
Rationale: ${variant.rationaleNotes || "Not provided"}`)
  }
  parts.push(`</revised_copy>`)

  // Critique history
  parts.push(`<critique_history>`)
  for (const critique of critiqueHistory) {
    parts.push(`--- Attempt ${critique.attemptNumber} (Score: ${critique.qualityScore}/100, ${critique.approved ? "Approved" : "Rejected"}) ---
Issues:`)
    for (const issue of critique.issues) {
      parts.push(`  [${issue.severity.toUpperCase()}] ${issue.platform}/${issue.variant}/${issue.field} (${issue.category}):
    Problem: ${issue.issue}
    Suggestion: ${issue.suggestion}`)
    }
    parts.push(`Overall note: ${critique.overallNote}`)
  }
  parts.push(`</critique_history>`)

  // Revision context
  const maxAttempts = 2
  parts.push(`<revision_context>
This is revision attempt ${attemptNumber} of max ${maxAttempts}. Previous issues have been addressed by the Copywriter. Review the revised copy:

1. Check that ALL previous issues are fixed (compare against critique history)
2. Check for NEW issues that may have been introduced during revision
3. Re-score against all 5 weighted criteria

${attemptNumber >= maxAttempts ? `IMPORTANT: This is the final revision attempt. If quality is still below threshold, approve with the best available version and note any remaining issues in overallNote. The pipeline must not stall indefinitely.` : `If issues remain, reject with updated feedback. The Copywriter will have one more revision attempt.`}
</revision_context>`)

  return parts.join("\n\n")
}

// ===== Tool Schema =====

/**
 * Tool schema for the JP Localization agent's deliver_localization_review tool.
 * Forces structured output matching the JpLocalizationOutput interface.
 */
export const JP_LOCALIZATION_TOOL_SCHEMA: ToolSchema<JpLocalizationOutput> = {
  name: "deliver_localization_review",
  description:
    "Deliver the Japanese copy quality evaluation with structured critique, quality score, compliance flags, and approval decision. Each issue includes exact field-level location and a specific Japanese fix.",
  input_schema: {
    type: "object",
    properties: {
      approved: {
        type: "boolean",
        description:
          "Whether the copy meets quality standards. True if qualityScore >= 70 and no critical issues.",
      },
      qualityScore: {
        type: "number",
        description:
          "Overall quality score 0-100, calculated as weighted sum of: naturalness (30%), register consistency (25%), persuasiveness (20%), cultural resonance (15%), platform fit (10%).",
        minimum: 0,
        maximum: 100,
      },
      issues: {
        type: "array",
        description:
          "Array of structured issues found in the copy. Maximum 5 issues, prioritized by severity. Empty array if no issues found.",
        items: {
          type: "object",
          properties: {
            platform: {
              type: "string",
              description:
                'Platform where the issue was found (e.g., "instagram", "line", "x")',
            },
            variant: {
              type: "string",
              description:
                'Variant label where the issue was found (e.g., "A案", "B案")',
            },
            field: {
              type: "string",
              enum: ["headline", "body", "cta", "hashtags"],
              description: "Specific field within the variant where the issue exists",
            },
            category: {
              type: "string",
              enum: [
                "naturalness",
                "register",
                "persuasiveness",
                "cultural",
                "platform",
              ],
              description:
                "Which evaluation criterion this issue falls under",
            },
            issue: {
              type: "string",
              description:
                "The specific problem described in Japanese. Must identify the exact problematic text.",
            },
            suggestion: {
              type: "string",
              description:
                "The specific fix in Japanese. Must be a concrete replacement, not a vague instruction.",
            },
            severity: {
              type: "string",
              enum: ["critical", "moderate", "minor"],
              description:
                "Issue severity. Critical: must fix before approval. Moderate: should fix. Minor: nice to fix.",
            },
          },
          required: [
            "platform",
            "variant",
            "field",
            "category",
            "issue",
            "suggestion",
            "severity",
          ],
        },
      },
      complianceFlags: {
        type: "array",
        description:
          "Array of flagged compliance concerns (e.g., potential 薬機法 or 景品表示法 violations). Empty array if none found. Do NOT rewrite — just flag for Phase 12 review.",
        items: {
          type: "string",
        },
      },
      overallNote: {
        type: "string",
        description:
          "Summary feedback in Japanese. 1-2 sentences covering overall quality assessment and key recommendations.",
      },
      summaryJa: {
        type: "string",
        description:
          "Approximately 10 word Japanese summary of the review outcome.",
      },
      revisionsApplied: {
        type: "number",
        description:
          "Number of revision attempts completed. 0 for first review, 1-2 for subsequent reviews.",
      },
      localizationNotes: {
        type: "string",
        description:
          "English technical notes about what was evaluated and key findings. Used for pipeline logging and audit trail.",
      },
    },
    required: [
      "approved",
      "qualityScore",
      "issues",
      "overallNote",
      "summaryJa",
      "revisionsApplied",
      "localizationNotes",
    ],
  },
}
