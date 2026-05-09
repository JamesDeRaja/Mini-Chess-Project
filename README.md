# Pocket Shuffle Chess

A polished 5×6 Pocket Shuffle Chess app with a pure TypeScript rules engine, seeded shuffle setups, local bot matches, and Supabase-ready online multiplayer APIs.

Pocket Shuffle Chess is a fast 5x6 chess variant built around shuffled mirrored setups, daily seeds, short tactical games, and instant friend challenges.

- 5×6 randomized mirrored Pocket Shuffle Chess setup.
- Daily seeded games by default, so Play AI and Invite Link use the same UTC-date setup each day.
- A daily seed calendar that reveals only today and past daily seeds for fair replay.
- Custom seed challenge games that accept text seeds or direct back-rank codes such as `BQKRN`.
- Legal move validation, captures, check, checkmate, stalemate, and promotion.
- Local bot play with selectable match modes: One Match, Best 2/3, and Best 3/5.
- Chess.com-inspired board UI with drag-to-move, move history review, keyboard navigation, board flip, and sound effects.
- Supabase/Vercel API scaffolding for anonymous invite-link multiplayer.

Think:

```txt
Wordle + Chess960 + Mini Chess + friend challenge links
````

---

## Core Idea

Normal chess has a few problems for casual players:

```txt
Too long.
Too much opening theory.
Too intimidating.
Too much memorization.
Too much dead time before tactics start.
Hard to get friends into.
```

Pocket Shuffle Chess attacks those weak points with:

```txt
5x6 board
Short tactical games
Randomized mirrored back rank
No memorized openings
Daily seed
Instant bot play
Instant friend challenge links
Score-based results
Mirror Match rematches
```

The goal is simple:

```txt
Open the game.
Play today’s setup.
Get a result.
Share the seed.
Challenge a friend.
Play the other side.
Come back tomorrow.
```

---

## Why Pocket Shuffle Chess?

Standard chess is deep, but it can feel slow and theory-heavy.

Pocket Shuffle Chess keeps the familiar chess pieces and movement rules, but compresses the board and removes fixed openings.

Every game starts from a shuffled setup, so players cannot rely on memorized opening lines. They need to read the position, spot tactics, and adapt immediately.

The result is a faster, more casual-friendly chess battle.

---

## Game Rules

### Board

Pocket Shuffle Chess is played on a **5x6 board**.

```txt
Files: a b c d e
Ranks: 1 2 3 4 5 6
```

White starts at the bottom.
Black starts at the top.

Initial board layout:

```txt
6  black back rank
5  black pawns
4  empty
3  empty
2  white pawns
1  white back rank
   a b c d e
```

---

## Pieces

Each player has:

```txt
1 King
1 Queen
1 Rook
1 Bishop
1 Knight
5 Pawns
```

There are no duplicate bishops, knights, or rooks.

---

## Shuffled Setup

At the start of each game, White’s back rank is shuffled using the five major pieces:

```txt
K Q R B N
```

Black receives the mirrored version of the same setup.

Example:

```txt
White:
a1 Bishop
b1 Queen
c1 King
d1 Rook
e1 Knight

Black:
a6 Knight
b6 Rook
c6 King
d6 Queen
e6 Bishop
```

Visualized:

```txt
6  n r k q b
5  p p p p p
4  . . . . .
3  . . . . .
2  P P P P P
1  B Q K R N
   a b c d e
```

This keeps the game fair while removing memorized openings.

---

## Movement Rules

Pocket Shuffle Chess uses normal chess piece movement with a few simplified rules.

### King

```txt
Moves one square in any direction.
Cannot move into check.
Cannot be captured.
```

### Queen

```txt
Moves horizontally, vertically, and diagonally.
Blocked by pieces.
```

### Rook

```txt
Moves horizontally or vertically.
Blocked by pieces.
```

### Bishop

```txt
Moves diagonally.
Blocked by pieces.
```

### Knight

```txt
Moves in an L-shape.
Can jump over pieces.
```

### Pawn

White pawns:

```txt
Move one square upward.
Capture diagonally upward.
Promote on the final rank.
```

Black pawns:

```txt
Move one square downward.
Capture diagonally downward.
Promote on the final rank.
```

---

## Simplified Rules

Pocket Shuffle Chess intentionally removes some standard chess edge rules.

Included:

```txt
Legal movement
Captures
Turns
Check
Checkmate
Stalemate
Pawn promotion
Move history
Seeded setup generation
Bot play
Friend challenge links
```

Skipped in V1:

```txt
Castling
En passant
Two-square pawn move
50-move rule
Threefold repetition
Insufficient material draw
Timers
```

Reason:

```txt
The game is compressed and tactical.
Extra edge rules slow down development and do not improve the core loop yet.
```

---

## Game Modes

### 1. Daily Shuffle

Everyone gets the same shuffled setup each day.

Daily seed format:

```txt
daily-YYYY-MM-DD
```

Example:

```txt
daily-2026-05-09
```

Daily mode is the main retention loop.

```txt
Play today’s setup.
Compare result.
Share challenge.
Come back tomorrow.
```

---

### 2. Play vs Bot

Instant play against a bot.

Bot setup options:

```txt
Today’s Daily Setup
Random Setup
Custom Seed Setup
```

Bot difficulty targets:

```txt
Easy   - random legal moves
Normal - prefers captures, checks, and promotion
Hard   - simple minimax later
```

The first bot should not be too strong.
The goal is to make new players feel smart quickly.

---

### 3. Friend Challenge

Create a game link and send it to a friend.

Flow:

```txt
Create challenge
Copy invite link
Friend opens link
Friend becomes opponent
Game starts instantly
```

No login required.

Roles:

```txt
First player  - White
Second player - Black
Extra visitors - Spectators
```

---

### 4. Seed Challenge

Every setup can be shared as a seed.

Supported seed types:

```txt
Direct back-rank seed:
BQKRN

