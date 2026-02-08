---
phase: 03-multi-platform-formatting
plan: 01
subsystem: ai, api
tags: [claude, copy-generation, platform-constraints, japanese-text, character-counting]

# Dependency graph
requires:
  - phase: 01-foundation-core-pipeline
    provides: Claude copy generation (generateCopy), CampaignBrief type, brand profiles
provides:
  - Platform copy constraints registry with character limits for 7 platforms
  - Platform-aware copy prompt builder (buildPlatformCopyPrompt)
  - generatePlatformCopy() for multi-platform copy in single API call
  - Japanese codepoint-accurate character counting (countJapaneseChars)
  - Copy length validation with truncation fallback (validateCopyLength)
affects: [03-02, 03-03, 03-04, campaign-generation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Platform constraint registry as Record<string, PlatformCopyConstraints>"
    - "Single API call for multi-platform copy generation (cost efficiency)"
    - "Server-side validation as safety net with truncation fallback"
    - "Codepoint-accurate Japanese character counting via [...str].length"

key-files:
  created:
    - src/lib/platforms/copy-constraints.ts
  modified:
    - src/lib/ai/prompts/copy-generation.ts
    - src/lib/ai/claude.ts

key-decisions:
  - "Use [...str].length for codepoint-accurate character counting (not .length)"
  - "Truncation uses ellipsis character (U+2026) not three dots for single-char truncation marker"
  - "Server-side validation logs warnings but does not reject; truncates as fallback"
  - "Single Claude API call generates all platform variants for cost efficiency"

patterns-established:
  - "PlatformCopyConstraints interface: standardized platform constraint format"
  - "getConstraintsForPlatforms: filter registry by platform IDs"
  - "Platform-aware prompt building with explicit character limits per field"

# Metrics
duration: 5min
completed: 2026-02-08
---

# Phase 3 Plan 1: Platform Copy Constraints & Platform-Aware Generation Summary

**Platform copy constraint registry for 7 Japanese ad platforms with codepoint-accurate character counting and single-call multi-platform Claude copy generation**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-08T15:22:48Z
- **Completed:** 2026-02-08T15:27:58Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created platform copy constraints registry covering LINE, Yahoo Japan, Rakuten, Instagram, TikTok, X, and Email with research-sourced character limits
- Built codepoint-accurate Japanese character counting using [...str].length to correctly handle surrogate pairs
- Added copy length validation with truncation fallback (truncate to maxChars-1 + ellipsis)
- Created platform-aware prompt builder that embeds per-platform character limits directly into Claude prompts
- Added generatePlatformCopy() producing 4 variants per platform in a single API call with server-side validation safety net
- Maintained full backward compatibility with existing generateCopy() and buildCopyPrompt()

## Task Commits

Each task was committed atomically:

1. **Task 1: Create platform copy constraints registry** - `6f4c2ab` (feat)
2. **Task 2: Upgrade Claude copy generation to platform-aware output** - `6a029f9` (feat)

## Files Created/Modified
- `src/lib/platforms/copy-constraints.ts` - Platform constraint registry with 7 platforms, countJapaneseChars, validateCopyLength, getConstraintsForPlatforms
- `src/lib/ai/prompts/copy-generation.ts` - Added buildPlatformCopyPrompt with per-platform character limits; exported BrandProfileForPrompt
- `src/lib/ai/claude.ts` - Added PlatformCopyVariant/PlatformCopyResult types, DELIVER_PLATFORM_COPY_TOOL schema, generatePlatformCopy()

## Decisions Made
- Used ellipsis character (U+2026) as single-character truncation marker rather than "..." (3 chars) for more accurate character budget
- Exported BrandProfileForPrompt from copy-generation.ts for reuse in claude.ts (was previously module-private)
- Server-side truncation logs warnings via console.warn but does not throw -- graceful degradation over rejection
- Single API call for all platforms: max_tokens raised from 4096 to 8192 to accommodate multi-platform output

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Platform constraint registry ready for use by format spec generation (03-02)
- generatePlatformCopy() ready to be wired into campaign generation pipeline
- Copy validation utilities available for any downstream length checks

---
*Phase: 03-multi-platform-formatting*
*Completed: 2026-02-08*
