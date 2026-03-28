-- 개인(팀 미참가)도 월별 한마디 저장 가능: team_id nullable + 부분 유니크 인덱스
-- RLS: 본인 행은 항상 조회 가능, 팀 단위 행은 기존처럼 같은 팀원만 조회

alter table public.monthly_resolutions
  alter column team_id drop not null;

alter table public.monthly_resolutions
  drop constraint if exists monthly_resolutions_user_id_team_id_year_month_key;

create unique index if not exists monthly_resolutions_personal_uniq
  on public.monthly_resolutions (user_id, year_month)
  where team_id is null;

create unique index if not exists monthly_resolutions_team_uniq
  on public.monthly_resolutions (user_id, team_id, year_month)
  where team_id is not null;

drop policy if exists "View team resolutions" on public.monthly_resolutions;
drop policy if exists "Manage own resolutions" on public.monthly_resolutions;

create policy "View resolutions" on public.monthly_resolutions
  for select using (
    auth.uid() = user_id
    or (
      team_id is not null
      and exists (
        select 1 from public.team_members tm
        where tm.team_id = monthly_resolutions.team_id
          and tm.user_id = auth.uid()
      )
    )
  );

create policy "Manage own resolutions" on public.monthly_resolutions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
