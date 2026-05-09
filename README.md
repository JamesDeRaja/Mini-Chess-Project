# Mini Chess

A polished 5×6 Mini Chess app with a pure TypeScript rules engine, local bot matches, and Supabase-ready online multiplayer APIs.

## What is included

- 5×6 randomized mirrored Mini Chess setup.
- Legal move validation, captures, check, checkmate, stalemate, and promotion.
- Local bot play with selectable match modes: One Match, Best 2/3, and Best 3/5.
- Chess.com-inspired board UI with drag-to-move, move history review, keyboard navigation, board flip, and sound effects.
- Supabase/Vercel API scaffolding for invite-link multiplayer.

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

The app is designed for Vercel frontend/API hosting while realtime updates are handled by Supabase Realtime.
