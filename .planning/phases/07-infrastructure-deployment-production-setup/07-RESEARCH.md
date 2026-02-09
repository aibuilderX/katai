# Phase 7: Infrastructure, Deployment & Production Setup - Research

**Researched:** 2026-02-09
**Domain:** Vercel deployment, Drizzle migrations, Supabase configuration, Stripe production setup, production hardening
**Confidence:** HIGH

## Summary

Phase 7 takes a fully-built Next.js 16 application (24 plans across 6 phases, 46 requirements implemented) and deploys it to production. The application uses Vercel for hosting, Supabase for auth/DB/storage/realtime, Stripe for billing, and n8n for workflow orchestration. The deployment involves six distinct workstreams: (1) database migration management with Drizzle, (2) Supabase infrastructure setup (storage buckets, realtime, auth redirect URLs), (3) environment variable configuration across Vercel environments, (4) Stripe product/webhook/price setup, (5) Vercel deployment configuration with function timeout tuning, and (6) end-to-end smoke testing.

The most critical risk in this phase is the campaign generation pipeline timing out on Vercel. The `POST /api/campaigns` route runs a multi-stage pipeline (Claude copy generation, Flux image generation, compositing, platform resize, email generation, video pipeline) that can easily exceed default function timeouts. With Vercel Fluid Compute enabled (default on new projects), the Pro plan allows up to 800 seconds (13 minutes), which should be sufficient. However, the `maxDuration` export must be set on the campaigns route handler. When n8n is configured as the orchestrator (production path), the API route only triggers the webhook and returns quickly, with n8n calling back -- this is the recommended production pattern.

The second critical concern is that no Drizzle migration files exist yet. The project has been using `drizzle-kit push` for development. For production, migration files must be generated and applied in a controlled manner. The schema has 13 tables across auth, brands, campaigns, assets, billing, compliance, and approval domains.

**Primary recommendation:** Deploy to Vercel with n8n as the external orchestrator for campaign generation (avoiding function timeout issues), use `drizzle-kit generate` to create migration SQL from the current schema, configure all Supabase infrastructure via SQL statements, and set up Stripe products via the Dashboard with webhook pointing to the production URL.

## Standard Stack

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.6 | App framework | Already in use, Vercel-native |
| Vercel | latest | Hosting platform | Native Next.js support, automatic HTTPS, preview deployments |
| Supabase | 2.95.3 | Auth, DB, Storage, Realtime | Already in use as primary backend |
| Drizzle ORM | 0.45.1 | Database ORM | Already in use with postgres.js driver |
| drizzle-kit | 0.31.8 | Migration tooling | Companion to drizzle-orm |
| Stripe | 20.3.1 | Billing | Already integrated with v20 API |
| sharp | 0.34.5 | Image processing | Already a dependency; Vercel auto-installs for their platform |

### Supporting (Deployment Tools)
| Tool | Purpose | When to Use |
|------|---------|-------------|
| Vercel CLI (`vercel`) | Deployment, env management | Setting env vars, manual deploys |
| Stripe CLI (`stripe`) | Webhook testing, event forwarding | Local testing of webhook flow |
| Supabase Dashboard | Bucket creation, realtime config, auth settings | One-time infrastructure setup |

### Not Needed
| Tool | Why Not |
|------|---------|
| Docker | Vercel handles containerization |
| Terraform/Pulumi | Overkill for this stack; Supabase Dashboard + SQL is sufficient |
| CI/CD pipeline | Vercel's git integration handles this automatically |

## Architecture Patterns

### Deployment Architecture
```
[Browser] --> [Vercel Edge Network / CDN]
                    |
            [Next.js App (Serverless Functions)]
                    |
         +----------+----------+
         |          |          |
    [Supabase]  [Stripe]   [n8n]
    - Auth       - Billing   - Workflow orchestration
    - Postgres   - Webhooks  - AI provider calls
    - Storage               - Callback to /api/webhooks/n8n
    - Realtime
```

