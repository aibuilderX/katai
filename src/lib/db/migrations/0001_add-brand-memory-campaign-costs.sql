CREATE TABLE "brand_memory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_profile_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"signals" jsonb DEFAULT '[]'::jsonb,
	"voice_summary" jsonb,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "campaign_costs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"entry_type" text NOT NULL,
	"agent_name" text,
	"model_used" text,
	"input_tokens" integer,
	"output_tokens" integer,
	"provider_name" text,
	"operation_type" text,
	"duration_ms" integer,
	"cost_yen" numeric(10, 4),
	"success" boolean DEFAULT true NOT NULL,
	"error_message" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "brand_memory" ADD CONSTRAINT "brand_memory_brand_profile_id_brand_profiles_id_fk" FOREIGN KEY ("brand_profile_id") REFERENCES "public"."brand_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_memory" ADD CONSTRAINT "brand_memory_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_costs" ADD CONSTRAINT "campaign_costs_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;