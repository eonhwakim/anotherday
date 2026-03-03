-- ─── Remove goals.is_active (2026-03-03) ───────────────────────
-- goals.is_active는 user_goals.is_active와 동기화되지 않으며,
-- 실제 목표 필터링은 user_goals.is_active + end_date로만 처리됨.
-- 유일하게 참조하던 join_team_by_invite RPC도 함께 수정.

-- 1) goals 테이블에서 is_active 컬럼 제거
ALTER TABLE public.goals DROP COLUMN IF EXISTS is_active;

-- 2) join_team_by_invite RPC: is_active 필터 제거
--    팀 가입 시 해당 팀의 모든 목표를 새 멤버에게 배정
CREATE OR REPLACE FUNCTION public.join_team_by_invite(
  invite TEXT,
  member_user_id UUID
)
RETURNS JSON AS $$
DECLARE
  found_team RECORD;
  already_member BOOLEAN;
BEGIN
  -- 초대 코드로 팀 조회
  SELECT * INTO found_team
  FROM public.teams
  WHERE invite_code = upper(invite);

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- 이미 멤버인지 확인
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = found_team.id AND user_id = member_user_id
  ) INTO already_member;

  IF NOT already_member THEN
    -- 멤버로 등록
    INSERT INTO public.team_members (team_id, user_id, role)
    VALUES (found_team.id, member_user_id, 'member');

    -- 팀의 모든 목표를 유저에게 배정 (is_active 필터 제거)
    INSERT INTO public.user_goals (user_id, goal_id, is_active, frequency, start_date)
    SELECT member_user_id, g.id, true, 'daily', to_char(now(), 'YYYY-MM-DD')
    FROM public.goals g
    WHERE g.team_id = found_team.id
    AND NOT EXISTS (
      SELECT 1 FROM public.user_goals ug
      WHERE ug.user_id = member_user_id AND ug.goal_id = g.id
    );
  END IF;

  RETURN row_to_json(found_team);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
