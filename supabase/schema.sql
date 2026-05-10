create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  seed text,
  seed_source text,
  back_rank_code text,

  board jsonb not null,
  turn text not null default 'white',
  status text not null default 'waiting',

  white_player_id text,
  black_player_id text,

  move_history jsonb not null default '[]'::jsonb,

  winner text,
  result_type text,
  total_moves int,
  white_score int,
  black_score int
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_games_updated_at on public.games;

create trigger set_games_updated_at
before update on public.games
for each row
execute function public.set_updated_at();

alter table public.games replica identity full;

do $$
begin
  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  )
  and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
    and schemaname = 'public'
    and tablename = 'games'
  ) then
    alter publication supabase_realtime add table public.games;
  end if;
end $$;

alter table public.games enable row level security;

drop policy if exists "Allow anon read games" on public.games;
create policy "Allow anon read games"
on public.games
for select
to anon
using (true);

drop policy if exists "Allow anon insert games" on public.games;
create policy "Allow anon insert games"
on public.games
for insert
to anon
with check (true);

drop policy if exists "Allow anon update games" on public.games;
create policy "Allow anon update games"
on public.games
for update
to anon
using (true)
with check (true);
