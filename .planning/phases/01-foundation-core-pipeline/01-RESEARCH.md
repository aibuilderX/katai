# Phase 1: Foundation & Core Pipeline - Research

**Researched:** 2026-02-07
**Domain:** Next.js 16 full-stack SaaS, Supabase Auth/DB, AI pipeline (Claude + Flux), Japanese-native UI
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Target user | Single-brand marketer (multi-brand supported) | Optimize for simplicity |
| Core promise | Brief in -> campaign kit out in under 5 minutes | Speed is the value prop |
| UI language | Japanese-only, zero English | Target market is JP; no half-measures |
| Visual style | Dark mode, monopo.co.jp inspired | Premium feel for agency users |
| Brand setup | Guided wizard | Non-technical users need structure |
| Logo -> colors | Auto-extract as suggestion | Speeds setup, user retains control |
| Keigo selection | 3 visual cards with examples | Makes abstract concept tangible |
| Font selection | Curated list only (Phase 1) | Avoids font compatibility issues |
| Product info | 2-layer (brand permanent + campaign specific) | Critical for prompt quality |
| Brief format | Structured form (Phase 1) | Reliable, predictable; conversational AI in Phase 5 |
| Platform selection | Visual icon grid, 11 platforms | Matches PROJECT.md platform list |
| Creative direction | Tags + free text + optional reference image | Balances guidance with freedom |
| Output presentation | Platform-adaptive preview cards | Visual comparison > text-only comparison |
| Output navigation | Sub-page of campaigns, not top-level nav | Campaign results are drill-down |
| Cost estimate | Skip Phase 1 | Deferred to Phase 6 billing |
| Competitors field | Skip Phase 1 | Not essential for generation quality |
| Auth | Email/password + Google SSO | Both options required |
| Navigation | Left sidebar, 64px collapsed (icon-only) by default | 4 nav items: Dashboard, Brands, Campaigns, Settings |
| Onboarding | Guided step-by-step for first-time users | Set up brand -> create first campaign |
| Dashboard layout | Quick-start focused with big CTA + past campaigns grid | Quick stats row |

### Claude's Discretion

- Multi-brand switching mechanism (secondary concern -- optimize for single-brand user)
- Brand wizard step grouping (Claude decides how to group the 7 wizard steps)
- Brief form layout and UX flow details

### Deferred Ideas (OUT OF SCOPE)

- Cost estimation UI (Phase 6)
- Competitors field in brand profile (Phase 1 skip)
- Conversational AI brief assistant (Phase 5)
- Text compositing onto images (Phase 2)
- Billing/credit system (Phase 6)
- Platform-specific copy rules enforcement (Phase 3)
- Selective regeneration (Phase 5)
- Approval workflow (Phase 5)

</user_constraints>

---

## Summary

Phase 1 is a full-stack foundation spanning authentication, database schema, dashboard UI, brand profile management, brief submission, and AI generation (copy via Claude API + images via Flux 1.1 Pro Ultra). The research covers seven technical domains: Next.js 16 (the current stable version, NOT Next.js 15), Supabase for auth/database/realtime/storage, Drizzle ORM for type-safe queries, Tailwind CSS v4 with shadcn/ui for the dark-mode Japanese UI, Claude API for structured copy generation, Flux API for image generation, and n8n for orchestration.

The most critical finding is that **Next.js 16 is now the current stable release** (released October 2025), superseding Next.js 15. This changes the project setup significantly: middleware is renamed to `proxy`, Turbopack is now the default bundler, all request APIs (params, searchParams, cookies, headers) are async-only, and React 19.2 is the default runtime. The project should start on Next.js 16, not 15.

The UI stack is Tailwind CSS v4 (CSS-first configuration, no tailwind.config.js) with shadcn/ui components customized for the dark design system. Supabase provides auth (email/password + Google OAuth), PostgreSQL database (Tokyo region), Realtime subscriptions for campaign progress, and temporary storage. Drizzle ORM handles type-safe database access. For AI, Claude API generates structured copy with keigo control, and Flux 1.1 Pro Ultra generates base images at $0.06/image via the BFL API.

**Primary recommendation:** Start with Next.js 16 (not 15), use Supabase as the integrated platform (Auth + DB + Realtime + Storage in Tokyo region), and build the AI pipeline as n8n sub-workflows triggered via webhooks from Next.js API routes.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.6 | Full-stack framework | Current stable; App Router with RSC; Turbopack default; proxy (replaces middleware); React 19.2 built-in |
| React | 19.2.4 | UI layer | Ships with Next.js 16; Server Components reduce client bundle; concurrent features |
| TypeScript | ^5.1+ | Type safety | Required for complex campaign/brand schemas; Drizzle inference |
| Vercel | Platform | Hosting | Tokyo edge CDN (hnd1); zero-config Next.js 16 deployment |

