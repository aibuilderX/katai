/**
 * Evaluation rubric definitions for A/B comparison between naive and optimized prompts.
 *
 * Defines per-agent evaluation dimensions with 1-5 scoring anchors and concrete
 * examples of what each score level looks like. Used to objectively measure
 * whether optimized prompts (Phase 9.1) produce measurably superior output
 * compared to naive prompts (Phase 9 defaults).
 *
 * Improvement threshold: optimized prompts should average >= 0.5 points higher
 * than naive across all dimensions (from research section 8.1).
 *
 * @see .planning/phases/09.1-agent-prompt-engineering-photorealistic-output/09.1-RESEARCH.md#8
 */

// ===== Types =====

/**
 * A single scoring anchor within a rubric dimension.
 */
export interface ScoringAnchor {
  /** Score level (1-5) */
  score: 1 | 2 | 3 | 4 | 5
  /** Label for the score level */
  label: string
  /** Concrete example or description of what this score looks like */
  example: string
}

/**
 * A single evaluation dimension within an agent's rubric.
 */
export interface RubricDimension {
  /** Dimension name (e.g., "Classification Accuracy") */
  name: string
  /** What this dimension evaluates */
  description: string
  /** Scoring anchors from 1 (Poor) to 5 (Excellent) */
  anchors: ScoringAnchor[]
}

/**
 * Complete evaluation rubric for a single agent.
 */
export interface AgentRubric {
  /** Agent identifier */
  agentId: string
  /** Agent display name */
  agentName: string
  /** Evaluation dimensions for this agent */
  dimensions: RubricDimension[]
}

/**
 * Overall evaluation configuration including all agents and thresholds.
 */
export interface EvaluationRubricConfig {
  /** Minimum average improvement (on 5-point scale) to consider optimization successful */
  improvementThreshold: number
  /** Description of the improvement threshold */
  thresholdDescription: string
  /** Per-agent rubrics */
  agentRubrics: AgentRubric[]
}

// ===== Strategic Insight Rubric =====

const STRATEGIC_INSIGHT_RUBRIC: AgentRubric = {
  agentId: "strategic_insight",
  agentName: "Strategic Insight",
  dimensions: [
    {
      name: "Classification Accuracy",
      description:
        "Does the awareness level, desire classification, and framework match the brief's intent?",
      anchors: [
        {
          score: 1,
          label: "Poor",
          example:
            'Classifies a new product launch for an unknown brand as "most_aware", or selects a framework with no logical connection to the brief.',
        },
        {
          score: 2,
          label: "Below Average",
          example:
            "Awareness level is adjacent but wrong (e.g., solution_aware when problem_aware is correct). Framework selection is defensible but not optimal.",
        },
        {
          score: 3,
          label: "Acceptable",
          example:
            "Awareness level and framework are reasonable. Desire classification is generic (e.g., always selects 'social approval' regardless of category).",
        },
        {
          score: 4,
          label: "Good",
          example:
            "All three classifications are well-matched to the brief. Framework rationale is specific and demonstrates understanding of the product-audience fit.",
        },
        {
          score: 5,
          label: "Excellent",
          example:
            "Classifications are precise with nuanced reasoning. Correctly identifies Japanese-specific desire nuances (wa, bi_ishiki, anshin). Framework rationale references specific brief details.",
        },
      ],
    },
    {
      name: "Insight Depth",
      description:
        "Is the target insight specific and actionable, not generic?",
      anchors: [
        {
          score: 1,
          label: "Poor",
          example:
            'Target insight is a platitude: "Customers want high quality products at good prices."',
        },
        {
          score: 2,
          label: "Below Average",
          example:
            'Insight is category-level but not brief-specific: "Women in their 30s care about skincare." No differentiation from any other skincare brief.',
        },
        {
          score: 3,
          label: "Acceptable",
          example:
            "Insight references the specific brief details but reads like a summary rather than an insight. Adequate for downstream agents to work with.",
        },
        {
          score: 4,
          label: "Good",
          example:
            'Insight reveals a non-obvious connection between audience, product, and market context. E.g., "Urban 30s women seek ingredient transparency as a proxy for brand trustworthiness."',
        },
        {
          score: 5,
          label: "Excellent",
          example:
            'Insight is specific, actionable, and reveals a strategic angle that directly shapes creative direction. E.g., connects Japanese consumer behavior patterns to specific campaign opportunities.',
        },
      ],
    },
    {
      name: "Framework Appropriateness",
      description:
        "Does the chosen framework suit the product type and channel mix?",
      anchors: [
        {
          score: 1,
          label: "Poor",
          example:
            "Selects AIDMA for a digital-only Instagram campaign targeting Gen Z, or PAS for a brand with no clear pain point.",
        },
        {
          score: 2,
          label: "Below Average",
          example:
            "Framework could technically work but is not the best fit. No rationale for why this framework over alternatives.",
        },
        {
          score: 3,
          label: "Acceptable",
          example:
            "Framework is a reasonable choice with basic rationale. Does not consider Japanese-specific frameworks (AIDMA/AISAS) when they would be more appropriate.",
        },
        {
          score: 4,
          label: "Good",
          example:
            "Framework is well-matched. Rationale explains why it fits the product type, audience behavior, and channel mix. Considers Japanese market norms.",
        },
        {
          score: 5,
          label: "Excellent",
          example:
            "Framework selection demonstrates deep understanding of the brief's unique characteristics. Rationale explicitly addresses why alternatives were not chosen. AIDMA/AISAS selected when appropriate for Japanese market.",
        },
      ],
    },
  ],
}

