# Phase 6: Billing & Compliance - Research

**Researched:** 2026-02-09
**Domain:** Stripe subscription billing (JPY), credit-based metering, Japanese advertising law compliance (AI agent)
**Confidence:** HIGH

## Summary

Phase 6 adds two distinct capabilities: (1) a Stripe-powered subscription and credit billing system with JPY pricing, and (2) an AI compliance agent that flags Japanese advertising law violations before campaign delivery.

For billing, the standard approach is Stripe Checkout (hosted) for subscription creation, Stripe Customer Portal for self-service management, and webhooks syncing subscription state to the Supabase database via Drizzle ORM. JPY is a zero-decimal currency in Stripe (amount 500 = 500 yen, no cents), with a minimum charge of 50 JPY. The credit system should use a local database ledger with atomic deductions, not Stripe's Billing Credits feature (which requires Stripe Meters and is overly complex for this use case). Credits are purchased as part of the subscription tier and tracked locally with per-campaign deduction logs.

For compliance, the existing QA agent pattern (Claude + structured tool output) provides the architecture template. The compliance agent checks generated copy against Keihyouhou (景品表示法 -- Act against Unjustifiable Premiums and Misleading Representations) for yuryou gonin (優良誤認/quality misrepresentation) and yuuri gonin (有利誤認/transaction misrepresentation), and against Yakki Ho (薬機法 -- Pharmaceutical and Medical Device Act) for prohibited health/cosmetic claims. Platform-specific rules (character limits, prohibited content) are already partially covered by the existing QA agent and can be extended.

**Primary recommendation:** Use Stripe Checkout + Customer Portal + webhooks for subscriptions, local credit ledger with atomic deductions for metering, and a Claude-based compliance agent following the existing QA agent pattern with Japanese advertising law knowledge baked into the system prompt.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| stripe | ^20.x | Server-side Stripe API (subscriptions, checkout, webhooks, portal) | Official Node SDK, TypeScript-first, handles all billing operations |
| @stripe/stripe-js | ^5.x | Client-side Stripe.js loader for Checkout redirect | Required for client-side Stripe interactions, thin wrapper |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| drizzle-orm | ^0.45.1 (already installed) | Schema definitions for billing tables, atomic credit operations | All database operations for subscriptions, credits, compliance reports |
| @anthropic-ai/sdk | ^0.73.0 (already installed) | Claude API for compliance agent | Compliance checking via structured tool output (same as QA agent) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Local credit ledger | Stripe Billing Credits API | Stripe Credits requires Meters + metered pricing, adds complexity; local ledger is simpler for pre-paid credit packs with subscription tiers |
| Stripe Checkout (hosted) | Stripe Elements (embedded) | Hosted Checkout is faster to implement, handles PCI compliance, supports JPY natively; Elements gives more UI control but requires more code |
| Claude compliance agent | Dedicated compliance SaaS (Ad-IS, TRUSQUETTA) | External services cost per-check and add vendor dependency; Claude-based agent is consistent with existing architecture and customizable |

**Installation:**
```bash
npm install stripe @stripe/stripe-js
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── api/
│   │   ├── webhooks/
│   │   │   └── stripe/route.ts       # Stripe webhook handler (signature verification + event dispatch)
│   │   ├── billing/
│   │   │   ├── checkout/route.ts      # Create Checkout Session for subscription
│   │   │   ├── portal/route.ts        # Create Customer Portal session
│   │   │   ├── credits/route.ts       # GET credit balance, usage history
│   │   │   └── estimate/route.ts      # POST campaign brief -> credit cost estimate
│   │   └── campaigns/
│   │       └── [id]/
│   │           └── compliance/route.ts # POST run compliance check on campaign
│   ├── (dashboard)/
│   │   ├── billing/page.tsx           # Subscription management + credit balance UI
│   │   └── campaigns/
│   │       └── [id]/page.tsx          # (existing) add compliance results display
├── lib/
│   ├── stripe/
│   │   ├── client.ts                  # Stripe server instance (singleton)
│   │   ├── config.ts                  # Tier definitions, price IDs, credit allocations
│   │   └── sync.ts                    # Webhook event handlers (upsert subscription, grant credits)
│   ├── billing/
│   │   ├── credits.ts                 # Credit ledger operations (check, deduct, grant, history)
│   │   ├── estimate.ts                # Cost estimation logic (brief -> credits)
│   │   └── tiers.ts                   # Tier feature gates and credit limits
│   ├── ai/
│   │   ├── compliance-agent.ts        # Compliance checking agent (mirrors qa-agent.ts pattern)
│   │   └── prompts/
│   │       └── compliance-check.ts    # System + user prompts for advertising law checks
│   └── db/
│       └── schema.ts                  # (extend) add billing tables
```

