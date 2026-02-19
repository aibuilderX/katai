/**
 * Art Director meta-prompt builder for Flux 1.1 Pro Ultra image generation.
 *
 * This is a META-PROMPT SYSTEM: it teaches Claude HOW to craft photorealistic
 * image prompts for any product category, not WHAT specific prompts to write.
 * The Art Director infers product category from brief content and selects
 * camera/lens/lighting from the category database.
 *
 * Key features:
 * - Category-aware camera/lens/lighting selection (5 categories + abstract)
 * - Mandatory 8-item self-critique quality checklist (chain-of-thought)
 * - Skin realism anti-pattern counters for photorealistic people
 * - Japanese demographic default for Japanese market advertising
 * - Mode-dependent output: 1 prompt set (auto) or 2-3 variations (pro)
 * - Text compositing safe zone awareness
 * - GENX-09: works without brand profile by inferring from brief content
 *
 * Replaces naive prompts in src/lib/ai/prompts/image-generation.ts for v1.1.
 *
 * @see .planning/phases/09.1-agent-prompt-engineering-photorealistic-output/09.1-RESEARCH.md#5
 */

import {
  CAMERA_LENS_DATABASE,
  PHOTOREALISM_KEYWORDS,
  SKIN_REALISM_COUNTERS,
  FLUX_CONFIG,
} from "../shared/flux-techniques"
import { ART_DIRECTOR_QUALITY_CHECKLIST } from "../shared/quality-checklist"
import type { ToolSchema } from "./types"
import { buildPromptFromSections } from "./types"
import type { PromptSection } from "./types"
import type { ArtDirectorOutput } from "@/types/pipeline"

// ===== Types =====

export interface ArtDirectorSystemInput {
  // No runtime input needed for system prompt -- all knowledge is baked in
}

export interface ArtDirectorUserInput {
  creativeDirection: {
    visualConcept: string
    colorGuidance: string
    compositionNotes: string
    moodKeywords: string[]
    platformAdaptations: Record<string, string>
  }
  strategicInsight: {
    awarenessLevel: string
    primaryDesires: string[]
    targetInsight: string
  }
  brief: {
    campaignProductInfo?: string
    targetAudience: string
    platforms: string[]
    creativeMoodTags: string[]
    objective?: string
  }
  brandProfile: {
    name: string
    colors?: { primary: string; secondary: string; accent: string; background: string } | null
    toneTags?: string[] | null
  } | null
  mode: "auto" | "pro"
}

// ===== System Prompt Builder =====

/**
 * Build the Art Director meta-prompt system prompt.
 *
 * This system prompt teaches Claude HOW to craft Flux prompts, embedding:
 * - Full camera/lens database (5 categories)
 * - Photography knowledge (lighting, composition)
 * - Flux-specific constraints (Raw Mode, no negative prompts, word order)
 * - Photorealism keyword stack and skin realism counters
 * - 6 category visual convention templates
 * - Mandatory 8-item self-critique quality checklist
 * - Anti-pattern avoidance list
 * - Japanese advertising visual conventions
 * - 3 few-shot examples (cosmetics, food, fashion)
 */
export function buildArtDirectorSystemPrompt(): string {
  const sections: PromptSection[] = [
    buildRoleSection(),
    buildPhotographyKnowledgeSection(),
    buildFluxKnowledgeSection(),
    buildCategoryTemplatesSection(),
    buildSelfCritiqueSection(),
    buildAntiPatternsSection(),
    buildExamplesSection(),
  ]

  return buildPromptFromSections(sections)
}

// ===== User Message Builder =====

/**
 * Build the Art Director user message with campaign-specific context.
 *
 * Formats creative direction, strategic insight, and brief into XML-tagged
 * sections. Handles GENX-09: when brandProfile is null or lacks colors/tone,
 * explicitly instructs inference from brief content.
 */
