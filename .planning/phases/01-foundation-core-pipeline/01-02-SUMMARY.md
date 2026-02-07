---
phase: 01-foundation-core-pipeline
plan: 02
subsystem: auth-dashboard
tags: [supabase-auth, proxy-ts, dashboard, sidebar, shadcn-ui, japanese-ui]

dependency-graph:
  requires:
    - "01-01: Next.js scaffold, Supabase clients, i18n, schema"
  provides:
    - "Supabase Auth (email/password + Google SSO) with proxy.ts protection"
    - "Dashboard shell with collapsible sidebar and Japanese navigation"
    - "Hero CTA, stats row, campaign card grid with empty state"
    - "Settings page with logout"
    - "Auth layout for login/register pages"
  affects:
    - "01-03: Brand wizard (renders inside dashboard shell)"
    - "01-04: Brief form (renders inside dashboard shell, uses auth)"
    - "01-05: Campaign results (renders inside dashboard shell)"

tech-stack:
  added:
    - "sonner@2.0.7 (toast notifications)"
    - "shadcn/ui button component"
    - "shadcn/ui input component"
  patterns:
    - "Next.js 16 proxy.ts for auth protection (not middleware.ts)"
    - "getUser() for JWT verification (never getSession())"
    - "force-dynamic on auth layout to prevent static prerendering"
    - "Zustand store for sidebar collapse state"
    - "Server component dashboard layout with auth check"

key-files:
  created:
    - "src/proxy.ts"
    - "src/app/(auth)/layout.tsx"
    - "src/app/(auth)/login/page.tsx"
    - "src/app/(auth)/register/page.tsx"
    - "src/app/api/auth/callback/route.ts"
    - "src/app/(dashboard)/layout.tsx"
    - "src/app/(dashboard)/page.tsx"
    - "src/app/(dashboard)/dashboard-content.tsx"
    - "src/app/(dashboard)/settings/page.tsx"
    - "src/app/(dashboard)/settings/settings-content.tsx"
    - "src/app/(dashboard)/setup-profile/page.tsx"
    - "src/components/dashboard/sidebar.tsx"
    - "src/components/dashboard/stats-row.tsx"
    - "src/components/dashboard/campaign-card.tsx"
    - "src/stores/ui-store.ts"
  modified:
    - "src/app/globals.css (spacing token rename to fix Tailwind v4 conflicts)"
    - "src/app/layout.tsx (added Toaster component)"

decisions:
  - id: "proxy-ts-not-middleware"
    decision: "Use proxy.ts instead of middleware.ts for auth protection"
    rationale: "Next.js 16 convention; proxy.ts runs Node.js only (not edge)"
  - id: "force-dynamic-auth"
    decision: "Set export const dynamic = 'force-dynamic' on auth layout"
    rationale: "Auth pages use Supabase client which requires runtime env vars"
  - id: "setup-profile-route"
    decision: "Added /setup-profile route for post-registration profile creation"
    rationale: "Separates registration from profile setup; cleaner UX flow"
  - id: "sonner-toasts"
    decision: "Used sonner instead of shadcn toast for notification toasts"
    rationale: "Simpler API, less boilerplate; already included in layout"
  - id: "tailwind-spacing-rename"
    decision: "Renamed --spacing-{xs,sm,md,lg,xl} to --spacing-space-{...}"
    rationale: "Custom spacing tokens conflicted with Tailwind v4 built-in size tokens, causing max-w-md to resolve to 12px instead of 28rem"

metrics:
  duration: "~20 minutes"
  completed: "2026-02-07"
---

# Phase 1 Plan 02: Auth & Dashboard Shell Summary

Supabase Auth with email/password + Google SSO, proxy.ts route protection, and a complete dashboard shell with collapsible sidebar, hero CTA, stats row, campaign grid, and settings page. All UI is Japanese-only with dark theme.

## Task Commits

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Supabase Auth with proxy.ts | c6c2c68 | proxy.ts, login/page.tsx, register/page.tsx, callback/route.ts |
| 2 | Dashboard shell with sidebar | 0fd45ba | dashboard layout, sidebar.tsx, dashboard-content.tsx, settings |
| fix | Tailwind v4 token conflicts | 0e94526 | globals.css, all components with rounded-radius-* |
| fix | Login form label spacing | 99288ef | login/page.tsx |

## What Was Built

### Task 1: Supabase Auth with proxy.ts Protection
- proxy.ts using Next.js 16 convention (not middleware.ts)
- Auth check via `getUser()` (never `getSession()`)
- Redirects unauthenticated users to /login, authenticated users away from auth pages
- Login page: email/password + Google SSO, all Japanese labels
- Register page: email/password + Google SSO with password confirmation
- OAuth callback handler at /api/auth/callback
- Setup profile page for post-registration profile/team creation
- Sonner toasts for error feedback

### Task 2: Dashboard Shell
- Collapsible sidebar (240px expanded, 64px collapsed by default)
- 4 navigation items: ダッシュボード, ブランド, キャンペーン, 設定
- Active route detection with vermillion left border accent
- Server-side auth check in dashboard layout (belt-and-suspenders with proxy.ts)
- Hero CTA area with vermillion "新しいキャンペーンを作成" button
- Stats row with 3 metric cards (total campaigns, active brands, monthly generations)
- Campaign card component with hover animations and status pills
- Empty state for campaigns grid
- Settings page with account info, team members, and logout
- Zustand store for sidebar collapse state

## Deviations from Plan

### Auto-fixed Issues

**1. [Critical] Tailwind v4 spacing token conflicts**
- **Found during:** Checkpoint visual verification
- **Issue:** Custom `--spacing-xs/sm/md/lg/xl` tokens in `@theme` overrode Tailwind v4's built-in size tokens, causing `max-w-md` to resolve to `12px` instead of `28rem` (448px). This made the login card only 12px wide.
- **Fix:** Renamed all spacing tokens to `--spacing-space-{xs,sm,md,lg,xl,...}` to avoid namespace conflicts
- **Commit:** 0e94526

**2. [Critical] Invalid rounded-radius-* CSS classes**
- **Found during:** Checkpoint visual verification
- **Issue:** Components used `rounded-radius-lg`, `rounded-radius-sm`, `rounded-radius-pill` etc. which are not valid Tailwind classes
- **Fix:** Replaced with standard `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-pill` which correctly reference `@theme --radius-*` tokens
- **Commit:** 0e94526

**3. [Minor] Added setup-profile route (not in plan)**
- **Rationale:** Post-registration needs a place to create profile + default team records

**4. [Minor] Added sonner for toasts (not in plan)**
- **Rationale:** Error feedback needed for auth flows; sonner is simpler than shadcn toast

## Verification Results

- Login page returns 200 with correct Japanese labels
- `max-w-md` resolves to `var(--container-md)` = 28rem (verified in compiled CSS)
- Sidebar renders with 4 Japanese navigation items
- Dashboard hero CTA uses vermillion styling
- All `rounded-radius-*` classes replaced with valid Tailwind utilities
- Auth pages use `force-dynamic` to prevent static prerendering issues

## Next Phase Readiness

Ready for Wave 3 (Plans 01-03 and 01-04 in parallel):
- Dashboard shell provides the layout for brand wizard and brief form pages
- Auth flow protects all dashboard routes
- Supabase clients work for both client and server components
- Design system tokens are properly configured (spacing conflict resolved)
- i18n messages are available for brand and campaign strings