### Pattern 1: Stripe Webhook Handler (App Router)
**What:** Route handler that receives Stripe events, verifies signature with raw body, and dispatches to handlers
**When to use:** All Stripe event processing (subscription changes, payment success, etc.)
**Example:**
```typescript
// Source: Stripe docs + Next.js App Router pattern (verified via multiple guides)
// src/app/api/webhooks/stripe/route.ts
import { NextResponse } from "next/server"
import Stripe from "stripe"
import { handleSubscriptionChange, handleCheckoutComplete } from "@/lib/stripe/sync"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(request: Request) {
  const rawBody = await request.text()
  const signature = request.headers.get("stripe-signature")

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutComplete(event.data.object as Stripe.Checkout.Session)
      break
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await handleSubscriptionChange(event.data.object as Stripe.Subscription)
      break
    case "invoice.payment_succeeded":
      // Monthly credit grant on successful payment
      await handleInvoicePaid(event.data.object as Stripe.Invoice)
      break
  }

  return NextResponse.json({ received: true })
}
```

### Pattern 2: Atomic Credit Deduction
**What:** Check-and-deduct credits in a single atomic database operation to prevent race conditions
**When to use:** Every campaign generation that consumes credits
**Example:**
```typescript
// Source: Verified pattern from multiple SaaS billing guides
// src/lib/billing/credits.ts
import { db } from "@/lib/db"
import { creditLedger, teams } from "@/lib/db/schema"
import { eq, sql } from "drizzle-orm"

export async function deductCredits(
  teamId: string,
  amount: number,
  campaignId: string,
  description: string
): Promise<{ success: boolean; remainingBalance: number }> {
  // Atomic: only deducts if balance >= amount
  const result = await db
    .update(teams)
    .set({
      creditBalance: sql`credit_balance - ${amount}`,
    })
    .where(
      sql`${teams.id} = ${teamId} AND credit_balance >= ${amount}`
    )
    .returning({ creditBalance: teams.creditBalance })

  if (result.length === 0) {
    return { success: false, remainingBalance: 0 }
  }

  // Log the transaction
  await db.insert(creditLedger).values({
    teamId,
    amount: -amount,
    balanceAfter: result[0].creditBalance,
    type: "deduction",
    campaignId,
    description,
  })

  return { success: true, remainingBalance: result[0].creditBalance }
}
```

### Pattern 3: Compliance Agent (mirrors QA Agent)
**What:** Claude-based agent using structured tool output to flag advertising law violations
**When to use:** After copy generation, before campaign delivery/approval
**Example:**
```typescript
// Source: Existing QA agent pattern in src/lib/ai/qa-agent.ts
// src/lib/ai/compliance-agent.ts
import Anthropic from "@anthropic-ai/sdk"
import { COMPLIANCE_SYSTEM_PROMPT, buildComplianceUserPrompt } from "./prompts/compliance-check"

const COMPLIANCE_TOOL: Anthropic.Tool = {
  name: "deliver_compliance_report",
  description: "広告コンプライアンスの検証結果を構造化された形式で返します。",
  input_schema: {
    type: "object" as const,
    properties: {
      overallRisk: {
        type: "string",
        enum: ["low", "medium", "high"],
        description: "全体リスクレベル",
      },
      keihyouhouIssues: {
        type: "array",
        items: {
          type: "object",
          properties: {
            category: { type: "string", enum: ["yuryou_gonin", "yuuri_gonin", "stealth_marketing"] },
            field: { type: "string" },
            problematicText: { type: "string" },
            issue: { type: "string" },
            severity: { type: "string", enum: ["error", "warning"] },
            suggestion: { type: "string" },
            legalBasis: { type: "string" },
          },
          required: ["category", "field", "problematicText", "issue", "severity", "suggestion", "legalBasis"],
        },
      },
      yakkihoIssues: { /* same structure for pharmaceutical law */ },
      platformRuleIssues: { /* platform-specific rule violations */ },
    },
    required: ["overallRisk", "keihyouhouIssues", "yakkihoIssues", "platformRuleIssues"],
  },
}
```

