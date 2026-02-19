/**
 * Internal API endpoint: Build Agent Prompt
 *
 * Serializes agent prompts from Phase 9.1 TypeScript prompt builders.
 * This is the single source of truth for all agent prompts -- n8n
 * sub-workflows call this endpoint instead of inlining prompt content.
 *
 * Security: HMAC-SHA256 signature verification (same as webhook handler).
 *
 * Why this exists: The Phase 9.1 prompt builders contain embedded framework
 * knowledge (Schwartz levels, LF8 desires, copywriting frameworks, register
 * maps, Flux techniques, quality checklists). Inlining in n8n Code nodes
 * would create drift -- any builder update would not reach n8n workflows.
 */

import { NextResponse } from "next/server"
import crypto from "crypto"

// Strategic Insight agent
import {
  buildStrategicInsightSystemPrompt,
  buildStrategicInsightUserMessage,
  STRATEGIC_INSIGHT_TOOL_SCHEMA,
} from "@/lib/ai/prompts/agents/strategic-insight"

// Creative Director agent
import {
  buildCreativeDirectorSystemPrompt,
  buildCreativeDirectorUserMessage,
  getCreativeDirectorToolSchema,
} from "@/lib/ai/prompts/agents/creative-director"

// Copywriter agent
import {
  buildCopywriterSystemPrompt,
  buildCopywriterUserMessage,
  COPYWRITER_TOOL_SCHEMA,
} from "@/lib/ai/prompts/agents/copywriter"

// Art Director agent
import {
  buildArtDirectorSystemPrompt,
  buildArtDirectorUserMessage,
  getArtDirectorToolSchema,
} from "@/lib/ai/prompts/agents/art-director"

// JP Localization agent
import {
  buildJpLocalizationSystemPrompt,
  buildJpLocalizationUserMessage,
  buildJpLocalizationRevisionMessage,
  JP_LOCALIZATION_TOOL_SCHEMA,
} from "@/lib/ai/prompts/agents/jp-localization"

import { AGENT_CONFIG } from "@/lib/ai/prompts/shared/agent-config"
import { PLATFORM_COPY_CONSTRAINTS } from "@/lib/platforms/copy-constraints"

import type { CampaignBrief } from "@/types/campaign"
import type {
  N8nWebhookPayload,
  StrategicInsightOutput,
  CreativeDirectorOutput,
  CopywriterOutput,
  JpLocalizationOutput,
} from "@/types/pipeline"
import type { CopywriterBrief, CopywriterBrandProfile } from "@/lib/ai/prompts/agents/copywriter"
import type { JpLocalizationBrief, CritiqueHistoryEntry } from "@/lib/ai/prompts/agents/jp-localization"
import type { ArtDirectorUserInput } from "@/lib/ai/prompts/agents/art-director"

// ===== Request/Response Types =====

type AgentName = "strategicInsight" | "creativeDirector" | "copywriter" | "artDirector" | "jpLocalization"

interface BuildPromptRequest {
  agentName: AgentName
  brief: CampaignBrief
  brandProfile: N8nWebhookPayload["brandProfile"]
  agentConfig: N8nWebhookPayload["agentConfig"]
  mode: "auto" | "pro"
  upstreamOutputs?: {
    strategicInsight?: StrategicInsightOutput
    creativeDirector?: CreativeDirectorOutput
    copywriter?: CopywriterOutput
  }
  revisionContext?: {
    attemptNumber: number
    previousCritique: JpLocalizationOutput
    originalVariants: CopywriterOutput
  }
}

interface BuildPromptResponse {
  systemPrompt: string
  userMessage: string
  toolSchema: {
    name: string
    description: string
    input_schema: {
      type: "object"
      properties: Record<string, unknown>
      required: string[]
    }
  }
  toolChoice: { type: "tool"; name: string }
  temperature: number
  maxTokens: number
}

// ===== HMAC Verification =====

function verifySignature(body: string, signature: string): boolean {
  const secret = process.env.N8N_WEBHOOK_SECRET
  if (!secret) {
    console.error("N8N_WEBHOOK_SECRET is not set")
    return false
  }

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex")

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSignature, "hex")
    )
  } catch {
    return false
  }
}

// ===== Agent Prompt Builders =====

function buildStrategicInsight(
  req: BuildPromptRequest
): BuildPromptResponse {
  const config = AGENT_CONFIG.strategicInsight

  return {
    systemPrompt: buildStrategicInsightSystemPrompt(),
    userMessage: buildStrategicInsightUserMessage(req.brief, req.brandProfile),
    toolSchema: STRATEGIC_INSIGHT_TOOL_SCHEMA,
    toolChoice: { type: "tool", name: config.toolName },
    temperature: config.temperature,
    maxTokens: config.maxTokens,
  }
}