### Database & Auth

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | 2.95.3 | Supabase client SDK | Type-safe queries; real-time subscriptions; auth; storage |
| @supabase/ssr | 0.8.0 | Next.js SSR auth | Server-side auth in App Router; cookie-based sessions; proxy integration |
| Drizzle ORM | 0.45.1 | Type-safe SQL | Lightweight, Edge-compatible, no query engine binary; SQL-first |
| drizzle-kit | ^0.31.x | Migration tooling | Schema generation, migration management |
| postgres | ^3.x | PostgreSQL driver | Works with Drizzle; connection pooling support for Supabase |

### UI

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Tailwind CSS | 4.1.18 | Utility CSS | v4 CSS-first config; @theme directive for design tokens; dark mode via class strategy |
| shadcn/ui | CLI-latest | Component primitives | Copy-paste ownership; Radix UI underneath; fully customizable dark theme |
| next-themes | 0.4.6 | Theme management | Dark mode switching (locked to dark-only in this project); SSR-safe |
| Lucide React | 0.563.0 | Icons | Tree-shakeable; consistent with shadcn/ui; outline style matches design system |
| next-intl | 4.8.2 | Japanese i18n | App Router native; Server Component support; message format for ja locale |
| Zustand | 5.0.11 | Client state | Campaign builder UI state; simple API; React 19 compatible (client components only) |
| TanStack Query | 5.90.20 | Server state | Campaign list caching; polling for generation status |
| react-dropzone | 14.4.0 | File upload | Brand logo upload; drag-and-drop; file type validation |

### AI Integration

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Anthropic SDK | latest | Claude API client | Structured output (GA); keigo-controlled copy generation; model version pinning |
| n8n | self-hosted latest | AI workflow orchestration | Visual workflow builder; webhook triggers; sub-workflow pattern; error handling |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| extract-colors | 4.2.1 | Logo color extraction | Brand wizard: auto-extract palette from uploaded logo |
| Stripe | 20.3.1 | Payment (future) | Not Phase 1 but install SDK early for schema alignment |
| @sentry/nextjs | 10.38.0 | Error tracking | Client + server error capture; production monitoring |
| Sharp | 0.34.5 | Image processing | Server-side image manipulation for logo processing; Phase 2+ compositing |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Next.js 16 | Next.js 15 | 15 is outdated; 16 has Turbopack stable, React 19.2, better caching; use 16 |
| Supabase Auth | Clerk, NextAuth | Supabase Auth is free, bundled, RLS-integrated; no per-MAU pricing |
| Drizzle ORM | Prisma | Drizzle: no query engine binary, Edge-compatible, lighter serverless footprint |
| next-intl | i18next | next-intl is App Router-native; better RSC support |
| extract-colors | Color Thief | extract-colors is smaller (2kB gzip), no dependencies, works in Node.js |
| Zustand | Redux, Jotai | Simplest API; minimal boilerplate; sufficient for dashboard state |

**Installation:**
```bash
# Initialize Next.js 16 project
pnpm create next-app@latest ai-studio --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

# Core dependencies
pnpm add @supabase/supabase-js @supabase/ssr drizzle-orm postgres

# UI
pnpm add zustand @tanstack/react-query next-intl lucide-react react-dropzone next-themes class-variance-authority clsx tailwind-merge

# AI & Processing
pnpm add extract-colors sharp

# Monitoring
pnpm add @sentry/nextjs

# Dev dependencies
pnpm add -D drizzle-kit @types/node vitest playwright eslint prettier

# shadcn/ui initialization
pnpm dlx shadcn@latest init
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/                           # Next.js 16 App Router
│   ├── (auth)/                    # Auth routes group (login, register)
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/               # Protected dashboard routes group
│   │   ├── layout.tsx             # Dashboard shell with sidebar
│   │   ├── page.tsx               # Dashboard home (campaigns overview)
│   │   ├── brands/
│   │   │   ├── page.tsx           # Brand list
│   │   │   ├── new/page.tsx       # Brand wizard
│   │   │   └── [id]/page.tsx      # Brand edit
│   │   ├── campaigns/
│   │   │   ├── page.tsx           # Campaigns list
│   │   │   ├── new/page.tsx       # Brief submission form
│   │   │   └── [id]/page.tsx      # Campaign results (copy + images)
│   │   └── settings/page.tsx      # Account settings
│   ├── api/
│   │   ├── campaigns/
│   │   │   ├── route.ts           # POST: submit brief, trigger n8n
│   │   │   └── [id]/
│   │   │       ├── route.ts       # GET: campaign status + assets
│   │   │       └── status/route.ts # SSE: real-time progress
│   │   ├── webhooks/
│   │   │   └── n8n/route.ts       # POST: receive n8n progress callbacks
│   │   └── auth/
│   │       └── callback/route.ts  # OAuth callback handler
│   ├── layout.tsx                 # Root layout (fonts, theme provider)
│   └── globals.css                # Tailwind v4 @theme + design tokens
├── components/
│   ├── ui/                        # shadcn/ui components (customized)
│   ├── dashboard/                 # Dashboard-specific components
│   │   ├── sidebar.tsx
│   │   ├── campaign-card.tsx
│   │   └── stats-row.tsx
│   ├── brand/                     # Brand wizard components
│   │   ├── wizard-shell.tsx
│   │   ├── logo-upload-step.tsx
│   │   ├── color-picker-step.tsx
│   │   ├── font-select-step.tsx
│   │   ├── keigo-select-step.tsx
│   │   ├── tone-step.tsx
│   │   └── product-info-step.tsx
│   ├── brief/                     # Brief form components
│   │   ├── brief-form.tsx
│   │   ├── platform-grid.tsx
│   │   └── keigo-override.tsx
│   └── campaign/                  # Campaign results components
│       ├── copy-tab.tsx
│       ├── image-tab.tsx
│       ├── platform-selector.tsx
│       └── variant-card.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts              # Browser Supabase client
│   │   ├── server.ts              # Server Supabase client
│   │   └── admin.ts               # Service role client (for webhooks)
│   ├── db/
│   │   ├── schema.ts              # Drizzle schema definitions
│   │   ├── index.ts               # Drizzle client instance
│   │   └── migrations/            # SQL migration files
│   ├── ai/
│   │   ├── claude.ts              # Claude API client + prompt assembly
│   │   ├── flux.ts                # Flux API client
│   │   └── prompts/               # Prompt templates by type
│   │       ├── copy-generation.ts
│   │       └── image-generation.ts
│   ├── utils/
│   │   ├── cn.ts                  # Tailwind class merge utility
│   │   └── color-extract.ts       # Logo color extraction
│   └── constants/
│       ├── platforms.ts           # Platform definitions + dimensions
│       ├── keigo.ts               # Keigo register definitions
│       └── fonts.ts               # Curated font list
├── messages/
│   └── ja.json                    # Japanese UI translations
├── stores/
│   └── campaign-store.ts          # Zustand store for campaign UI state
├── types/
│   ├── database.ts                # Drizzle-inferred types
│   ├── campaign.ts                # Campaign/brief types
│   └── brand.ts                   # Brand profile types
├── proxy.ts                       # Next.js 16 proxy (was middleware.ts)
└── i18n/
    └── request.ts                 # next-intl request config
```

