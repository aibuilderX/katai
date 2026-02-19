/**
 * Flux 1.1 Pro Ultra photorealistic prompt engineering data.
 *
 * Centralizes camera/lens specifications, photorealism keywords, skin realism
 * anti-pattern counters, and Flux configuration for the Art Director agent.
 * The Art Director meta-prompt imports these to generate category-aware,
 * photorealistic image prompts.
 *
 * Key Flux constraints:
 * - Raw Mode always enabled for photorealism
 * - No negative prompt support (all avoidances phrased positively)
 * - Word order matters: front-load most important elements
 * - Priority order: Subject > Action > Style > Context
 *
 * @see .planning/phases/09.1-agent-prompt-engineering-photorealistic-output/09.1-RESEARCH.md#5
 */

// ===== Types =====

export interface CameraLensSpec {
  camera: string
  lens: string
  lighting: string
  rationale: string
}

export interface SkinRealismCounter {
  antiPattern: string
  counter: string
  keywords: string
}

export interface FluxConfig {
  rawMode: boolean
  noNegativePrompts: boolean
  priorityOrder: readonly string[]
  maxPromptLength: number
}

// ===== Camera/Lens Database =====

/**
 * Camera and lens specifications by product category.
 * Specifying real camera equipment in prompts triggers Flux's learned
 * associations with actual photographic quality, significantly boosting realism.
 *
 * @see RESEARCH.md section 5.3
 */
export const CAMERA_LENS_DATABASE: Record<string, CameraLensSpec> = {
  cosmetics: {
    camera: "Canon EOS R5",
    lens: "85mm f/1.4",
    lighting: "Soft studio lighting, beauty dish",
    rationale:
      "Flattering portraits with beautiful bokeh. 85mm is the classic portrait focal length. Beauty dish provides even, flattering light that highlights skin texture without harsh shadows.",
  },
  food: {
    camera: "Sony A7 IV",
    lens: "50mm f/1.8 macro",
    lighting: "Natural window light, warm tones",
    rationale:
      "Appetizing macro detail with natural-looking bokeh. 50mm macro captures food textures. Natural window light creates warm, inviting tones that make food look delicious.",
  },
  fashion: {
    camera: "Nikon Z9",
    lens: "35mm f/1.4",
    lighting: "Natural light, golden hour",
    rationale:
      "Editorial wide-angle feel with environmental context. 35mm captures both the model and surroundings for lifestyle fashion shots. Golden hour light creates warm, aspirational mood.",
  },
  personal_service: {
    camera: "Canon EOS R6",
    lens: "50mm f/1.4",
    lighting: "Soft ambient, warm tones",
    rationale:
      "Approachable and intimate feel. 50mm is natural and non-distorting. Soft ambient lighting creates a welcoming atmosphere that builds trust.",
  },
  tech: {
    camera: "Sony A7R V",
    lens: "90mm macro",
    lighting: "Clean studio, controlled",
    rationale:
      "Precision detail capture for product photography. 90mm macro reveals fine product details. Clean studio lighting ensures accurate color reproduction and sharp detail.",
  },
} as const

// ===== Photorealism Keywords =====

/**
 * Keyword stack to include in all people-focused image prompts.
 * These keywords trigger Flux's photorealism associations and counter
 * the default "AI-smooth" output tendency.
 */
export const PHOTOREALISM_KEYWORDS =
  "natural skin texture with visible pores, subsurface scattering, shallow depth of field, natural lighting with soft shadow transitions, candid expression, 8K resolution" as const

// ===== Skin Realism Counters =====

/**
 * Anti-pattern counters for skin realism in Flux-generated images.
 * Each entry identifies a common AI image generation failure mode and
 * provides positive-phrasing counter-instructions (since Flux does not
 * support negative prompts).
 *
 * @see RESEARCH.md section 5.4
 */
export const SKIN_REALISM_COUNTERS: readonly SkinRealismCounter[] = [
  {
    antiPattern: "Plastic skin",
    counter:
      "Include visible skin pores, natural skin texture with fine details, subtle imperfections",
    keywords:
      "visible skin pores, natural skin texture, fine skin details, subtle skin imperfections",
  },
  {
    antiPattern: "Flat lighting",
    counter:
      "Specify subsurface scattering, three-point lighting with visible shadow transitions, rim lighting",
    keywords:
      "subsurface scattering, three-point lighting, visible shadow transitions, rim lighting, light falloff",
  },
  {
    antiPattern: "Generic poses",
    counter:
      "Describe a candid moment with natural body language and asymmetric pose",
    keywords:
      "candid moment, natural body language, asymmetric pose, genuine expression, relaxed posture",
  },
  {
    antiPattern: "Over-smoothing",
    counter:
      "Request fine facial hair, visible skin texture at macro level, natural skin variation",
    keywords:
      "fine facial hair, visible skin texture, natural skin variation, realistic skin detail, micro-detail",
  },
  {
    antiPattern: "Uncanny valley eyes",
    counter:
      "Specify natural eye moisture, realistic iris detail, subtle eye reflection",
    keywords:
      "natural eye moisture, realistic iris detail, subtle eye reflection, natural eye catchlight, lifelike gaze",
  },
] as const

// ===== Flux Configuration =====

/**
 * Flux 1.1 Pro Ultra generation configuration.
 * Raw Mode is always enabled for photorealistic output.
 * Negative prompts are not supported by the Flux API.
 * Priority order follows Black Forest Labs' official prompt framework.
 */
export const FLUX_CONFIG: FluxConfig = {
  rawMode: true,
  noNegativePrompts: true,
  priorityOrder: ["subject", "action", "style", "context"] as const,
  maxPromptLength: 500,
} as const
