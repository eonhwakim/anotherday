create table if not exists checkin_reactions (
  id uuid default gen_random_uuid() primary key,
  checkin_id uuid references checkins(id) on delete cascade not null,
  user_id uuid references users(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(checkin_id, user_id)
);

alter table checkin_reactions enable row level security;

create policy "Users can view checkin reactions"
  on checkin_reactions for select
  using (true);

create policy "Users can insert their own reaction"
  on checkin_reactions for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own reaction"
  on checkin_reactions for delete
  using (auth.uid() = user_id);
