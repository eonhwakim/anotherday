-- ─── Another Day MVP: 초기 DB 스키마 ───────────────────────────
-- Supabase Postgres에서 실행

-- 1) Users (프로필)
-- Supabase Auth의 auth.users와는 별도로, 앱 자체 프로필 테이블
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nickname TEXT NOT NULL,
  profile_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2) Teams
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3) Team Members
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('leader', 'member')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- 4) Goals (팀 공통 목표)
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5) User Goals (개인이 선택한 목표)
CREATE TABLE IF NOT EXISTS user_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, goal_id)
);

-- 6) Checkins (하루 인증)
CREATE TABLE IF NOT EXISTS checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  date TEXT NOT NULL, -- 'YYYY-MM-DD'
  photo_url TEXT,
  memo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, goal_id, date)  -- 같은 날 같은 목표 중복 인증 방지
);

-- 7) Reactions (MVP: 타입만, 추후 확장)
CREATE TABLE IF NOT EXISTS reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkin_id UUID NOT NULL REFERENCES checkins(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('like', 'fire', 'comment')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(checkin_id, user_id, type)
);

-- ─── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_goals_team ON goals(team_id);
CREATE INDEX IF NOT EXISTS idx_user_goals_user ON user_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_checkins_user_date ON checkins(user_id, date);
CREATE INDEX IF NOT EXISTS idx_checkins_goal ON checkins(goal_id);

-- ─── RLS (Row Level Security) ──────────────────────────────────
-- 기본 RLS 활성화: 모든 테이블에 대해

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

-- Users: 본인만 조회/수정, 같은 팀원도 조회 가능
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 같은 팀의 멤버 프로필도 조회 가능
CREATE POLICY "Team members can view each other" ON users
  FOR SELECT USING (
    id IN (
      SELECT tm2.user_id FROM team_members tm1
      JOIN team_members tm2 ON tm1.team_id = tm2.team_id
      WHERE tm1.user_id = auth.uid()
    )
  );

-- Teams: 소속 멤버만 조회
CREATE POLICY "Members can view their teams" ON teams
  FOR SELECT USING (
    id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Anyone can create a team" ON teams
  FOR INSERT WITH CHECK (true);

-- Team Members: 같은 팀 멤버 조회
CREATE POLICY "Members can view team members" ON team_members
  FOR SELECT USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Anyone can join a team" ON team_members
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Goals: 같은 팀 멤버만 조회/생성
CREATE POLICY "Members can view team goals" ON goals
  FOR SELECT USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can create team goals" ON goals
  FOR INSERT WITH CHECK (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

-- User Goals: 본인 것만
CREATE POLICY "Users manage own goals" ON user_goals
  FOR ALL USING (user_id = auth.uid());

-- Checkins: 본인 것 관리 + 같은 팀 멤버 것 조회
CREATE POLICY "Users manage own checkins" ON checkins
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Team members can view checkins" ON checkins
  FOR SELECT USING (
    user_id IN (
      SELECT tm2.user_id FROM team_members tm1
      JOIN team_members tm2 ON tm1.team_id = tm2.team_id
      WHERE tm1.user_id = auth.uid()
    )
  );

-- Reactions: 본인 것 관리 + 조회
CREATE POLICY "Users manage own reactions" ON reactions
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Anyone can view reactions" ON reactions
  FOR SELECT USING (true);

-- ─── Storage Bucket ─────────────────────────────────────────────
-- Supabase Dashboard에서 'checkin-photos' 버킷을 만들거나:
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('checkin-photos', 'checkin-photos', true);