### Pattern 1: Environment Variable Scoping
**What:** Vercel supports three scopes for environment variables: Production, Preview, and Development.
**When to use:** Always. Every env var must be scoped correctly.
**Critical detail:** `NEXT_PUBLIC_` prefixed vars are inlined at build time and cannot be changed post-build. Server-only vars (no prefix) remain runtime-accessible.

**Complete environment variable inventory for this project:**
```
# Public (inlined at build time) -- set for all environments
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app

# Server-only -- set for Production + Preview
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DATABASE_URL=postgresql://postgres:...@db.xxx.supabase.co:5432/postgres

# AI Services -- server-only
ANTHROPIC_API_KEY=sk-ant-...
BFL_API_KEY=...
FAL_KEY=...
RUNWAYML_API_SECRET=...
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID_JP_FEMALE=...
HEYGEN_API_KEY=...
HEYGEN_DEFAULT_AVATAR_ID=...
HEYGEN_JP_VOICE_ID=...

# n8n -- server-only
N8N_WEBHOOK_URL=https://your-n8n.example.com/webhook/campaign
N8N_WEBHOOK_SECRET=...

# Stripe -- server-only
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_STARTER_PRICE_ID=price_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_BUSINESS_PRICE_ID=price_...
```

### Pattern 2: Drizzle Migration Generation from Existing Schema
**What:** Generate SQL migration files from the TypeScript schema for controlled production deployment.
**When to use:** When transitioning from `drizzle-kit push` (dev) to production.

```bash
# Generate migration SQL from current schema
npx drizzle-kit generate

# This produces: src/lib/db/migrations/XXXX_migration_name.sql
# Review the generated SQL, then apply:
npx drizzle-kit migrate
```

**Critical detail:** The project currently has NO migration files (src/lib/db/migrations/ is empty). The schema defines 13 tables. Running `generate` against an empty migrations directory will produce a single SQL file creating all tables. This SQL needs manual review before running against production.

### Pattern 3: Supabase Storage Bucket Creation via SQL
**What:** Create storage buckets using SQL INSERT statements into `storage.buckets`.
**When to use:** For repeatable, version-controlled infrastructure setup.

```sql
-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('composited-images', 'composited-images', true),
  ('platform-images', 'platform-images', true),
  ('campaign-videos', 'campaign-videos', true),
  ('campaign-audio', 'campaign-audio', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies for public read access
CREATE POLICY "Public read access" ON storage.objects
  FOR SELECT USING (bucket_id IN ('composited-images', 'platform-images', 'campaign-videos', 'campaign-audio'));

-- Service role write access (for server-side uploads via adminClient)
CREATE POLICY "Service role insert" ON storage.objects
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role update" ON storage.objects
  FOR UPDATE USING (true);
```

### Pattern 4: Function Timeout Configuration
**What:** Set `maxDuration` on API routes that need extended execution time.
**When to use:** For the campaign generation route and any other long-running operations.

```typescript
// Source: https://vercel.com/docs/functions/configuring-functions/duration
// In src/app/api/campaigns/route.ts
export const maxDuration = 300; // 5 minutes -- covers direct generation fallback

export async function POST(request: Request) {
  // ... existing code
}
```

**Vercel Fluid Compute duration limits (enabled by default):**
| Plan | Default | Maximum |
|------|---------|---------|
| Hobby | 300s (5 min) | 300s (5 min) |
| Pro | 300s (5 min) | 800s (13 min) |
| Enterprise | 300s (5 min) | 800s (13 min) |

