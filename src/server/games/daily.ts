import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createInitialBoard } from '../../game/createInitialBoard.js';
import { dailyBackRankCodeFromSeed, getDailySeed, isCompleteDailyBackRankCode, getUtcDateKey } from '../../game/seed.js';
import { safeSupabaseInsert } from '../../multiplayer/safeSupabaseInsert.js';
import { cleanupOldGames, getNewGameLifecycleFields } from './lifecycle.js';
import { getServerSupabase } from '../supabase.js';

type DailySeedRecord = {
  seed?: string;
  back_rank_code?: string;
};

const dateKeyPattern = /^\d{4}-\d{2}-\d{2}$/;

function getRequestedDateKey(value: unknown): string | null {
  if (typeof value !== 'string') return getUtcDateKey();
  if (!dateKeyPattern.test(value)) return null;
  if (value > getUtcDateKey()) return null;
  return value;
}

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
  const dateKey = getRequestedDateKey(request.body?.dateKey);
  if (!playerId) {
    response.status(400).send('Missing playerId');
    return;
  }
  if (!dateKey) {
    response.status(400).send('dateKey must be today or a past date in YYYY-MM-DD format');
    return;
  }

  const supabase = getServerSupabase();
  await cleanupOldGames(supabase);
  const lifecycleFields = getNewGameLifecycleFields();
  const storedDailySeed = await getStoredDailySeed(supabase, dateKey);
  const seed = storedDailySeed?.seed ?? getDailySeed(dateKey);
  const storedBackRankCode = storedDailySeed?.back_rank_code;
  const backRankCode = storedBackRankCode && isCompleteDailyBackRankCode(storedBackRankCode) ? storedBackRankCode : dailyBackRankCodeFromSeed(seed);

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