// ===== Creative Director Rubric =====

const CREATIVE_DIRECTOR_RUBRIC: AgentRubric = {
  agentId: "creative_director",
  agentName: "Creative Director",
  dimensions: [
    {
      name: "Concept Clarity",
      description:
        "Is the visual concept specific enough to generate imagery from?",
      anchors: [
        {
          score: 1,
          label: "Poor",
          example:
            'Concept is abstract and unactionable: "Create beautiful, engaging content that resonates with the audience."',
        },
        {
          score: 2,
          label: "Below Average",
          example:
            'Concept has a direction but lacks specificity: "Warm, natural imagery showing skincare." No scene, no subject, no composition.',
        },
        {
          score: 3,
          label: "Acceptable",
          example:
            'Concept describes a scene at a high level: "A woman applying skincare in a bathroom with natural light." Adequate but generic.',
        },
        {
          score: 4,
          label: "Good",
          example:
            'Concept is specific with subject, setting, mood, and key visual elements: "A 30s Japanese woman in a minimalist bathroom, morning light through linen curtains, applying serum with quiet confidence."',
        },
        {
          score: 5,
          label: "Excellent",
          example:
            "Concept is cinematic and immediately visualizable. Includes emotional undertone, cultural references, and unique creative angle that differentiates from generic advertising.",
        },
      ],
    },
    {
      name: "Visual Specificity",
      description:
        "Are colors, composition, and mood concretely described?",
      anchors: [
        {
          score: 1,
          label: "Poor",
          example:
            'No color guidance, no composition notes. Just "use brand colors" or "make it look good."',
        },
        {
          score: 2,
          label: "Below Average",
          example:
            'Generic color terms ("warm colors", "soft tones") without hex codes or palette curation. Composition mentioned but not specified.',
        },
        {
          score: 3,
          label: "Acceptable",
          example:
            "Colors specified by name with mood rationale. Composition mentions rule of thirds or similar. Mood keywords provided but generic (clean, modern).",
        },
        {
          score: 4,
          label: "Good",
          example:
            "Hex codes for colors with mood rationale. Specific composition direction (subject placement, text safe zones). Mood keywords are specific and evocative (not generic).",
        },
        {
          score: 5,
          label: "Excellent",
          example:
            "Complete visual spec: curated color palette with hex codes and usage guidance, detailed composition with camera angle and depth cues, platform-specific framing, and mood keywords that guide both visual and copy tone.",
        },
      ],
    },
    {
      name: "Downstream Actionability",
      description:
        "Can a Copywriter and Art Director execute from this direction without ambiguity?",
      anchors: [
        {
          score: 1,
          label: "Poor",
          example:
            "Direction is so vague that Copywriter and Art Director would produce wildly different interpretations. No register guidance, no tonal direction.",
        },
        {
          score: 2,
          label: "Below Average",
          example:
            "Some direction present but gaps that require guesswork. Copy direction says 'friendly' without specifying register. Platform adaptations missing.",
        },
        {
          score: 3,
          label: "Acceptable",
          example:
            "Copy direction includes register recommendation. Platform adaptations present but generic. Art Director has enough to start but would need to infer several details.",
        },
        {
          score: 4,
          label: "Good",
          example:
            "Copy direction specifies register, tonal angle, and key messaging approach. Platform adaptations are specific (vertical Stories, conversational LINE). Art Director can generate prompts with minimal inference.",
        },
        {
          score: 5,
          label: "Excellent",
          example:
            "Both agents can execute directly from the brief with zero ambiguity. Copy direction includes register, specific tonal persona, and CTA style. Platform adaptations address format, length, and behavioral differences. Art Director receives complete visual direction.",
        },
      ],
    },
  ],
}

