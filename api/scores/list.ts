import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getServerSupabase } from '../games/serverSupabase.js';

type ScoreRow = {
  id: string;
  player_id: string;
  display_name: string;
  seed: string;
  back_rank_code: string | null;
  mode: string;
  side: string;
  result: string;
  score: number;
  moves: number;
  created_at: string;
};

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'GET') {
    response.status(405).send('Method not allowed');
    return;
  }

  const seed = typeof request.query.seed === 'string' ? request.query.seed : null;
  const mode = typeof request.query.mode === 'string' ? request.query.mode : 'daily';
  if (!seed) {
    response.status(400).send('Missing seed');
    return;
  }

  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from('scores')
    .select('*')
    .eq('seed', seed)
    .eq('mode', mode)
    .order('score', { ascending: false })
    .order('moves', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(100);

  if (error) {
    response.status(500).send(error.message);
    return;
  }

  const bestByPlayerSeedModeSide = new Map<string, ScoreRow>();
  for (const row of (data ?? []) as ScoreRow[]) {
    const key = `${row.player_id}:${row.seed}:${row.mode}:${row.side}`;
    if (!bestByPlayerSeedModeSide.has(key)) bestByPlayerSeedModeSide.set(key, row);
  }

  response.status(200).json({ scores: [...bestByPlayerSeedModeSide.values()].slice(0, 25) });
}
