-- ─── Fix: 팀원의 user_goals 조회 RLS 정책 추가 (2026-02-10) ──────────
-- 
-- 문제: fetchMemberProgress에서 팀원의 user_goals를 조회할 때
--       RLS 정책이 "본인만 관리"로만 설정되어 있어서
--       다른 팀원의 목표 정보가 빈 배열로 반환됨
--       → 산 애니메이션에서 다른 멤버 퍼센트가 항상 0%
--
-- 해결: checkins 테이블의 "View team checkins"와 동일한 패턴으로
--       팀원의 user_goals를 SELECT할 수 있는 정책 추가

-- 팀원의 목표 설정 조회 허용 (같은 팀에 속한 멤버끼리)
CREATE POLICY "View team user_goals" ON user_goals
  FOR SELECT USING (
    user_id IN (
      SELECT user_id FROM team_members 
      WHERE team_id IN (SELECT get_my_team_ids())
    )
  );
