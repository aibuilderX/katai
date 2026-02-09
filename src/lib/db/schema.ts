import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  boolean,
  integer,
} from "drizzle-orm/pg-core"

// ===== JSONB Type Interfaces =====

export interface BrandColors {
  primary: string
  secondary: string
  accent: string
  background: string
}

export interface ProductCatalogEntry {
  name: string
  description: string
  keyFeatures: string[]
  priceRange: string
  targetSegment: string
}

export interface CampaignBrief {
  brandProfileId: string
  objective: string
  targetAudience: string
  platforms: string[]
  registerOverride?: string
  creativeMoodTags: string[]
  creativeDirection: string
  referenceImageUrl?: string
  campaignProductInfo?: string
}

export interface CampaignProgress {
  stage: string
  copyStatus: "pending" | "generating" | "complete" | "failed"
  imageStatus: "pending" | "generating" | "complete" | "failed"
  compositingStatus?: "pending" | "generating" | "complete" | "failed"
  platformResizeStatus?: "pending" | "generating" | "complete" | "failed"
  emailStatus?: "pending" | "generating" | "complete" | "failed"
  voiceoverStatus?: "pending" | "generating" | "complete" | "failed" | "skipped"
  videoStatus?: "pending" | "generating" | "complete" | "failed" | "skipped"
  avatarStatus?: "pending" | "generating" | "complete" | "failed" | "skipped"
  percentComplete: number
  currentStep: string
}

export interface ErrorEntry {
  timestamp: string
  stage: string
  message: string
  details?: string
}

export interface ComplianceIssue {
  category: string
  field: string
  problematicText: string
  issue: string
  severity: "error" | "warning"
  suggestion: string
  legalBasis: string
}

// ===== Tables =====

/**
 * User profiles -- extends Supabase auth.users.
 * id matches auth.users.id (not auto-generated).
 */
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(), // matches auth.users.id
  email: text("email").notNull(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
})

/**
 * Teams / Organizations.
 * Every user belongs to at least one team (auto-created on signup).
 */
export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  ownerId: uuid("owner_id")
    .references(() => profiles.id)
    .notNull(),
  creditBalance: integer("credit_balance").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

/**
 * Team membership with role-based access.
 */
export const teamMembers = pgTable("team_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id")
    .references(() => teams.id)
    .notNull(),
  userId: uuid("user_id")
    .references(() => profiles.id)
    .notNull(),
  role: text("role").notNull().default("editor"), // 'admin' | 'editor' | 'viewer'
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

/**
 * Brand profiles -- each brand contains identity, tone, and product info.
 */
export const brandProfiles = pgTable("brand_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id")
    .references(() => teams.id)
    .notNull(),
  name: text("name").notNull(),
  logoUrl: text("logo_url"),
  colors: jsonb("colors").$type<BrandColors>(),
  fontPreference: text("font_preference").default("noto_sans_jp"),
  defaultRegister: text("default_register").notNull().default("standard"), // 'casual' | 'standard' | 'formal'
  toneTags: jsonb("tone_tags").$type<string[]>().default([]),
  toneDescription: text("tone_description"),
  productCatalog: jsonb("product_catalog").$type<ProductCatalogEntry[]>(),
  positioningStatement: text("positioning_statement"),
  brandStory: text("brand_story"),
  targetMarket: text("target_market"),
  brandValues: jsonb("brand_values").$type<string[]>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
})

/**
 * Campaigns -- each campaign represents one brief submission and generation run.
 */
export const campaigns = pgTable("campaigns", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id")
    .references(() => teams.id)
    .notNull(),
  brandProfileId: uuid("brand_profile_id")
    .references(() => brandProfiles.id)
    .notNull(),
  createdBy: uuid("created_by")
    .references(() => profiles.id)
    .notNull(),
  name: text("name"),
  brief: jsonb("brief").notNull().$type<CampaignBrief>(),
  status: text("status").notNull().default("pending"), // 'pending' | 'generating' | 'complete' | 'failed' | 'partial'
  n8nExecutionId: text("n8n_execution_id"),
  progress: jsonb("progress").$type<CampaignProgress>(),
  errorLog: jsonb("error_log").$type<ErrorEntry[]>(),
  thumbnailUrl: text("thumbnail_url"),
  parentCampaignId: uuid("parent_campaign_id"),
  templateId: text("template_id"),
  approvalStatus: text("approval_status").default("none"), // 'none' | 'draft' | 'pending_review' | 'pending_approval' | 'approved' | 'rejected' | 'revision_requested'
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
})

/**
 * Copy variants -- each campaign generates 4 copy variants (A/B/C/D) per platform.
 */