### Pattern 4: Checkout Session Creation with JPY
**What:** Create Stripe Checkout session for subscription with JPY pricing
**When to use:** User subscribes or upgrades tier
**Example:**
```typescript
// Source: Stripe Checkout docs + JPY zero-decimal currency handling
// src/app/api/billing/checkout/route.ts
import { NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@/lib/supabase/server"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 })

  const { priceId } = await request.json()

  // Get or create Stripe customer
  let customerId = await getStripeCustomerId(user.id)
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { supabaseUserId: user.id },
    })
    customerId = customer.id
    await saveStripeCustomerId(user.id, customerId)
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: "subscription",
    currency: "jpy",  // JPY is zero-decimal: amount 5000 = 5000 yen
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?canceled=true`,
    metadata: { supabaseUserId: user.id },
  })

  return NextResponse.json({ url: session.url })
}
```

### Anti-Patterns to Avoid
- **Storing credit balance only in Stripe:** Always maintain a local ledger. Stripe API latency makes real-time balance checks too slow for pre-generation estimation.
- **Polling Stripe for subscription status:** Use webhooks to sync state to your database. Never check Stripe on every page load.
- **Trusting client-side tier checks:** Always verify subscription tier and credit balance server-side before allowing generation.
- **Hardcoding prices in the app:** Store Stripe Price IDs in environment variables or a config file. Create products/prices in Stripe Dashboard, reference by ID.
- **Running compliance checks synchronously in the generation pipeline:** Run compliance as a separate step after generation, before delivery. Don't block the generation pipeline.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Payment form / PCI compliance | Custom payment form | Stripe Checkout (hosted) | PCI-DSS compliance is extremely complex; Stripe handles it entirely |
| Subscription lifecycle management | Custom state machine for trial/active/canceled/past_due | Stripe Subscription API + webhooks | Dunning, retries, proration are handled by Stripe |
| Customer billing portal | Custom subscription management UI | Stripe Customer Portal | Pre-built, handles plan changes, payment method updates, invoices |
| Webhook signature verification | Custom HMAC verification | `stripe.webhooks.constructEvent()` | Handles replay attack prevention, timing-safe comparison |
| Invoice generation | Custom PDF invoices | Stripe Invoices | Automatically generated, handles tax, receipt emails |
| Currency formatting | Manual JPY formatting | `Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' })` | Handles zero-decimal correctly, locale-aware |

**Key insight:** Stripe has spent billions making billing reliable. Every custom billing solution introduces edge cases around failed payments, prorations, upgrades/downgrades, and tax handling that Stripe already solves. Use Stripe for payment/subscription state; use your database only for credit balance tracking and feature gates.

## Common Pitfalls

### Pitfall 1: JPY Zero-Decimal Currency Miscalculation
**What goes wrong:** Developers multiply JPY amounts by 100 (as with USD), resulting in charges 100x too high
**Why it happens:** Most Stripe tutorials use USD examples where $10.00 = 1000 (smallest unit)
**How to avoid:** JPY is zero-decimal. Amount 5000 = 5000 yen. Never multiply by 100. Add a helper function that validates zero-decimal currencies.
**Warning signs:** Test charges showing 500,000 instead of 5,000

### Pitfall 2: Webhook Body Parsing Breaks Signature Verification
**What goes wrong:** Next.js automatically parses the request body as JSON, but Stripe signature verification requires the raw body string
**Why it happens:** App Router route handlers don't auto-parse, but developers sometimes use `request.json()` before `request.text()`
**How to avoid:** Always use `request.text()` first for the raw body, then `JSON.parse()` manually after verification
**Warning signs:** All webhook events fail signature verification in development

