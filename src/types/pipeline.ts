/**
 * v1.1 Pipeline types for 7-agent orchestration.
 *
 * These types define the data contracts between:
 * - Next.js app and n8n (webhook payload)
 * - n8n agents (PipelineState accumulation)
 * - n8n and Next.js (callback payload)
 * - Dashboard UI (milestone progress)
 */

import type { BrandColors, ProductCatalogEntry } from "@/lib/db/schema"

// ===== Pipeline Milestones (Progress Display) =====

/**
 * Milestone-based progress for the v1.1 pipeline.
 * User decision: 3-4 high-level milestones, Japanese labels, no agent internals exposed.
 */
export interface PipelineMilestone {
  id: "strategy" | "content" | "assets" | "packaging"
  label: string        // Japanese label shown to user
  status: "pending" | "active" | "complete" | "failed"
  startedAt?: string   // ISO timestamp -- used for elapsed time counter
  completedAt?: string // ISO timestamp
  error?: string       // Friendly Japanese error message (only for critical-stop failures)
}

/**
 * Milestone definitions with agent-to-milestone mapping.
 * Claude's discretion: mapping agents to the 4 user-decided milestones.
 */
export const PIPELINE_MILESTONES: readonly {
  id: PipelineMilestone["id"]
  label: string
  agents: string[]
  criticalStop: boolean
}[] = [
  {
    id: "strategy",
    label: "\u6226\u7565\u5206\u6790\u4e2d",
    agents: ["strategic_insight"],
    criticalStop: true,  // Strategic Insight failure stops pipeline
  },
  {
    id: "content",
    label: "\u30b3\u30f3\u30c6\u30f3\u30c4\u4f5c\u6210\u4e2d",
    agents: ["creative_director", "copywriter", "jp_localization"],
    criticalStop: false, // Creative Director is critical-stop within this milestone, but Copywriter/JP Localization are partial-delivery
  },
  {
    id: "assets",
    label: "\u30a2\u30bb\u30c3\u30c8\u751f\u6210\u4e2d",
    agents: ["art_director"],
    criticalStop: false, // Art Director is partial-delivery
  },
  {
    id: "packaging",
    label: "\u30d1\u30c3\u30b1\u30fc\u30b8\u30f3\u30b0",
    agents: [],
    criticalStop: false, // Compositing, resize, ZIP -- all partial-delivery
  },
] as const

/**
 * Friendly Japanese error messages for critical-stop failures.
 * User decision: only 2 messages needed (Strategic Insight + Creative Director).
 */
export const CRITICAL_STOP_ERRORS = {
  strategic_insight:
    "\u6226\u7565\u5206\u6790\u3092\u5b8c\u4e86\u3067\u304d\u307e\u305b\u3093\u3067\u3057\u305f\u3002\u304a\u624b\u6570\u3067\u3059\u304c\u3001\u3082\u3046\u4e00\u5ea6\u304a\u8a66\u3057\u304f\u3060\u3055\u3044\u3002",
  creative_director:
    "\u30af\u30ea\u30a8\u30a4\u30c6\u30a3\u30d6\u306e\u65b9\u5411\u6027\u3092\u751f\u6210\u3067\u304d\u307e\u305b\u3093\u3067\u3057\u305f\u3002\u304a\u624b\u6570\u3067\u3059\u304c\u3001\u3082\u3046\u4e00\u5ea6\u304a\u8a66\u3057\u304f\u3060\u3055\u3044\u3002",
} as const

// ===== PipelineState (Agent Scratchpad) =====

/**
 * Structured JSON object that accumulates each agent's output through the pipeline.
 * ORCH-03: Accumulates agent outputs. ORCH-13: Only structured JSON summaries, not full reasoning.
 *
 * Each agent writes to its designated section. Downstream agents read upstream sections.
 * The scratchpad pattern means agents pass structured summaries, not full reasoning chains.
 */
export interface PipelineState {
  version: "v1.1"
  campaignId: string
  mode: "auto" | "pro"
  status: "running" | "complete" | "partial" | "failed"

