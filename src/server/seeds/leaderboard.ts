import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createSeedFromInput } from '../../game/seed.js';
import { getServerSupabase } from '../supabase.js';

type SeedScoreRow = {
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

const seedLeaderboardNames = [
  'CheckmateGoblin', 'PawnGoblin', 'TinyRook', 'BishopBongo', 'KnightMare', 'ForkEnjoyer', 'BlunderChef', 'MateMagnet', 'PocketTactician', 'QueenSneak',
  'RookSnack', 'BoardGremlin', 'CastlelessKing', 'TempoThief', 'PinCollector', 'SkewerWizard', 'PawnStormy', 'MiniMate', 'ShuffleGremlin', 'EndgameEel',
  'TacticToaster', 'FiveBySixer', 'RankRascal', 'FileFerret', 'DiagonalDodo', 'CheckChaser', 'MateMoth', 'LooseKnight', 'SneakyBishop', 'RookRaccoon',
];

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
  const names = [...seedLeaderboardNames];
  const random = seededRandom(`seed-leaderboard-names:${seedSlug}`);
  for (let index = names.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [names[index], names[swapIndex]] = [names[swapIndex], names[index]];
  }
  return names;
}

function createSeedLeaderboardFillers(seedSlug: string): SeedScoreRow[] {
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
      created_at: new Date(Date.UTC(2026, 0, 4, 0, index, 0)).toISOString(),
    };
  });
}

function sortScores(scores: SeedScoreRow[]): SeedScoreRow[] {
  return [...scores].sort((a, b) => b.score - a.score || a.moves - b.moves || a.created_at.localeCompare(b.created_at));
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  const seed = cleanSeed(request.query.seed);
  if (!seed) { response.status(400).send('Invalid seed'); return; }
  try {
    const { data, error } = await getServerSupabase()
      .from('seed_scores')
      .select('*')
      .eq('seed_slug', seed)
      .order('score', { ascending: false })
      .order('moves', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(50);
    if (error) throw error;
    response.status(200).json({ scores: sortScores([...(data ?? []) as SeedScoreRow[], ...createSeedLeaderboardFillers(seed)]).slice(0, 50) });
  } catch {
    response.status(200).json({ scores: sortScores(createSeedLeaderboardFillers(seed)) });
  }
}
