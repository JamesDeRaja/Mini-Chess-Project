import { createSeedChallengeUrl, type ChallengePayload } from '../game/challenge.js';

export type ChallengeRecord = ChallengePayload & { id: string; created_at?: string };
export type SeedStatsRecord = { seed_slug: string; seed: string; back_rank_code: string; display_name?: string | null; total_plays?: number; total_completed?: number; total_shares?: number; best_score?: number; best_score_player_name?: string | null; best_score_challenge_id?: string | null; last_played_at?: string | null; created_at?: string };
export type SeedScoreRecord = { id: string; seed_slug: string; seed: string; back_rank_code: string; player_id?: string | null; player_name?: string | null; score: number; moves: number; result: string; color: string; challenge_id?: string | null; created_at?: string };

async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { headers: { 'Content-Type': 'application/json', ...options?.headers }, ...options });
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<T>;
}

export async function createChallenge(payload: ChallengePayload): Promise<ChallengeRecord> {
  const result = await requestJson<{ challenge: ChallengeRecord }>('/api/challenges/create', { method: 'POST', body: JSON.stringify(payload) });
  return result.challenge;
}

export async function fetchChallenge(challengeId: string): Promise<ChallengeRecord | null> {
  const result = await requestJson<{ challenge: ChallengeRecord | null }>(`/api/challenges/get?id=${encodeURIComponent(challengeId)}`);
  return result.challenge;
}

export async function submitSeedScore(payload: Omit<SeedScoreRecord, 'id' | 'created_at'>): Promise<void> {
  await requestJson('/api/seeds/score', { method: 'POST', body: JSON.stringify(payload) });
}

export async function fetchPopularSeedStats(): Promise<SeedStatsRecord[]> {
  const result = await requestJson<{ seeds: SeedStatsRecord[] }>('/api/seeds/popular');
  return result.seeds;
}

export async function fetchSeedLeaderboard(seedSlug: string): Promise<SeedScoreRecord[]> {
  const result = await requestJson<{ scores: SeedScoreRecord[] }>(`/api/seeds/leaderboard?seed=${encodeURIComponent(seedSlug)}`);
  return result.scores;
}

export function fallbackSeedShareUrl(seedSlug: string) { return createSeedChallengeUrl(seedSlug); }