### Pattern 5: Stripe Production Setup
**What:** Create Stripe products and prices that match the tier configuration, then register the production webhook endpoint.
**Steps:**
1. Create 3 Products in Stripe Dashboard (Starter, Pro, Business)
2. Create a recurring Price for each product in JPY (zero-decimal currency)
3. Copy price IDs into Vercel env vars as `STRIPE_STARTER_PRICE_ID`, `STRIPE_PRO_PRICE_ID`, `STRIPE_BUSINESS_PRICE_ID`
4. Register webhook endpoint: `https://your-domain.vercel.app/api/webhooks/stripe`
5. Subscribe to events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`
6. Copy webhook signing secret to `STRIPE_WEBHOOK_SECRET`

**Stripe product configuration matching existing tiers:**
```
Starter: 5,000 JPY/month (recurring)
Pro:     15,000 JPY/month (recurring)
Business: 50,000 JPY/month (recurring)
```

### Anti-Patterns to Avoid
- **Using `drizzle-kit push` in production:** No audit trail, can cause data loss on destructive changes. Use `generate` + `migrate` instead.
- **Hardcoding production URLs:** Use `NEXT_PUBLIC_APP_URL` and `APP_URL` env vars everywhere. The project already does this correctly.
- **Setting `NEXT_PUBLIC_` vars only at runtime:** They are inlined at build time. Must be set before `next build` runs.
- **Skipping RLS on storage buckets:** The app uses `adminClient` (service role) for uploads, which bypasses RLS. But read access should still have explicit RLS policies for public buckets.
- **Not setting REPLICA IDENTITY FULL:** Without it, Supabase Realtime won't include changed column values in UPDATE events, breaking the campaign progress UI.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CI/CD pipeline | Custom GitHub Actions | Vercel Git Integration | Automatic preview + production deploys on push |
| SSL certificates | Manual cert management | Vercel (automatic HTTPS) | Zero-config TLS for all domains |
| Database migration tracking | Custom migration runner | drizzle-kit generate + migrate | Handles snapshots, conflict detection, SQL generation |
| Cron jobs | node-cron in serverless | Vercel Cron Jobs (vercel.json) | Serverless functions don't persist; Vercel cron triggers HTTP endpoints |
| Background task execution | Custom queue system | n8n (already configured) or Next.js `after()` | n8n handles long-running AI pipeline; `after()` for non-critical post-response work |
| Stripe product setup | Programmatic product creation | Stripe Dashboard | One-time setup; Dashboard provides visual confirmation |

**Key insight:** This phase is primarily infrastructure configuration, not code. The application code is already built. The work is about setting up the production environment correctly and verifying everything works end-to-end.

## Common Pitfalls

### Pitfall 1: Campaign Generation Timeout
**What goes wrong:** The `POST /api/campaigns` route runs the full AI pipeline (copy, images, compositing, resize, video) in a single request when n8n is not configured. This can take 2-10+ minutes.
**Why it happens:** Development used direct generation (no n8n), which works locally but exceeds serverless timeouts.
**How to avoid:** (1) Always configure n8n webhook URL in production so the API route returns immediately after triggering. (2) Set `export const maxDuration = 300` on the campaigns route as a safety net. (3) The direct generation fallback path already runs async (doesn't block the response), but the function still needs to stay alive.
**Warning signs:** 504 Gateway Timeout errors on campaign creation.

### Pitfall 2: Missing NEXT_PUBLIC_ Variables at Build Time
**What goes wrong:** Supabase client-side initialization fails because `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are undefined.
**Why it happens:** These variables must be present when `next build` runs because they get inlined into the JavaScript bundle. Setting them after build has no effect.
**How to avoid:** Add all `NEXT_PUBLIC_*` vars to Vercel project settings BEFORE the first deployment.
**Warning signs:** Client-side errors about undefined Supabase URL, hydration mismatches.

### Pitfall 3: Database Connection Pooling
**What goes wrong:** Database connections exhaust or prepared statement errors in production.
**Why it happens:** Supabase uses connection pooler in Transaction mode by default, which doesn't support prepared statements.
**How to avoid:** The project already has `{ prepare: false }` in `src/lib/db/index.ts`. Verify the `DATABASE_URL` uses the connection pooler URL (port 6543) for production, not the direct connection URL (port 5432).
**Warning signs:** "prepared statement already exists" errors, connection timeout errors.

### Pitfall 4: Supabase Auth Redirect URL Not Updated
**What goes wrong:** Google OAuth login redirects to localhost:3000 instead of production URL.
**Why it happens:** Supabase project's "Site URL" is still set to localhost, and production URL is not in the redirect allow list.
**How to avoid:** In Supabase Dashboard > Authentication > URL Configuration: (1) Update Site URL to production URL. (2) Add production URL to Redirect URLs. (3) Update Google Cloud Console OAuth client with production callback URL.
**Warning signs:** OAuth login redirects to wrong domain, "redirect_uri_mismatch" errors.

