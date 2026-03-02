-- ============================================================
-- delete_team: LEADER만 팀 삭제 가능
-- CASCADE로 team_members, goals, user_goals, checkins 등 연관 데이터 삭제
-- ============================================================
CREATE OR REPLACE FUNCTION delete_team(p_team_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 리더 권한 확인
  IF NOT EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = p_team_id AND user_id = p_user_id AND role = 'leader'
  ) THEN
    RAISE EXCEPTION 'Permission denied: only the team leader can delete the team';
  END IF;

  -- 팀 삭제 (FK CASCADE로 team_members 등 연관 레코드 자동 삭제)
  DELETE FROM teams WHERE id = p_team_id;
END;
$$;

-- ============================================================
-- leave_team: MEMBER가 팀에서 탈퇴
-- 리더는 탈퇴 불가 (팀 삭제를 사용해야 함)
-- ============================================================
CREATE OR REPLACE FUNCTION leave_team(p_team_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 멤버인지 확인
  IF NOT EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = p_team_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'User is not a member of this team';
  END IF;

  -- 리더는 탈퇴 불가
  IF EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = p_team_id AND user_id = p_user_id AND role = 'leader'
  ) THEN
    RAISE EXCEPTION 'Leader cannot leave the team. Please delete the team instead.';
  END IF;

  -- 해당 팀의 목표에 대한 user_goals 제거
  DELETE FROM user_goals
  WHERE user_id = p_user_id
    AND goal_id IN (SELECT id FROM goals WHERE team_id = p_team_id);

  -- team_members에서 제거
  DELETE FROM team_members
  WHERE team_id = p_team_id AND user_id = p_user_id;
END;
$$;
