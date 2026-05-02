create table predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  gameweek integer not null,
  timestamp timestamptz not null default now(),
  total_expected_points numeric not null,
  total_actual_points numeric,
  formation text,
  captain_player_id integer not null,
  captain_player_name text not null,
  players jsonb not null,
  constraint predictions_user_gameweek_unique unique (user_id, gameweek)
);

alter table predictions enable row level security;

create policy "Users can manage own predictions"
  on predictions
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
