-- ─── Goal Rules Update (2026-02-10) ───────────────────────────
-- 목표 타입을 DAILY / WEEKLY_COUNT로 재정의
-- start_date, target_count 추가

-- 1) frequency 체크 제약 변경: 'weekly' → 'weekly_count'
ALTER TABLE public.user_goals DROP CONSTRAINT IF EXISTS user_goals_frequency_check;
UPDATE public.user_goals SET frequency = 'daily' WHERE frequency = 'weekly';
ALTER TABLE public.user_goals
  ADD CONSTRAINT user_goals_frequency_check
  CHECK (frequency IN ('daily', 'weekly_count'));

-- 2) target_count 추가 (주 N회 목표의 N값, weekly_count일 때만 유효)
ALTER TABLE public.user_goals
  ADD COLUMN IF NOT EXISTS target_count INTEGER DEFAULT NULL;

-- 3) start_date 추가 (목표 시작일, 이 날짜부터 유효)
ALTER TABLE public.user_goals
  ADD COLUMN IF NOT EXISTS start_date TEXT DEFAULT NULL;

-- 기존 데이터: start_date가 null이면 created_at 기준으로 채움
UPDATE public.user_goals
  SET start_date = TO_CHAR(created_at, 'YYYY-MM-DD')
  WHERE start_date IS NULL;

-- 4) week_days 컬럼은 더 이상 사용하지 않지만, 호환성을 위해 유지
-- (추후 데이터 마이그레이션 완료 후 삭제 가능)

-- 5) 이메일 중복 체크 RPC (회원가입 시 실시간 검증용)
--    auth.users + public.users 모두 확인 (SECURITY DEFINER로 auth 스키마 접근)
CREATE OR REPLACE FUNCTION public.check_email_exists(check_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users WHERE email = check_email
  ) OR EXISTS (
    SELECT 1 FROM public.users WHERE email = check_email
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6) 팀 생성 RPC (INSERT + team_members 등록을 한 트랜잭션으로 처리)
--    RLS SELECT 정책이 team_members 기반이라, 별도 RPC가 필요
CREATE OR REPLACE FUNCTION public.create_team_with_member(
  team_name TEXT,
  member_user_id UUID
)
RETURNS JSON AS $$
DECLARE
  new_team RECORD;
  invite TEXT;
BEGIN
  -- 6자리 초대 코드 생성
  invite := upper(substr(md5(random()::text), 1, 6));

  -- 팀 생성
  INSERT INTO public.teams (name, invite_code)
  VALUES (team_name, invite)
  RETURNING * INTO new_team;

  -- 생성자를 leader로 등록
  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (new_team.id, member_user_id, 'leader');

  RETURN row_to_json(new_team);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7) 초대 코드로 팀 참가 RPC
--    RLS SELECT 정책이 team_members 기반이라, 가입 전 팀 조회가 불가능하므로 RPC 필요
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

    -- 팀의 활성 목표를 유저에게 배정
    INSERT INTO public.user_goals (user_id, goal_id, is_active, frequency, start_date)
    SELECT member_user_id, g.id, true, 'daily', to_char(now(), 'YYYY-MM-DD')
    FROM public.goals g
    WHERE g.team_id = found_team.id AND g.is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM public.user_goals ug
      WHERE ug.user_id = member_user_id AND ug.goal_id = g.id
    );
  END IF;

  RETURN row_to_json(found_team);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
