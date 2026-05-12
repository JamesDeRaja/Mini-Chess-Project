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
