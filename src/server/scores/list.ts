import type { VercelRequest, VercelResponse } from '@vercel/node';
import { HUMAN_PLAYER_NAMES } from '../../game/humanPlayers.js';
import { getServerSupabase } from '../supabase.js';

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

type SeedScoreRow = {
  id: string;
  seed_slug: string;
  seed: string;
  back_rank_code: string | null;
  player_id: string | null;
  player_name: string | null;
  score: number;
  moves: number;
  result: string;
  color: string;
  challenge_id: string | null;
  created_at: string;
};

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed: string): () => number {
  let state = hashString(seed) || 0x9e3779b9;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffledDailyNames(seed: string): string[] {
  const names = [...new Set(HUMAN_PLAYER_NAMES)];
  const random = seededRandom(seed);
  for (let index = names.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [names[index], names[swapIndex]] = [names[swapIndex], names[index]];
  }
  return names;
}

function createDailyLeaderboardFillers(seed: string, mode: string): ScoreRow[] {
  if (mode !== 'daily' || !seed.startsWith('daily-')) return [];
  const random = seededRandom(`leaderboard:${seed}`);
  return shuffledDailyNames(seed).slice(0, 100).map((displayName, index) => {
    const side = random() < 0.5 ? 'white' : 'black';
    return {
      id: `daily-bot-${seed}-${index}`,
      player_id: `daily-bot-${index}`,
      display_name: displayName,
      seed,
      back_rank_code: null,
      mode,
      side,
      result: side === 'white' ? 'white_won' : 'black_won',
      score: 35 + Math.floor(random() * 65),
      moves: 8 + Math.floor(random() * 34),
      created_at: new Date(Date.UTC(2026, 0, 1, 0, index, 0)).toISOString(),
    };
  });
}

const defaultStartCodes = ['QNRBK', 'RKBQN', 'BNQKR', 'KRBNQ', 'NQBRK', 'RBKQN', 'QKNRB', 'BRQNK', 'NRKBQ', 'KQBRN'];

function createGlobalLeaderboardFillers(): ScoreRow[] {
  const random = seededRandom('global-leaderboard-defaults');
  return shuffledDailyNames('global-leaderboard-defaults').slice(0, 10).map((displayName, index) => {
    const score = 110 - index - Math.floor(random() * 2);
    return {
      id: `global-bot-${index}`,
      player_id: `global-bot-${index}`,
      display_name: displayName,
      seed: `global-default-${index + 1}`,
      back_rank_code: defaultStartCodes[index % defaultStartCodes.length] ?? null,
      mode: 'daily',
      side: index % 2 === 0 ? 'white' : 'black',
      result: index % 2 === 0 ? 'white_won' : 'black_won',
      score: Math.max(100, score),
      moves: 7 + index,
      created_at: new Date(Date.UTC(2026, 0, 2, 0, index, 0)).toISOString(),
    };
  });
}

function createGlobalStartPointFillers(): ScoreRow[] {
  const random = seededRandom('global-start-point-defaults');
  return defaultStartCodes.map((backRankCode, index) => {
    const displayName = shuffledDailyNames(`start-point-${backRankCode}`)[0] ?? `StartPlayer${index + 1}`;
    return {
      id: `start-point-bot-${backRankCode}`,
      player_id: `start-point-bot-${index}`,
      display_name: displayName,
      seed: `default-start-${backRankCode}`,
      back_rank_code: backRankCode,
      mode: 'daily',
      side: index % 2 === 0 ? 'white' : 'black',
      result: index % 2 === 0 ? 'white_won' : 'black_won',
      score: 20 - index - Math.floor(random() * 2),
      moves: 10 + index,
      created_at: new Date(Date.UTC(2026, 0, 3, 0, index, 0)).toISOString(),
    };
  }).map((row) => ({ ...row, score: Math.max(5, row.score) }));
}

function utcDayStart(date = new Date()): string {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())).toISOString();
}