### Pitfall 3: Race Condition in Credit Deduction
**What goes wrong:** Two concurrent requests both check balance (100 credits), both see enough credits, both deduct, resulting in negative balance
**Why it happens:** Separate SELECT then UPDATE without atomicity
**How to avoid:** Use single atomic UPDATE with WHERE clause: `UPDATE teams SET credit_balance = credit_balance - X WHERE id = Y AND credit_balance >= X`
**Warning signs:** Credit balance going negative in production

### Pitfall 4: Missing Webhook Events During Development
**What goes wrong:** Subscription state in database gets out of sync with Stripe because webhook endpoint is not reachable
**Why it happens:** Local development server is not accessible to Stripe
**How to avoid:** Use Stripe CLI: `stripe listen --forward-to http://localhost:3000/api/webhooks/stripe`. Add this to package.json scripts.
**Warning signs:** Subscription shows active in Stripe Dashboard but not in app

### Pitfall 5: Compliance Agent False Positives Blocking Legitimate Copy
**What goes wrong:** Agent flags too many issues, making the system unusable
**Why it happens:** Overly strict prompts or misunderstanding context (e.g., flagging brand names as claims)
**How to avoid:** Use severity levels (error vs warning), only block on "error" severity. Include product category context in the prompt. Allow users to acknowledge warnings and proceed.
**Warning signs:** Users consistently ignoring compliance warnings

### Pitfall 6: Not Handling Stripe Customer Portal Subscription Changes
**What goes wrong:** User downgrades via portal, but app still shows old tier and grants old credit allocation
**Why it happens:** Only handling `checkout.session.completed`, not `customer.subscription.updated`
**How to avoid:** Handle all subscription lifecycle events: `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`
**Warning signs:** Users on canceled subscriptions still able to generate campaigns

### Pitfall 7: Stripe Minimum Charge Amount for JPY
**What goes wrong:** Creating subscriptions with amounts below 50 JPY fails
**Why it happens:** Stripe enforces minimum charge amounts per currency
**How to avoid:** Ensure all subscription tier prices are at or above 50 JPY (effectively not an issue for real pricing, but matters for testing)
**Warning signs:** Checkout session creation fails with "amount_too_small" error

## Code Examples

### Database Schema Extension for Billing
```typescript
// Source: Drizzle ORM pg-core column types (verified via official docs)
// Extend src/lib/db/schema.ts

import { pgTable, uuid, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core"

// Add creditBalance to teams table (ALTER TABLE via migration)
// teams.creditBalance: integer("credit_balance").notNull().default(0)

/**
 * Stripe customer mapping -- links Supabase user to Stripe customer.
 */
export const stripeCustomers = pgTable("stripe_customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => profiles.id)
    .notNull()
    .unique(),
  stripeCustomerId: text("stripe_customer_id").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

/**
 * Subscriptions -- synced from Stripe via webhooks.
 */
export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id")
    .references(() => teams.id)
    .notNull()
    .unique(),
  stripeSubscriptionId: text("stripe_subscription_id").notNull().unique(),
  stripePriceId: text("stripe_price_id").notNull(),
  tier: text("tier").notNull().default("starter"), // 'starter' | 'pro' | 'business'
  status: text("status").notNull().default("active"), // 'trialing' | 'active' | 'canceled' | 'past_due' | 'incomplete'
  currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
})

/**
 * Credit ledger -- immutable audit log of all credit transactions.
 */
export const creditLedger = pgTable("credit_ledger", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id")
    .references(() => teams.id)
    .notNull(),
  amount: integer("amount").notNull(), // positive = grant, negative = deduction
  balanceAfter: integer("balance_after").notNull(),
  type: text("type").notNull(), // 'grant' | 'deduction' | 'adjustment' | 'expiry'
  campaignId: uuid("campaign_id").references(() => campaigns.id),
  description: text("description").notNull(),
  stripeInvoiceId: text("stripe_invoice_id"), // links to Stripe invoice for grants
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

/**
 * Compliance reports -- results from the compliance agent per campaign.
 */
export const complianceReports = pgTable("compliance_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  campaignId: uuid("campaign_id")
    .references(() => campaigns.id)
    .notNull(),
  overallRisk: text("overall_risk").notNull(), // 'low' | 'medium' | 'high'
  keihyouhouResult: jsonb("keihyouhou_result").notNull(), // { issues: ComplianceIssue[] }
  yakkihoResult: jsonb("yakkiho_result").notNull(), // { issues: ComplianceIssue[] }
  platformRuleResult: jsonb("platform_rule_result").notNull(), // { issues: ComplianceIssue[] }
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }), // user acknowledged warnings
  acknowledgedBy: uuid("acknowledged_by").references(() => profiles.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
})
```