export function buildArtDirectorUserMessage(
  creativeDirection: ArtDirectorUserInput["creativeDirection"],
  strategicInsight: ArtDirectorUserInput["strategicInsight"],
  brief: ArtDirectorUserInput["brief"],
  brandProfile: ArtDirectorUserInput["brandProfile"],
  mode: "auto" | "pro"
): string {
  const brandName = brandProfile?.name ?? "Unknown Brand"
  const brandColors =
    brandProfile?.colors
      ? `Primary: ${brandProfile.colors.primary}, Secondary: ${brandProfile.colors.secondary}, Accent: ${brandProfile.colors.accent}, Background: ${brandProfile.colors.background}`
      : "none — infer appropriate palette from product and mood"
  const brandTone =
    brandProfile?.toneTags && brandProfile.toneTags.length > 0
      ? brandProfile.toneTags.join(", ")
      : null

  // GENX-09: explicit inference instruction when brand profile is missing
  const noBrandProfileNote =
    !brandProfile?.colors && !brandTone
      ? "\nNo brand profile colors or tone available — infer an appropriate color palette and visual tone from the product type, target audience, and mood tags."
      : ""

  const modeInstruction =
    mode === "auto"
      ? "Generate 1 optimized image prompt per platform."
      : "Generate 2-3 image prompt variations per platform, each with a distinct variation theme."

  const platformAdaptationLines = Object.entries(creativeDirection.platformAdaptations)
    .map(([platform, note]) => `  - ${platform}: ${note}`)
    .join("\n")

  return `<creative_direction>
[Visual Concept]: ${creativeDirection.visualConcept}
[Color Guidance]: ${creativeDirection.colorGuidance}
[Composition Notes]: ${creativeDirection.compositionNotes}
[Mood Keywords]: ${creativeDirection.moodKeywords.join(", ")}
[Platform Adaptations]:
${platformAdaptationLines}
</creative_direction>

<strategy>
[Awareness Level]: ${strategicInsight.awarenessLevel}
[Primary Desires]: ${strategicInsight.primaryDesires.join(", ")}
[Target Insight]: ${strategicInsight.targetInsight}
</strategy>

<brief>
[Brand]: ${brandName}
[Product]: ${brief.campaignProductInfo ?? "Not specified — infer from creative direction"}
[Audience]: ${brief.targetAudience}
[Platforms]: ${brief.platforms.join(", ")}
[Brand Colors]: ${brandColors}
[Mood Tags]: ${brief.creativeMoodTags.join(", ")}
</brief>
${noBrandProfileNote}

<mode>${mode}</mode>

${modeInstruction}
Infer the product category from the brief content. Select camera/lens/lighting from your knowledge base.
Apply the self-critique checklist to every prompt before delivering.
Leave appropriate space for Japanese text overlay in compositions where applicable.`
}

// ===== Tool Schemas =====

/**
 * Tool schema for auto mode: 1 optimized prompt per platform.
 */
export const ART_DIRECTOR_TOOL_SCHEMA_AUTO: ToolSchema<ArtDirectorOutput> = {
  name: "deliver_image_prompts",
  description:
    "Deliver the final, quality-checked image prompts for each platform. Each prompt has been reviewed against the 8-item quality checklist and revised as needed.",
  input_schema: {
    type: "object",
    properties: {
      imagePrompts: {
        type: "array",
        description:
          "One optimized image prompt per platform. Each prompt must pass the quality checklist.",
        items: {
          type: "object",
          properties: {
            platform: {
              type: "string",
              description: "Target platform (e.g., Instagram, LINE, X)",
            },
            prompt: {
              type: "string",
              description:
                "The complete Flux 1.1 Pro Ultra image generation prompt. Must be at least 100 characters, front-load the main subject, include camera/lens and lighting specs.",
              minLength: 100,
            },
            style: {
              type: "string",
              description:
                'Visual style category (e.g., "photorealistic", "editorial", "product", "lifestyle")',
            },
            aspectRatio: {
              type: "string",
              description:
                'Aspect ratio for the platform (e.g., "1:1" for Instagram feed, "9:16" for Stories/Reels, "16:9" for banner)',
              enum: ["1:1", "4:3", "3:4", "16:9", "9:16"],
            },
            productCategory: {
              type: "string",
              description:
                "Inferred product category used for camera/lens selection (cosmetics, food, fashion, personal_service, tech, abstract)",
            },
            cameraLens: {
              type: "string",
              description:
                'Camera and lens specification used in the prompt (e.g., "Canon EOS R5 with 85mm f/1.4")',
            },
            lightingSetup: {
              type: "string",
              description:
                'Lighting setup used in the prompt (e.g., "Soft studio lighting with beauty dish")',
            },
            compositionGuidance: {
              type: "string",
              description:
                'Composition approach used (e.g., "Rule of thirds with subject in left third, negative space right for text overlay")',
            },
            textSafeZone: {
              type: "string",
              description:
                'Area left clear for text compositing (e.g., "Upper third", "Right half"). Optional.',
            },
          },
          required: [
            "platform",
            "prompt",
            "style",
            "aspectRatio",
            "productCategory",
            "cameraLens",
            "lightingSetup",
            "compositionGuidance",
          ],
        },
      },
    },
    required: ["imagePrompts"],
  },
}

