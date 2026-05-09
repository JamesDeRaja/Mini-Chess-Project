import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createInitialBoard } from '../../src/game/createInitialBoard';
import { backRankToCode, codeToBackRank, seedToBackRank } from '../../src/game/seedUtils';
import { safeGameInsert } from '../../src/multiplayer/safeSupabaseInsert';
import { getServerSupabase } from './serverSupabase';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    response.status(405).send('Method not allowed');
    return;
  }

  const playerId = typeof request.body?.playerId === 'string' ? request.body.playerId : null;
  const rawSeed = typeof request.body?.seed === 'string' ? request.body.seed.trim() : null;

  if (!playerId) {
    response.status(400).send('Missing playerId');
    return;
  }
  if (!rawSeed) {
    response.status(400).send('Missing seed');
    return;
  }

  // If the seed looks like a direct back-rank code (5 letters K/Q/R/B/N), use it directly
  const directRank = codeToBackRank(rawSeed);
  const backRank = directRank ?? seedToBackRank(rawSeed);
  const backRankCode = backRankToCode(backRank);
  const seedSource = directRank ? 'code' : 'custom';
  const board = createInitialBoard({ backRankCode });

  const supabase = getServerSupabase();
  const row = await safeGameInsert(supabase, {
    board,
    turn: 'white',
    status: 'waiting',
    white_player_id: playerId,
    black_player_id: null,
    move_history: [],
    seed: rawSeed,
    seed_source: seedSource,
    back_rank_code: backRankCode,
  });

  if (!row) {
    response.status(500).send('Failed to create seeded game');
    return;
  }

  response.status(200).json({ gameId: row.id, seed: rawSeed, backRankCode });
}