### Tier Configuration
```typescript
// src/lib/billing/tiers.ts
export interface TierConfig {
  id: "starter" | "pro" | "business"
  nameJa: string
  nameEn: string
  monthlyPriceJpy: number
  monthlyCredits: number
  maxBrands: number
  maxTeamMembers: number
  features: string[]
}

export const TIERS: TierConfig[] = [
  {
    id: "starter",
    nameJa: "スターター",
    nameEn: "Starter",
    monthlyPriceJpy: 5000,  // 5,000 yen/month
    monthlyCredits: 100,
    maxBrands: 3,
    maxTeamMembers: 2,
    features: ["copy_generation", "image_generation", "basic_qa"],
  },
  {
    id: "pro",
    nameJa: "プロ",
    nameEn: "Pro",
    monthlyPriceJpy: 15000,  // 15,000 yen/month
    monthlyCredits: 500,
    maxBrands: 10,
    maxTeamMembers: 5,
    features: ["copy_generation", "image_generation", "video_generation", "qa_agent", "compliance_agent", "approval_workflow"],
  },
  {
    id: "business",
    nameJa: "ビジネス",
    nameEn: "Business",
    monthlyPriceJpy: 50000,  // 50,000 yen/month
    monthlyCredits: 2000,
    maxBrands: -1,  // unlimited
    maxTeamMembers: -1,  // unlimited
    features: ["copy_generation", "image_generation", "video_generation", "qa_agent", "compliance_agent", "approval_workflow", "avatar_generation", "priority_support"],
  },
]
```

### Credit Cost Estimation
```typescript
// src/lib/billing/estimate.ts

interface CreditEstimate {
  copyCredits: number
  imageCredits: number
  videoCredits: number
  voiceoverCredits: number
  avatarCredits: number
  totalCredits: number
}

/**
 * Estimate credit cost for a campaign based on its brief.
 * Called before generation starts so user sees cost upfront.
 */
export function estimateCampaignCost(brief: {
  platforms: string[]
  includeVideo?: boolean
  includeVoiceover?: boolean
  includeAvatar?: boolean
}): CreditEstimate {
  const platformCount = brief.platforms.length

  // Base costs per component
  const copyCredits = platformCount * 2      // 2 credits per platform (4 variants each)
  const imageCredits = 4 * 3                 // 4 images x 3 credits each
  const videoCredits = brief.includeVideo ? platformCount * 10 : 0
  const voiceoverCredits = brief.includeVoiceover ? 5 : 0
  const avatarCredits = brief.includeAvatar ? 15 : 0

  return {
    copyCredits,
    imageCredits,
    videoCredits,
    voiceoverCredits,
    avatarCredits,
    totalCredits: copyCredits + imageCredits + videoCredits + voiceoverCredits + avatarCredits,
  }
}
```

### Stripe Client Singleton
```typescript
// src/lib/stripe/client.ts
import Stripe from "stripe"

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set")
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  typescript: true,
})
```

### Currency Formatting Helper
```typescript
// Add to src/lib/utils.ts or new src/lib/billing/format.ts
export function formatJPY(amount: number): string {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
  }).format(amount)
}

// Usage: formatJPY(5000) => "￥5,000"
```

### Compliance Agent System Prompt (Key Sections)
```typescript
// src/lib/ai/prompts/compliance-check.ts

export const COMPLIANCE_SYSTEM_PROMPT = `あなたは日本の広告法規コンプライアンスの検証エージェントです。以下の法律に基づいて広告コピーを検証してください。

【検証対象法規】

