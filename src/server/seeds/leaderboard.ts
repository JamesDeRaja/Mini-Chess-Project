import type { VercelRequest, VercelResponse } from '@vercel/node';
import { HUMAN_PLAYER_NAMES } from '../../game/humanPlayers.js';
import { createSeedFromInput } from '../../game/seed.js';
import { getServerSupabase } from '../supabase.js';

export type SeedScoreRow = {
  id: string;
  seed_slug: string;
  seed: string;
  back_rank_code: string;
  player_id: string | null;
  player_name: string | null;
  score: number;
  moves: number;
  result: string;
  color: string;
  challenge_id: string | null;
  created_at: string;
};

type ScoreRow = {
  id: string;
  player_id: string;
  display_name: string;
  seed: string;
  back_rank_code: string | null;
  side: string;
  result: string;
  score: number;
  moves: number;
  created_at: string;
};

function cleanSeed(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 80) : '';
}

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

function shuffledSeedNames(seedSlug: string): string[] {
  const names = [...new Set(HUMAN_PLAYER_NAMES)];
  const random = seededRandom(`seed-leaderboard-names:${seedSlug}`);
  for (let index = names.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [names[index], names[swapIndex]] = [names[swapIndex], names[index]];
  }
  return names;
}

function randomRecentDate(random: () => number, index: number): Date {
  const dayOffset = 2 + Math.floor(random() * 120) + index;
  const hour = Math.floor(random() * 24);
  const minute = Math.floor(random() * 60);
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - dayOffset);
  date.setUTCHours(hour, minute, 0, 0);
  return date;
}

export function createSeedLeaderboardFillers(seedSlug: string): SeedScoreRow[] {
  const validation = createSeedFromInput(seedSlug);
  const backRankCode = validation.ok ? validation.backRankCode : 'BQKRN';
  const random = seededRandom(`seed-leaderboard:${seedSlug}`);
  return shuffledSeedNames(seedSlug).slice(0, 25).map((playerName, index) => {
    const color = random() < 0.5 ? 'white' : 'black';
    const result = random() < 0.78 ? `${color}_won` : 'draw';
    return {
      id: `seed-filler-${seedSlug}-${index}`,
      seed_slug: seedSlug,
      seed: seedSlug,
      back_rank_code: backRankCode,
      player_id: `seed-filler-${index}`,
      player_name: playerName,
      score: 35 + Math.floor(random() * 65),
      moves: 8 + Math.floor(random() * 34),
      result,
      color,
      challenge_id: null,
      created_at: randomRecentDate(random, index).toISOString(),
    };
  });
}

export function mapScoreRowToSeedScore(row: ScoreRow): SeedScoreRow {
  return {
    id: `score-${row.id}`,
    seed_slug: cleanSeed(row.seed),
    seed: row.seed,
    back_rank_code: row.back_rank_code ?? 'BQKRN',
    player_id: row.player_id,
    player_name: row.display_name,
    score: row.score,
    moves: row.moves,
    result: row.result,
    color: row.side,
    challenge_id: null,
    created_at: row.created_at,
  };
}

export function sortSeedScores(scores: SeedScoreRow[]): SeedScoreRow[] {
  return [...scores].sort((a, b) => b.score - a.score || a.moves - b.moves || a.created_at.localeCompare(b.created_at));
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  const seed = cleanSeed(request.query.seed);
  if (!seed) { response.status(400).send('Invalid seed'); return; }
  try {
    const supabase = getServerSupabase();
    const [{ data, error }, { data: sharedScoreData, error: sharedScoreError }] = await Promise.all([
      supabase
        .from('seed_scores')
        .select('*')
        .eq('seed_slug', seed)
        .order('score', { ascending: false })
        .order('moves', { ascending: true })
        .order('created_at', { ascending: true })
        .limit(50),
      supabase
        .from('scores')
        .select('id, player_id, display_name, seed, back_rank_code, side, result, score, moves, created_at')
        .eq('seed', seed)
        .order('score', { ascending: false })
        .order('moves', { ascending: true })
        .order('created_at', { ascending: true })
        .limit(50),
    ]);
    const seedScores = error ? [] : (data ?? []) as SeedScoreRow[];
    const sharedScores = sharedScoreError ? [] : ((sharedScoreData ?? []) as ScoreRow[]).map(mapScoreRowToSeedScore);
    response.status(200).json({ scores: sortSeedScores([...seedScores, ...sharedScores, ...createSeedLeaderboardFillers(seed)]).slice(0, 50) });
  } catch {
    response.status(200).json({ scores: sortSeedScores(createSeedLeaderboardFillers(seed)) });
  }
}