### Pattern 1: Next.js 16 Proxy for Auth (replaces Middleware)

**What:** Next.js 16 renames middleware.ts to proxy.ts. The proxy function refreshes Supabase Auth tokens on every request.
**When to use:** Every request to protected routes.

```typescript
// src/proxy.ts
// Source: Next.js 16 docs + Supabase SSR docs
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session - MUST use getUser() not getSession()
  const { data: { user } } = await supabase.auth.getUser()

  // Redirect unauthenticated users to login
  if (!user && !request.nextUrl.pathname.startsWith('/login') &&
      !request.nextUrl.pathname.startsWith('/register') &&
      !request.nextUrl.pathname.startsWith('/api/webhooks')) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

**CRITICAL NOTE:** In Next.js 16, the proxy function runs on Node.js runtime only (Edge runtime is NOT supported). This is a breaking change from Next.js 15 where middleware could run on Edge.

### Pattern 2: Async Request APIs (Next.js 16 Breaking Change)

**What:** All request APIs (params, searchParams, cookies, headers) are now async in Next.js 16.
**When to use:** Every page, layout, and route handler that uses these APIs.

```typescript
// src/app/(dashboard)/campaigns/[id]/page.tsx
// Source: Next.js 16 migration docs
import type { PageProps } from 'next'

export default async function CampaignPage(
  props: PageProps<'/campaigns/[id]'>
) {
  const { id } = await props.params  // MUST await params in Next.js 16
  // ... fetch campaign data
}
```

### Pattern 3: Tailwind CSS v4 Design Token Configuration

**What:** Tailwind v4 uses CSS-first configuration via @theme directive. No tailwind.config.js needed.
**When to use:** Setting up the design system color tokens from design-system.md.

```css
/* src/app/globals.css */
/* Source: Tailwind CSS v4 docs + design-system.md */
@import "tailwindcss";

@theme {
  /* Background colors */
  --color-bg-page: #0A0A0A;
  --color-bg-card: #141414;
  --color-bg-surface: #1A1A1A;
  --color-bg-hover: #1F1F1F;

  /* Border colors */
  --color-border: #2A2A2A;
  --color-border-subtle: #1E1E1E;

  /* Text colors */
  --color-text-primary: #FFFFFF;
  --color-text-secondary: #A0A0A0;
  --color-text-muted: #666666;
  --color-text-inverse: #0A0A0A;

  /* Accent colors */
  --color-vermillion: #D73C3C;
  --color-vermillion-hover: #C13232;
  --color-warm-gold: #C9956B;
  --color-steel-blue: #6B8FA3;

  /* Semantic colors */
  --color-success: #4ADE80;
  --color-warning: #FBBF24;
  --color-error: #EF4444;

  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 12px;
  --spacing-lg: 16px;
  --spacing-xl: 24px;
  --spacing-2xl: 32px;
  --spacing-3xl: 48px;
  --spacing-4xl: 64px;

  /* Border radius */
  --radius-sm: 6px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  --radius-pill: 999px;

  /* Fonts -- set via next/font CSS variables */
  --font-sans: var(--font-noto-sans-jp);
  --font-mono: var(--font-jetbrains-mono);
}

