-- ─── Another Day MVP 통합 스키마 (2026-02-09) ───────────────────
-- 기존의 파편화된 마이그레이션을 통합하고, RLS 재귀 문제 및 타입 불일치를 해결했습니다.
-- 이 스크립트를 Supabase SQL Editor에서 실행하면 DB가 완벽하게 세팅됩니다.

-- [초기화] 기존 테이블이 있다면 삭제하고 새로 시작 (개발 편의성 위해)
DROP TABLE IF EXISTS reactions CASCADE;
DROP TABLE IF EXISTS checkins CASCADE;
DROP TABLE IF EXISTS user_goals CASCADE;
DROP TABLE IF EXISTS goals CASCADE;
DROP TABLE IF EXISTS team_members CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1) Users (프로필)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nickname TEXT NOT NULL,
  profile_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2) Teams
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3) Team Members
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('leader', 'member')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- 4) Goals (팀 공통 목표)
CREATE TABLE public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5) User Goals (개인이 선택한 목표 - 매핑 테이블)
CREATE TABLE public.user_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  frequency TEXT NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly')),
  week_days INTEGER[], -- 0(일) ~ 6(토). weekly일 때만 유효.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, goal_id)
);

-- 6) Checkins (하루 인증)
CREATE TABLE public.checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  date TEXT NOT NULL, -- 'YYYY-MM-DD'
  photo_url TEXT,
  memo TEXT,
  status TEXT NOT NULL DEFAULT 'done' CHECK (status IN ('done', 'pass')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, goal_id, date)
);

-- 7) Reactions
CREATE TABLE public.reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkin_id UUID NOT NULL REFERENCES checkins(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('like', 'fire', 'comment')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(checkin_id, user_id, type)
);

-- ─── Indexes ──────────────────────────────────────────────────
CREATE INDEX idx_team_members_user ON team_members(user_id);
CREATE INDEX idx_team_members_team ON team_members(team_id);
CREATE INDEX idx_goals_team ON goals(team_id);
CREATE INDEX idx_user_goals_user ON user_goals(user_id);
CREATE INDEX idx_checkins_user_date ON checkins(user_id, date);
CREATE INDEX idx_checkins_goal ON checkins(goal_id);

-- ─── Functions (RPC & Helpers) ────────────────────────────────

-- 1. 프로필 생성 RPC (authStore.ts에서 사용)
-- Security Definer를 사용하여 RLS를 우회, 안전하게 프로필 생성
CREATE OR REPLACE FUNCTION public.create_user_profile(
  user_id UUID,
  user_email TEXT,
  user_nickname TEXT
)
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  INSERT INTO public.users (id, email, nickname, profile_image_url)
  VALUES (user_id, user_email, user_nickname, NULL)
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      nickname = COALESCE(users.nickname, EXCLUDED.nickname);

  SELECT row_to_json(u) INTO result
  FROM public.users u WHERE u.id = user_id;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. 내 팀 ID 목록 조회 헬퍼 (RLS 재귀 방지용)
-- Security Definer로 실행되어 순환 참조 없이 내 팀 목록을 가져옴
CREATE OR REPLACE FUNCTION get_my_team_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT team_id FROM team_members WHERE user_id = auth.uid();
$$;

-- ─── RLS Policies ─────────────────────────────────────────────
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

-- [Users]
-- 본인 프로필: 조회/수정 가능
CREATE POLICY "Users manage own profile" ON users
  FOR ALL USING (auth.uid() = id);

-- 팀원 프로필: 조회 가능 (get_my_team_ids 사용으로 안전하게)
CREATE POLICY "Team members view each other" ON users
  FOR SELECT USING (
    id IN (
      SELECT user_id FROM team_members 
      WHERE team_id IN (SELECT get_my_team_ids())
    )
  );

-- [Teams]
-- 내 팀만 조회 가능
CREATE POLICY "View my teams" ON teams
  FOR SELECT USING (
    id IN (SELECT get_my_team_ids())
  );

-- 팀 생성은 누구나 가능
CREATE POLICY "Create teams" ON teams
  FOR INSERT WITH CHECK (true);

-- [Team Members]
-- 내 팀의 멤버 목록 조회
CREATE POLICY "View team members" ON team_members
  FOR SELECT USING (
    team_id IN (SELECT get_my_team_ids())
  );

-- 팀 가입 (초대코드 로직은 서비스 레이어에서 처리, DB단에서는 본인 추가 허용)
CREATE POLICY "Join team" ON team_members
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- [Goals]
-- 내 팀의 목표 또는 내 개인 목표 조회
CREATE POLICY "View goals (team or own)" ON goals
  FOR SELECT USING (
    (team_id IS NOT NULL AND team_id IN (SELECT get_my_team_ids()))
    OR (owner_id = auth.uid())
  );

-- 내 팀에 목표 생성 또는 내 개인 목표 생성
CREATE POLICY "Create goals (team or own)" ON goals
  FOR INSERT WITH CHECK (
    (team_id IS NOT NULL AND team_id IN (SELECT get_my_team_ids()))
    OR (owner_id = auth.uid())
  );

-- 내 개인 목표 수정/삭제
CREATE POLICY "Manage own goals" ON goals
  FOR ALL USING (owner_id = auth.uid());

-- [User Goals]
-- 본인 목표 관리
CREATE POLICY "Manage own user_goals" ON user_goals
  FOR ALL USING (user_id = auth.uid());

-- [Checkins]
-- 본인 체크인 관리
CREATE POLICY "Manage own checkins" ON checkins
  FOR ALL USING (user_id = auth.uid());

-- 팀원 체크인 조회
CREATE POLICY "View team checkins" ON checkins
  FOR SELECT USING (
    user_id IN (
      SELECT user_id FROM team_members 
      WHERE team_id IN (SELECT get_my_team_ids())
    )
  );

-- [Reactions]
-- 본인 리액션 관리
CREATE POLICY "Manage own reactions" ON reactions
  FOR ALL USING (user_id = auth.uid());

-- 리액션은 누구나 조회 가능 (혹은 팀원만 제한 가능하나, 일단 허용)
CREATE POLICY "View reactions" ON reactions
  FOR SELECT USING (true);

-- ─── Storage Bucket (Optional) ────────────────────────────────
-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('checkin-photos', 'checkin-photos', true)
-- ON CONFLICT DO NOTHING;