/**
 * Tool schema for pro mode: 2-3 variation sets per platform.
 * Each variation is a complete set of per-platform prompts with a theme label.
 */
export const ART_DIRECTOR_TOOL_SCHEMA_PRO: ToolSchema<ArtDirectorOutput> = {
  name: "deliver_image_prompt_variations",
  description:
    "Deliver 2-3 variation sets of image prompts. Each variation has a distinct theme and includes prompts for all platforms. All prompts reviewed against the 8-item quality checklist.",
  input_schema: {
    type: "object",
    properties: {
      variations: {
        type: "array",
        description:
          "2-3 variation sets, each with a distinct visual theme and complete platform coverage.",
        minItems: 2,
        maxItems: 3,
        items: {
          type: "object",
          properties: {
            variationTheme: {
              type: "string",
              description:
                'A label describing this variation\'s visual approach (e.g., "warm and intimate", "bold and energetic", "minimal and elegant")',
            },
            imagePrompts: {
              type: "array",
              description:
                "Complete set of image prompts for this variation, one per platform.",
              items: {
                type: "object",
                properties: {
                  platform: {
                    type: "string",
                    description: "Target platform (e.g., Instagram, LINE, X)",
                  },
                  prompt: {
                    type: "string",
                    description:
                      "The complete Flux 1.1 Pro Ultra image generation prompt. Must be at least 100 characters.",
                    minLength: 100,
                  },
                  style: {
                    type: "string",
                    description:
                      'Visual style category (e.g., "photorealistic", "editorial", "product", "lifestyle")',
                  },
                  aspectRatio: {
                    type: "string",
                    description: "Aspect ratio for the platform",
                    enum: ["1:1", "4:3", "3:4", "16:9", "9:16"],
                  },
                  productCategory: {
                    type: "string",
                    description: "Inferred product category for camera/lens selection",
                  },
                  cameraLens: {
                    type: "string",
                    description: "Camera and lens specification used in the prompt",
                  },
                  lightingSetup: {
                    type: "string",
                    description: "Lighting setup used in the prompt",
                  },
                  compositionGuidance: {
                    type: "string",
                    description: "Composition approach used",
                  },
                  textSafeZone: {
                    type: "string",
                    description:
                      "Area left clear for text compositing. Optional.",
                  },
                },
                required: [
                  "platform",
                  "prompt",
                  "style",
                  "aspectRatio",
                  "productCategory",
                  "cameraLens",
                  "lightingSetup",
                  "compositionGuidance",
                ],
              },
            },
          },
          required: ["variationTheme", "imagePrompts"],
        },
      },
    },
    required: ["variations"],
  },
}

/**
 * Returns the appropriate tool schema based on pipeline mode.
 */
export function getArtDirectorToolSchema(
  mode: "auto" | "pro"
): ToolSchema<ArtDirectorOutput> {
  return mode === "auto" ? ART_DIRECTOR_TOOL_SCHEMA_AUTO : ART_DIRECTOR_TOOL_SCHEMA_PRO
}

// ===== Private Section Builders =====

function buildRoleSection(): PromptSection {
  return {
    tag: "role",
    content: `You are an expert art director and Flux 1.1 Pro Ultra prompt engineer specializing in Japanese advertising photography. You generate detailed, photorealistic image prompts tailored to each campaign's product category, target audience, and creative direction. You are a meta-prompt system — you do not use fixed templates but craft case-specific prompts using your knowledge of photography, Flux capabilities, and Japanese advertising visual conventions.

Your prompts produce images that look like they were shot by a professional photographer with real camera equipment — not AI-generated. Every prompt you deliver has passed your internal quality review.`,
  }
}