  // Agent output sections (populated as pipeline progresses)
  strategicInsight?: StrategicInsightOutput
  creativeDirector?: CreativeDirectorOutput
  copywriter?: CopywriterOutput
  artDirector?: ArtDirectorOutput
  jpLocalization?: JpLocalizationOutput

  // Error tracking for partial delivery (ORCH-12)
  agentErrors: AgentError[]

  // Metadata
  startedAt: string
  completedAt?: string
}

/**
 * Strategic Insight agent output.
 * Quality gate: must pass schema validation with minimum required fields before pipeline continues.
 *
 * Phase 9.1 updates: typed awareness/framework literals, confidence scores,
 * Japanese desire nuance, framework rationale, market context, Japanese summary.
 */
export interface StrategicInsightOutput {
  awarenessLevel: "unaware" | "problem_aware" | "solution_aware" | "product_aware" | "most_aware"
  awarenessConfidence?: "high" | "medium" | "low"
  lf8Desires: string[]            // At least one LF8 desire identified
  desireConfidence?: "high" | "medium" | "low"
  japaneseDesireNuance?: string   // Cultural overlay (wa, bi_ishiki, anshin)
  copywritingFramework: "PAS" | "AIDA" | "BAB" | "AIDMA" | "AISAS"
  frameworkConfidence?: "high" | "medium" | "low"
  frameworkRationale?: string     // Why this framework for this brief
  targetInsight: string           // Substantive audience insight (min 10 chars)
  creativeDirection: string       // Direction for Creative Director (min 10 chars)
  keyMessages: string[]           // Core messages to convey
  tonalGuidance: string           // Register and tone recommendation
  marketContext?: string          // Brief competitive/market context
  summaryJa?: string              // ~10 word Japanese summary
}

/**
 * Creative Director agent output.
 *
 * Phase 9.1 updates: concept distillation, copy direction, Japanese summary.
 */
export interface CreativeDirectorOutput {
  concept?: string                // One-sentence concept distillation
  visualConcept: string           // Overall visual direction
  colorGuidance: string           // Color palette recommendation
  compositionNotes: string        // Layout and composition direction
  moodKeywords: string[]          // Visual mood keywords
  copyDirection?: string          // Tonal guidance for Copywriter
  platformAdaptations: Record<string, string>  // Per-platform visual notes
  summaryJa?: string              // Japanese summary
}

/**
 * Copywriter agent output.
 *
 * Phase 9.1 updates: rationaleNotes per variant explaining register choice,
 * CTA style, and key word decisions.
 */
export interface CopywriterOutput {
  variants: {
    platform: string
    variantLabel: string
    headline: string
    body: string
    cta: string
    hashtags: string[]
    register: string
    rationaleNotes?: string       // Explaining register choice, CTA style, key word choices
  }[]
}

/**
 * Art Director agent output.
 *
 * Phase 9.1 updates: removed negativePrompt (Flux does not support it),
 * added productCategory, cameraLens, lightingSetup, compositionGuidance,
 * textSafeZone for photorealistic prompt engineering.
 */
export interface ArtDirectorOutput {
  imagePrompts: {
    platform: string
    prompt: string
    style: string
    aspectRatio: string
    productCategory?: string      // Inferred product category for camera/lens selection
    cameraLens?: string           // Camera and lens specification used
    lightingSetup?: string        // Lighting description used
    compositionGuidance?: string  // Composition direction (rule of thirds, etc.)
    textSafeZone?: string         // Area left clear for text compositing
  }[]
}

/**
 * JP Localization agent output.
 *
 * Phase 9.1 updates: structured critique issues with platform/variant/field
 * specificity, compliance flags for early warning, overall note, Japanese summary.
 */
export interface JpLocalizationOutput {
  approved: boolean
  revisionsApplied: number        // 0 = first pass approved, 1-2 = revisions needed
  localizationNotes: string       // What was adjusted and why
  qualityScore: number            // 0-100
  issues?: {
    platform: string
    variant: string
    field: string
    category: string
    issue: string
    suggestion: string
    severity: "critical" | "moderate" | "minor"
  }[]
  complianceFlags?: string[]      // Early warning flags for obvious compliance violations
  overallNote?: string            // Summary feedback
  summaryJa?: string              // ~10 word Japanese summary
}

