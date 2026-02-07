import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  boolean,
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
  percentComplete: number
  currentStep: string
}

export interface ErrorEntry {
  timestamp: string
  stage: string
  message: string
  details?: string
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
