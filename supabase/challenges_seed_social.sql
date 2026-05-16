create extension if not exists pgcrypto;

create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  seed text not null,
  seed_slug text not null,
  back_rank_code text not null,
  display_seed_name text null,
  challenger_name text null,
  challenger_player_id text null,
  challenger_score integer not null default 0,
  challenger_moves integer not null default 0,
  challenger_result text not null,
  challenger_color text not null default 'white',
  game_mode text not null default 'seed',
  share_text text null,
  share_taunt text null,
  parent_challenge_id uuid null,
  chain_root_id uuid null,
  chain_depth integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists challenges_seed_slug_idx on public.challenges(seed_slug);
create index if not exists challenges_back_rank_code_idx on public.challenges(back_rank_code);
create index if not exists challenges_chain_root_id_idx on public.challenges(chain_root_id);
create index if not exists challenges_created_at_idx on public.challenges(created_at);
create index if not exists challenges_challenger_score_idx on public.challenges(challenger_score);

create table if not exists public.seed_stats (
  id uuid primary key default gen_random_uuid(),
  seed_slug text not null unique,
  seed text not null,
  back_rank_code text not null,
  display_name text null,
  total_plays integer not null default 0,
  total_completed integer not null default 0,
  total_shares integer not null default 0,
  best_score integer not null default 0,
  best_score_player_name text null,
  best_score_challenge_id uuid null,
  last_played_at timestamptz null,
  created_at timestamptz not null default now()
);

create table if not exists public.seed_scores (
  id uuid primary key default gen_random_uuid(),
  seed_slug text not null,
  seed text not null,
  back_rank_code text not null,
  player_id text null,
  player_name text null,
  score integer not null default 0,
  moves integer not null default 0,
  result text not null,
  color text not null default 'white',
  challenge_id uuid null,
  created_at timestamptz not null default now()
);
create index if not exists seed_scores_seed_slug_idx on public.seed_scores(seed_slug);
create index if not exists seed_scores_score_desc_idx on public.seed_scores(score desc);
create index if not exists seed_scores_created_at_desc_idx on public.seed_scores(created_at desc);

-- Preview/serverless API routes may fall back to the anon key, so the social seed
-- leaderboard tables need explicit RLS policies for public reads and submissions.
alter table public.challenges enable row level security;
alter table public.seed_scores enable row level security;
alter table public.seed_stats enable row level security;
grant select, insert on public.challenges to anon, authenticated;
grant select, insert on public.seed_scores to anon, authenticated;
grant select, insert, update on public.seed_stats to anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'challenges' and policyname = 'challenges_public_select'
  ) then
    create policy challenges_public_select on public.challenges for select to anon, authenticated using (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'challenges' and policyname = 'challenges_public_insert'
  ) then
    create policy challenges_public_insert on public.challenges for insert to anon, authenticated with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'seed_scores' and policyname = 'seed_scores_public_select'
  ) then
    create policy seed_scores_public_select on public.seed_scores for select to anon, authenticated using (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'seed_scores' and policyname = 'seed_scores_public_insert'
  ) then
    create policy seed_scores_public_insert on public.seed_scores for insert to anon, authenticated with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'seed_stats' and policyname = 'seed_stats_public_select'
  ) then
    create policy seed_stats_public_select on public.seed_stats for select to anon, authenticated using (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'seed_stats' and policyname = 'seed_stats_public_insert'
  ) then
    create policy seed_stats_public_insert on public.seed_stats for insert to anon, authenticated with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'seed_stats' and policyname = 'seed_stats_public_update'
  ) then
    create policy seed_stats_public_update on public.seed_stats for update to anon, authenticated using (true) with check (true);
  end if;
end $$;
