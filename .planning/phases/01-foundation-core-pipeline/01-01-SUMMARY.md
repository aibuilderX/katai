---
phase: 01-foundation-core-pipeline
plan: 01
subsystem: foundation
tags: [nextjs, tailwind-v4, drizzle, supabase, i18n, typescript]

dependency-graph:
  requires: []
  provides:
    - "Next.js 16 project scaffold with Tailwind v4 design system"
    - "Drizzle ORM schema for 7 Phase 1 tables"
    - "Supabase client utilities (browser, server, admin)"
    - "Japanese i18n with comprehensive translations"
    - "Platform, keigo, and font constants"
    - "Type definitions for database, campaign, and brand"
  affects:
    - "01-02: Auth and dashboard shell (uses layout, supabase clients, i18n)"
    - "01-03: Brand wizard (uses schema, constants, types)"
    - "01-04: Brief form and generation (uses schema, constants, supabase)"
    - "01-05: Campaign results UI (uses schema, types, constants)"

tech-stack:
  added:
    - "next@16.1.6"
    - "react@19.2.3"
    - "tailwindcss@4.1.18"
    - "@supabase/supabase-js@2.95.3"
    - "@supabase/ssr@0.8.0"
    - "drizzle-orm@0.45.1"
    - "drizzle-kit@0.31.8"
    - "next-intl@4.8.2"
    - "next-themes@0.4.6"
    - "@tanstack/react-query@5.90.20"
    - "zustand@5.0.11"
    - "lucide-react@0.563.0"
    - "class-variance-authority@0.7.1"
    - "sharp@0.34.5"
    - "extract-colors@4.2.1"
    - "vitest@4.0.18"
  patterns:
    - "CSS-first Tailwind v4 config via @theme directive"
    - "shadcn/ui with new-york style for component primitives"
    - "Forced dark mode via next-themes"
    - "Server-side Supabase client with async cookies (Next.js 16)"
    - "Drizzle ORM with typed JSONB columns"
    - "next-intl for Japanese-only i18n"

key-files:
  created:
    - "package.json"
    - "next.config.ts"
    - "tsconfig.json"
    - "drizzle.config.ts"
    - "components.json"
    - ".env.local.example"
    - "src/app/globals.css"
    - "src/app/layout.tsx"
    - "src/app/page.tsx"
    - "src/lib/utils.ts"
    - "src/lib/utils/cn.ts"
    - "src/lib/utils/color-extract.ts"
    - "src/lib/providers/query-provider.tsx"
    - "src/lib/supabase/client.ts"
    - "src/lib/supabase/server.ts"
    - "src/lib/supabase/admin.ts"
    - "src/lib/db/schema.ts"
    - "src/lib/db/index.ts"
    - "src/lib/constants/platforms.ts"
    - "src/lib/constants/keigo.ts"
    - "src/lib/constants/fonts.ts"
    - "src/i18n/request.ts"
    - "src/messages/ja.json"
    - "src/types/database.ts"
    - "src/types/campaign.ts"
    - "src/types/brand.ts"
  modified: []

decisions:
  - id: "tailwind-v4-css-first"
    decision: "Use @theme directive in globals.css instead of tailwind.config.js"
    rationale: "Tailwind v4 standard; CSS-first configuration is the current approach"
  - id: "dark-mode-forced"
    decision: "Force dark mode via next-themes with no toggle"
    rationale: "Design system is dark-only per design-system.md"
  - id: "shadcn-utils-coexist"
    decision: "Keep shadcn-generated src/lib/utils.ts alongside src/lib/utils/cn.ts"
    rationale: "shadcn components import from @/lib/utils; our code can use either path"
  - id: "color-extract-sharp"
    decision: "Use sharp for image-to-pixel conversion before extract-colors"
    rationale: "extract-colors requires ImageDataAlt on server; sharp provides raw RGBA data"

metrics:
  duration: "11 minutes"
  completed: "2026-02-07"
---

# Phase 1 Plan 01: Project Scaffolding & Foundation Summary

Next.js 16.1.6 project initialized with Tailwind v4 CSS-first design system, Drizzle ORM schema for 7 tables, Supabase client utilities, comprehensive Japanese i18n, and all shared constants/types.

## Task Commits

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Initialize Next.js 16 with Tailwind v4 design system | 31c00e4 | package.json, globals.css, layout.tsx, next.config.ts, .env.local.example |
| 2 | Set up Supabase clients and Drizzle ORM schema | 1897916 | schema.ts, server.ts, client.ts, admin.ts, database.ts, campaign.ts, brand.ts |
| 3 | Set up i18n, constants, and shared utilities | 8064950 | ja.json, platforms.ts, keigo.ts, fonts.ts, color-extract.ts |

## What Was Built