1. 景品表示法（不当景品類及び不当表示防止法）

   a) 優良誤認（第5条第1号）
      商品・サービスの品質、規格、内容について、実際よりも著しく優良であると一般消費者に誤認される表示

      チェックポイント:
      - 「No.1」「最高」「最大」「唯一」などの最上級表現に根拠があるか
      - 効果・性能について客観的根拠なく断定していないか
      - 比較広告で競合より優れているという根拠のない主張がないか

   b) 有利誤認（第5条第2号）
      価格・取引条件について、実際よりも著しく有利であると一般消費者に誤認される表示

      チェックポイント:
      - 二重価格表示（「通常価格○○円→今だけ△△円」）が実態に即しているか
      - 「限定」「今だけ」などの緊急性表現が事実に基づいているか
      - 数量限定・期間限定の根拠があるか

   c) ステルスマーケティング規制
      広告であることを明示しない宣伝行為

2. 薬機法（医薬品、医療機器等の品質、有効性及び安全性の確保等に関する法律）

   チェックポイント:
   - 化粧品・健康食品について医薬品的な効能効果を標ぼうしていないか
   - 「治る」「改善する」「痩せる」「若返る」などの禁止表現がないか
   - 「安心・安全」を断定的に使用していないか
   - 体験談が効能効果の保証として使われていないか

3. プラットフォーム固有ルール
   - 各広告プラットフォームの禁止コンテンツポリシー
   - 文字数・ハッシュタグ数の制限違反

【重要な注意】
- AIで生成されたコピーは無意識に誇大表現になりやすいことを考慮してください
- severity は "error"（法令違反の可能性が高い）と "warning"（グレーゾーン・要確認）を使い分けてください
- 各指摘には法的根拠（legalBasis）を必ず含めてください
- ブランド名や商品名を誇大表現と混同しないでください