function buildPhotographyKnowledgeSection(): PromptSection {
  // Build camera/lens database text from the shared constant
  const cameraLines = Object.entries(CAMERA_LENS_DATABASE)
    .map(
      ([category, spec]) =>
        `${category}:
  Camera: ${spec.camera}
  Lens: ${spec.lens}
  Lighting: ${spec.lighting}
  Rationale: ${spec.rationale}`
    )
    .join("\n\n")

  return {
    tag: "photography_knowledge",
    content: `Camera and Lens Selection by Category:

${cameraLines}

Lighting Techniques:
- Soft studio lighting / beauty dish: Flattering portraits, even skin tone, cosmetics/beauty
- Natural window light / warm tones: Appetizing food photography, authentic atmosphere
- Natural light / golden hour: Editorial fashion, environmental portraits
- Soft ambient / warm tones: Intimate personal service, approachable feel
- Clean studio / controlled: Product precision, tech/electronics detail
- Three-point lighting: Standard portrait setup with key, fill, and rim lights
- Rembrandt lighting: Dramatic portraiture with triangle shadow on cheek
- Split lighting: High contrast, editorial/fashion mood

Composition Rules:
- Rule of thirds: Place subject at intersection points for natural visual flow
- Leading lines: Guide the viewer's eye to the subject
- Negative space: Leave room for text overlay (Japanese advertising commonly overlays text on images)
- Symmetry: Formal, premium, luxury feeling
- Dynamic diagonals: Energy, movement, fashion/lifestyle
- Center composition: Authority, product hero shots, luxury items`,
  }
}

function buildFluxKnowledgeSection(): PromptSection {
  // Build skin realism counters text from the shared constant
  const skinCounterLines = SKIN_REALISM_COUNTERS.map(
    (counter) =>
      `- Anti-pattern: "${counter.antiPattern}"
  Counter: ${counter.counter}
  Keywords: ${counter.keywords}`
  ).join("\n")

  return {
    tag: "flux_specific_knowledge",
    content: `Flux 1.1 Pro Ultra Capabilities:
- Raw Mode: ALWAYS use Raw Mode for photorealistic output. It captures authentic candid photography feel and enhances diversity in human subjects.
- Word Order Priority: Front-load the most important elements. Priority: ${FLUX_CONFIG.priorityOrder.join(" > ")}. Flux pays more attention to what comes first in the prompt.
- NO Negative Prompts: Flux does NOT support negative prompts. All avoidance must be phrased positively. Instead of "no plastic skin," write "natural skin texture with visible pores."
- Aspect Ratios: 1:1 (Instagram feed), 4:3 (standard), 16:9 (wide/banner), 9:16 (Stories/Reels), 3:4 (portrait)
- Resolution: Up to 4MP for ultra-high detail
- Maximum prompt length: ${FLUX_CONFIG.maxPromptLength} characters — be specific but concise

Photorealism Keyword Stack (include in ALL people-focused prompts):
${PHOTOREALISM_KEYWORDS}

Skin Realism Anti-Patterns and Counters:
${skinCounterLines}`,
  }
}

function buildCategoryTemplatesSection(): PromptSection {
  return {
    tag: "category_templates",
    content: `Product Category Visual Conventions:

Cosmetics/Beauty:
- Beauty shot conventions: close-up, soft lighting, skin detail focus
- Lighting: beauty dish + soft fill, warm tones
- Focus: product application moment or result
- Models: Japanese women matching target demographic (age, style)
- Key: visible skin texture, natural imperfections, avoid poreless "AI skin"

Food/Restaurant:
- Appetizing composition: overhead or 45-degree angle, steam/motion cues
- Lighting: natural window light, warm color temperature
- Focus: hero dish with complementary styling elements
- Props: chopsticks, Japanese tableware, seasonal garnish
- Key: macro detail, bokeh background, warm inviting atmosphere

Fashion:
- Editorial styling: environmental context, lifestyle setting
- Lighting: natural light, golden hour, or studio with movement
- Focus: outfit in context, not isolated on white background
- Models: Japanese models in natural, asymmetric poses
- Key: authentic body language, environmental storytelling

Personal Service (salon/spa):
- Human connection: stylist-client interaction or result reveal
- Lighting: soft ambient, warm salon/spa environment
- Focus: the experience and result, not tools/products
- Setting: clean, inviting Japanese salon aesthetic
- Key: trust and warmth, candid natural moments

Tech/Product:
- Clean product focus: minimal background, precise lighting
- Lighting: controlled studio, clean shadows
- Focus: product detail, material texture, interface
- Style: precision, reliability, modern
- Key: macro detail on materials and finishes

Abstract/Conceptual:
- Brand mood imagery: colors, textures, patterns
- Lighting: creative, atmospheric
- Focus: emotional response, brand feeling
- Style: artistic, interpretive
- Key: composition and color harmony

Japanese Advertising Visual Conventions:
- Seasonal references: cherry blossoms (spring), fireworks/festival (summer), autumn leaves (fall), snow/New Year (winter)
- Visual harmony: balanced composition, appropriate negative space
- Trust signals in imagery: clean environments, organized settings, quality materials
- Demographic default: Japanese models and features for Japanese market advertising`,
  }
}