/* Dark mode only -- force dark class on html */
@custom-variant dark (&:where(.dark, .dark *));
```

### Pattern 4: Font Setup with next/font

**What:** Load Noto Sans JP and JetBrains Mono via next/font for optimal performance.
**When to use:** Root layout.

```typescript
// src/app/layout.tsx
import { Noto_Sans_JP, JetBrains_Mono } from 'next/font/google'

const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],  // 'japanese' subset is implicit
  weight: ['400', '500', '700', '900'],
  variable: '--font-noto-sans-jp',
  display: 'swap',
  preload: false,  // JP fonts are large; defer loading
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja" className={`dark ${notoSansJP.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-bg-page text-text-primary font-sans">
        {children}
      </body>
    </html>
  )
}
```

### Pattern 5: Supabase Realtime for Campaign Progress

**What:** Subscribe to campaign status changes via Supabase Realtime instead of polling.
**When to use:** Campaign results page while generation is in progress.

```typescript
// Client component subscribing to campaign progress
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useCampaignProgress(campaignId: string) {
  const [progress, setProgress] = useState<CampaignProgress | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel(`campaign-${campaignId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'campaigns',
          filter: `id=eq.${campaignId}`,
        },
        (payload) => {
          setProgress(payload.new.progress)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [campaignId])

  return progress
}
```

### Pattern 6: Claude API Structured Copy Generation

**What:** Use Claude API with structured output for consistent Japanese copy generation with keigo control.
**When to use:** Copy generation sub-workflow triggered by n8n.

```typescript
// lib/ai/claude.ts
// Source: Anthropic Claude API docs (structured output GA)
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

interface CopyVariant {
  headline: string
  body: string
  cta: string
  hashtags: string[]
}

interface CopyGenerationResult {
  variants: CopyVariant[]
  platform: string
  register: string
}

export async function generateCopy(brief: CampaignBrief, brand: BrandProfile) {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250514', // Pin model version
    max_tokens: 4096,
    temperature: 0.2, // Low temperature for register consistency
    system: buildSystemPrompt(brand),
    messages: [
      {
        role: 'user',
        content: buildCopyPrompt(brief, brand),
      },
    ],
    // Use tool-based structured output for guaranteed schema
    tools: [
      {
        name: 'deliver_copy_variants',
        description: 'Deliver the generated copy variants',
        input_schema: {
          type: 'object',
          properties: {
            variants: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  headline: { type: 'string' },
                  body: { type: 'string' },
                  cta: { type: 'string' },
                  hashtags: { type: 'array', items: { type: 'string' } },
                },
                required: ['headline', 'body', 'cta', 'hashtags'],
              },
              minItems: 4,
              maxItems: 4,
            },
          },
          required: ['variants'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'deliver_copy_variants' },
  })

  // Extract structured result from tool use
  const toolUseBlock = response.content.find(
    (block) => block.type === 'tool_use'
  )
  return toolUseBlock?.input as { variants: CopyVariant[] }
}
```

### Pattern 7: n8n Webhook Integration

**What:** Next.js API route triggers n8n workflow, n8n calls back with results.
**When to use:** Brief submission -> generation pipeline.

```typescript
// src/app/api/campaigns/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { campaigns } from '@/lib/db/schema'
import crypto from 'crypto'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const brief = await request.json()

  // Insert campaign record
  const [campaign] = await db.insert(campaigns).values({
    userId: user.id,
    brandProfileId: brief.brandProfileId,
    brief: brief,
    status: 'pending',
  }).returning()

  // Trigger n8n webhook
  const payload = JSON.stringify({
    campaignId: campaign.id,
    brief,
    brandProfile: brief.brandProfile,
  })

  const signature = crypto
    .createHmac('sha256', process.env.N8N_WEBHOOK_SECRET!)
    .update(payload)
    .digest('hex')

  await fetch(process.env.N8N_WEBHOOK_URL!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Signature': signature,
    },
    body: payload,
  })

  return NextResponse.json({ id: campaign.id }, { status: 201 })
}
```

### Anti-Patterns to Avoid

- **Using middleware.ts instead of proxy.ts:** Next.js 16 renamed middleware to proxy. The old convention still works but is deprecated and will be removed.
- **Synchronous params/searchParams access:** Will throw errors in Next.js 16. Always `await props.params`.
- **Using Edge Runtime for proxy:** Next.js 16 proxy runs Node.js only. Do not add `export const runtime = 'edge'`.
- **Storing Zustand state in Server Components:** Zustand is client-only. Server Components must fetch data directly from Supabase/Drizzle.
- **Using tailwind.config.js with Tailwind v4:** Configuration is now CSS-first via @theme directive in globals.css. Remove the config file.
- **Using getSession() instead of getUser():** Supabase SSR docs explicitly warn that getSession() does not revalidate the JWT. Always use getUser() for auth checks.
- **Hardcoded platform dimensions:** Use a configuration file/constant. Platform specs change.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Authentication | Custom JWT/session system | Supabase Auth + @supabase/ssr | Email/password, Google OAuth, RLS integration, session refresh all built-in |
| Color palette extraction | Canvas pixel sampling | extract-colors (4.2.1) | Handles PNG/JPG/SVG, weighted dominant color, no node-canvas dependency |
| Theme/dark mode | Manual class toggling | next-themes + Tailwind dark: variant | SSR-safe, prevents FOUC, handles system preference |
| Form validation | Manual if/else chains | Zod + react-hook-form | Schema-based validation, type inference, server action compatible |
| Icon system | SVG sprite sheets | Lucide React | Tree-shakeable, 1000+ icons, consistent stroke width |
| i18n message format | Manual string interpolation | next-intl | ICU message format, pluralization, Server Component support |
| Database migrations | Raw SQL scripts | drizzle-kit generate + migrate | Type-safe schema, automatic migration generation, rollback support |
| Real-time updates | WebSocket server | Supabase Realtime | Built into Supabase, listens to Postgres changes, zero infrastructure |
| File upload UX | Custom drag-and-drop | react-dropzone | File type validation, preview, accessibility, drop zone styling |
| CSS class merging | String concatenation | cn() utility (clsx + tailwind-merge) | Handles conditional classes, resolves Tailwind conflicts |

**Key insight:** Phase 1 has zero novel infrastructure problems. Every component has a mature, well-documented solution in the Next.js + Supabase ecosystem. The novelty is in the *combination* (Japanese-native UI + AI pipeline) and the *domain* (keigo control, platform-adaptive previews), not the infrastructure.

---

## Common Pitfalls

### Pitfall 1: Next.js 16 Migration Surprises (middleware -> proxy)

**What goes wrong:** Using Next.js 15 patterns that break in 16 -- synchronous params access, middleware.ts filename, Edge runtime in proxy, old caching behavior.
**Why it happens:** Most tutorials and Stack Overflow answers still reference Next.js 15 patterns.
**How to avoid:** Start with Next.js 16 from scratch using `create-next-app@latest`. Use the official migration guide. Test proxy.ts early. Always `await` params and searchParams.
**Warning signs:** Build errors mentioning "params is a Promise", proxy not executing, Edge runtime errors.

### Pitfall 2: Supabase Auth getUser() vs getSession()

**What goes wrong:** Using `getSession()` in server-side code. This returns the session from cookies without revalidating the JWT, meaning an expired or tampered token passes validation.
**Why it happens:** `getSession()` was the common pattern in older docs. Many tutorials still use it.
**How to avoid:** Always use `supabase.auth.getUser()` in server-side code (Server Components, Route Handlers, proxy.ts). This makes a request to Supabase to verify the JWT.
**Warning signs:** Auth appearing to work in development but failing intermittently in production; security audit flags.

### Pitfall 3: Noto Sans JP Font Loading Performance

**What goes wrong:** Noto Sans JP is a massive font family (each weight is 1-5MB due to full CJK coverage). Loading all weights synchronously blocks page render.
**Why it happens:** Japanese fonts contain thousands of glyphs. Google Fonts subsets help but the initial load is still large.
**How to avoid:** Use `next/font` with `preload: false` for the JP font. Use `display: 'swap'` to prevent FOIT. Load only the weights you actually use (400, 500, 700, 900). Consider subsetting if build performance suffers.
**Warning signs:** Slow First Contentful Paint; text appearing as fallback font for 1-2 seconds; large JS bundle warnings.

### Pitfall 4: Japanese Text in UTF-8 Pipeline

**What goes wrong:** Japanese text gets corrupted (mojibake) when passing through API boundaries: Claude API response -> n8n -> PostgreSQL -> Next.js -> browser.
**Why it happens:** Any component that defaults to Latin-1 or mishandles multi-byte UTF-8 will produce garbled output. ZIP filenames with kanji are especially fragile.
**How to avoid:** Establish UTF-8 everywhere contract. Set `Content-Type: application/json; charset=utf-8` on all API responses. Set PostgreSQL `client_encoding=UTF8`. Create a canary test string containing all three scripts: `"テスト漢字ABCabc123半角ｶﾀｶﾅ"` and verify it survives the full pipeline.
**Warning signs:** Katakana works but kanji does not; text fine in dashboard but garbled in downloads; works in dev but not production.

### Pitfall 5: Keigo Register Drift in Copy Generation

**What goes wrong:** Claude generates copy with inconsistent politeness levels across variants -- mixing casual (`見てみて!`) with formal keigo (`ご確認いただけますと幸いです`).
**Why it happens:** Each API call is independent. Without strong register enforcement in the prompt, the model drifts. Short-form text (CTAs) naturally gravitates casual.
**How to avoid:** Use temperature 0.2 or lower. Include register-specific few-shot examples in every prompt. Generate all 4 variants in a single API call (not separate calls). Add post-generation regex validation checking verb endings match the requested register (`です$`, `ます$` for standard; `だ$`, `よ$` for casual).
**Warning signs:** Verb endings inconsistent across variants; same CTA in different register across platforms.

### Pitfall 6: n8n Webhook Security

**What goes wrong:** n8n webhook URLs are publicly accessible. Anyone who discovers the URL can trigger campaign generation, consuming API credits.
**Why it happens:** n8n webhooks are designed for easy integration and are public by default.
**How to avoid:** Sign every webhook request with HMAC-SHA256 using a shared secret. Verify the signature in n8n's first Code node before proceeding. Also restrict n8n webhook access by IP if possible (firewall on the VPS).
**Warning signs:** Unexpected n8n executions; API credit consumption when no users are active; mysterious campaigns in the database.

### Pitfall 7: Tailwind v4 Configuration Confusion

**What goes wrong:** Trying to use tailwind.config.js/ts from v3. Tailwind v4 uses CSS-first configuration with @theme directive in the CSS file. The old JS config is ignored.
**Why it happens:** Most existing resources still show v3 config pattern.
**How to avoid:** Use `@theme` in globals.css for all design tokens. Use `@custom-variant` for custom variants. shadcn/ui CLI already supports Tailwind v4 initialization.
**Warning signs:** Custom colors not working; design tokens not available as utilities; "unknown at-rule" warnings.

---

## Code Examples

### Drizzle Schema for Phase 1 Tables

```typescript
// src/lib/db/schema.ts
// Source: Drizzle ORM docs + project ARCHITECTURE.md
import { pgTable, uuid, text, timestamp, jsonb, boolean } from 'drizzle-orm/pg-core'

// Users table (extends Supabase auth.users)
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(), // matches auth.users.id
  email: text('email').notNull(),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

// Teams / Organizations
export const teams = pgTable('teams', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  ownerId: uuid('owner_id').references(() => profiles.id).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const teamMembers = pgTable('team_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: uuid('team_id').references(() => teams.id).notNull(),
  userId: uuid('user_id').references(() => profiles.id).notNull(),
  role: text('role').notNull().default('editor'), // 'admin' | 'editor' | 'viewer'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

// Brand Profiles
export const brandProfiles = pgTable('brand_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: uuid('team_id').references(() => teams.id).notNull(),
  name: text('name').notNull(),
  logoUrl: text('logo_url'),
  colors: jsonb('colors').$type<{
    primary: string
    secondary: string
    accent: string
    background: string
  }>(),
  fontPreference: text('font_preference').default('noto_sans_jp'),
  defaultRegister: text('default_register').notNull().default('standard'),
  toneTags: jsonb('tone_tags').$type<string[]>().default([]),
  toneDescription: text('tone_description'),
  productCatalog: jsonb('product_catalog').$type<ProductCatalogEntry[]>(),
  positioningStatement: text('positioning_statement'),
  brandStory: text('brand_story'),
  targetMarket: text('target_market'),
  brandValues: jsonb('brand_values').$type<string[]>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

// Campaigns
export const campaigns = pgTable('campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: uuid('team_id').references(() => teams.id).notNull(),
  brandProfileId: uuid('brand_profile_id').references(() => brandProfiles.id).notNull(),
  createdBy: uuid('created_by').references(() => profiles.id).notNull(),
  name: text('name'),
  brief: jsonb('brief').notNull().$type<CampaignBrief>(),
  status: text('status').notNull().default('pending'),
  // 'pending' | 'generating' | 'complete' | 'failed' | 'partial'
  n8nExecutionId: text('n8n_execution_id'),
  progress: jsonb('progress').$type<CampaignProgress>(),
  errorLog: jsonb('error_log').$type<ErrorEntry[]>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
})

// Copy Variants
export const copyVariants = pgTable('copy_variants', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id').references(() => campaigns.id).notNull(),
  platform: text('platform').notNull(),
  variantLabel: text('variant_label').notNull(), // 'A案' | 'B案' | 'C案' | 'D案'
  register: text('register').notNull(),
  headline: text('headline').notNull(),
  bodyText: text('body_text').notNull(),
  ctaText: text('cta_text').notNull(),
  hashtags: jsonb('hashtags').$type<string[]>().default([]),
  isFavorite: boolean('is_favorite').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

// Generated Assets (images for Phase 1)
export const assets = pgTable('assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id').references(() => campaigns.id).notNull(),
  type: text('type').notNull(), // 'image' (Phase 1: images only)
  storageKey: text('storage_key').notNull(), // Supabase Storage path
  fileName: text('file_name'),
  width: text('width'),
  height: text('height'),
  mimeType: text('mime_type'),
  modelUsed: text('model_used'), // 'flux-1.1-pro-ultra'
  prompt: text('prompt'), // The prompt used for generation
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})
```

### Logo Color Extraction

```typescript
// src/lib/utils/color-extract.ts
import { extractColors } from 'extract-colors'

export async function extractPaletteFromLogo(
  imageBuffer: ArrayBuffer
): Promise<{ hex: string; area: number }[]> {
  const colors = await extractColors(imageBuffer, {
    pixels: 10000,
    distance: 0.2,
    saturationImportance: 0.5,
    lightnessImportance: 0.2,
    hueDistance: 0.1,
  })

  return colors
    .sort((a, b) => b.area - a.area)
    .slice(0, 5)
    .map(c => ({
      hex: c.hex,
      area: c.area,
    }))
}
```

### Japanese-Only i18n Setup

```typescript
// src/i18n/request.ts
// Source: next-intl docs
import { getRequestConfig } from 'next-intl/server'

export default getRequestConfig(async () => {
  // Japanese-only -- no locale detection needed
  const locale = 'ja'

  return {
    locale,
    messages: (await import(`@/messages/${locale}.json`)).default,
  }
})
```

```json
// src/messages/ja.json (excerpt)
{
  "nav": {
    "dashboard": "ダッシュボード",
    "brands": "ブランド",
    "campaigns": "キャンペーン",
    "settings": "設定"
  },
  "dashboard": {
    "createCampaign": "新しいキャンペーンを作成",
    "recentCampaigns": "最近のキャンペーン",
    "noCampaigns": "まだキャンペーンがありません"
  },
  "brand": {
    "wizard": {
      "title": "ブランドプロフィール設定",
      "logoStep": "ロゴアップロード",
      "colorsStep": "ブランドカラー",
      "fontStep": "フォント選択",
      "keigoStep": "敬語レベル",
      "toneStep": "トーン設定",
      "productStep": "商品情報",
      "positionStep": "ポジショニング"
    }
  },
  "keigo": {
    "casual": "カジュアル",
    "casualDesc": "親しみやすい、タメ口スタイル",
    "standard": "標準",
    "standardDesc": "丁寧語、です/ます形",
    "formal": "敬語",
    "formalDesc": "尊敬語・謙譲語、格式高い表現"
  }
}
```

### Flux 1.1 Pro Ultra Image Generation

```typescript
// src/lib/ai/flux.ts
// Source: BFL API docs

const BFL_API_BASE = 'https://api.bfl.ml/v1'

interface FluxGenerationRequest {
  prompt: string
  width: number
  height: number
  prompt_upsampling?: boolean
  seed?: number
  safety_tolerance?: number
  raw?: boolean // Ultra-only: less processed look
}

interface FluxGenerationResponse {
  id: string
  status: 'Pending' | 'Ready' | 'Error'
  result?: {
    sample: string // URL to generated image
  }
}

export async function generateImage(
  prompt: string,
  options: { width?: number; height?: number; raw?: boolean } = {}
): Promise<string> {
  // Submit generation request
  const submitResponse = await fetch(`${BFL_API_BASE}/flux-pro-1.1-ultra`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Key': process.env.BFL_API_KEY!,
    },
    body: JSON.stringify({
      prompt,
      width: options.width ?? 1024,
      height: options.height ?? 1024,
      prompt_upsampling: true,
      raw: options.raw ?? false,
    }),
  })

  const { id } = await submitResponse.json()

  // Poll for result (Flux is async)
  let attempts = 0
  const maxAttempts = 30 // 30 * 2s = 60s max
  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 2000))
    const statusResponse = await fetch(`${BFL_API_BASE}/get_result?id=${id}`, {
      headers: { 'X-Key': process.env.BFL_API_KEY! },
    })
    const result: FluxGenerationResponse = await statusResponse.json()

    if (result.status === 'Ready' && result.result?.sample) {
      return result.result.sample // URL to generated image
    }
    if (result.status === 'Error') {
      throw new Error(`Flux generation failed for task ${id}`)
    }
    attempts++
  }

  throw new Error(`Flux generation timed out for task ${id}`)
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Next.js 15 + middleware.ts | Next.js 16 + proxy.ts | October 2025 | Rename middleware to proxy; Node.js only (no Edge); all request APIs async |
| tailwind.config.js (Tailwind v3) | @theme in CSS (Tailwind v4) | 2025 | CSS-first configuration; no JS config file; @theme directive for tokens |
| @supabase/auth-helpers | @supabase/ssr | 2024 | auth-helpers deprecated; @supabase/ssr is the official package |
| getSession() for auth | getUser() for auth | 2024-2025 | getSession() does not revalidate JWT; getUser() is secure |
| React 18 | React 19.2 | 2025 | Server Components stable; useEffectEvent; View Transitions |
| Implicit Next.js caching | Explicit "use cache" directive | Next.js 16 | Caching is opt-in only; no surprising cache behavior |
| Prisma as default ORM | Drizzle as lightweight alternative | 2024-2025 | Drizzle: no binary, Edge-compatible, SQL-first |
| Claude 3.5 Sonnet | Claude Sonnet 4.5 / Claude Opus 4.5 | 2025-2026 | Structured output GA; improved Japanese; strict tool schemas |

**Deprecated/outdated:**
- **Next.js middleware.ts**: Renamed to proxy.ts in Next.js 16. Still works but deprecated.
- **@supabase/auth-helpers**: Replaced by @supabase/ssr. No longer maintained.
- **tailwind.config.js**: Replaced by CSS-first @theme configuration in Tailwind v4.
- **next/legacy/image**: Fully removed in Next.js 16.
- **AMP support**: Fully removed in Next.js 16.
- **next lint command**: Removed in Next.js 16; use ESLint directly.
- **experimental.turbopack**: Turbopack is now default; config moved to top-level.

---

## Open Questions

1. **Next.js 16 proxy.ts + Supabase SSR compatibility**
   - What we know: Next.js 16 renamed middleware to proxy. Supabase SSR docs still reference middleware.ts.
   - What's unclear: Whether @supabase/ssr has been updated to work with proxy.ts natively, or if it requires the file rename only.
   - Recommendation: Rename the file and function, keep the same Supabase client logic. Test early. The community discussion found suggests it works with just a rename.

2. **Flux 1.1 Pro Ultra exact API response format**
   - What we know: POST to `https://api.bfl.ml/v1/flux-pro-1.1-ultra`, poll via `/get_result?id=`. $0.06/image.
   - What's unclear: Exact response schema, error codes, rate limits per API key.
   - Recommendation: Test the API manually before building the n8n workflow. Verify the polling endpoint URL and response format.

3. **n8n sub-workflow concurrency in default execution mode**
   - What we know: n8n supports Execute Sub-Workflow nodes on parallel branches.
   - What's unclear: Whether sub-workflows on parallel branches truly execute concurrently in single-process mode, or are serialized.
   - Recommendation: Test empirically with two simple parallel sub-workflows. If serialized, still acceptable for Phase 1 (copy + images are only 2 branches).

4. **Noto Sans JP preload:false performance impact**
   - What we know: Noto Sans JP is large; preload:false defers loading to avoid blocking render.
   - What's unclear: Exact UX impact -- how long is the FOUT (Flash of Unstyled Text) on first load?
   - Recommendation: Test with `display: 'swap'` and accept brief FOUT. Japanese users are accustomed to font loading delays due to CJK font sizes. Could also subset to JIS Level 1 only for the UI font.

5. **Claude model version for Japanese copy generation**
   - What we know: Claude Sonnet 4.5 and Claude Opus 4.5 support structured output GA. Claude Opus 4.6 is the newest model.
   - What's unclear: Which model gives best keigo consistency vs cost tradeoff for Japanese advertising copy. Opus 4.5/4.6 likely better at keigo but significantly more expensive.
   - Recommendation: Start with Claude Sonnet 4.5 for development. Test keigo consistency. Upgrade to Opus only if Sonnet's register control is insufficient. Pin model version in all API calls.

---

## Sources

### Primary (HIGH confidence)
- [Next.js 16 Blog Post](https://nextjs.org/blog/next-16) - Major features, breaking changes
- [Next.js 16 Migration Guide](https://nextjs.org/docs/app/guides/upgrading/version-16) - Full migration steps
- [Supabase Auth SSR Next.js Setup](https://supabase.com/docs/guides/auth/server-side/nextjs) - Official auth setup
- [Drizzle ORM Supabase Tutorial](https://orm.drizzle.team/docs/tutorials/drizzle-with-supabase) - Official integration
- [Tailwind CSS v4 Dark Mode](https://tailwindcss.com/docs/dark-mode) - CSS-first config, @theme
- [shadcn/ui Tailwind v4](https://ui.shadcn.com/docs/tailwind-v4) - Component setup for v4
- [Flux 1.1 Pro Ultra](https://bfl.ai/models/flux-pro-ultra) - Model specs, pricing
- [Claude Structured Outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) - GA structured output
- [next-intl App Router](https://next-intl.dev/docs/getting-started/app-router) - i18n setup
- [Supabase Realtime with Next.js](https://supabase.com/docs/guides/realtime/realtime-with-nextjs) - Real-time subscriptions

### Secondary (MEDIUM confidence)
- npm registry version checks (2026-02-07) - All versions verified via `npm view`
- [BFL API Documentation](https://docs.bfl.ml/) - Endpoints and parameters
- [Zustand Next.js Setup](https://docs.pmnd.rs/zustand/guides/nextjs) - Server/client boundary patterns
- [next/font Google Fonts](https://nextjs.org/docs/app/getting-started/fonts) - Font optimization

### Tertiary (LOW confidence)
- Community discussion: Supabase + Next.js 16 proxy.ts compatibility (answeroverflow.com) - Early reports suggest rename-only migration works
- BFL API polling endpoint format - Based on community repos, not official docs

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All versions verified via npm; Next.js 16, Tailwind v4, Supabase SSR patterns confirmed via official docs
- Architecture: HIGH - Patterns follow official Next.js 16 + Supabase documentation; n8n webhook pattern is well-established
- Pitfalls: HIGH - Most pitfalls documented in official migration guides (Next.js 16 breaking changes, Supabase auth getUser() requirement)
- AI integration: MEDIUM - Claude structured output is GA and documented; Flux API exact response format needs manual verification
- n8n orchestration: MEDIUM - Patterns are sound but sub-workflow concurrency in single-process mode needs empirical testing

**Research date:** 2026-02-07
**Valid until:** 2026-03-07 (30 days - stack is stable; Next.js patch versions may change)
