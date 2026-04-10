-- 2026-04-10
-- Security hardening for RLS, SECURITY DEFINER RPCs, and Storage uploads.

-- ---------------------------------------------------------------------------
-- Supporting indexes for RLS predicates and common team/stat queries
-- ---------------------------------------------------------------------------
create index if not exists idx_checkins_user_goal_date
  on public.checkins (user_id, goal_id, date);

create index if not exists idx_user_goals_user_goal_active
  on public.user_goals (user_id, goal_id, is_active)
  where deleted_at is null;

create index if not exists idx_goals_owner_team
  on public.goals (owner_id, team_id);

-- ---------------------------------------------------------------------------
-- SECURITY DEFINER hardening
-- ---------------------------------------------------------------------------
create or replace function public.create_user_profile(
  user_id uuid,
  user_email text,
  user_nickname text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_uid uuid := auth.uid();
  result json;
begin
  if actor_uid is null or actor_uid <> user_id then
    raise exception 'permission denied for create_user_profile'
      using errcode = '42501';
  end if;

  insert into public.users (id, email, nickname, profile_image_url)
  values (user_id, user_email, nullif(trim(user_nickname), ''), null)
  on conflict (id) do update
  set email = excluded.email,
      nickname = coalesce(nullif(public.users.nickname, ''), excluded.nickname);

  select row_to_json(u) into result
  from public.users u
  where u.id = user_id;

  return result;
end;
$$;

create or replace function public.create_team_with_member(
  team_name text,
  member_user_id uuid
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_uid uuid := auth.uid();
  invite text;
  new_team public.teams%rowtype;
begin
  if actor_uid is null or actor_uid <> member_user_id then
    raise exception 'permission denied for create_team_with_member'
      using errcode = '42501';
  end if;

  if nullif(trim(team_name), '') is null then
    raise exception 'team name is required'
      using errcode = '22023';
  end if;

  loop
    invite := upper(substr(md5(random()::text), 1, 6));

    begin
      insert into public.teams (name, invite_code)
      values (trim(team_name), invite)
      returning * into new_team;
      exit;
    exception
      when unique_violation then
        continue;
    end;
  end loop;

  insert into public.team_members (team_id, user_id, role)
  values (new_team.id, actor_uid, 'leader')
  on conflict (team_id, user_id) do nothing;

  return row_to_json(new_team);
end;
$$;

create or replace function public.join_team_by_invite(
  invite text,
  member_user_id uuid
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_uid uuid := auth.uid();
  normalized_invite text := upper(trim(invite));
  found_team public.teams%rowtype;
begin
  if actor_uid is null or actor_uid <> member_user_id then
    raise exception 'permission denied for join_team_by_invite'
      using errcode = '42501';
  end if;

  select *
    into found_team
  from public.teams
  where invite_code = normalized_invite;

  if not found then
    return null;
  end if;

  insert into public.team_members (team_id, user_id, role)
  values (found_team.id, actor_uid, 'member')
  on conflict (team_id, user_id) do nothing;

  return row_to_json(found_team);
end;
$$;

create or replace function public.delete_team(p_team_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_uid uuid := auth.uid();
begin
  if actor_uid is null or actor_uid <> p_user_id then
    raise exception 'permission denied for delete_team'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.team_members
    where team_id = p_team_id
      and user_id = actor_uid
      and role = 'leader'
  ) then
    raise exception 'only the team leader can delete the team'
      using errcode = '42501';
  end if;

  delete from public.teams
  where id = p_team_id;
end;
$$;

create or replace function public.leave_team(p_team_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_uid uuid := auth.uid();
begin
  if actor_uid is null or actor_uid <> p_user_id then
    raise exception 'permission denied for leave_team'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.team_members
    where team_id = p_team_id
      and user_id = actor_uid
  ) then
    raise exception 'user is not a member of this team'
      using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.team_members
    where team_id = p_team_id
      and user_id = actor_uid
      and role = 'leader'
  ) then
    raise exception 'leader cannot leave the team. use delete_team instead.'
      using errcode = '42501';
  end if;

  delete from public.user_goals
  where user_id = actor_uid
    and goal_id in (
      select id
      from public.goals
      where team_id = p_team_id
    );

  delete from public.team_members
  where team_id = p_team_id
    and user_id = actor_uid;
end;
$$;

create or replace function public.delete_user_account(user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_uid uuid := auth.uid();
begin
  if actor_uid is null or actor_uid <> user_id then
    raise exception 'permission denied for delete_user_account'
      using errcode = '42501';
  end if;

  delete from storage.objects
  where bucket_id = 'checkin-photos'
    and (
      (storage.foldername(name))[1] = actor_uid::text
      or (
        (storage.foldername(name))[1] = 'profiles'
        and (storage.foldername(name))[2] = actor_uid::text
      )
    );

  delete from public.checkins
  where user_id = actor_uid;

  delete from public.user_goals
  where user_id = actor_uid;

  delete from public.goals
  where owner_id = actor_uid
    and id not in (
      select goal_id
      from public.user_goals
      where user_id <> actor_uid
    );

  delete from public.team_members
  where user_id = actor_uid;

  delete from public.users
  where id = actor_uid;

  delete from auth.users
  where id = actor_uid;
end;
$$;

revoke all on function public.create_user_profile(uuid, text, text) from public;
revoke all on function public.create_team_with_member(text, uuid) from public;
revoke all on function public.join_team_by_invite(text, uuid) from public;
revoke all on function public.delete_team(uuid, uuid) from public;
revoke all on function public.leave_team(uuid, uuid) from public;
revoke all on function public.delete_user_account(uuid) from public;

grant execute on function public.create_user_profile(uuid, text, text) to authenticated;
grant execute on function public.create_team_with_member(text, uuid) to authenticated;
grant execute on function public.join_team_by_invite(text, uuid) to authenticated;
grant execute on function public.delete_team(uuid, uuid) to authenticated;
grant execute on function public.leave_team(uuid, uuid) to authenticated;
grant execute on function public.delete_user_account(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS hardening
-- ---------------------------------------------------------------------------
drop policy if exists "Create goals (team or own)" on public.goals;
create policy "Create goals (team or own)" on public.goals
  for insert
  with check (
    owner_id = auth.uid()
    and (
      team_id is null
      or exists (
        select 1
        from public.team_members tm
        where tm.team_id = goals.team_id
          and tm.user_id = auth.uid()
      )
    )
  );

drop policy if exists "Manage own goals" on public.goals;
create policy "Manage own goals" on public.goals
  for all
  using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid()
    and (
      team_id is null
      or exists (
        select 1
        from public.team_members tm
        where tm.team_id = goals.team_id
          and tm.user_id = auth.uid()
      )
    )
  );

drop policy if exists "Manage own user_goals" on public.user_goals;
create policy "Manage own user_goals" on public.user_goals
  for all
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.goals g
      where g.id = user_goals.goal_id
        and (
          g.owner_id = auth.uid()
          or (
            g.team_id is not null
            and exists (
              select 1
              from public.team_members tm
              where tm.team_id = g.team_id
                and tm.user_id = auth.uid()
            )
          )
        )
    )
  );

drop policy if exists "View team user_goals" on public.user_goals;
create policy "View shared team user_goals" on public.user_goals
  for select
  using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.goals g
      join public.team_members tm_self
        on tm_self.team_id = g.team_id
       and tm_self.user_id = auth.uid()
      join public.team_members tm_target
        on tm_target.team_id = g.team_id
       and tm_target.user_id = user_goals.user_id
      where g.id = user_goals.goal_id
        and g.team_id is not null
    )
  );

