# Pocket Shuffle Chess

**Fast chess without memorized openings.**

Pocket Shuffle Chess is a browser-playable 5x6 shuffle chess variant built for quick tactical games, daily seeds, AI battles, and instant friend challenges.

> Play fast tactical chess on a smaller board with randomized mirrored setups. Every game starts with a fresh puzzle instead of a memorized opening line.

## What Is It?

Pocket Shuffle Chess is a casual online chess variant with three simple ideas:

- **5x6 chess board** - fewer squares means faster contact, shorter games, and less waiting.
- **Randomized mirrored setup** - each seed creates a balanced back rank shared by both players.
- **Daily tactical chess** - every UTC day has a deterministic daily seed that everyone can replay and share.

The result is mini chess that feels tactical immediately: no opening memorization, no long buildup, and no need to know decades of theory before having fun.

## Why It Exists

Traditional chess is beautiful, but it can feel intimidating:

- Strong players often win before the middle game through memorized openings.
- Casual games can take longer than a quick break allows.
- New players may feel like they need study time before they can enjoy competitive play.

Pocket Shuffle Chess keeps the recognizable chess pieces and tactical decisions, then compresses the experience into fast 2-5 minute browser matches.

## Features

- **Daily seeds** - play the same tactical setup as everyone else each day.
- **AI battles** - jump into a quick daily AI match from the homepage.
- **Friend challenges** - create an invite link and play the same mirrored setup online.
- **Mirror match setup** - both sides receive equivalent randomized back ranks for fairness.
- **Ascension mode** - daily AI progress adds lightweight challenge escalation.
- **Mobile-friendly** - designed for portrait screens, touch input, and native sharing.
- **Custom seeds** - share a specific setup with routes like `/seed/QBKNR`.
- **Search-ready pages** - route metadata, structured data, sitemap, robots rules, and social cards are included.

## Screenshots

Add production screenshots here when capturing final marketing assets:

| Homepage | Gameplay | Mobile |
| --- | --- | --- |
| `docs/screenshots/homepage.png` | `docs/screenshots/gameplay.png` | `docs/screenshots/mobile.png` |

| Move History | AI Ascension |
| --- | --- |
| `docs/screenshots/move-history.png` | `docs/screenshots/ai-ascension.png` |

## How It Works

Pocket Shuffle Chess uses familiar chess movement with a smaller board and shuffled starting position.

1. A seed resolves to a five-piece back rank containing one bishop, rook, king, knight, and queen.
2. Black receives the mirrored setup so neither side gets a hidden opening advantage.
3. Pawns start in front of the back rank.
4. Players move using standard piece movement adapted to the 5x6 board.
5. The goal remains checkmate, with fast tactical pressure from the first few moves.

Consistent phrases used throughout the app and metadata:

- Fast chess without memorized openings
- Daily tactical chess
- 5x6 mirrored setup
- Shuffle chess variant


## Seed Validation

Custom seeds can be entered as a direct back-rank code or as a deterministic text seed.

Valid direct seed:

```text
QBKNR
```

Direct seed rules:

- Must contain exactly one K, Q, R, B, and N.
- Uppercase and lowercase entries are accepted and normalized to uppercase.

Valid text seed:

```text
boss-battle-1
```

Text seed rules:

- Use letters, numbers, and ASCII hyphens only.
- Text seeds are normalized safely before deterministic setup generation.

Invalid:

```text
INVALID_SEED_XYZ
QBKNN
QBKNRX
```

Invalid seeds are rejected with a visible error and never silently fall back to the daily setup.

## Tech Stack

- **React** - app UI and interactive game screens
- **TypeScript** - game state, route logic, API contracts, and safety
- **Vite** - fast local development and production bundling
- **Supabase** - anonymous online games and realtime updates
- **Vercel** - static app hosting plus serverless API routes

## Local Development

```bash
npm install
npm run dev
```

The Vite dev server will print a local URL. Open it in a browser to play.

## Build

```bash
npm run build
```

The build runs TypeScript project checks and then creates a production Vite bundle.

## Deployment

Pocket Shuffle Chess is designed for Vercel.

1. Create a Vercel project from this repository.
2. Configure Supabase environment variables for online play.
3. Deploy the Vite frontend and `/api` serverless routes together.
4. Submit `https://chess.alphaden.club/sitemap.xml` in Google Search Console and Bing Webmaster Tools.

### Supabase Environment Variables

Configure the variables expected by the multiplayer API routes, including the project URL and service credentials used by the server-side Supabase client.

## SEO / Philosophy

Pocket Shuffle Chess is positioned as **fast tactical chess for casual players**.

The product is intentionally described in plain language so players, search engines, and AI systems can understand it quickly:

- It is a chess variant.
- It is playable in the browser.
- It has a 5x6 board.
- It uses mirrored randomized setups.
- It has a daily tactical seed.
- It supports AI games and friend challenge links.
- It is not a generic chess clone or a serious tournament platform.

SEO foundations include:

- Unique route titles and descriptions
- Open Graph and Twitter/X share metadata
- JSON-LD `SoftwareApplication`, `WebSite`, and game-oriented structured data
- `robots.txt` and `sitemap.xml`
- Canonical URLs
- PWA manifest metadata
- `llms.txt` and `ai.txt` summaries for AI-search context

## Content Roadmap

Future lightweight educational pages should be useful to real players, not keyword spam:

- What is Shuffle Chess?
- Why 5x6 Chess Is Faster
- Daily Tactical Chess Explained
- Chess Without Memorizing Openings
- Best Chess Variants for Casual Players

## License

License information has not been finalized yet. Add the project license before public redistribution.

## Credits

Created by Alpha Den as a fast, friendly chess variant for players who want tactical games without opening homework.
