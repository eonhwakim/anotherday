-- RLS 무한 재귀 방지를 위한 헬퍼 함수
-- SECURITY DEFINER: 이 함수는 실행하는 유저의 권한이 아니라, 함수 생성자의 권한(admin)으로 실행됨
-- 따라서 RLS 정책을 우회하여 안전하게 팀 ID 목록을 가져올 수 있음
CREATE OR REPLACE FUNCTION get_my_team_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT team_id FROM team_members WHERE user_id = auth.uid();
$$;

-- 1. team_members 정책 수정 (재귀 원인 제거)
DROP POLICY IF EXISTS "Members can view team members" ON team_members;
DROP POLICY IF EXISTS "View team members" ON team_members;

CREATE POLICY "View team members" ON team_members
  FOR SELECT USING (
    team_id IN (SELECT get_my_team_ids())
  );

-- 2. goals 정책 수정 (함수 사용으로 안전하게 변경)
DROP POLICY IF EXISTS "View goals (team or own)" ON goals;
DROP POLICY IF EXISTS "Create goals (team or own)" ON goals;
-- 혹시 남아있을 수 있는 구버전 정책 삭제
DROP POLICY IF EXISTS "Members can view team goals" ON goals;
DROP POLICY IF EXISTS "Members can create team goals" ON goals;


CREATE POLICY "View goals (team or own)" ON goals
  FOR SELECT USING (
    (team_id IN (SELECT get_my_team_ids()))
    OR owner_id = auth.uid()
  );

CREATE POLICY "Create goals (team or own)" ON goals
  FOR INSERT WITH CHECK (
    (team_id IN (SELECT get_my_team_ids()))
    OR (owner_id = auth.uid())
  );

-- 3. checkins 정책 수정
DROP POLICY IF EXISTS "Team members can view checkins" ON checkins;

CREATE POLICY "Team members can view checkins" ON checkins
  FOR SELECT USING (
    -- 내 팀에 속한 멤버들의 체크인 조회
    user_id IN (
      SELECT user_id FROM team_members 
      WHERE team_id IN (SELECT get_my_team_ids())
    )
  );

-- 4. users 정책 수정
DROP POLICY IF EXISTS "Team members can view each other" ON users;

CREATE POLICY "Team members can view each other" ON users
  FOR SELECT USING (
    id IN (
      SELECT user_id FROM team_members 
      WHERE team_id IN (SELECT get_my_team_ids())
    )
  );
