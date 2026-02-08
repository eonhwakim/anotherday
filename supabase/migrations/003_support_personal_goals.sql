-- 3) Personal Goals Support
-- goals 테이블의 team_id를 nullable로 변경하고 owner_id 추가
ALTER TABLE goals ALTER COLUMN team_id DROP NOT NULL;
ALTER TABLE goals ADD COLUMN owner_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- RLS 정책 업데이트
-- 기존 정책 삭제 (이름이 정확해야 함, 001 파일 참조)
DROP POLICY IF EXISTS "Members can view team goals" ON goals;
DROP POLICY IF EXISTS "Members can create team goals" ON goals;

-- 새 조회 정책: 내 팀의 목표 OR 내가 만든 목표
CREATE POLICY "View goals (team or own)" ON goals
  FOR SELECT USING (
    (team_id IS NOT NULL AND team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()))
    OR owner_id = auth.uid()
  );

-- 새 생성 정책: 팀 목표(팀원임) OR 개인 목표(내꺼)
CREATE POLICY "Create goals (team or own)" ON goals
  FOR INSERT WITH CHECK (
    (team_id IS NOT NULL AND team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()))
    OR (owner_id = auth.uid())
  );

-- 새 수정/삭제 정책: 내 목표는 내가 관리
CREATE POLICY "Manage own goals" ON goals
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Delete own goals" ON goals
  FOR DELETE USING (owner_id = auth.uid());
