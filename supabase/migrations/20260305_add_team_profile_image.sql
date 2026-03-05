-- 2026-03-05: Add profile_image_url to teams for team profile
ALTER TABLE public.teams
ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