Text seed:
boss-battle-1

Daily seed:
daily-2026-05-09
```

Example URLs:

```txt
/seed/BQKRN
/seed/boss-battle-1
/daily
```

A valid direct seed must contain exactly one of each:

```txt
K Q R B N
```

Valid:

```txt
BQKRN
RKBQN
NQBRK
```

Invalid:

```txt
KKQRB
BQKR
BQKRNX
```

---

### 5. Mirror Match

Mirror Match is the competitive mode.

Both players play the same seed twice, once from each side.

Round 1:

```txt
Player A = White
Player B = Black
Seed = BQKRN
```

Round 2:

```txt
Player A = Black
Player B = White
Same seed = BQKRN
```

Scores from both rounds are combined.

This removes the excuse:

```txt
You only won because your side had the better setup.
```

Both players prove how well they can play the same position from both sides.

---

## Scoring

Win/loss alone is not enough for a daily challenge game, so Pocket Shuffle Chess uses a simple scoring layer.

### Base Scoring

```txt
Checkmate win: +100
Stalemate: +20 each
Loss: 0
```

### Speed Bonus

```txt
Win under 10 full moves: +40
Win under 15 full moves: +25
Win under 20 full moves: +10
```

### Capture Bonus

```txt
Capture queen: +25
Capture rook: +15
Capture bishop: +10
Capture knight: +10
Capture pawn: +3
```

Post-game results show:

```txt
Result
Score
Move count
Seed
Setup
Share link
```

Example:

```txt
Victory
Score: 145
Moves: 18
Seed: BQKRN
Setup: B Q K R N
```

---

## Product Loop

The main loop is:

```txt
1. Open app
2. Play today’s seed
3. Finish a short tactical game
4. Get score
5. Share result
6. Friend plays same setup
7. Play other side
8. Return tomorrow
```

The product is not just chess.

It is:

```txt
Daily tactical chess challenge
Seed sharing
Friend comparison
Fast rematches
No opening memorization
```

---

## UI Goals

The interface should be simple, fast, and mobile-first.

### Home Page

Main elements:

```txt
Title:
Pocket Shuffle Chess

Tagline:
Fast chess without memorized openings.

Primary CTA:
Play Today’s Daily

Secondary actions:
Play vs Bot
Create Friend Challenge
Enter Seed
How It Works
```

Also show today’s setup:

```txt
Seed: BQKRN
White: B Q K R N
Black: N R K Q B
```

---

### Game Page

The game page should show:

```txt
Mode
Turn
Seed
Back-rank setup
Move count
Board
Move history
Copy challenge link
Settings
```

---

### Result Panel

After a game ends:

```txt
Checkmate
You won
Score: 145
Moves: 18
Seed: BQKRN
```

Actions:

```txt
Challenge Friend
Play Other Side
Replay Seed
Copy Result
Home
```

---

## Move Feedback

The board should feel responsive and satisfying.

### Piece Selection

```txt
Selected square outline
Piece slightly scales up
Legal move dots appear
Capture targets are highlighted
```

### Normal Move

```txt
Soft move sound
Target square pulse
Last move highlight
```

### Capture

```txt
Soft capture sound
Small red pulse
Captured piece disappears cleanly
```

### Check

```txt
King glow
Soft check sound
Text: Check
```

### Checkmate

```txt
Result panel appears
Win sound
Board pauses
```

---

## Settings

Settings should be persisted locally.

Recommended settings:

```txt
Sound on/off
Legal move hints on/off
Capture highlights on/off
Last move highlight on/off
Board orientation: auto / white / black
Coordinates on/off
Animation on/off
```

Defaults:

```txt
Sound: On
Legal move hints: On
Capture highlights: On
Last move highlight: On
Board orientation: Auto
Coordinates: Off on mobile
Animation: On
```

---

## Assets

### Piece Assets

Use local SVG pieces.

Expected folder:

```txt
public/pieces/
```

Expected files:

```txt
white-king.svg
white-queen.svg
white-rook.svg
white-bishop.svg
white-knight.svg
white-pawn.svg

