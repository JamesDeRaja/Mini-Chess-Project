create table if not exists scores (
  id uuid primary key default gen_random_uuid(),
  player_id text not null,
  display_name text not null,
  seed text not null,
  back_rank_code text,
  mode text not null,
  side text not null,
  result text not null,
  score integer not null,
  moves integer not null,
  created_at timestamptz default now()
);

create index if not exists scores_seed_rank_idx on scores (seed, score desc, moves asc, created_at asc);
create index if not exists scores_player_id_idx on scores (player_id);

-- Public leaderboard API routes may run with the anon key in preview deployments.
-- Keep leaderboard rows publicly readable and allow casual score submissions through RLS.
alter table public.scores enable row level security;
grant select, insert on public.scores to anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'scores' and policyname = 'scores_public_select'
  ) then
    create policy scores_public_select on public.scores for select to anon, authenticated using (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'scores' and policyname = 'scores_public_insert'
  ) then
    create policy scores_public_insert on public.scores for insert to anon, authenticated with check (true);
  end if;
end $$;
