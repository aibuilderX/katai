/**
 * Internal AI Proxy endpoint
 *
 * Accepts Anthropic-format requests from n8n agent workflows,
 * routes to the configured AI provider (Anthropic or OpenAI),
 * and normalizes the response back to Anthropic format.
 *
 * This lets n8n workflows stay provider-agnostic — switching
 * providers is a single env var change (AI_PROVIDER).
 *
 * Security: HMAC-SHA256 signature verification.
 */

import { NextResponse } from "next/server"
import crypto from "crypto"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AnthropicRequest {
  model: string
  max_tokens: number
  temperature?: number
  system: string
  messages: Array<{ role: string; content: string }>
  tools?: Array<{
    name: string
    description: string
    input_schema: Record<string, unknown>
  }>
  tool_choice?: { type: string; name?: string }
}

interface AnthropicResponse {
  id: string
  type: "message"
  role: "assistant"
  content: Array<
    | { type: "text"; text: string }
    | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  >
  model: string
  stop_reason: string
  usage: { input_tokens: number; output_tokens: number }
}

// ---------------------------------------------------------------------------
// Provider config
// ---------------------------------------------------------------------------

const MODEL_MAP: Record<string, string> = {
  "claude-opus-4-6": process.env.OPENAI_MODEL || "gpt-4o",
  "claude-sonnet-4-6": process.env.OPENAI_MODEL || "gpt-4o",
  "claude-haiku-4-5-20251001": process.env.OPENAI_MODEL_FAST || "gpt-4o-mini",
}

// ---------------------------------------------------------------------------
// HMAC verification (shared with other internal endpoints)
// ---------------------------------------------------------------------------

function verifyHmac(body: string, signature: string | null): boolean {
  const secret = process.env.N8N_WEBHOOK_SECRET
  if (!secret || !signature) return false
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex")
  try {
    return crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"))
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Anthropic → OpenAI format translation
// ---------------------------------------------------------------------------

function translateRequestToOpenAI(anthropicReq: AnthropicRequest) {
  const messages: Array<{ role: string; content: string | null }> = []

  // System prompt → system message
  if (anthropicReq.system) {
    messages.push({ role: "system", content: anthropicReq.system })
  }

  // User/assistant messages
  for (const msg of anthropicReq.messages) {
    messages.push({ role: msg.role, content: msg.content })
  }

  // Tools translation
  const tools = anthropicReq.tools?.map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema,
    },
  }))

  // tool_choice translation
  let toolChoice: unknown = undefined
  if (anthropicReq.tool_choice) {
    if (anthropicReq.tool_choice.type === "tool" && anthropicReq.tool_choice.name) {
      toolChoice = {
        type: "function",
        function: { name: anthropicReq.tool_choice.name },
      }
    } else if (anthropicReq.tool_choice.type === "any") {
      toolChoice = "required"
    } else if (anthropicReq.tool_choice.type === "auto") {
      toolChoice = "auto"
    }
  }

  // Model mapping
  const model = MODEL_MAP[anthropicReq.model] || process.env.OPENAI_MODEL || "gpt-4o"

  return {
    model,
    max_tokens: anthropicReq.max_tokens,
    temperature: anthropicReq.temperature ?? 0.7,
    messages,
    ...(tools && tools.length > 0 ? { tools } : {}),
    ...(toolChoice !== undefined ? { tool_choice: toolChoice } : {}),
  }
}

// ---------------------------------------------------------------------------
// OpenAI → Anthropic response translation
// ---------------------------------------------------------------------------

function translateResponseToAnthropic(
  openaiResponse: Record<string, unknown>,
  originalModel: string
): AnthropicResponse {
  const choices = openaiResponse.choices as Array<{
    message: {
      role: string
      content: string | null
      tool_calls?: Array<{
        id: string
        type: string
        function: { name: string; arguments: string }
      }>
    }
    finish_reason: string
  }>

  const choice = choices?.[0]
  if (!choice) {
    return {
      id: (openaiResponse.id as string) || "msg_proxy",
      type: "message",
      role: "assistant",
      content: [{ type: "text", text: "No response from OpenAI" }],
      model: originalModel,
      stop_reason: "end_turn",
      usage: { input_tokens: 0, output_tokens: 0 },
    }
  }

  const content: AnthropicResponse["content"] = []

  // Text content
  if (choice.message.content) {
    content.push({ type: "text", text: choice.message.content })
  }

  // Tool calls → tool_use blocks
  if (choice.message.tool_calls) {
    for (const tc of choice.message.tool_calls) {
      let parsedArgs: Record<string, unknown> = {}
      try {
        parsedArgs = JSON.parse(tc.function.arguments)
      } catch {
        parsedArgs = { _raw: tc.function.arguments }
      }
      content.push({
        type: "tool_use",
        id: tc.id || `toolu_${crypto.randomBytes(12).toString("hex")}`,
        name: tc.function.name,
        input: parsedArgs,
      })
    }
  }

  // If no content at all, add empty text
  if (content.length === 0) {
    content.push({ type: "text", text: "" })
  }

  // Usage mapping
  const usage = openaiResponse.usage as {
    prompt_tokens?: number
    completion_tokens?: number
  } | undefined

  // Map finish_reason → stop_reason
  const stopReasonMap: Record<string, string> = {
    stop: "end_turn",
    tool_calls: "tool_use",
    length: "max_tokens",
    content_filter: "end_turn",
  }

  return {
    id: (openaiResponse.id as string) || "msg_proxy",
    type: "message",
    role: "assistant",
    content,
    model: originalModel,
    stop_reason: stopReasonMap[choice.finish_reason] || "end_turn",
    usage: {
      input_tokens: usage?.prompt_tokens || 0,
      output_tokens: usage?.completion_tokens || 0,
    },
  }
}

// ---------------------------------------------------------------------------
// Call Anthropic directly
// ---------------------------------------------------------------------------

async function callAnthropic(body: AnthropicRequest): Promise<AnthropicResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set")

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Anthropic API error ${response.status}: ${errorBody}`)
  }

  return response.json()
}

// ---------------------------------------------------------------------------
// Call OpenAI
// ---------------------------------------------------------------------------

async function callOpenAI(anthropicReq: AnthropicRequest): Promise<AnthropicResponse> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set")

  const openaiBody = translateRequestToOpenAI(anthropicReq)
  const baseUrl = process.env.OPENAI_API_BASE_URL || "https://api.openai.com/v1"

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(openaiBody),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`OpenAI API error ${response.status}: ${errorBody}`)
  }

  const openaiResponse = await response.json()
  return translateResponseToAnthropic(openaiResponse, anthropicReq.model)
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  const rawBody = await request.text()
  const signature = request.headers.get("x-signature")

  if (!verifyHmac(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  let body: AnthropicRequest
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const provider = (process.env.AI_PROVIDER || "anthropic").toLowerCase()

  try {
    let result: AnthropicResponse

    if (provider === "openai") {
      result = await callOpenAI(body)
    } else {
      result = await callAnthropic(body)
    }

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error(`[ai-proxy] ${provider} call failed:`, message)
    return NextResponse.json(
      {
        type: "error",
        error: { type: "api_error", message },
      },
      { status: 502 }
    )
  }
}
