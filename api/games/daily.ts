import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createInitialBoard } from '../../src/game/createInitialBoard';
import { getDailySeedInfo, todayDateKey } from '../../src/game/seedUtils';
import { safeGameInsert } from '../../src/multiplayer/safeSupabaseInsert';
import { getServerSupabase } from './serverSupabase';

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

  const dateKey = todayDateKey();
  const { seed, backRankCode, backRank } = getDailySeedInfo(dateKey);
  const board = createInitialBoard({ backRankCode });

  const supabase = getServerSupabase();
  const row = await safeGameInsert(supabase, {
    board,
    turn: 'white',
    status: 'waiting',
    white_player_id: playerId,
    black_player_id: null,
    move_history: [],
    seed,
    seed_source: 'daily',
    back_rank_code: backRankCode,
  });

  if (!row) {
    response.status(500).send('Failed to create daily game');
    return;
  }

  response.status(200).json({
    gameId: row.id,
    seed,
    backRankCode,
    backRank,
    dateKey,
  });
}
