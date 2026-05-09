# Mini Chess

A polished 5×6 Mini Chess app with a pure TypeScript rules engine, seeded shuffle setups, local bot matches, and Supabase-ready online multiplayer APIs.

## What is included

- 5×6 randomized mirrored Mini Chess setup.
- Daily seeded games by default, so Play AI and Invite Link use the same UTC-date setup each day.
- A daily seed calendar that reveals only today and past daily seeds for fair replay.
- Custom seed challenge games that accept text seeds or direct back-rank codes such as `BQKRN`.
- Legal move validation, captures, check, checkmate, stalemate, and promotion.
- Local bot play with selectable match modes: One Match, Best 2/3, and Best 3/5.
- Chess.com-inspired board UI with drag-to-move, move history review, keyboard navigation, board flip, and sound effects.
- Supabase/Vercel API scaffolding for anonymous invite-link multiplayer.

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

## Multiplayer environment variables

For online games, configure Supabase variables before deploying:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

The app is designed for Vercel frontend/API hosting while realtime updates are handled by Supabase Realtime. Anonymous invite play is the first-version login model; Google login is not required.

## Supabase Dashboard Setup Note

Do not add SQL setup instructions inside the codebase. Configure tables and columns from the Supabase dashboard.

Supabase required table:

- `games`

Required fields:

- `id`
- `board`
- `turn`
- `status`
- `white_player_id`
- `black_player_id`
- `move_history`
- `created_at`
- `updated_at`

Recommended optional fields for analytics:

- `seed`
- `seed_source`
- `back_rank_code`
- `match_id`
- `round_number`
- `winner`
- `result_type`
- `total_moves`
- `white_score`
- `black_score`

The app works before optional analytics fields are added. Game creation and move updates first try to store seed/result metadata, then retry with only base game fields if Supabase rejects optional metadata columns.

## Daily seed storage

The app supports a tolerant daily seed layer:

- If a `daily_seeds` table exists, the daily API can read `seed` and `back_rank_code` for the current `date_key`.
- If that table does not exist, the API deterministically uses `daily-YYYY-MM-DD` and derives the back-rank code from that seed.
- The daily API accepts today or a past `dateKey` so older dailies can be replayed, but future dates are rejected.

For MVP, no stored daily seed row is required. Today's setup is stable because the fallback date key and seed are deterministic. The default invite-link and AI flows are daily-seeded; custom seed challenges are the opt-in alternative.

## Optional matchmaking queue

The Find Match button uses Supabase when a `matchmaking_queue` table is available from the dashboard. If that table is not configured yet, the app falls back to showing an invite-friend path instead of crashing.

Recommended matchmaking fields:

- `id`
- `player_id`
- `seed`
- `back_rank_code`
- `status`
- `game_id`
- `created_at`
- `updated_at`

Queue rows match only when players are waiting on the same seed, so today’s daily players are paired with other players using `daily-YYYY-MM-DD`.