// ===== Copywriter Rubric =====

const COPYWRITER_RUBRIC: AgentRubric = {
  agentId: "copywriter",
  agentName: "Copywriter",
  dimensions: [
    {
      name: "Japanese Naturalness",
      description:
        "Does the copy read like native Japanese, not translationese?",
      anchors: [
        {
          score: 1,
          label: "Poor",
          example:
            'Reads like machine translation. English word order (SVO), direct idiom translations ("時間を節約する" instead of "時短になる"), unnatural particle usage.',
        },
        {
          score: 2,
          label: "Below Average",
          example:
            'Grammatically correct but stiff. Some unnatural phrasing ("あなたの肌を変革する" instead of "素肌が変わる実感"). Occasional Western-style directness.',
        },
        {
          score: 3,
          label: "Acceptable",
          example:
            "Reads naturally in most places. Occasional phrasing that feels slightly off to a native speaker. Tri-script mixing is correct but not elegant.",
        },
        {
          score: 4,
          label: "Good",
          example:
            "Natural Japanese throughout. Appropriate tri-script mixing. Good rhythm and cadence. Minor improvements possible but would pass native speaker review.",
        },
        {
          score: 5,
          label: "Excellent",
          example:
            "Indistinguishable from professional Japanese copywriter output. Natural rhythm (5-7 mora patterns), elegant tri-script balance, culturally resonant expressions and wordplay.",
        },
      ],
    },
    {
      name: "Register Correctness",
      description:
        "Is the keigo level consistent and appropriate for the product category?",
      anchors: [
        {
          score: 1,
          label: "Poor",
          example:
            'Register mixing within variants: casual endings (だよ) mixed with formal (ございます). Or completely wrong register (casual for luxury, formal for ramen shop).',
        },
        {
          score: 2,
          label: "Below Average",
          example:
            "Register mostly consistent but with 1-2 slips per variant. Some sentence endings inconsistent. Register choice may not match category norms.",
        },
        {
          score: 3,
          label: "Acceptable",
          example:
            "Register consistent throughout each variant. Choice is acceptable for the category. No mixing errors. But register does not feel optimized for the specific audience.",
        },
        {
          score: 4,
          label: "Good",
          example:
            "Perfect register consistency. Register is well-matched to product category and target audience. Appropriate keigo patterns used throughout.",
        },
        {
          score: 5,
          label: "Excellent",
          example:
            "Flawless register with nuanced application. Subtle register variations between platforms (slightly softer for LINE, slightly more formal for Instagram) while maintaining the same base level. Shows deep understanding of Japanese register system.",
        },
      ],
    },
    {
      name: "Persuasiveness",
      description:
        "Does the copy motivate action? Is the CTA compelling?",
      anchors: [
        {
          score: 1,
          label: "Poor",
          example:
            'Copy is informational but not persuasive. CTA is generic ("詳しくはこちら") with no emotional hook. No clear value proposition.',
        },
        {
          score: 2,
          label: "Below Average",
          example:
            "Some persuasive elements but disjointed. CTA exists but does not connect to the emotional hook. Framework (PAS/AIDA) is nominally present but not effectively applied.",
        },
        {
          score: 3,
          label: "Acceptable",
          example:
            "Clear value proposition. CTA is adequate. Framework structure is visible and functional. Persuasion is competent but not compelling.",
        },
        {
          score: 4,
          label: "Good",
          example:
            "Effective persuasion with emotional and rational hooks. CTA is specific and motivating. Framework application is natural (not forced). Each variant offers a genuinely different persuasion angle.",
        },
        {
          score: 5,
          label: "Excellent",
          example:
            "Highly compelling copy with strong emotional resonance for the Japanese audience. CTA feels like a natural invitation (not a demand). Framework is seamlessly integrated. Variants are diverse and each could independently drive action.",
        },
      ],
    },
    {
      name: "Platform Fit",
      description:
        "Does the copy match platform conventions (length, tone, hashtags)?",
      anchors: [
        {
          score: 1,
          label: "Poor",
          example:
            "Same copy for all platforms with no adaptation. Character limits violated. Hashtags on LINE. No platform-specific CTA style.",
        },
        {
          score: 2,
          label: "Below Average",
          example:
            "Copy length varies by platform but tone is identical. Hashtag strategy is generic (same tags for all platforms). CTA style does not match platform norms.",
        },
        {
          score: 3,
          label: "Acceptable",
          example:
            "Length and hashtags match platform requirements. Some tonal adaptation. CTA style is platform-appropriate. Basic compliance with conventions.",
        },
        {
          score: 4,
          label: "Good",
          example:
            "Clear platform-specific adaptation: conversational for LINE, visual-first captions for Instagram, concise for X. Hashtag strategy is platform-native (JP+EN mix for Instagram, trending for X, none for LINE).",
        },
        {
          score: 5,
          label: "Excellent",
          example:
            "Copy feels native to each platform. LINE messages feel like friend recommendations. Instagram captions leverage visual storytelling. X posts are shareable and timely. Deep understanding of Japanese user behavior per platform.",
        },
      ],
    },
  ],
}

