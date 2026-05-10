import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createInitialBoard } from '../../src/game/createInitialBoard.js';
import { normalizeSeed, resolveBackRankCode } from '../../src/game/seed.js';
import { safeSupabaseInsert } from '../../src/multiplayer/safeSupabaseInsert.js';
import { cleanupOldGames, getNewGameLifecycleFields } from './lifecycle.js';
import { getServerSupabase } from './serverSupabase.js';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    response.status(405).send('Method not allowed');
    return;
  }

  const playerId = typeof request.body?.playerId === 'string' ? request.body.playerId : null;
  const rawSeed = typeof request.body?.seed === 'string' ? request.body.seed : null;
  const seed = rawSeed ? normalizeSeed(rawSeed) : null;
  if (!playerId || !seed) {
    response.status(400).send('Missing playerId or seed');
    return;
  }

  const backRankCode = resolveBackRankCode(seed);
  const supabase = getServerSupabase();
  await cleanupOldGames(supabase);
  const lifecycleFields = getNewGameLifecycleFields();
  const { data, error } = await safeSupabaseInsert<{ id: string }>(
    supabase,
    {
      board: createInitialBoard({ backRankCode }),
      turn: 'white',
      status: 'waiting',
      white_player_id: playerId,
      black_player_id: null,
      move_history: [],
      ...lifecycleFields,
      seed,
      seed_source: 'custom',
      back_rank_code: backRankCode,
      round_number: 1,
      total_moves: 0,
      white_score: 0,
      black_score: 0,
    },
    'id',
  );

  if (error || !data) {
    response.status(500).send(error?.message ?? 'Unable to create seeded game');
    return;
  }

  response.status(200).json({ gameId: data.id, seed, backRankCode });
}