function buildCreativeDirector(
  req: BuildPromptRequest
): BuildPromptResponse {
  const config = AGENT_CONFIG.creativeDirector

  if (!req.upstreamOutputs?.strategicInsight) {
    throw new Error("creativeDirector requires upstreamOutputs.strategicInsight")
  }

  const toolSchema = getCreativeDirectorToolSchema(req.mode)

  return {
    systemPrompt: buildCreativeDirectorSystemPrompt(),
    userMessage: buildCreativeDirectorUserMessage(
      req.upstreamOutputs.strategicInsight,
      req.brief,
      req.brandProfile,
      req.mode
    ),
    toolSchema,
    toolChoice: { type: "tool", name: config.toolName },
    temperature: config.temperature,
    maxTokens: config.maxTokens,
  }
}

function buildCopywriter(
  req: BuildPromptRequest
): BuildPromptResponse {
  const config = AGENT_CONFIG.copywriter

  if (!req.upstreamOutputs?.strategicInsight) {
    throw new Error("copywriter requires upstreamOutputs.strategicInsight")
  }
  if (!req.upstreamOutputs?.creativeDirector) {
    throw new Error("copywriter requires upstreamOutputs.creativeDirector")
  }

  // Map brief and brandProfile to Copywriter-specific shapes
  const copywriterBrief: CopywriterBrief = {
    brandName: req.brandProfile.name,
    productInfo: req.brief.campaignProductInfo,
    targetAudience: req.brief.targetAudience,
    objective: req.brief.objective,
    platforms: req.brief.platforms,
    registerOverride: req.brief.registerOverride,
    creativeMoodTags: req.brief.creativeMoodTags,
  }

  const copywriterBrandProfile: CopywriterBrandProfile = {
    name: req.brandProfile.name,
    defaultRegister: req.brandProfile.defaultRegister,
    toneTags: req.brandProfile.toneTags,
    toneDescription: req.brandProfile.toneDescription,
    positioningStatement: req.brandProfile.positioningStatement,
    brandStory: req.brandProfile.brandStory,
    brandValues: req.brandProfile.brandValues,
  }

  // Get platform constraints for the requested platforms
  const platformConstraints = req.brief.platforms
    .map((p) => PLATFORM_COPY_CONSTRAINTS[p.toLowerCase()])
    .filter(Boolean)

  const productCategory = req.brief.campaignProductInfo || "general"

  return {
    systemPrompt: buildCopywriterSystemPrompt(productCategory),
    userMessage: buildCopywriterUserMessage(
      req.upstreamOutputs.creativeDirector,
      req.upstreamOutputs.strategicInsight,
      copywriterBrief,
      copywriterBrandProfile,
      platformConstraints
    ),
    toolSchema: COPYWRITER_TOOL_SCHEMA,
    toolChoice: { type: "tool", name: config.toolName },
    temperature: config.temperature,
    maxTokens: config.maxTokens,
  }
}

function buildArtDirector(
  req: BuildPromptRequest
): BuildPromptResponse {
  const config = AGENT_CONFIG.artDirector

  if (!req.upstreamOutputs?.strategicInsight) {
    throw new Error("artDirector requires upstreamOutputs.strategicInsight")
  }
  if (!req.upstreamOutputs?.creativeDirector) {
    throw new Error("artDirector requires upstreamOutputs.creativeDirector")
  }

  const si = req.upstreamOutputs.strategicInsight
  const cd = req.upstreamOutputs.creativeDirector

  // Map to Art Director-specific shapes
  const creativeDirection: ArtDirectorUserInput["creativeDirection"] = {
    visualConcept: cd.visualConcept,
    colorGuidance: cd.colorGuidance,
    compositionNotes: cd.compositionNotes,
    moodKeywords: cd.moodKeywords,
    platformAdaptations: cd.platformAdaptations,
  }

  const strategicInsight: ArtDirectorUserInput["strategicInsight"] = {
    awarenessLevel: si.awarenessLevel,
    primaryDesires: si.lf8Desires,
    targetInsight: si.targetInsight,
  }

  const brief: ArtDirectorUserInput["brief"] = {
    campaignProductInfo: req.brief.campaignProductInfo,
    targetAudience: req.brief.targetAudience,
    platforms: req.brief.platforms,
    creativeMoodTags: req.brief.creativeMoodTags,
    objective: req.brief.objective,
  }

  const brandProfile: ArtDirectorUserInput["brandProfile"] = {
    name: req.brandProfile.name,
    colors: req.brandProfile.colors,
    toneTags: req.brandProfile.toneTags,
  }

  const toolSchema = getArtDirectorToolSchema(req.mode)

  return {
    systemPrompt: buildArtDirectorSystemPrompt(),
    userMessage: buildArtDirectorUserMessage(
      creativeDirection,
      strategicInsight,
      brief,
      brandProfile,
      req.mode
    ),
    toolSchema,
    toolChoice: { type: "tool", name: config.toolName },
    temperature: config.temperature,
    maxTokens: config.maxTokens,
  }
}

