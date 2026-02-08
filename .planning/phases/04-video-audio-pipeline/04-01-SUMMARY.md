---
phase: 04-video-audio-pipeline
plan: 01
subsystem: ai, api
tags: [runway, elevenlabs, kling, fal.ai, heygen, video, tts, circuit-breaker]

# Dependency graph
requires:
  - phase: 03-multi-platform-formatting
    provides: "Complete image+copy campaign pipeline with platform formatting"
provides:
  - "Typed Runway Gen-4 image-to-video client (generateCinematicVideo)"
  - "Typed ElevenLabs Japanese TTS client (generateJapaneseVoiceover)"
  - "Typed Kling video client via fal.ai (generateKlingVideo)"
  - "Typed HeyGen avatar video client (generateAvatarVideo)"
  - "Extended CampaignProgress with voiceoverStatus, videoStatus, avatarStatus"
  - "Video provider constants with cost tables, fallback mappings, platform aspect ratios"
  - "ProviderHealthTracker singleton with circuit breaker pattern"
affects: [04-02-pipeline-orchestration, 04-03-progressive-ui]

# Tech tracking
tech-stack:
  added: ["@runwayml/sdk ^3.11.0", "@elevenlabs/elevenlabs-js ^2.34.0"]
  patterns: ["Circuit breaker for provider health", "fal.ai queue API polling", "HeyGen REST API polling"]

key-files:
  created:
    - "src/lib/ai/runway.ts"
    - "src/lib/ai/elevenlabs.ts"
    - "src/lib/ai/kling.ts"
    - "src/lib/ai/heygen.ts"
    - "src/lib/constants/video-providers.ts"
    - "src/lib/ai/provider-health.ts"
  modified:
    - "src/types/campaign.ts"
    - "src/lib/db/schema.ts"
    - "package.json"

key-decisions:
  - "Runway Gen-4 Turbo ratio corrected to 1280:720 (SDK constraint, not 1920:1080 as originally planned)"
  - "Kling accessed via fal.ai proxy for simpler API key auth (no JWT token management)"
  - "ElevenLabs applyLanguageTextNormalization omitted to avoid latency; enable if intonation issues observed"
  - "Provider health tracker is in-memory only (resets on server restart, acceptable for MVP)"

patterns-established:
  - "Provider client pattern: single async function per module, env var check, submit-poll-retrieve"
  - "Circuit breaker: 3 consecutive failures opens circuit, 5-min cooldown for half-open retry"
  - "Cost-ordered generation: voiceover -> video -> cinematic -> avatar (cheapest first)"

# Metrics
duration: 6min
completed: 2026-02-09
---

# Phase 4 Plan 1: Provider Client Modules Summary

**4 typed video/audio provider clients (Runway, ElevenLabs, Kling, HeyGen) with circuit breaker health tracking and centralized provider constants**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-08T18:38:56Z
- **Completed:** 2026-02-08T18:44:44Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Installed official SDKs for Runway (@runwayml/sdk) and ElevenLabs (@elevenlabs/elevenlabs-js)
- Extended CampaignProgress type in both campaign.ts and schema.ts with voiceoverStatus, videoStatus, avatarStatus
- Created 4 provider client modules following the established async submit-poll-retrieve pattern from flux.ts
- Created centralized video provider constants with cost tables, fallback mappings, and platform aspect ratio mappings
- Created ProviderHealthTracker with circuit breaker pattern for fallback routing decisions

## Task Commits

Each task was committed atomically:

1. **Task 1: Install SDKs, extend types, create provider constants** - `3b37024` (feat)
2. **Task 2: Create provider client modules** - `a9345e0` (feat)

## Files Created/Modified
- `src/lib/ai/runway.ts` - Runway Gen-4 Turbo image-to-video client using official SDK
- `src/lib/ai/elevenlabs.ts` - ElevenLabs Japanese TTS client using official SDK
- `src/lib/ai/kling.ts` - Kling video generation client via fal.ai queue REST API
- `src/lib/ai/heygen.ts` - HeyGen avatar video generation client via REST API
- `src/lib/constants/video-providers.ts` - VIDEO_PROVIDERS, FALLBACK_MAP, PLATFORM_ASPECT_RATIOS, GENERATION_ORDER
- `src/lib/ai/provider-health.ts` - ProviderHealthTracker singleton with circuit breaker logic
- `src/types/campaign.ts` - Added voiceoverStatus, videoStatus, avatarStatus to CampaignProgress
- `src/lib/db/schema.ts` - Mirrored CampaignProgress extension for schema consistency
- `package.json` - Added @runwayml/sdk and @elevenlabs/elevenlabs-js dependencies

## Decisions Made
- [04-01]: Runway Gen-4 Turbo aspect ratios corrected to SDK-valid values (1280:720, 720:1280, 960:960 instead of 1920:1080, 1080:1920)
- [04-01]: Kling accessed via fal.ai proxy to avoid JWT token management complexity
- [04-01]: ElevenLabs language text normalization omitted by default (latency concern; documented for future activation)
- [04-01]: Provider health tracker is in-memory only (acceptable for MVP, resets on restart)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Runway aspect ratio values to match SDK type constraints**
- **Found during:** Task 2 (Runway client module creation)
- **Issue:** Plan specified `1920:1080`, `1080:1920`, `960:960` as Runway Gen-4 Turbo ratios, but the SDK's TypeScript types enforce `1280:720`, `720:1280`, `1104:832`, `832:1104`, `960:960`, `1584:672`
- **Fix:** Updated constants and client to use `1280:720` as the 16:9 default instead of `1920:1080`
- **Files modified:** `src/lib/constants/video-providers.ts`, `src/lib/ai/runway.ts`
- **Verification:** `pnpm build` passes with no type errors
- **Committed in:** a9345e0 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Essential for type safety. The SDK would reject invalid ratio values at compile time. No scope creep.

## Issues Encountered
None

## User Setup Required

**External services require manual configuration.** See [04-USER-SETUP.md](./04-USER-SETUP.md) for:
- 8 environment variables (RUNWAYML_API_SECRET, ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID_JP_FEMALE, ELEVENLABS_VOICE_ID_JP_MALE, FAL_KEY, HEYGEN_API_KEY, HEYGEN_DEFAULT_AVATAR_ID, HEYGEN_JP_VOICE_ID)
- Account setup for Runway, ElevenLabs, fal.ai, HeyGen
- Voice and avatar selection in provider dashboards

## Next Phase Readiness
- All 4 provider client modules ready for pipeline orchestration (04-02)
- CampaignProgress type ready for progressive status tracking (04-03)
- Provider health tracker ready for fallback routing decisions (04-02)
- User must complete 04-USER-SETUP.md before provider clients can be used at runtime

---
*Phase: 04-video-audio-pipeline*
*Completed: 2026-02-09*