export interface AgentError {
  agentName: string
  timestamp: string
  message: string
  retryAttempted: boolean         // ORCH-10: 1 silent auto-retry
  retrySucceeded?: boolean
  isCriticalStop: boolean         // Strategic Insight or Creative Director
}

// ===== Webhook Payload (Next.js -> n8n) =====

/**
 * Expanded webhook payload sent from Next.js to n8n when triggering a campaign.
 * v1.0 fields preserved for backward compatibility. v1.1 fields added.
 */
export interface N8nWebhookPayload {
  // v1.0 fields (preserved)
  campaignId: string
  brief: {
    brandProfileId: string
    objective: string
    targetAudience: string
    platforms: string[]
    registerOverride?: string
    creativeMoodTags: string[]
    creativeDirection: string
    referenceImageUrl?: string
    campaignProductInfo?: string
  }
  brandProfile: {
    id: string
    name: string
    colors: BrandColors | null
    fontPreference: string | null
    defaultRegister: string
    toneTags: string[] | null
    toneDescription: string | null
    productCatalog: ProductCatalogEntry[] | null
    positioningStatement: string | null
    brandStory: string | null
    targetMarket: string | null
    brandValues: string[] | null
  }

  // v1.1 fields (new)
  mode: "auto" | "pro"
  brandMemory: BrandVoiceSummary | null   // null until Phase 11 populates
  agentConfig: {
    strategicInsight: { model: string }
    creativeDirector: { model: string }
    copywriter: { model: string }
    artDirector: { model: string }
    jpLocalization: { model: string }
  }
  pipelineVersion: "v1.0" | "v1.1"
}

// ===== Callback Payload (n8n -> Next.js) =====

/**
 * Expanded callback payload sent from n8n back to Next.js.
 * Supports both v1.0 stage-based updates and v1.1 milestone-based updates.
 */
export interface N8nCallbackPayload {
  campaignId: string
  status: "success" | "failure" | "progress" | "partial"
  pipelineVersion?: "v1.0" | "v1.1"

  // v1.0 fields (preserved for backward compat)
  copyVariants?: {
    platform: string
    variantLabel: string
    register: string
    headline: string
    body: string
    cta: string
    hashtags: string[]
  }[]
  imageUrls?: string[]
  videoAssets?: {
    url: string
    provider: string
    aspectRatio: string
    duration: number
    type: string
    mimeType: string
  }[]
  audioAssets?: {
    url: string
    provider: string
    duration: number
    mimeType: string
    voiceId: string
  }[]
  stage?: string
  error?: string

  // v1.1 fields (new)
  milestone?: PipelineMilestone         // Current milestone update
  pipelineState?: PipelineState         // Full pipeline state on completion
  costEntries?: CostEntry[]             // Cost entries to persist
  agentError?: AgentError               // Agent-specific error
}

/**
 * Cost entry for persisting to campaign_costs table.
 * Sent from n8n after each agent call or provider call.
 */
export interface CostEntry {
  entryType: "agent" | "provider"
  // Agent fields
  agentName?: string
  modelUsed?: string
  inputTokens?: number
  outputTokens?: number
  // Provider fields
  providerName?: string
  operationType?: string
  durationMs?: number
  // Shared
  costYen: number
  success: boolean
  errorMessage?: string
  metadata?: Record<string, unknown>
}

// ===== Brand Memory Types =====

export interface BrandMemorySignal {
  source: "favorite" | "approval" | "register_selection" | "campaign_feedback"
  campaignId: string
  signalType: "tone_preference" | "cta_style" | "keigo_level" | "visual_preference"
  value: string
  confidence: number    // 0.0 to 1.0
  extractedAt: string   // ISO timestamp
}

export interface BrandVoiceSummary {
  sentenceLength: "short" | "medium" | "long"
  keigoLevel: "casual" | "standard" | "formal"
  ctaStyle: "direct" | "soft" | "question"
  preferredExpressions: string[]
  avoidExpressions: string[]
  lastUpdated: string   // ISO timestamp
}