drop policy if exists "Manage own checkins" on public.checkins;
create policy "Manage own checkins" on public.checkins
  for all
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.user_goals ug
      join public.goals g
        on g.id = ug.goal_id
      where ug.user_id = auth.uid()
        and ug.goal_id = checkins.goal_id
        and ug.is_active = true
        and ug.deleted_at is null
        and (ug.start_date is null or ug.start_date::date <= checkins.date::date)
        and (ug.end_date is null or ug.end_date::date >= checkins.date::date)
        and (
          g.owner_id = auth.uid()
          or (
            g.team_id is not null
            and exists (
              select 1
              from public.team_members tm
              where tm.team_id = g.team_id
                and tm.user_id = auth.uid()
            )
          )
        )
    )
  );

drop policy if exists "View team checkins" on public.checkins;
create policy "View shared team checkins" on public.checkins
  for select
  using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.goals g
      join public.team_members tm_self
        on tm_self.team_id = g.team_id
       and tm_self.user_id = auth.uid()
      join public.team_members tm_target
        on tm_target.team_id = g.team_id
       and tm_target.user_id = checkins.user_id
      where g.id = checkins.goal_id
        and g.team_id is not null
    )
  );

drop policy if exists "Users can view checkin reactions" on public.checkin_reactions;
create policy "Users can view checkin reactions" on public.checkin_reactions
  for select
  using (
    exists (
      select 1
      from public.checkins c
      where c.id = checkin_reactions.checkin_id
    )
  );

