/**
 * Per-agent configuration for the 5-agent pipeline.
 *
 * Maps each agent to temperature, effort level, model tier, tool name,
 * and max token settings. Values based on research section 2.2 and 7.2.
 *
 * Note: All agents default to claude-opus-4-6 via AGENT_*_MODEL env vars
 * per Phase 8 decision. The `modelTier` field documents the research
 * recommendation for future cost optimization when usage data is available.
 *
 * Temperature gradient:
 * - 0.2 for analytical/evaluative agents (consistency)
 * - 0.5 for creative-but-structured agents (balance)
 * - 0.7 for creative writing agents (variety)
 *
 * @see .planning/phases/09.1-agent-prompt-engineering-photorealistic-output/09.1-RESEARCH.md#2.2
 * @see .planning/phases/09.1-agent-prompt-engineering-photorealistic-output/09.1-RESEARCH.md#7.2
 */

// ===== Types =====

export type AgentName =
  | "strategicInsight"
  | "creativeDirector"
  | "copywriter"
  | "artDirector"
  | "jpLocalization"

export type ModelTier = "opus" | "sonnet"
export type EffortLevel = "high" | "medium" | "low"

export interface AgentConfigEntry {
  temperature: number
  effort: EffortLevel
  modelTier: ModelTier
  toolName: string
  maxTokens: number
}

// ===== Agent Configuration =====

/**
 * Per-agent settings for the pipeline.
 *
 * - strategicInsight: Low temperature, high effort — analytical classification needs consistency
 * - creativeDirector: Medium temperature, medium effort — creative but needs structure
 * - copywriter: Higher temperature, medium effort — creative writing benefits from variety
 * - artDirector: Medium temperature, high effort — complex prompt generation needs deliberation
 * - jpLocalization: Low temperature, high effort — quality evaluation needs consistency
 */
export const AGENT_CONFIG: Record<AgentName, AgentConfigEntry> = {
  strategicInsight: {
    temperature: 0.2,
    effort: "high",
    modelTier: "opus",
    toolName: "deliver_strategic_insight",
    maxTokens: 4096,
  },
  creativeDirector: {
    temperature: 0.5,
    effort: "medium",
    modelTier: "opus",
    toolName: "deliver_creative_direction",
    maxTokens: 4096,
  },
  copywriter: {
    temperature: 0.7,
    effort: "medium",
    modelTier: "sonnet",
    toolName: "deliver_platform_copy",
    maxTokens: 8192,
  },
  artDirector: {
    temperature: 0.5,
    effort: "high",
    modelTier: "sonnet",
    toolName: "deliver_image_prompts",
    maxTokens: 4096,
  },
  jpLocalization: {
    temperature: 0.2,
    effort: "high",
    modelTier: "opus",
    toolName: "deliver_localization_review",
    maxTokens: 4096,
  },
} as const