deliver_compliance_report ツールを使って構造化された検証結果を返してください。`
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Stripe Charges API | Stripe Payment Intents + Checkout Sessions | 2019+ | Checkout handles SCA, 3D Secure, multi-currency natively |
| Custom subscription state machine | Stripe Billing + Customer Portal | 2020+ | Eliminates 90% of subscription management code |
| Stripe Usage Records API | Stripe Meters + Meter Events API | 2024 | New meters API is more reliable; however for simple credits, local ledger is still simpler |
| Manual legal review of ad copy | AI-assisted compliance checking + human review | 2024-2025 | Multiple Japanese startups launched AI ad-check tools (Ad-IS, TRUSQUETTA, etc.) |
| Stripe Charges (legacy) | Stripe Billing Credits (for usage-based) | 2024-10 | New API for prepaid credits; requires Meters; good for true usage-based but overkill for subscription tiers with credit packs |

**Deprecated/outdated:**
- Stripe `stripe.charges.create()`: Use `stripe.checkout.sessions.create()` or Payment Intents instead
- Stripe Usage Records API: Being superseded by Meters API for new integrations
- Manual webhook HMAC verification: Use `stripe.webhooks.constructEvent()` which handles timing-safe comparison

## Open Questions

1. **Exact credit costs per operation**
   - What we know: Credits should scale with campaign complexity (platforms, video, avatar)
   - What's unclear: The exact credit-to-cost mapping needs business input (how much does each AI API call actually cost?)
   - Recommendation: Start with rough estimates (copy: 2 per platform, image: 3 per image, video: 10 per clip), tune based on actual API costs after launch

2. **Compliance agent integration point in the pipeline**
   - What we know: Must run after copy generation, before delivery
   - What's unclear: Should it run automatically (like QA), or on-demand (user clicks "check compliance")? Should it block delivery or just warn?
   - Recommendation: Run automatically after QA, display results alongside QA results. "Error" severity issues should require acknowledgment before delivery. "Warning" issues are informational only.

3. **Stripe product/price creation workflow**
   - What we know: Products and prices should be created in Stripe Dashboard, not via API
   - What's unclear: Whether to use Stripe CLI fixtures for reproducible test setup or manual dashboard creation
   - Recommendation: Create a `stripe-fixtures.json` for test/dev environments, manual creation for production. Store Price IDs in environment variables per environment.

4. **Credit rollover policy**
   - What we know: Monthly credits are granted on each billing cycle
   - What's unclear: Do unused credits roll over? Expire at period end? Cap at some maximum?
   - Recommendation: Credits expire at period end (no rollover) for simplicity. This is the most common SaaS pattern and avoids liability accumulation.

5. **Product category for compliance checking**
   - What we know: Yakki Ho (pharmaceutical law) rules apply differently to cosmetics, health foods, supplements, general products
   - What's unclear: Whether the brand profile should include a product category that modifies compliance checking strictness
   - Recommendation: Add an optional `productCategory` field to brand profiles (e.g., "general", "cosmetics", "health_food", "supplement") that the compliance agent uses to adjust checking rules.

## Sources

### Primary (HIGH confidence)
- [Stripe Currencies Docs](https://docs.stripe.com/currencies) - JPY zero-decimal handling, minimum charge (50 JPY), max amounts
- [Stripe Checkout Quickstart for Next.js](https://docs.stripe.com/checkout/quickstart?client=next) - Route handler patterns, session creation
- [Stripe Customer Portal Integration](https://docs.stripe.com/customer-management/integrate-customer-portal) - Portal session API, webhook events
- [Stripe Usage-Based Billing Implementation](https://docs.stripe.com/billing/subscriptions/usage-based/implementation-guide) - Meters API, meter events
- [Stripe Billing Credits Docs](https://docs.stripe.com/billing/subscriptions/usage-based/billing-credits) - Credit grants, ledger system
- [Stripe Credit-Based Pricing Model](https://docs.stripe.com/billing/subscriptions/usage-based/use-cases/credits-based-pricing-model) - Full credit pricing setup
- [Consumer Affairs Agency - Fair Labeling Regulations](https://www.caa.go.jp/policies/policy/representation/fair_labeling/representation_regulation) - Keihyouhou categories, yuryou/yuuri gonin definitions
- [Drizzle ORM PostgreSQL Column Types](https://orm.drizzle.team/docs/column-types/pg) - integer, numeric types for billing schema

### Secondary (MEDIUM confidence)
- [Japan's Advertising Laws Overview (MailMate)](https://mailmate.jp/blog/japans-advertising-laws) - Keihyouhou and Yakki Ho summary with examples
- [Stripe + Next.js 15 Complete Guide (Pedro Alonso)](https://www.pedroalonso.net/blog/stripe-nextjs-complete-guide-2025/) - Modern integration patterns
- [Pre-paid Credit Billing with Next.js (Pedro Alonso)](https://www.pedroalonso.net/blog/stripe-usage-credit-billing/) - Credit ledger architecture
- [Vercel nextjs-subscription-payments template](https://github.com/vercel/nextjs-subscription-payments) - Reference architecture for Supabase + Stripe
- [Stripe + Supabase + Next.js Integration Guide (DEV)](https://dev.to/flnzba/33-stripe-integration-guide-for-nextjs-15-with-supabase-13b5) - Supabase-specific webhook patterns
- [AI Ad Compliance Check Services in Japan (HackAI)](https://hackai.cyand.co.jp/article/ad-check-ai-generation/) - Landscape of AI compliance tools, approaches
- [stripe npm package v20.3.1](https://www.npmjs.com/package/stripe) - Current version verification

### Tertiary (LOW confidence)
- Tier pricing (5000/15000/50000 JPY) and credit allocations are placeholder values requiring business validation
- Credit cost per operation (2 per platform copy, 3 per image, etc.) is a rough estimate requiring tuning against actual API costs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Stripe is the de-facto standard for SaaS billing; Next.js integration is well-documented with multiple official and community sources
- Architecture: HIGH - Webhook-driven sync pattern is established; credit ledger pattern is well-documented; compliance agent follows existing QA agent pattern in codebase
- Pitfalls: HIGH - JPY zero-decimal, webhook body parsing, credit race conditions are well-known issues documented across multiple sources
- Compliance law specifics: MEDIUM - Japanese advertising law categories and rules verified via official Consumer Affairs Agency sources, but specific edge cases in Keihyouhou/Yakki Ho may require legal review
- Pricing/credits: LOW - Tier pricing and credit costs are placeholders requiring business decisions

**Research date:** 2026-02-09
**Valid until:** 2026-03-09 (30 days - Stripe APIs are stable; Japanese advertising laws change infrequently)
