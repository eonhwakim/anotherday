create table if not exists public.daily_todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  date text not null,
  title text not null check (char_length(trim(title)) > 0 and char_length(title) <= 50),
  due_time text,
  reminder_minutes integer check (reminder_minutes in (10, 20, 30, 60)),
  is_completed boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.daily_todos
  add column if not exists due_time text;

alter table public.daily_todos
  add column if not exists reminder_minutes integer;

alter table public.daily_todos
  drop constraint if exists daily_todos_reminder_minutes_check;

alter table public.daily_todos
  add constraint daily_todos_reminder_minutes_check
  check (reminder_minutes in (10, 20, 30, 60));

create index if not exists idx_daily_todos_user_date
  on public.daily_todos (user_id, date);

alter table public.daily_todos enable row level security;

drop policy if exists "Manage own daily todos" on public.daily_todos;
create policy "Manage own daily todos" on public.daily_todos
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