export const copyVariants = pgTable("copy_variants", {
  id: uuid("id").primaryKey().defaultRandom(),
  campaignId: uuid("campaign_id")
    .references(() => campaigns.id)
    .notNull(),
  platform: text("platform").notNull(),
  variantLabel: text("variant_label").notNull(), // 'A案' | 'B案' | 'C案' | 'D案'
  register: text("register").notNull(), // 'casual' | 'standard' | 'formal'
  headline: text("headline").notNull(),
  bodyText: text("body_text").notNull(),
  ctaText: text("cta_text").notNull(),
  hashtags: jsonb("hashtags").$type<string[]>().default([]),
  isFavorite: boolean("is_favorite").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

/**
 * Generated assets -- images (Phase 1), video/audio in later phases.
 */
export const assets = pgTable("assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  campaignId: uuid("campaign_id")
    .references(() => campaigns.id)
    .notNull(),
  type: text("type").notNull(), // 'image' | 'video' | 'audio' (Phase 1: images only)
  storageKey: text("storage_key").notNull(), // Supabase Storage path
  fileName: text("file_name"),
  width: text("width"),
  height: text("height"),
  mimeType: text("mime_type"),
  modelUsed: text("model_used"), // e.g. 'flux-1.1-pro-ultra'
  prompt: text("prompt"), // The prompt used for generation
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

/**
 * Approval workflows -- one workflow per campaign for review/approval tracking.
 */
export const approvalWorkflows = pgTable("approval_workflows", {
  id: uuid("id").primaryKey().defaultRandom(),
  campaignId: uuid("campaign_id")
    .references(() => campaigns.id)
    .notNull()
    .unique(),
  status: text("status").notNull().default("draft"), // 'draft' | 'pending_review' | 'pending_approval' | 'approved' | 'rejected' | 'revision_requested'
  submittedBy: uuid("submitted_by").references(() => profiles.id),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  reviewedBy: uuid("reviewed_by").references(() => profiles.id),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewComment: text("review_comment"),
  approvedBy: uuid("approved_by").references(() => profiles.id),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  approvalComment: text("approval_comment"),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
})

/**
 * Approval history -- audit log of all approval workflow state transitions.
 */
export const approvalHistory = pgTable("approval_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  workflowId: uuid("workflow_id")
    .references(() => approvalWorkflows.id)
    .notNull(),
  action: text("action").notNull(), // 'submitted' | 'reviewed' | 'approved' | 'rejected' | 'revision_requested'
  fromStatus: text("from_status").notNull(),
  toStatus: text("to_status").notNull(),
  actorId: uuid("actor_id")
    .references(() => profiles.id)
    .notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

/**
 * QA reports -- automated quality assurance results per campaign.
 */
export const qaReports = pgTable("qa_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  campaignId: uuid("campaign_id")
    .references(() => campaigns.id)
    .notNull(),
  overallScore: integer("overall_score").notNull(), // 0-100
  keigoResult: jsonb("keigo_result").notNull(), // { passed: boolean, issues: Array<{variantId, field, issue, severity, suggestion}> }
  brandResult: jsonb("brand_result").notNull(), // { passed: boolean, issues: Array<{type, description, severity}> }
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

// ===== Billing & Compliance Tables =====

/**
 * Stripe customers -- maps users to Stripe customer IDs.
 * One Stripe customer per user.
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
 * Subscriptions -- one active subscription per team.
 * Tracks Stripe subscription state and tier.
 */
export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id")
    .references(() => teams.id)
    .notNull()
    .unique(),
  stripeSubscriptionId: text("stripe_subscription_id").notNull().unique(),
  stripePriceId: text("stripe_price_id").notNull(),
  tier: text("tier").notNull().default("free"), // 'free' | 'starter' | 'pro' | 'business'
  status: text("status").notNull().default("active"), // 'trialing' | 'active' | 'canceled' | 'past_due' | 'incomplete'
  currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
})

/**
 * Credit ledger -- audit log of all credit transactions.
 * Positive amounts = grants, negative = deductions.
 */
export const creditLedger = pgTable("credit_ledger", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id")
    .references(() => teams.id)
    .notNull(),
  amount: integer("amount").notNull(), // positive = grant, negative = deduction
  balanceAfter: integer("balance_after").notNull(),
  type: text("type").notNull(), // 'grant' | 'deduction' | 'adjustment' | 'expiry'
  campaignId: uuid("campaign_id").references(() => campaigns.id), // nullable -- only for deductions
  description: text("description").notNull(),
  stripeInvoiceId: text("stripe_invoice_id"), // nullable -- only for grants tied to payments
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

/**
 * Compliance reports -- regulatory compliance check results per campaign.
 * Covers Keihyouhou (景品表示法), Yakkihou (薬機法), and platform rules.
 */
export const complianceReports = pgTable("compliance_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  campaignId: uuid("campaign_id")
    .references(() => campaigns.id)
    .notNull(),
  overallRisk: text("overall_risk").notNull(), // 'low' | 'medium' | 'high'
  keihyouhouResult: jsonb("keihyouhou_result").notNull().$type<ComplianceIssue[]>(),
  yakkihoResult: jsonb("yakkiho_result").notNull().$type<ComplianceIssue[]>(),
  platformRuleResult: jsonb("platform_rule_result").notNull().$type<ComplianceIssue[]>(),
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
  acknowledgedBy: uuid("acknowledged_by").references(() => profiles.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
})