function buildSelfCritiqueSection(): PromptSection {
  const checklistLines = ART_DIRECTOR_QUALITY_CHECKLIST.map(
    (item) => `${item.id}. ${item.check}\n   Failure action: ${item.failureAction}`
  ).join("\n")

  return {
    tag: "self_critique",
    content: `MANDATORY: Before delivering your final prompts, review each prompt against this quality checklist. If any item fails, revise the prompt and note what you changed.

Quality Checklist:
${checklistLines}

Process:
1. Generate the image prompt
2. Review against ALL 8 checklist items
3. Note any failures
4. Revise the prompt to address failures
5. Deliver the final, quality-checked prompt

Include your self-critique reasoning in your thinking but output ONLY the final revised prompt through the tool.`,
  }
}

function buildAntiPatternsSection(): PromptSection {
  return {
    tag: "anti_patterns",
    content: `NEVER generate prompts containing these patterns:
- "perfect skin" / "flawless skin" / "poreless" / "smooth complexion" / "immaculate" -> Instead: "natural skin with visible pores and subtle imperfections"
- "beautiful" as the primary descriptor -> Instead: specific descriptors (warm smile, confident posture, thoughtful gaze)
- Generic model descriptions -> Instead: specific demographic, age-appropriate features, natural body language
- "professional photo" alone -> Instead: specific camera, lens, lighting, and composition
- "high quality" without technical specs -> Instead: "8K resolution, shot on [camera] with [lens]"
- Any negative prompt language (no, without, avoid, exclude) -> Instead: positive description of what IS present`,
  }
}