### Pitfall 5: Stripe Webhook Signature Verification Fails
**What goes wrong:** Stripe webhook events return 400 errors in production.
**Why it happens:** Using test-mode webhook secret with live-mode events, or vice versa. Each webhook endpoint gets its own signing secret.
**How to avoid:** (1) Create a new webhook endpoint in Stripe Dashboard for the production URL. (2) Use the production endpoint's webhook signing secret (not the CLI's test secret). (3) Verify the secret matches `STRIPE_WEBHOOK_SECRET` env var.
**Warning signs:** "Webhook signature verification failed" in Vercel function logs.

### Pitfall 6: Missing REPLICA IDENTITY on campaigns Table
**What goes wrong:** Supabase Realtime subscriptions receive UPDATE events but `payload.new` only contains the primary key, not the changed columns.
**Why it happens:** By default, PostgreSQL tables use REPLICA IDENTITY DEFAULT which only sends the primary key in the WAL for updates.
**How to avoid:** Run `ALTER TABLE campaigns REPLICA IDENTITY FULL;` before deploying.
**Warning signs:** Campaign progress UI doesn't update in realtime (falls back to 5-second polling but with null progress data).

### Pitfall 7: Storage Bucket Doesn't Exist
**What goes wrong:** File uploads fail with "Bucket not found" errors.
**Why it happens:** The code references four storage buckets that must be created manually in Supabase.
**How to avoid:** Create all four buckets before first deployment: `composited-images`, `platform-images`, `campaign-videos`, `campaign-audio`.
**Warning signs:** Upload errors in campaign generation, missing images/videos in the UI.

### Pitfall 8: Vercel Request Body Size Limit
**What goes wrong:** Large n8n webhook payloads (with base64 encoded media) fail with 413 errors.
**Why it happens:** Vercel has a 4.5 MB request body limit on serverless functions.
**How to avoid:** The n8n webhook handler already downloads media from provider URLs rather than receiving them inline. Verify n8n workflow sends URLs, not base64 data.
**Warning signs:** 413 FUNCTION_PAYLOAD_TOO_LARGE errors on webhook callbacks.

## Code Examples

### Vercel Configuration (vercel.json)
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs",
  "regions": ["hnd1"],
  "functions": {
    "app/api/campaigns/route.ts": {
      "maxDuration": 300
    },
    "app/api/webhooks/n8n/route.ts": {
      "maxDuration": 60
    },
    "app/api/webhooks/stripe/route.ts": {
      "maxDuration": 30
    }
  }
}
```
**Note:** `regions: ["hnd1"]` sets Tokyo as the default serverless region, which is optimal for a Japanese-market application with Supabase likely hosted in Tokyo region.

### Database Migration Generation
```bash
# Step 1: Generate SQL from current schema
npx drizzle-kit generate --name initial-schema

# Step 2: Review generated SQL
cat src/lib/db/migrations/0000_initial-schema.sql

# Step 3: Apply to production database
# Option A: drizzle-kit migrate (uses DATABASE_URL)
DATABASE_URL=postgresql://... npx drizzle-kit migrate

# Option B: Copy SQL and run in Supabase SQL Editor (for manual review)
```

### Supabase Infrastructure SQL
```sql
-- 1. Enable Realtime on campaigns table
ALTER TABLE campaigns REPLICA IDENTITY FULL;

-- 2. Enable Realtime publication for campaigns table
-- (In Supabase Dashboard: Database > Replication > supabase_realtime > toggle campaigns ON)
-- Or via SQL:
ALTER PUBLICATION supabase_realtime ADD TABLE campaigns;

-- 3. Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES
  ('composited-images', 'composited-images', true, 10485760),
  ('platform-images', 'platform-images', true, 10485760),
  ('campaign-videos', 'campaign-videos', true, 104857600),
  ('campaign-audio', 'campaign-audio', true, 20971520)
ON CONFLICT (id) DO NOTHING;

