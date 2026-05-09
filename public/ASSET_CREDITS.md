# Asset Credits

## Chess Piece SVGs

**Source:** Custom SVG pieces created for Mini Chess Project.
**Location:** `/public/pieces/`
**Files:** white-king.svg, white-queen.svg, white-rook.svg, white-bishop.svg, white-knight.svg, white-pawn.svg,
black-king.svg, black-queen.svg, black-rook.svg, black-bishop.svg, black-knight.svg, black-pawn.svg
**License:** MIT — created for this project, no external attribution required.
**Style:** Flat Staunton-inspired, 45×45 SVG with radial gradients.

TODO: Replace with higher-quality Staunton SVG set before public launch (e.g. cburnett set from Wikimedia Commons under CC-BY-SA 3.0).

---

## Sound Effects

**Source:** Web Audio API synthesis — no external audio files used in current version.
**Location:** `/public/audio/` (directory reserved for future MP3/OGG files)

TODO: Replace synthesised sounds with recorded audio files before public launch.
Recommended file specs: MP3, 44.1kHz, ≤50KB each.

Files to add:
- move-soft.mp3
- capture-soft.mp3
- check-soft.mp3
- win-soft.mp3
- invalid-soft.mp3
- button-soft.mp3

Suggested source: freesound.org (CC0 license), or custom recorded wooden chess piece sounds.

---

## Supabase Dashboard Setup Checklist

Required table: `games`

**Required fields (must exist):**
- id
- board
- turn
- status
- white_player_id
- black_player_id
- move_history
- created_at
- updated_at

**Optional analytics fields (add when ready — app works without them):**
- seed (text)
- seed_source (text)
- back_rank_code (text)
- match_id (text)
- round_number (integer)
- winner (text)
- result_type (text)
- total_moves (integer)
- white_score (numeric)
- black_score (numeric)

The app uses safe fallback helpers (`safeSupabaseInsert`, `safeSupabaseUpdate`) that
automatically retry with only required fields if optional columns are not yet present.