function mapSeedScoreToScore(row: SeedScoreRow): ScoreRow {
  return {
    id: `seed-score-${row.id}`,
    player_id: row.player_id ?? `seed-score-player-${row.id}`,
    display_name: row.player_name ?? 'Anonymous Player',
    seed: row.seed,
    back_rank_code: row.back_rank_code,
    mode: row.seed.startsWith('daily-') ? 'daily' : 'seed',
    side: row.color,
    result: row.result,
    score: row.score,
    moves: row.moves,
    created_at: row.created_at,
  };
}

async function fetchSeedScoreRows(supabase: ReturnType<typeof getServerSupabase>, input: { scope: string; seed: string | null }): Promise<ScoreRow[]> {
  if (input.scope === 'global-start-points') return [];
  let query = supabase
    .from('seed_scores')
    .select('*')
    .order('score', { ascending: false })
    .order('moves', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(input.scope === 'global' ? 500 : 100);

  if (input.seed) query = query.eq('seed_slug', input.seed);
  else if (input.scope === 'daily') query = query.gte('created_at', utcDayStart());

  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as SeedScoreRow[]).map(mapSeedScoreToScore);
}

function sortScores(scores: ScoreRow[]): ScoreRow[] {
  return [...scores].sort((a, b) => b.score - a.score || a.moves - b.moves || a.created_at.localeCompare(b.created_at));
}

function bestScoresByKey(scores: ScoreRow[], createKey: (row: ScoreRow) => string): ScoreRow[] {
  const bestByKey = new Map<string, ScoreRow>();
  for (const row of sortScores(scores)) {
    const key = createKey(row);
    if (!bestByKey.has(key)) bestByKey.set(key, row);
  }
  return [...bestByKey.values()];
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'GET') {
    response.status(405).send('Method not allowed');
    return;
  }

  const seed = typeof request.query.seed === 'string' ? request.query.seed : null;
  const mode = typeof request.query.mode === 'string' ? request.query.mode : 'daily';
  const scope = typeof request.query.scope === 'string' ? request.query.scope : 'daily';

  const supabase = getServerSupabase();
  let query = supabase
    .from('scores')
    .select('*')
    .order('score', { ascending: false })
    .order('moves', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(scope === 'global' ? 500 : 100);

  if (seed) query = query.eq('seed', seed);
  else if (scope === 'daily') query = query.gte('created_at', utcDayStart());
  if (scope === 'global-start-points') query = query.not('back_rank_code', 'is', null);

  try {
    const [{ data, error }, seedScoreRows] = await Promise.all([
      query,
      fetchSeedScoreRows(supabase, { scope, seed }),
    ]);

    if (error) throw error;

    if (scope === 'global-start-points') {
      const bestByStartingPoint = bestScoresByKey([...(data ?? []) as ScoreRow[], ...createGlobalStartPointFillers()], (row) => row.back_rank_code ?? row.seed);
      response.status(200).json({ scores: sortScores(bestByStartingPoint).slice(0, 25) });
      return;
    }

    const databaseRows = [...((data ?? []) as ScoreRow[]), ...seedScoreRows];
    const sourceRows = scope === 'global' ? [...databaseRows, ...createGlobalLeaderboardFillers()] : databaseRows;

    const bestByPlayerSeedModeSide = new Map<string, ScoreRow>();
    for (const row of sourceRows) {
      const key = `${row.player_id}:${row.seed}:${row.side}`;
      if (!bestByPlayerSeedModeSide.has(key)) bestByPlayerSeedModeSide.set(key, row);
    }

    if (scope === 'daily' && seed) {
      for (const row of createDailyLeaderboardFillers(seed, mode)) {
        const key = `${row.player_id}:${row.seed}:${row.side}`;
        if (!bestByPlayerSeedModeSide.has(key)) bestByPlayerSeedModeSide.set(key, row);
      }
    }

    response.status(200).json({ scores: sortScores([...bestByPlayerSeedModeSide.values()]).slice(0, 25) });
  } catch (error) {
    response.status(500).send(error instanceof Error ? error.message : 'Unable to load leaderboard');
  }
}