-- 4. Storage RLS policies
-- Allow public read on all campaign asset buckets
CREATE POLICY "Allow public read" ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id IN ('composited-images', 'platform-images', 'campaign-videos', 'campaign-audio'));

-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated uploads" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id IN ('composited-images', 'platform-images', 'campaign-videos', 'campaign-audio'));

-- Allow service role full access (the adminClient uses service role)
-- Note: service_role bypasses RLS by default, so no explicit policy needed for it
```

### Environment Variable Verification Script
```bash
#!/bin/bash
# verify-env.sh -- run locally or in CI to verify all required env vars exist

REQUIRED_VARS=(
  "NEXT_PUBLIC_SUPABASE_URL"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  "NEXT_PUBLIC_APP_URL"
  "SUPABASE_SERVICE_ROLE_KEY"
  "DATABASE_URL"
  "ANTHROPIC_API_KEY"
  "BFL_API_KEY"
  "STRIPE_SECRET_KEY"
  "STRIPE_WEBHOOK_SECRET"
  "STRIPE_STARTER_PRICE_ID"
  "STRIPE_PRO_PRICE_ID"
  "STRIPE_BUSINESS_PRICE_ID"
)

OPTIONAL_VARS=(
  "N8N_WEBHOOK_URL"
  "N8N_WEBHOOK_SECRET"
  "FAL_KEY"
  "RUNWAYML_API_SECRET"
  "ELEVENLABS_API_KEY"
  "ELEVENLABS_VOICE_ID_JP_FEMALE"
  "HEYGEN_API_KEY"
  "HEYGEN_DEFAULT_AVATAR_ID"
  "HEYGEN_JP_VOICE_ID"
)

missing=0
for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo "MISSING (required): $var"
    missing=$((missing + 1))
  fi
done

for var in "${OPTIONAL_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo "MISSING (optional): $var"
  fi
done

if [ $missing -gt 0 ]; then
  echo "ERROR: $missing required environment variables are missing"
  exit 1
