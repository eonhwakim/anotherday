-- 2026-02-11
-- 팀 월별 기능 추가: 한마디(Resolution) 및 회고(Retrospective)

-- 1. 월별 한마디 (Resolution)
create table if not exists public.monthly_resolutions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  team_id uuid references public.teams(id) on delete cascade not null,
  year_month text not null, -- 'YYYY-MM' format
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, team_id, year_month)
);

-- 2. 월별 회고 (Retrospective)
create table if not exists public.monthly_retrospectives (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  team_id uuid references public.teams(id) on delete cascade not null,
  year_month text not null, -- 'YYYY-MM' format
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, team_id, year_month)
);

-- RLS 활성화
alter table public.monthly_resolutions enable row level security;
alter table public.monthly_retrospectives enable row level security;

-- Policies for monthly_resolutions

-- 조회: 같은 팀 멤버는 볼 수 있음
create policy "View team resolutions" on public.monthly_resolutions
  for select using (
    exists (
      select 1 from public.team_members tm
      where tm.team_id = monthly_resolutions.team_id
      and tm.user_id = auth.uid()
    )
  );

-- 생성/수정/삭제: 본인만 가능
create policy "Manage own resolutions" on public.monthly_resolutions
  for all using (
    auth.uid() = user_id
  );

-- Policies for monthly_retrospectives

-- 조회: 같은 팀 멤버는 볼 수 있음
create policy "View team retrospectives" on public.monthly_retrospectives
  for select using (
    exists (
      select 1 from public.team_members tm
      where tm.team_id = monthly_retrospectives.team_id
      and tm.user_id = auth.uid()
    )
  );

-- 생성/수정/삭제: 본인만 가능
create policy "Manage own retrospectives" on public.monthly_retrospectives
  for all using (
    auth.uid() = user_id
  );
