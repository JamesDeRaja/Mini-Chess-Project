-- Pocket Shuffle Chess multiplayer schema for Supabase.
-- Run this in the Supabase SQL editor for the project used by Vercel.

create extension if not exists pgcrypto;

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  board jsonb not null,
  turn text not null default 'white' check (turn in ('white', 'black')),
  status text not null default 'waiting' check (status in ('waiting', 'active', 'white_won', 'black_won', 'draw')),
  white_player_id text,
  black_player_id text,
  move_history jsonb not null default '[]'::jsonb,
  seed text,
  seed_source text,
  back_rank_code text,
  match_id text,
  round_number integer not null default 1,
  winner text check (winner in ('white', 'black')),
  result_type text,
  total_moves integer not null default 0,
  white_score integer not null default 0,
  black_score integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists games_seed_status_idx on public.games (seed, status, created_at);
create index if not exists games_white_player_seed_idx on public.games (white_player_id, seed, status, created_at desc);
create index if not exists games_black_player_idx on public.games (black_player_id);

create table if not exists public.matchmaking_queue (
  id uuid primary key default gen_random_uuid(),
  player_id text not null,
  seed text not null,
  back_rank_code text not null,
  status text not null default 'waiting' check (status in ('waiting', 'matched', 'cancelled', 'expired')),
  game_id uuid references public.games(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists matchmaking_queue_seed_status_idx on public.matchmaking_queue (seed, status, created_at);
create index if not exists matchmaking_queue_player_seed_idx on public.matchmaking_queue (player_id, seed, status, created_at desc);

create table if not exists public.daily_seeds (
  date_key date primary key,
  seed text not null,
  back_rank_code text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists games_set_updated_at on public.games;
create trigger games_set_updated_at
  before update on public.games
  for each row execute function public.set_updated_at();

drop trigger if exists matchmaking_queue_set_updated_at on public.matchmaking_queue;
create trigger matchmaking_queue_set_updated_at
  before update on public.matchmaking_queue
  for each row execute function public.set_updated_at();

drop trigger if exists daily_seeds_set_updated_at on public.daily_seeds;
create trigger daily_seeds_set_updated_at
  before update on public.daily_seeds
  for each row execute function public.set_updated_at();

alter table public.games enable row level security;
alter table public.matchmaking_queue enable row level security;
alter table public.daily_seeds enable row level security;

drop policy if exists "Public realtime read games" on public.games;
create policy "Public realtime read games"
  on public.games
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Public read daily seeds" on public.daily_seeds;
create policy "Public read daily seeds"
  on public.daily_seeds
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Anonymous API write games" on public.games;
create policy "Anonymous API write games"
  on public.games
  for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "Anonymous API manage matchmaking queue" on public.matchmaking_queue;
create policy "Anonymous API manage matchmaking queue"
  on public.matchmaking_queue
  for all
  to anon, authenticated
  using (true)
  with check (true);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.games to anon, authenticated;
grant select, insert, update, delete on public.matchmaking_queue to anon, authenticated;
grant select on public.daily_seeds to anon, authenticated;

alter table public.games replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.games;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