// ===== Art Director Rubric =====

const ART_DIRECTOR_RUBRIC: AgentRubric = {
  agentId: "art_director",
  agentName: "Art Director",
  dimensions: [
    {
      name: "Prompt Specificity",
      description:
        "Is the prompt detailed enough for Flux to produce a specific image (not generic)?",
      anchors: [
        {
          score: 1,
          label: "Poor",
          example:
            '"Professional photo of a product for advertising. High quality." No subject, no scene, no mood.',
        },
        {
          score: 2,
          label: "Below Average",
          example:
            '"A woman using skincare products in a bathroom with nice lighting." Vague subject, no camera specs, no composition direction.',
        },
        {
          score: 3,
          label: "Acceptable",
          example:
            "Describes subject, setting, and general mood. Includes some lighting direction. Missing camera/lens specs, specific composition, or skin realism keywords.",
        },
        {
          score: 4,
          label: "Good",
          example:
            "Detailed prompt with specific subject, camera/lens, lighting setup, composition rule, and mood. Front-loads the main subject. Includes text safe zone direction.",
        },
        {
          score: 5,
          label: "Excellent",
          example:
            "Cinematic-level prompt: specific Japanese demographic, exact camera/lens, lighting technique, skin texture keywords, composition with text overlay zones, mood-appropriate color palette, 8K resolution. Prompt reads like a professional photography brief.",
        },
      ],
    },
    {
      name: "Realism Technique Inclusion",
      description:
        "Are camera/lens, lighting, and skin realism keywords present?",
      anchors: [
        {
          score: 1,
          label: "Poor",
          example:
            'No camera/lens, no lighting description, no skin realism keywords. Just "photorealistic" or "high quality."',
        },
        {
          score: 2,
          label: "Below Average",
          example:
            'Mentions a camera brand but no lens spec. Lighting is generic ("good lighting"). No skin texture or realism keywords.',
        },
        {
          score: 3,
          label: "Acceptable",
          example:
            'Camera and lens specified. Lighting direction present. But missing skin realism counters (no "visible pores", "subsurface scattering", etc.). May include anti-patterns like "perfect skin".',
        },
        {
          score: 4,
          label: "Good",
          example:
            "Full camera/lens spec, specific lighting technique, skin realism keywords (visible pores, natural texture, subsurface scattering). No anti-pattern language. Includes shallow depth of field and resolution.",
        },
        {
          score: 5,
          label: "Excellent",
          example:
            "Complete photorealism stack: camera/lens matched to category, lighting technique with shadow direction, full skin realism keyword set (visible pores, subsurface scattering, natural imperfections), film grain mention, 8K resolution. Anti-patterns explicitly countered.",
        },
      ],
    },
    {
      name: "Category Awareness",
      description:
        "Does the prompt reflect the product category's visual conventions?",
      anchors: [
        {
          score: 1,
          label: "Poor",
          example:
            "Generic advertising prompt that could apply to any product. No category-specific visual conventions (e.g., food photography conventions for a ramen shot).",
        },
        {
          score: 2,
          label: "Below Average",
          example:
            "Some category awareness but generic application. Food prompt mentions food but uses portrait lighting. Fashion prompt has product-shot composition instead of editorial style.",
        },
        {
          score: 3,
          label: "Acceptable",
          example:
            "Category-appropriate conventions present: food uses overhead/45-degree angles, cosmetics uses beauty lighting. But conventions are applied formulaically without adaptation to the specific brief.",
        },
        {
          score: 4,
          label: "Good",
          example:
            "Category conventions well-applied and adapted to the brief. Camera/lens choice matches category (macro for food, 85mm for cosmetics portraits). Japanese advertising visual norms referenced (seasonal, demographic).",
        },
        {
          score: 5,
          label: "Excellent",
          example:
            "Deep category expertise evident. Prompt uses conventions specific to the sub-category (tonkotsu ramen steam vs. sushi precision, nail art close-up vs. salon atmosphere). Camera/lens/lighting perfectly matched. Japanese seasonal and cultural elements integrated naturally.",
        },
      ],
    },
  ],
}