drop policy if exists "Users can insert their own reaction" on public.checkin_reactions;
create policy "Users can insert their own reaction" on public.checkin_reactions
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.checkins c
      where c.id = checkin_reactions.checkin_id
    )
  );

drop policy if exists "Users can delete their own reaction" on public.checkin_reactions;
create policy "Users can delete their own reaction" on public.checkin_reactions
  for delete
  using (
    auth.uid() = user_id
    and exists (
      select 1
      from public.checkins c
      where c.id = checkin_reactions.checkin_id
    )
  );

-- ---------------------------------------------------------------------------
-- Storage hardening
-- ---------------------------------------------------------------------------
update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array[
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/heic',
      'image/heif'
    ]::text[]
where id = 'checkin-photos';

drop policy if exists "Authenticated users can upload" on storage.objects;
drop policy if exists "Users can manage own uploads" on storage.objects;

create policy "Users can upload own checkin photos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'checkin-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
  and (storage.foldername(name))[2] is null
  and lower(coalesce(storage.extension(name), '')) = any (
    array['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif']
  )
);

create policy "Users can upload own profile photos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'checkin-photos'
  and (storage.foldername(name))[1] = 'profiles'
  and (storage.foldername(name))[2] = auth.uid()::text
  and (storage.foldername(name))[3] is null
  and lower(coalesce(storage.extension(name), '')) = any (
    array['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif']
  )
);

create policy "Team leaders can upload team photos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'checkin-photos'
  and (storage.foldername(name))[1] = 'teams'
  and (storage.foldername(name))[2] is not null
  and (storage.foldername(name))[3] is null
  and lower(coalesce(storage.extension(name), '')) = any (
    array['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif']
  )
  and exists (
    select 1
    from public.team_members tm
    where tm.team_id::text = (storage.foldername(name))[2]
      and tm.user_id = auth.uid()
      and tm.role = 'leader'
  )
);

create policy "Users can manage own checkin uploads"
on storage.objects for update
to authenticated
using (
  bucket_id = 'checkin-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
  and (storage.foldername(name))[2] is null
)
with check (
  bucket_id = 'checkin-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
  and (storage.foldername(name))[2] is null
);

create policy "Users can delete own checkin uploads"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'checkin-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
  and (storage.foldername(name))[2] is null
);

create policy "Users can manage own profile uploads"
on storage.objects for update
to authenticated
using (
  bucket_id = 'checkin-photos'
  and (storage.foldername(name))[1] = 'profiles'
  and (storage.foldername(name))[2] = auth.uid()::text
  and (storage.foldername(name))[3] is null
)
with check (
  bucket_id = 'checkin-photos'
  and (storage.foldername(name))[1] = 'profiles'
  and (storage.foldername(name))[2] = auth.uid()::text
  and (storage.foldername(name))[3] is null
);

create policy "Users can delete own profile uploads"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'checkin-photos'
  and (storage.foldername(name))[1] = 'profiles'
  and (storage.foldername(name))[2] = auth.uid()::text
  and (storage.foldername(name))[3] is null
);

create policy "Team leaders can manage team uploads"
on storage.objects for update
to authenticated
using (
  bucket_id = 'checkin-photos'
  and (storage.foldername(name))[1] = 'teams'
  and exists (
    select 1
    from public.team_members tm
    where tm.team_id::text = (storage.foldername(name))[2]
      and tm.user_id = auth.uid()
      and tm.role = 'leader'
  )
)
with check (
  bucket_id = 'checkin-photos'
  and (storage.foldername(name))[1] = 'teams'
  and exists (
    select 1
    from public.team_members tm
    where tm.team_id::text = (storage.foldername(name))[2]
      and tm.user_id = auth.uid()
      and tm.role = 'leader'
  )
);

create policy "Team leaders can delete team uploads"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'checkin-photos'
  and (storage.foldername(name))[1] = 'teams'
  and exists (
    select 1
    from public.team_members tm
    where tm.team_id::text = (storage.foldername(name))[2]
      and tm.user_id = auth.uid()
      and tm.role = 'leader'
  )
);
