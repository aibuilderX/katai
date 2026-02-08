/**
 * ElevenLabs Japanese TTS client.
 *
 * Uses the official @elevenlabs/elevenlabs-js SDK for text-to-speech conversion.
 * Generates natural Japanese voiceover audio from ad copy text.
 *
 * Model: eleven_multilingual_v2 (best Japanese support, ~300ms latency)
 * Output: MP3 at 44.1kHz / 128kbps
 * Cost: ~$0.00033 per character (1 credit = 1 char on Starter plan)
 *
 * Note: This is a synchronous API call -- no polling needed.
 * The SDK returns a ReadableStream that is consumed into a Buffer.
 *
 * @see https://elevenlabs.io/docs/api-reference/text-to-speech/convert
 */

import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js"

/**
 * Generate Japanese voiceover audio from text.
 *
 * Converts the provided Japanese text into speech using the specified voice.
 * Returns the audio as a Buffer along with an estimated duration.
 *
 * @param text - Japanese text to convert to speech
 * @param voiceId - ElevenLabs voice ID (get from dashboard or GET /v1/voices)
 * @param options - Optional model override
 * @param options.modelId - TTS model to use (default: "eleven_multilingual_v2")
 * @returns Object with audio buffer and estimated duration in seconds
 * @throws Error if ELEVENLABS_API_KEY is not set or API call fails
 *
 * @remarks
 * `applyLanguageTextNormalization` is omitted by default to avoid latency.
 * Enable it if Japanese intonation issues are observed (especially with
 * numbers, dates, or katakana loanwords).
 */
export async function generateJapaneseVoiceover(
  text: string,
  voiceId: string,
  options?: { modelId?: string }
): Promise<{ buffer: Buffer; durationEstimate: number }> {
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) {
    throw new Error(
      "ELEVENLABS_API_KEY is not set. Get your API key from https://elevenlabs.io/app/settings/api-keys"
    )
  }

  const client = new ElevenLabsClient({ apiKey })

  // Generate speech -- returns ReadableStream<Uint8Array>
  const audioStream = await client.textToSpeech.convert(voiceId, {
    text,
    modelId: options?.modelId ?? "eleven_multilingual_v2",
    outputFormat: "mp3_44100_128",
    languageCode: "ja",
  })

  // Convert ReadableStream to Buffer by reading all chunks
  const chunks: Uint8Array[] = []
  const reader = audioStream.getReader()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) {
      chunks.push(value)
    }
  }
  const buffer = Buffer.concat(chunks)

  // Estimate duration: MP3 at 128kbps = ~16KB per second
  const durationEstimate = Math.round(buffer.length / 16000)

  return { buffer, durationEstimate }
}
