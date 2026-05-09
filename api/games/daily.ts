import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createInitialBoard } from '../../src/game/createInitialBoard';
import { backRankCodeFromSeed, getDailySeed, getUtcDateKey } from '../../src/game/seed';
import { safeSupabaseInsert } from '../../src/multiplayer/safeSupabaseInsert';
import { getServerSupabase } from './serverSupabase';

type DailySeedRecord = {
  seed?: string;
  back_rank_code?: string;
};

async function getStoredDailySeed(supabase: ReturnType<typeof getServerSupabase>, dateKey: string): Promise<DailySeedRecord | null> {
  const { data, error } = await supabase.from('daily_seeds').select('seed, back_rank_code').eq('date_key', dateKey).maybeSingle();
  if (error || !data) return null;
  return data as DailySeedRecord;
}

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
  const supabase = getServerSupabase();
  const storedDailySeed = await getStoredDailySeed(supabase, dateKey);
  const seed = storedDailySeed?.seed ?? getDailySeed(dateKey);
  const backRankCode = storedDailySeed?.back_rank_code ?? backRankCodeFromSeed(seed);

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
    response.status(500).send(error?.message ?? 'Unable to create daily game');
    return;
  }

  response.status(200).json({ gameId: data.id, seed, backRankCode, dateKey });
}