function buildExamplesSection(): PromptSection {
  return {
    tag: "examples",
    content: `Example A — Cosmetics Brief (People-focused):

Brief: New organic skincare line for Japanese women in their 30s. Platforms: Instagram, LINE.
Creative Direction: Warm, natural beauty concept emphasizing skin health. Soft, earth-tone palette.

Tool output:
{
  "imagePrompts": [
    {
      "platform": "Instagram",
      "prompt": "A Japanese woman in her early 30s with a gentle, confident smile, applying organic skincare serum to her cheek with her fingertips, natural skin texture with visible pores and subtle smile lines, subsurface scattering on her cheekbones, soft dewy finish, shot on Canon EOS R5 with 85mm f/1.4 lens, soft studio lighting with beauty dish creating even illumination and gentle shadows under the jawline, shallow depth of field with creamy bokeh, warm earth-tone palette with soft beige and muted green accents, composed using rule of thirds with the subject in the right two-thirds and negative space on the left for text overlay, candid expression of self-care enjoyment, 8K resolution",
      "style": "photorealistic",
      "aspectRatio": "1:1",
      "productCategory": "cosmetics",
      "cameraLens": "Canon EOS R5 with 85mm f/1.4",
      "lightingSetup": "Soft studio lighting with beauty dish, warm fill light",
      "compositionGuidance": "Rule of thirds, subject right, negative space left for text overlay",
      "textSafeZone": "Left third"
    },
    {
      "platform": "LINE",
      "prompt": "A Japanese woman in her early 30s holding a glass bottle of organic skincare serum close to her face, natural skin texture with visible pores and soft natural imperfections, warm smile with relaxed expression, shot on Canon EOS R5 with 85mm f/1.4 lens, soft beauty dish lighting with warm fill creating gentle shadows and natural skin dimension, subsurface scattering on forehead and cheeks, tight composition centered on face and product with soft bokeh background in muted sage green, 8K resolution, intimate close-up conveying trust and quality",
      "style": "photorealistic",
      "aspectRatio": "1:1",
      "productCategory": "cosmetics",
      "cameraLens": "Canon EOS R5 with 85mm f/1.4",
      "lightingSetup": "Beauty dish with warm fill light, soft shadows",
      "compositionGuidance": "Center composition, tight crop on face and product, soft background",
      "textSafeZone": "Bottom quarter"
    }
  ]
}

Self-critique applied: Added "visible pores" and "subtle smile lines" (checklist item 3), front-loaded Japanese woman subject (item 7), added text safe zone (item 8).

---

Example B — Food/Restaurant Brief (Product-focused):

Brief: Ramen shop grand opening in Shibuya. Signature tonkotsu ramen with rich broth. Platforms: Instagram, X.
Creative Direction: Appetizing, vibrant, steam and warmth. Bold, warm color palette.

Tool output:
{
  "imagePrompts": [
    {
      "platform": "Instagram",
      "prompt": "A steaming bowl of tonkotsu ramen with rich milky-white broth, perfectly arranged chashu pork slices with caramelized edges, soft-boiled ajitama egg cut in half revealing golden yolk, fresh green negi scattered on top, shot on Sony A7 IV with 50mm f/1.8 macro lens, natural window light from the left creating warm golden tones and gentle steam wisps catching the light, 45-degree overhead angle, Japanese ceramic bowl on a dark wood counter, shallow depth of field with bokeh background suggesting a warm ramen shop interior, macro detail on the broth surface showing oil droplets and texture, composed with the bowl slightly off-center following rule of thirds, 8K resolution",
      "style": "photorealistic",
      "aspectRatio": "1:1",
      "productCategory": "food",
      "cameraLens": "Sony A7 IV with 50mm f/1.8 macro",
      "lightingSetup": "Natural window light from left, warm golden tones",
      "compositionGuidance": "45-degree angle, rule of thirds with bowl off-center, negative space upper right",
      "textSafeZone": "Upper right corner"
    },
    {
      "platform": "X",
      "prompt": "Close-up of tonkotsu ramen broth surface showing rich milky texture and glistening oil droplets, steam rising in soft wisps, chashu pork edge visible at frame border, shot on Sony A7 IV with 50mm f/1.8 macro lens, warm natural window light creating inviting golden atmosphere, extremely shallow depth of field focusing on broth detail with everything else softly blurred, warm color temperature emphasizing the richness of the tonkotsu, tight composition with broth filling most of the frame, 8K resolution macro detail",
      "style": "photorealistic",
      "aspectRatio": "16:9",
      "productCategory": "food",
      "cameraLens": "Sony A7 IV with 50mm f/1.8 macro",
      "lightingSetup": "Natural window light, warm color temperature",
      "compositionGuidance": "Extreme close-up, broth as hero, minimal negative space for banner format"
    }
  ]
}

Self-critique applied: Front-loaded the food subject (item 7), added specific lighting "natural window light" (item 2), added composition direction (item 6). Skin realism items (3, 5) not applicable for food-only shots.

---

Example C — Fashion Brief (Lifestyle, abbreviated):

Brief: Spring collection for young Japanese professionals. Platforms: Instagram.
Creative Direction: Fresh, confident, urban lifestyle. Light pastel palette with city backdrop.

Tool output:
{
  "imagePrompts": [
    {
      "platform": "Instagram",
      "prompt": "A young Japanese woman in her mid-20s wearing a light pastel blazer and tailored trousers, walking confidently through a sunlit Tokyo street with cherry blossom trees in soft focus behind her, natural skin texture with visible pores and a relaxed authentic smile, asymmetric walking pose with natural body language, shot on Nikon Z9 with 35mm f/1.4 lens, golden hour natural light creating long warm shadows and rim lighting on hair and shoulders, subsurface scattering on face, composed with subject in the left third walking into the frame with negative space and blurred city environment on the right, 8K resolution editorial fashion photography",
      "style": "editorial",
      "aspectRatio": "4:3",
      "productCategory": "fashion",
      "cameraLens": "Nikon Z9 with 35mm f/1.4",
      "lightingSetup": "Golden hour natural light, rim lighting, warm shadows",
      "compositionGuidance": "Rule of thirds, subject left, walking into frame, environmental context right",
      "textSafeZone": "Right third"
    }
  ]
}

Self-critique applied: All 8 checklist items pass — camera/lens (1), lighting (2), skin realism (3), no anti-patterns (4), Japanese demographic (5), composition (6), subject front-loaded (7), text safe zone (8).`,
  }
}