// ===== JP Localization Rubric =====

const JP_LOCALIZATION_RUBRIC: AgentRubric = {
  agentId: "jp_localization",
  agentName: "JP Localization",
  dimensions: [
    {
      name: "Critique Accuracy",
      description:
        "Are identified issues real problems (not false positives)?",
      anchors: [
        {
          score: 1,
          label: "Poor",
          example:
            "Flags correct Japanese as errors. Identifies non-existent register inconsistencies. Most flagged issues are false positives.",
        },
        {
          score: 2,
          label: "Below Average",
          example:
            "Identifies some real issues but also flags stylistic choices as errors. Over-flags minor variations that are acceptable in advertising copy.",
        },
        {
          score: 3,
          label: "Acceptable",
          example:
            "Most flagged issues are genuine problems. Occasional false positive on nuanced language choices. Severity classification is mostly correct.",
        },
        {
          score: 4,
          label: "Good",
          example:
            "All flagged issues are genuine. Correctly distinguishes between critical (register mixing), moderate (translationese), and minor (style preference) issues. No false positives.",
        },
        {
          score: 5,
          label: "Excellent",
          example:
            "Catches subtle issues a non-native reviewer would miss: particle nuance (wa/ga), unnatural keigo patterns, culturally inappropriate expressions. Zero false positives. Correctly applies cultural context to evaluation.",
        },
      ],
    },
    {
      name: "Suggestion Quality",
      description:
        "Are suggested fixes natural Japanese that improve the copy?",
      anchors: [
        {
          score: 1,
          label: "Poor",
          example:
            'Suggestions are vague: "Use better Japanese" or "Make it more natural." No concrete replacement text provided.',
        },
        {
          score: 2,
          label: "Below Average",
          example:
            "Suggestions provide replacement text but the replacements are themselves unnatural or introduce new issues.",
        },
        {
          score: 3,
          label: "Acceptable",
          example:
            "Suggestions are concrete Japanese replacements that fix the identified issue. Replacements are grammatically correct but may not be optimal.",
        },
        {
          score: 4,
          label: "Good",
          example:
            "Suggestions are natural Japanese that clearly improve the copy. Replacements maintain the original intent while fixing the specific issue. Register consistency maintained in suggestions.",
        },
        {
          score: 5,
          label: "Excellent",
          example:
            "Suggestions are professional-quality Japanese that not only fix the issue but elevate the copy. Replacements demonstrate deep understanding of Japanese advertising conventions and the specific product category.",
        },
      ],
    },
    {
      name: "False Positive/Negative Rate",
      description:
        "Does the agent approve good copy and reject bad copy correctly?",
      anchors: [
        {
          score: 1,
          label: "Poor",
          example:
            "Approves copy with critical register mixing or severe translationese. Or rejects perfectly natural Japanese copy. Approval decisions are unreliable.",
        },
        {
          score: 2,
          label: "Below Average",
          example:
            "Generally correct on obvious cases but misses subtle issues or over-penalizes acceptable variations. Quality scores do not reflect actual copy quality.",
        },
        {
          score: 3,
          label: "Acceptable",
          example:
            "Approval/rejection aligns with actual quality in most cases. Quality scores are in the right ballpark. May miss one moderate issue or incorrectly reject one acceptable variant.",
        },
        {
          score: 4,
          label: "Good",
          example:
            "Accurate approval/rejection for all test cases. Quality scores are well-calibrated. Catches all critical and moderate issues while appropriately passing minor stylistic choices.",
        },
        {
          score: 5,
          label: "Excellent",
          example:
            "Perfect approval/rejection accuracy. Quality scores are precisely calibrated with clear differentiation between excellent (85+), good (70-84), and below-threshold (<70) copy. Compliance flags are accurate and actionable.",
        },
      ],
    },
  ],
}