black-king.svg
black-queen.svg
black-rook.svg
black-bishop.svg
black-knight.svg
black-pawn.svg
```

Requirements:

```txt
SVG
Readable on mobile
Strong white/black contrast
Consistent style
Staunton-like
No external hotlinking
Unicode fallback if SVG fails
```

---

### Audio Assets

Expected folder:

```txt
public/audio/
```

Expected files:

```txt
move-soft.mp3
capture-soft.mp3
check-soft.mp3
win-soft.mp3
invalid-soft.mp3
button-soft.mp3
```

Audio rules:

```txt
Short
Soft
Premium-feeling
No harsh beeps
No casino sounds
No long win music
Should work safely if files are missing
```

---

## Technical Direction

Pocket Shuffle Chess should keep game logic, UI, online logic, and audio separate.

Recommended structure:

```txt
src/
  game/
    board.ts
    rules.ts
    moves.ts
    seed.ts
    dailySeed.ts
    scoring.ts
    shareText.ts

  components/
    Board.tsx
    Square.tsx
    Piece.tsx
    GamePage.tsx
    HomePage.tsx
    ResultPanel.tsx
    SettingsPanel.tsx

  audio/
    audioManager.ts

  online/
    supabaseClient.ts
    gameService.ts
    realtime.ts

  api/
    games/
      create.ts
      join.ts
      move.ts
```

Core rule:

```txt
Pure game logic should not depend on React, Supabase, browser APIs, or audio.
```

---

## Seed System

Seed generation must be deterministic.

Do not use `Math.random()` for daily seeds.

Required seed utilities:

```txt
seededShuffle
normalizeSeedInput
isBackRankCode
createSeedFromInput
backRankCodeToPieces
getTodayDateKey
getDailySeed
getDailyBackRankCode
```

Expected behavior:

```txt
BQKRN always creates:
White: B Q K R N
Black: N R K Q B
```

Daily seed:

```txt
daily-YYYY-MM-DD
```

The same date should always generate the same setup.

---

## Online Multiplayer

Online play should use anonymous player identity first.

No login should be required to play.

Player identity:

```txt
Anonymous localStorage player ID
```

Online flow:

```txt
Create game
Generate invite link
Friend joins
Server validates moves
Realtime board updates
Game result is stored
```

The server must validate:

```txt
Game exists
Player is white or black
It is the player's turn
Move is legal
Move does not leave king in check
Game is still active
```

Never trust frontend-only move validation for online games.

---

## Supabase Data

Game rows should support:

```txt
id
board
turn
status
white_player_id
black_player_id
move_history
seed
seed_source
back_rank_code
winner
result_type
total_moves
white_score
black_score
created_at
updated_at
```

The app should still work if optional analytics columns are missing.

Required base fields:

```txt
board
turn
status
white_player_id
black_player_id
move_history
```

---

## Google Sign-In

Google sign-in is not required for V1.

Correct usage:

```txt
Sign in to save your stats.
```

Incorrect usage:

```txt
Sign in to play.
```

Do not block the core game behind authentication.

Google login can be added later for:

```txt
Profiles
Saved stats
Daily history
Friend requests
Leaderboards
Match history
```

---

## Roadmap

### V1 - Playable Core

```txt
5x6 board
Random mirrored setup
Legal moves
Captures
Turn system
Check
Checkmate
Stalemate
Pawn promotion
Move history
Bot mode
Invite friend mode
Move highlights
SVG pieces
Soft sounds
Settings persistence
```

---

### V2 - Daily Seed Layer

```txt
Daily seed
Custom seed input
Seed challenge links
Result sharing
Move count
Simple scoring
Daily vs bot
Daily friend challenge
```

---

### V3 - Competitive Layer

```txt
Mirror Match
Play other side
Two-sided score
Daily personal best
Seed history
Result cards
```

---

### V4 - Social Layer

```txt
Optional Google sign-in
Profiles
Friend rematches
Friend leaderboard
Daily streak
Match history
```

---

### V5 - Growth Layer

```txt
Daily global leaderboard
Anti-cheat validation
Puzzle seeds
Improved bot difficulty
Mobile PWA polish
App Store wrapper
```

---

## Acceptance Criteria

The project is considered successful when:

```txt
Bot mode works.
Invite friend mode works.
Daily seed creates the same setup on the same date.
Custom seed BQKRN always creates White B Q K R N and Black N R K Q B.
Seed is displayed in the game UI.
Seed challenge links work.
Result panel shows score, moves, seed, and setup.
Copy share text works.
Sound can be muted.
SVG pieces render with Unicode fallback.
Settings persist in localStorage.
Online game validates moves server-side.
npm run build passes.
```

---

## Positioning

Pocket Shuffle Chess should not be marketed as a chess.com clone.

Chess.com owns serious chess.

Pocket Shuffle Chess should own:

```txt
Fast tactical chess
Daily shuffled setups
No opening memorization
Instant friend challenges
Short mobile-first games
Same-seed competition
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
