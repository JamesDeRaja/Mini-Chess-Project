import type { VercelRequest, VercelResponse } from '@vercel/node';
import { CURATED_SEEDS } from '../../game/curatedSeeds.js';
import { getServerSupabase } from '../supabase.js';
import { createSeedLeaderboardFillers, sortSeedScores, type SeedScoreRow } from './leaderboard.js';

type SeedStatsRow = {
  seed_slug: string;
  seed: string;
  back_rank_code: string;
  display_name?: string | null;
  total_plays?: number | null;
  total_completed?: number | null;
  total_shares?: number | null;
  best_score?: number | null;
  best_score_player_name?: string | null;
  best_score_challenge_id?: string | null;
  last_played_at?: string | null;
  created_at?: string;
};

function mergeBestLeaderboardScore(statsRow: SeedStatsRow | undefined, seedSlug: string, seedScores: SeedScoreRow[]): SeedStatsRow {
  const topScore = sortSeedScores([...seedScores, ...createSeedLeaderboardFillers(seedSlug)])[0];
  const statsBestScore = statsRow?.best_score ?? null;
  const shouldUseStatsBest = statsBestScore !== null && statsBestScore > (topScore?.score ?? Number.NEGATIVE_INFINITY);
  return {
    seed_slug: seedSlug,
    seed: statsRow?.seed ?? topScore?.seed ?? seedSlug,
    back_rank_code: statsRow?.back_rank_code ?? topScore?.back_rank_code ?? 'BQKRN',
    display_name: statsRow?.display_name ?? seedSlug,
    total_plays: statsRow?.total_plays ?? 0,
    total_completed: statsRow?.total_completed ?? 0,
    total_shares: statsRow?.total_shares ?? 0,
    best_score: shouldUseStatsBest ? statsBestScore : topScore?.score ?? statsBestScore,
    best_score_player_name: shouldUseStatsBest ? statsRow?.best_score_player_name ?? null : topScore?.player_name ?? statsRow?.best_score_player_name ?? null,
    best_score_challenge_id: shouldUseStatsBest ? statsRow?.best_score_challenge_id ?? null : topScore?.challenge_id ?? statsRow?.best_score_challenge_id ?? null,
    last_played_at: statsRow?.last_played_at ?? topScore?.created_at ?? null,
    created_at: statsRow?.created_at,
  };
}

export default async function handler(_request: VercelRequest, response: VercelResponse) {
  const seedSlugs = CURATED_SEEDS.map((seed) => seed.slug);
  try {
    const supabase = getServerSupabase();
    const [{ data: statsData, error: statsError }, { data: scoreData, error: scoreError }] = await Promise.all([
      supabase.from('seed_stats').select('*').in('seed_slug', seedSlugs).order('total_shares', { ascending: false }).order('total_completed', { ascending: false }),
      supabase.from('seed_scores').select('*').in('seed_slug', seedSlugs).order('score', { ascending: false }).order('moves', { ascending: true }).order('created_at', { ascending: true }).limit(1000),
    ]);
    if (statsError) throw statsError;
    const statsBySeed = new Map(((statsData ?? []) as SeedStatsRow[]).map((row) => [row.seed_slug, row]));
    const scoresBySeed = new Map<string, SeedScoreRow[]>();
    if (!scoreError) {
      for (const row of (scoreData ?? []) as SeedScoreRow[]) {
        scoresBySeed.set(row.seed_slug, [...(scoresBySeed.get(row.seed_slug) ?? []), row]);
      }
    }
    response.status(200).json({ seeds: seedSlugs.map((seedSlug) => mergeBestLeaderboardScore(statsBySeed.get(seedSlug), seedSlug, scoresBySeed.get(seedSlug) ?? [])) });
  } catch {
    response.status(200).json({ seeds: seedSlugs.map((seedSlug) => mergeBestLeaderboardScore(undefined, seedSlug, [])) });
  }
}