// ===== Exported Constants =====

/**
 * Per-agent rubric dimensions keyed by agent identifier.
 * Used for scoring individual agent outputs during A/B comparison.
 */
export const AGENT_RUBRIC_DIMENSIONS: Record<string, RubricDimension[]> = {
  strategic_insight: STRATEGIC_INSIGHT_RUBRIC.dimensions,
  creative_director: CREATIVE_DIRECTOR_RUBRIC.dimensions,
  copywriter: COPYWRITER_RUBRIC.dimensions,
  art_director: ART_DIRECTOR_RUBRIC.dimensions,
  jp_localization: JP_LOCALIZATION_RUBRIC.dimensions,
}

/**
 * Complete evaluation rubrics configuration with all 5 agents
 * and the improvement threshold for A/B comparison.
 */
export const EVALUATION_RUBRICS: EvaluationRubricConfig = {
  improvementThreshold: 0.5,
  thresholdDescription:
    "Optimized prompts should average >= 0.5 points higher than naive prompts across all dimensions on a 1-5 scale. This represents a meaningful quality improvement (e.g., moving from 'Acceptable' to 'Good' on most dimensions).",
  agentRubrics: [
    STRATEGIC_INSIGHT_RUBRIC,
    CREATIVE_DIRECTOR_RUBRIC,
    COPYWRITER_RUBRIC,
    ART_DIRECTOR_RUBRIC,
    JP_LOCALIZATION_RUBRIC,
  ],
}
