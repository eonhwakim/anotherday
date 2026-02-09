-- 2026-02-09: Add name, gender, age to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS age INTEGER;

-- Storage bucket for photos (checkin + profile images)
INSERT INTO storage.buckets (id, name, public)
VALUES ('checkin-photos', 'checkin-photos', true)
ON CONFLICT DO NOTHING;

-- Allow authenticated users to upload to checkin-photos bucket
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'checkin-photos');

-- Allow public read access
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'checkin-photos');

-- Allow users to update/delete their own uploads
CREATE POLICY "Users can manage own uploads"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'checkin-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
