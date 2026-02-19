/**
 * Art Director self-critique quality checklist.
 *
 * Grounded checklist for the Art Director's chain-of-thought self-critique loop.
 * The Art Director generates an image prompt, reviews it against this checklist,
 * revises based on failures, then outputs the final prompt.
 *
 * Research finding: Ungrounded self-critique leads to "reformulation rather than
 * progress" (Mirror Loop paper). A concrete checklist provides the grounding
 * needed for effective single-call self-correction.
 *
 * @see .planning/phases/09.1-agent-prompt-engineering-photorealistic-output/09.1-RESEARCH.md#5.6
 */

// ===== Types =====

export interface QualityCheckItem {
  id: number
  check: string
  failureAction: string
}

// ===== Quality Checklist =====

/**
 * 8-item quality checklist for Art Director prompt self-critique.
 * Each item has a verification check and a specific action to take on failure.
 */
export const ART_DIRECTOR_QUALITY_CHECKLIST: readonly QualityCheckItem[] = [
  {
    id: 1,
    check: "Does the prompt include a specific camera and lens specification?",
    failureAction:
      "Add the camera/lens from the category database. Example: 'shot on Canon EOS R5 with 85mm f/1.4 lens'.",
  },
  {
    id: 2,
    check: "Does the prompt include a specific lighting description?",
    failureAction:
      "Add lighting details from the category database. Example: 'soft studio lighting with beauty dish' or 'natural window light with warm tones'.",
  },
  {
    id: 3,
    check:
      "Does the prompt include skin realism keywords (for prompts featuring people)?",
    failureAction:
      "Add: 'natural skin texture with visible pores, subsurface scattering, candid expression'. Skip this check for product-only or environment-only prompts.",
  },
  {
    id: 4,
    check:
      "Does the prompt avoid anti-pattern language (perfect, flawless, smooth skin, porcelain, airbrushed)?",
    failureAction:
      "Remove anti-pattern words and replace with realism keywords. 'Flawless skin' becomes 'natural skin texture with subtle imperfections'. 'Perfect features' becomes 'authentic features with natural variation'.",
  },
  {
    id: 5,
    check:
      "Does the prompt specify Japanese demographic when featuring people?",
    failureAction:
      "Add 'Japanese' before the person description. Example: 'a Japanese woman in her 30s' not just 'a woman in her 30s'.",
  },
  {
    id: 6,
    check:
      "Does the prompt include composition direction (rule of thirds, leading lines, etc.)?",
    failureAction:
      "Add composition guidance. Example: 'composed using rule of thirds with the subject in the left third' or 'centered composition with symmetric framing'.",
  },
  {
    id: 7,
    check:
      "Does the prompt front-load the most important subject at the beginning?",
    failureAction:
      "Restructure to put the main subject first. Flux pays more attention to what comes first. Move subject description to the opening of the prompt.",
  },
  {
    id: 8,
    check:
      "Does the prompt respect safe zones for text compositing (if applicable)?",
    failureAction:
      "Add a soft guideline: 'Leave the top/bottom third relatively uncluttered for text overlay' or 'Position the main subject to allow text space in the opposite area'. Composition quality takes priority over this constraint.",
  },
] as const
