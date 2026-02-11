-- ─── Fix: 팀 합류 시 목표 자동 배정 제거 (2026-02-11) ──────────
-- 기존 join_team_by_invite RPC는 합류 시 팀의 모든 활성 목표를
-- 새 멤버에게 자동 배정(is_active=true)했는데,
-- 이로 인해 다른 사람의 목표가 본인 목표로 설정되는 문제 발생.
-- → 자동 배정을 제거하고, 유저가 직접 목표를 선택하도록 변경.

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

    -- 목표 자동 배정 제거: 유저가 마이페이지에서 직접 선택하도록 함
  END IF;

  RETURN row_to_json(found_team);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
