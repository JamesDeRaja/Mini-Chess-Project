import { getAnonymousPlayerId, getDisplayName } from '../game/localPlayer.js';
import { isPlausibleScore } from '../game/scoring.js';
import type { Color, GameStatus } from '../game/types.js';

type ScorePayload = {
  seed: string;
  backRankCode: string | null;
  mode: string;
  side: Color;
  result: GameStatus;
  score: number;
  moves: number;
  gameId?: string;
};

export type LeaderboardEntry = ScorePayload & {
  id: string;
  player_id: string;
  display_name: string;
  created_at: string;
};

async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { headers: { 'Content-Type': 'application/json', ...options?.headers }, ...options });
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<T>;
}

export async function submitScore(payload: ScorePayload): Promise<{ ok: boolean; score?: LeaderboardEntry }> {
  if (!isPlausibleScore(payload.score, payload.moves)) throw new Error('Score is outside allowed bounds.');
  return requestJson('/api/leaderboard', {
    method: 'POST',
    body: JSON.stringify({ action: 'submit', ...payload, playerId: getAnonymousPlayerId(), displayName: getDisplayName() }),
  });
}

export type LeaderboardScope = 'daily' | 'global' | 'global-start-points';

export async function fetchLeaderboard(seed: string, mode = 'daily'): Promise<LeaderboardEntry[]> {
  const params = new URLSearchParams({ seed, mode });
  const result = await requestJson<{ scores: LeaderboardEntry[] }>(`/api/leaderboard?action=list&${params.toString()}`);
  return result.scores;
}

export async function fetchScoreboard(scope: LeaderboardScope, seed?: string, mode = 'daily'): Promise<LeaderboardEntry[]> {
  const params = new URLSearchParams({ scope, mode });
  if (seed) params.set('seed', seed);
  const result = await requestJson<{ scores: LeaderboardEntry[] }>(`/api/leaderboard?action=list&${params.toString()}`);
  return result.scores;
}
