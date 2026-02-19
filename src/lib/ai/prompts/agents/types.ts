/**
 * Shared types for agent prompt builders.
 *
 * All 5 agent prompt builders (Strategic Insight, Creative Director, Copywriter,
 * Art Director, JP Localization) implement the AgentPromptBuilder interface.
 * This ensures consistent prompt construction patterns across the system.
 *
 * Pattern: Each agent's prompt is a builder function (not a raw string),
 * providing type safety, testability, and composability.
 *
 * @see .planning/phases/09.1-agent-prompt-engineering-photorealistic-output/09.1-RESEARCH.md#7
 */

// ===== Core Interfaces =====

/**
 * Generic agent prompt builder interface.
 *
 * @template TInput - The input type the agent receives (e.g., campaign brief + upstream outputs)
 * @template TOutput - The output type the agent produces (matching its tool schema)
 */
export interface AgentPromptBuilder<TInput, TOutput> {
  /**
   * Build the system prompt with baked-in domain knowledge.
   * System prompt is in English (Claude's strongest reasoning language)
   * with output instructions specifying Japanese where needed.
   */
  buildSystemPrompt(input: TInput): string

  /**
   * Build the user message with the specific campaign context.
   * Contains the brief, upstream agent outputs, and any runtime parameters.
   */
  buildUserMessage(input: TInput): string

  /**
   * Get the tool schema for structured output via tool-use.
   * Used with tool_choice: { type: "tool", name: "..." } to force
   * schema-compliant JSON output.
   */
  getToolSchema(): ToolSchema<TOutput>
}

// ===== Prompt Section Types =====

/**
 * Tagged prompt section for XML-structured system prompts.
 * All agent prompts use XML tags to organize sections per Claude 4.6
 * best practices.
 *
 * Standard sections: <role>, <knowledge>, <task>, <constraints>,
 * <output_format>, <examples>
 */
export interface PromptSection {
  tag: string
  content: string
}

// ===== Few-Shot Example Types =====

/**
 * Few-shot example for demonstrating expected output format and quality.
 *
 * @template T - The output type matching the agent's tool schema
 *
 * Research recommendation:
 * - 1-3 examples per agent (diminishing returns beyond 3)
 * - Examples should match EXACT tool-use output format
 * - For creative tasks, use diverse examples showing range
 */
export interface FewShotExample<T> {
  description: string
  input: string
  output: T
}

// ===== Tool Schema Types =====

/**
 * Tool schema definition for Anthropic tool-use API.
 * Used to define the structured output format for each agent.
 */
export interface ToolSchema<_TOutput = unknown> {
  name: string
  description: string
  input_schema: {
    type: "object"
    properties: Record<string, unknown>
    required: string[]
  }
}

// ===== Utility Types =====

/**
 * Helper to build XML-tagged prompt sections into a single string.
 */
export function buildPromptFromSections(sections: PromptSection[]): string {
  return sections
    .map((section) => `<${section.tag}>\n${section.content}\n</${section.tag}>`)
    .join("\n\n")
}
