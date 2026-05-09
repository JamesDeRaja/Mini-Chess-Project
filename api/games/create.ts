import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createInitialBoard } from '../../src/game/createInitialBoard.js';
import { backRankCodeFromSeed, getDailySeed, getUtcDateKey } from '../../src/game/seed.js';
import { safeSupabaseInsert } from '../../src/multiplayer/safeSupabaseInsert.js';
import { getServerSupabase } from './serverSupabase.js';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    response.status(405).send('Method not allowed');
    return;
  }

  const playerId = typeof request.body?.playerId === 'string' ? request.body.playerId : null;
  if (!playerId) {
    response.status(400).send('Missing playerId');
    return;
  }

  const dateKey = getUtcDateKey();
  const seed = getDailySeed(dateKey);
  const backRankCode = backRankCodeFromSeed(seed);
  const supabase = getServerSupabase();
  const { data, error } = await safeSupabaseInsert<{ id: string }>(
    supabase,
    {
      board: createInitialBoard({ backRankCode }),
      turn: 'white',
      status: 'waiting',
      white_player_id: playerId,
      black_player_id: null,
      move_history: [],
      seed,
      seed_source: 'daily',
      back_rank_code: backRankCode,
      round_number: 1,
      total_moves: 0,
      white_score: 0,
      black_score: 0,
    },
    'id',
  );

  if (error || !data) {
    response.status(500).send(error?.message ?? 'Unable to create game');
    return;
  }

  response.status(200).json({ gameId: data.id, seed, backRankCode, dateKey });
}
