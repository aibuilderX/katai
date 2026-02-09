-- =============================================================================
-- AI Content Studio - Supabase Infrastructure Setup
-- =============================================================================
-- Run this script ONCE in the Supabase SQL Editor before first production deployment.
-- It is safe to re-run: uses ON CONFLICT / IF NOT EXISTS where possible.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Realtime: REPLICA IDENTITY FULL on campaigns table
-- ---------------------------------------------------------------------------
-- Enables Supabase Realtime to include full row data in UPDATE events,
-- so the dashboard can show real-time progress without re-fetching.
ALTER TABLE campaigns REPLICA IDENTITY FULL;

-- ---------------------------------------------------------------------------
-- 2. Realtime: Add campaigns table to the realtime publication
-- ---------------------------------------------------------------------------
-- Supabase Realtime listens on this publication for change events.
-- Note: If already added, this will error. Safe to ignore the error.
ALTER PUBLICATION supabase_realtime ADD TABLE campaigns;

-- ---------------------------------------------------------------------------
-- 3. Storage: Create buckets for campaign assets
-- ---------------------------------------------------------------------------
-- composited-images: Japanese text overlay composites (~10MB max)
-- platform-images:   Platform-resized images (~10MB max)
-- campaign-videos:   Video ads from Kling/Runway/HeyGen (~100MB max)
-- campaign-audio:    Voiceover from ElevenLabs (~20MB max)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES
  ('composited-images', 'composited-images', true, 10485760),
  ('platform-images', 'platform-images', true, 10485760),
  ('campaign-videos', 'campaign-videos', true, 104857600),
  ('campaign-audio', 'campaign-audio', true, 20971520)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. Storage: RLS policies for public read access
-- ---------------------------------------------------------------------------
-- All campaign asset buckets are publicly readable (assets served to end users).
-- Write access uses service_role key which bypasses RLS by default.
-- Note: Re-running will error if policy already exists. Safe to ignore.
CREATE POLICY "Allow public read on composited-images"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'composited-images');

CREATE POLICY "Allow public read on platform-images"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'platform-images');

CREATE POLICY "Allow public read on campaign-videos"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'campaign-videos');

CREATE POLICY "Allow public read on campaign-audio"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'campaign-audio');