fi
echo "All required environment variables are set"
```

### maxDuration Export for API Routes
```typescript
// Source: https://vercel.com/docs/functions/configuring-functions/duration
// Add to the TOP of src/app/api/campaigns/route.ts
export const maxDuration = 300; // 5 minutes for direct generation fallback
```

### Update .env.local.example with Complete Variable List
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Database
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# n8n Webhook
N8N_WEBHOOK_URL=https://your-n8n.example.com/webhook/campaign
N8N_WEBHOOK_SECRET=your-webhook-secret

# AI Services
ANTHROPIC_API_KEY=your-anthropic-api-key
BFL_API_KEY=your-bfl-api-key
FAL_KEY=your-fal-key
RUNWAYML_API_SECRET=your-runwayml-secret
ELEVENLABS_API_KEY=your-elevenlabs-key
ELEVENLABS_VOICE_ID_JP_FEMALE=your-voice-id
HEYGEN_API_KEY=your-heygen-key
HEYGEN_DEFAULT_AVATAR_ID=your-avatar-id
HEYGEN_JP_VOICE_ID=your-heygen-voice-id

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_STARTER_PRICE_ID=price_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_BUSINESS_PRICE_ID=price_...
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Vercel 10s/60s timeout | Fluid Compute 300s/800s default | 2025 | Campaign generation can run longer without n8n |
| `drizzle-kit push` for production | `drizzle-kit generate` + `migrate` | Always recommended | Audit trail, safe rollbacks |
| `waitUntil` (Vercel-specific) | `after()` from `next/server` | Next.js 15.1.0 | Framework-native, not vendor-locked |
| Stripe v19 `subscription.current_period_*` | Stripe v20 period on SubscriptionItem | 2025 | Project already handles this correctly |
| Manual Vercel env management | Vercel CLI `vercel env pull/push` | Ongoing | Faster environment setup |

**Deprecated/outdated:**
- `unstable_after()`: Replaced by stable `after()` in Next.js 15.1+. Project uses Next.js 16, so use the stable version.
- Direct database URL (port 5432) for production: Use Supabase connection pooler URL (port 6543) for serverless environments.

## Open Questions

1. **Supabase Database Region**
   - What we know: The app targets the Japanese market. Vercel should use `hnd1` (Tokyo) region.
   - What's unclear: Which region the Supabase project is deployed in.
   - Recommendation: Verify Supabase project region matches Vercel region (both should be Tokyo/ap-northeast-1 for lowest latency).

2. **n8n Hosting**
   - What we know: n8n is referenced as an external webhook URL. The app works without it (direct generation fallback).
   - What's unclear: Where n8n is hosted, how it's configured, whether it has its own deployment requirements.
   - Recommendation: Document n8n as an external dependency. If not yet set up, the app works in direct generation mode (with appropriate maxDuration).

3. **Custom Domain**
   - What we know: `NEXT_PUBLIC_APP_URL` is used for Stripe redirects and OAuth callbacks.
   - What's unclear: Whether a custom domain will be used or the default `.vercel.app` domain.
   - Recommendation: Support both. Set `NEXT_PUBLIC_APP_URL` to whatever the final domain is. Update Supabase Site URL and Stripe webhook URL accordingly.

4. **RLS Policies on Application Tables**
   - What we know: The app uses Supabase admin client (service role) for most operations, bypassing RLS. The proxy.ts handles auth at the application level.
   - What's unclear: Whether RLS should be enabled on application tables for defense-in-depth.
   - Recommendation: For MVP deployment, the current approach (service role + app-level auth) is sufficient. RLS can be added as a hardening step post-launch.

5. **Database Connection Pool URL**
   - What we know: The code uses `{ prepare: false }` which is correct for Transaction pool mode.
   - What's unclear: Whether the `DATABASE_URL` in production should use the pooler URL (port 6543) or direct URL (port 5432).
   - Recommendation: Use the connection pooler URL (port 6543, Transaction mode) for production. The code already has `prepare: false` set.

## Sources

### Primary (HIGH confidence)
- [Vercel Function Duration Configuration](https://vercel.com/docs/functions/configuring-functions/duration) - Exact timeout limits per plan, maxDuration syntax
- [Vercel Function Limitations](https://vercel.com/docs/functions/limitations) - Bundle size, request body, memory limits
- [Drizzle ORM Migrations](https://orm.drizzle.team/docs/migrations) - Generate and migrate workflow
- [Drizzle ORM with Supabase](https://orm.drizzle.team/docs/tutorials/drizzle-with-supabase) - Connection pooling, prepare: false
- [Supabase Storage Creating Buckets](https://supabase.com/docs/guides/storage/buckets/creating-buckets) - SQL and API bucket creation
- [Supabase Realtime Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes) - REPLICA IDENTITY FULL requirement
- [Supabase Auth Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls) - Site URL and redirect configuration
- [Next.js after() Function](https://nextjs.org/docs/app/api-reference/functions/after) - Stable since 15.1.0
- [Vercel Environment Variables](https://vercel.com/docs/environment-variables) - NEXT_PUBLIC_ build-time inlining

### Secondary (MEDIUM confidence)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs) - If scheduled tasks are needed later
- [Stripe Webhook Setup](https://docs.stripe.com/webhooks/quickstart) - Endpoint registration and event subscription
- [Stripe Products and Prices](https://docs.stripe.com/products-prices/manage-prices) - Product/price creation workflow

### Tertiary (LOW confidence)
- Vercel Fluid Compute specifics may have evolved since last checked. Verify current defaults at deployment time.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All technologies are already in the project; research verified current versions and deployment patterns
- Architecture: HIGH - Vercel + Supabase + Stripe deployment is well-documented with official sources
- Pitfalls: HIGH - Identified from project source code analysis (actual env var usage, missing configs, timeout-prone routes)
- Migration strategy: MEDIUM - drizzle-kit generate/migrate is standard, but no migrations exist yet; first generation needs manual review
- n8n deployment: LOW - External dependency with unknown hosting situation

**Research date:** 2026-02-09
**Valid until:** 2026-03-09 (30 days - stable technologies, well-documented patterns)
