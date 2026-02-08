# Phase 4: User Setup Required

**Generated:** 2026-02-09
**Phase:** 04-video-audio-pipeline
**Status:** Incomplete

Complete these items for the video/audio provider integrations to function. Claude automated everything possible; these items require human access to external dashboards/accounts.

## Environment Variables

| Status | Variable | Source | Add to |
|--------|----------|--------|--------|
| [ ] | `RUNWAYML_API_SECRET` | Runway Dashboard -> API Keys (https://app.runwayml.com) | `.env.local` |
| [ ] | `ELEVENLABS_API_KEY` | ElevenLabs Dashboard -> API Keys (https://elevenlabs.io/app/settings/api-keys) | `.env.local` |
| [ ] | `ELEVENLABS_VOICE_ID_JP_FEMALE` | ElevenLabs Dashboard -> Voices (pick a Japanese female voice ID) | `.env.local` |
| [ ] | `ELEVENLABS_VOICE_ID_JP_MALE` | ElevenLabs Dashboard -> Voices (pick a Japanese male voice ID) | `.env.local` |
| [ ] | `FAL_KEY` | fal.ai Dashboard -> API Keys (https://fal.ai/dashboard/keys) | `.env.local` |
| [ ] | `HEYGEN_API_KEY` | HeyGen Dashboard -> API Settings (https://app.heygen.com/settings) | `.env.local` |
| [ ] | `HEYGEN_DEFAULT_AVATAR_ID` | HeyGen Dashboard -> Avatars (select a JP-presenting avatar) | `.env.local` |
| [ ] | `HEYGEN_JP_VOICE_ID` | HeyGen Dashboard -> Voices (select a Japanese voice) | `.env.local` |

## Account Setup

- [ ] **Create Runway account** (if needed)
  - URL: https://app.runwayml.com
  - Required for: Runway Gen-4 cinematic video generation
  - Skip if: Already have Runway account with API access

- [ ] **Create ElevenLabs account** (if needed)
  - URL: https://elevenlabs.io
  - Required for: Japanese voiceover TTS generation
  - Skip if: Already have ElevenLabs account
  - Note: Starter plan ($5/30K credits) is sufficient for testing

- [ ] **Create fal.ai account** (if needed)
  - URL: https://fal.ai
  - Required for: Kling video ad generation (simpler auth than direct Kling API)
  - Skip if: Already have fal.ai account
  - Note: Pay-per-use pricing, no upfront packages required

- [ ] **Create HeyGen account** (if needed)
  - URL: https://app.heygen.com
  - Required for: AI avatar presenter video generation
  - Skip if: Already have HeyGen account

## Dashboard Configuration

- [ ] **Select ElevenLabs Japanese voices**
  - Location: ElevenLabs Dashboard -> Voices -> Voice Library
  - Action: Browse Japanese voices, test with sample ad copy
  - Copy voice IDs for: 1 female voice, 1 male voice
  - Set `ELEVENLABS_VOICE_ID_JP_FEMALE` and `ELEVENLABS_VOICE_ID_JP_MALE`

- [ ] **Select HeyGen avatar and voice**
  - Location: HeyGen Dashboard -> Avatars
  - Action: Choose an avatar suitable for Japanese business/advertising
  - Copy avatar ID to `HEYGEN_DEFAULT_AVATAR_ID`
  - Location: HeyGen Dashboard -> Voices
  - Action: Choose a Japanese voice for avatar lip-sync
  - Copy voice ID to `HEYGEN_JP_VOICE_ID`

## Verification

After completing setup:

```bash
# Check all env vars are set
grep -E "RUNWAYML|ELEVENLABS|FAL_KEY|HEYGEN" .env.local

# Verify build passes
pnpm build
```

Expected results:
- All 8 environment variables present in `.env.local`
- Build passes with no errors

---

**Once all items complete:** Mark status as "Complete" at top of file.
