import type { InferSelectModel, InferInsertModel } from "drizzle-orm"
import type {
  profiles,
  teams,
  teamMembers,
  brandProfiles,
  campaigns,
  copyVariants,
  assets,
} from "@/lib/db/schema"

// ===== Select Types (reading from DB) =====

export type Profile = InferSelectModel<typeof profiles>
export type Team = InferSelectModel<typeof teams>
export type TeamMember = InferSelectModel<typeof teamMembers>
export type BrandProfile = InferSelectModel<typeof brandProfiles>
export type Campaign = InferSelectModel<typeof campaigns>
export type CopyVariant = InferSelectModel<typeof copyVariants>
export type Asset = InferSelectModel<typeof assets>

// ===== Insert Types (writing to DB) =====

export type NewProfile = InferInsertModel<typeof profiles>
export type NewTeam = InferInsertModel<typeof teams>
export type NewTeamMember = InferInsertModel<typeof teamMembers>
export type NewBrandProfile = InferInsertModel<typeof brandProfiles>
export type NewCampaign = InferInsertModel<typeof campaigns>
export type NewCopyVariant = InferInsertModel<typeof copyVariants>
export type NewAsset = InferInsertModel<typeof assets>