function buildJpLocalization(
  req: BuildPromptRequest
): BuildPromptResponse {
  const config = AGENT_CONFIG.jpLocalization

  if (!req.upstreamOutputs?.strategicInsight) {
    throw new Error("jpLocalization requires upstreamOutputs.strategicInsight")
  }

  // Determine if this is a revision pass or initial review
  const isRevision = !!req.revisionContext

  const jpBrief: JpLocalizationBrief = {
    brandName: req.brandProfile.name,
    targetAudience: req.brief.targetAudience,
    platforms: req.brief.platforms,
    registerOverride: req.brief.registerOverride,
  }

  let userMessage: string

  if (isRevision && req.revisionContext) {
    // Build critique history from previous critique
    const critiqueHistory: CritiqueHistoryEntry[] = [
      {
        attemptNumber: req.revisionContext.attemptNumber - 1,
        qualityScore: req.revisionContext.previousCritique.qualityScore,
        approved: req.revisionContext.previousCritique.approved,
        issues: req.revisionContext.previousCritique.issues || [],
        overallNote: req.revisionContext.previousCritique.overallNote || "",
      },
    ]

    // Use the originalVariants (which have been revised by Copywriter)
    userMessage = buildJpLocalizationRevisionMessage(
      req.revisionContext.originalVariants,
      critiqueHistory,
      req.revisionContext.attemptNumber
    )
  } else {
    if (!req.upstreamOutputs?.copywriter) {
      throw new Error("jpLocalization initial review requires upstreamOutputs.copywriter")
    }

    userMessage = buildJpLocalizationUserMessage(
      req.upstreamOutputs.copywriter,
      req.upstreamOutputs.strategicInsight,
      jpBrief
    )
  }

  return {
    systemPrompt: buildJpLocalizationSystemPrompt(),
    userMessage,
    toolSchema: JP_LOCALIZATION_TOOL_SCHEMA,
    toolChoice: { type: "tool", name: config.toolName },
    temperature: config.temperature,
    maxTokens: config.maxTokens,
  }
}

// ===== Route Handler =====

const VALID_AGENTS: AgentName[] = [
  "strategicInsight",
  "creativeDirector",
  "copywriter",
  "artDirector",
  "jpLocalization",
]

const AGENT_BUILDERS: Record<AgentName, (req: BuildPromptRequest) => BuildPromptResponse> = {
  strategicInsight: buildStrategicInsight,
  creativeDirector: buildCreativeDirector,
  copywriter: buildCopywriter,
  artDirector: buildArtDirector,
  jpLocalization: buildJpLocalization,
}

export async function POST(request: Request) {
  // Read raw body for signature verification
  const rawBody = await request.text()

  // Verify HMAC signature
  const signature = request.headers.get("X-Signature")
  if (!signature) {
    return NextResponse.json(
      { error: "Missing X-Signature header" },
      { status: 401 }
    )
  }

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 401 }
    )
  }

  // Parse request
  let body: BuildPromptRequest
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 }
    )
  }

  // Validate agentName
  if (!body.agentName || !VALID_AGENTS.includes(body.agentName)) {
    return NextResponse.json(
      {
        error: `Unknown agentName: ${body.agentName}. Valid agents: ${VALID_AGENTS.join(", ")}`,
      },
      { status: 400 }
    )
  }

  // Validate required fields
  if (!body.brief) {
    return NextResponse.json(
      { error: "Missing required field: brief" },
      { status: 400 }
    )
  }
  if (!body.brandProfile) {
    return NextResponse.json(
      { error: "Missing required field: brandProfile" },
      { status: 400 }
    )
  }

  // Build prompt for the requested agent
  try {
    const builder = AGENT_BUILDERS[body.agentName]
    const response = builder(body)

    return NextResponse.json(response)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error building prompt"
    return NextResponse.json(
      { error: message },
      { status: 400 }
    )
  }
}