### Task 1: Next.js 16 Project with Tailwind v4 Design System
- Next.js 16.1.6 with React 19.2.3, Turbopack default bundler
- Tailwind v4 CSS-first design tokens via `@theme` directive in globals.css
- All design system tokens from design-system.md: backgrounds (#0A0A0A/#141414/#1A1A1A/#1F1F1F), borders (#2A2A2A/#1E1E1E), text (#FFFFFF/#A0A0A0/#666666), accents (vermillion #D73C3C, warm-gold #C9956B, steel-blue #6B8FA3), semantic colors
- shadcn/ui initialized with new-york style, neutral base, CSS variables
- shadcn CSS variables mapped to dark theme colors (`:root` and `.dark` both use dark palette)
- Noto Sans JP (400/500/700/900) and JetBrains Mono (400/500) via next/font
- `preload: false` on Noto Sans JP to avoid blocking render
- Forced dark mode via next-themes ThemeProvider
- TanStack Query provider for server state management
- next-intl provider for Japanese i18n
- cn() utility with clsx + tailwind-merge

### Task 2: Supabase Clients and Drizzle ORM Schema
- Browser Supabase client (`createBrowserClient` from `@supabase/ssr`)
- Server Supabase client with async `cookies()` for Next.js 16
- Admin Supabase client with service role key (bypasses RLS)
- Drizzle ORM schema with 7 tables:
  - `profiles` (extends auth.users)
  - `teams` (organizations)
  - `team_members` (role-based membership)
  - `brand_profiles` (identity, tone, product catalog)
  - `campaigns` (brief, status, progress, errors)
  - `copy_variants` (per-platform A/B/C/D variants)
  - `assets` (generated images, future video/audio)
- Typed JSONB columns: BrandColors, ProductCatalogEntry, CampaignBrief, CampaignProgress, ErrorEntry
- Drizzle client with postgres driver (prepare: false for Supabase Transaction pool)
- drizzle.config.ts for migration generation
- Type files with InferSelectModel/InferInsertModel for all tables

### Task 3: i18n, Constants, and Shared Utilities
- Comprehensive ja.json with 14 top-level sections covering all Phase 1 UI
- Zero English in user-facing strings
- 11 platform definitions: Instagram, X, LINE, Yahoo! JAPAN, Rakuten, TikTok, YouTube, GDN, DOOH, Email, In-Store POP
- Each platform has dimensions array, category, Japanese name, Lucide icon name, preview format
- 3 keigo register definitions with Japanese examples and verb ending patterns
- 7 curated Japanese-safe Google Fonts (gothic, mincho, rounded categories)
- Logo color palette extraction using sharp + extract-colors (server-side)
- next-intl request config for Japanese-only locale

## Decisions Made

1. **Tailwind v4 CSS-first config**: Used `@theme` directive in globals.css for all design tokens. No tailwind.config.js. This is the Tailwind v4 standard approach.

2. **Dark mode forced**: Both `:root` and `.dark` CSS variable blocks use the dark color palette. `ThemeProvider` is set to `forcedTheme="dark"`. No light mode exists.

3. **shadcn utils coexistence**: shadcn generates `src/lib/utils.ts` with the `cn()` function. We also created `src/lib/utils/cn.ts` as an explicit export. Both paths work; shadcn components import from `@/lib/utils`.

4. **Sharp for color extraction**: The `extract-colors` library requires `ImageDataAlt` (raw pixel data) on the server side. We use sharp to convert the uploaded image to raw RGBA buffer before passing to `extractColorsFromImageData`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed extract-colors type mismatch**
- **Found during:** Task 3
- **Issue:** `extractColors()` does not accept `ArrayBuffer` in its type signature; it requires `string | HTMLImageElement | ImageData | ImageDataAlt`
- **Fix:** Changed to `extractColorsFromImageData` with sharp preprocessing to convert image buffers to raw RGBA ImageDataAlt format
- **Files modified:** `src/lib/utils/color-extract.ts`
- **Commit:** 8064950

**2. [Rule 3 - Blocking] Created i18n stubs in Task 1 to unblock build**
- **Found during:** Task 1
- **Issue:** layout.tsx imports `getLocale`/`getMessages` from next-intl which requires `src/i18n/request.ts` and `src/messages/ja.json` to exist for the build to pass
- **Fix:** Created minimal stub files in Task 1 (i18n/request.ts and ja.json with basic content), then replaced with full content in Task 3
- **Files modified:** `src/i18n/request.ts`, `src/messages/ja.json`
- **Commit:** 31c00e4 (stubs), 8064950 (full content)

**3. [Rule 3 - Blocking] Fixed .gitignore to allow .env.local.example and next-env.d.ts**
- **Found during:** Task 1
- **Issue:** Default .gitignore had `.env*` pattern blocking `.env.local.example` and `next-env.d.ts` was explicitly ignored
- **Fix:** Added `!.env.local.example` exception and removed `next-env.d.ts` from gitignore
- **Files modified:** `.gitignore`
- **Commit:** 31c00e4

## Verification Results

All verification criteria met:
- `pnpm build` completes without errors
- No tailwind.config.js/ts exists
- globals.css contains `@theme` with all design tokens
- schema.ts defines 7 tables with proper JSONB types
- ja.json valid JSON with 14 sections, zero English user-facing strings
- All 3 Supabase client variants exist (browser, server, admin)
- 11 platforms, 3 keigo registers, 7 fonts all exported and verified

## Next Phase Readiness

The foundation is ready for Plan 02 (Auth + Dashboard Shell). Key integration points:
- `src/app/layout.tsx` already has all providers (ThemeProvider, NextIntlClientProvider, QueryProvider)
- Supabase server client is ready for proxy.ts auth flow
- Schema tables support team-based multi-tenancy
- i18n messages cover auth and navigation strings
- Design tokens are available as Tailwind utilities (e.g., `bg-bg-page`, `text-vermillion`)
