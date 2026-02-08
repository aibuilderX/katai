/**
 * Video and audio provider configurations, fallback mappings,
 * platform-to-aspect-ratio mappings, and generation order constants.
 *
 * Central source of truth for all video/audio pipeline configuration.
 * Consumed by provider client modules and pipeline orchestration.
 */

// ===== TypeScript Interfaces =====

export interface VideoProvider {
  id: string
  name: string
  /** Cost per second of generated video (USD). Not applicable to TTS. */
  costPerSecond?: number
  /** Cost per character for TTS (USD). Only applicable to ElevenLabs. */
  costPerChar?: number
  /** Cost per minute for avatar video (USD). Only applicable to HeyGen. */
  costPerMinute?: number
  /** Maximum video duration in seconds. */
  maxDuration?: number
  /** Supported aspect ratios for video output. */
  supportedAspectRatios?: string[]
  /** Authentication method used by this provider. */
  authType: "sdk" | "api-key"
}

export interface FallbackMap {
  [providerId: string]: string
}

export interface PlatformAspectRatios {
  [platformId: string]: string[]
}

// ===== Provider Configurations =====

export const VIDEO_PROVIDERS: Record<string, VideoProvider> = {
  kling: {
    id: "kling",
    name: "Kling",
    costPerSecond: 0.07,
    maxDuration: 10,
    supportedAspectRatios: ["16:9", "9:16", "1:1"],
    authType: "api-key",
  },
  runway: {
    id: "runway",
    name: "Runway Gen-4",
    costPerSecond: 0.05,
    maxDuration: 10,
    supportedAspectRatios: ["1920:1080", "1080:1920", "960:960"],
    authType: "sdk",
  },
  elevenlabs: {
    id: "elevenlabs",
    name: "ElevenLabs",
    costPerChar: 0.00033,
    authType: "sdk",
  },
  heygen: {
    id: "heygen",
    name: "HeyGen",
    costPerMinute: 0.5,
    maxDuration: 60,
    authType: "api-key",
  },
}

// ===== Fallback Routing =====

/**
 * Fallback provider mapping for video generation.
 * When a primary provider fails, route to the fallback.
 * HeyGen has no fallback -- it provides a unique avatar capability.
 */
export const FALLBACK_MAP: FallbackMap = {
  kling: "runway",
  runway: "kling",
}

// ===== Platform Aspect Ratios =====

/**
 * Maps platform IDs to the video aspect ratios required for that platform.
 * Used to determine which aspect ratios to generate for a campaign's selected platforms.
 */
export const PLATFORM_ASPECT_RATIOS: PlatformAspectRatios = {
  youtube: ["16:9"],
  instagram_feed: ["1:1"],
  instagram_story: ["9:16"],
  tiktok: ["9:16"],
  line: ["1:1"],
  x_twitter: ["16:9"],
}

// ===== Generation Order =====

/**
 * Defines the pipeline execution order for video/audio generation.
 * Order is critical for cost control: cheapest assets first, expensive last.
 * If an early step fails, halt before spending on expensive later steps.
 *
 * 1. voiceover -- cheapest (~$0.01), needed by avatar for lip-sync
 * 2. video -- medium cost (~$0.70/video), uses composited images
 * 3. cinematic -- higher cost (~$0.50), Runway Gen-4 premium
 * 4. avatar -- highest cost (~$1.00+), depends on voiceover
 */
export const GENERATION_ORDER = [
  "voiceover",
  "video",
  "cinematic",
  "avatar",
] as const

export type GenerationStep = (typeof GENERATION_ORDER)[number]
