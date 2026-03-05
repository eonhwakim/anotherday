-- 2026-03-05: Allow team leaders to update team profile (name, profile_image_url)
CREATE POLICY "Update team (leader only)" ON public.teams
  FOR UPDATE
  USING (
    id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND role = 'leader'
    )
  )
  WITH CHECK (
    id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND role = 'leader'
    )
  );
