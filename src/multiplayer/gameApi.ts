import type { Board, Color, GameStatus, Move, MoveRecord } from '../game/types';

export type OnlineGameRecord = {
  id: string;
  board: Board;
  turn: Color;
  status: GameStatus;
  white_player_id: string | null;
  black_player_id: string | null;
  move_history?: MoveRecord[] | null;
  seed?: string | null;
  seed_source?: string | null;
  back_rank_code?: string | null;
  match_id?: string | null;
  round_number?: number | null;
  winner?: Color | null;
  result_type?: string | null;
  total_moves?: number | null;
  white_score?: number | null;
  black_score?: number | null;
  created_at?: string;
  updated_at?: string;
};

async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json() as Promise<T>;
}

export function createOnlineGame(playerId: string): Promise<{ gameId: string; seed?: string; backRankCode?: string }> {
  return requestJson('/api/games/create', {
    method: 'POST',
    body: JSON.stringify({ playerId }),
  });
}

export function createDailyGame(playerId: string): Promise<{ gameId: string; seed: string; backRankCode: string; dateKey: string }> {
  return requestJson('/api/games/daily', {
    method: 'POST',
    body: JSON.stringify({ playerId }),
  });
}

export function createSeededGame(playerId: string, seed: string): Promise<{ gameId: string; seed: string; backRankCode: string }> {
  return requestJson('/api/games/create-seeded', {
    method: 'POST',
    body: JSON.stringify({ playerId, seed }),
  });
}

export function joinOnlineGame(gameId: string, playerId: string): Promise<{ game: OnlineGameRecord; role: Color | 'spectator' }> {
  return requestJson(`/api/games/join?id=${encodeURIComponent(gameId)}`, {
    method: 'POST',
    body: JSON.stringify({ playerId }),
  });
}

export function submitOnlineMove(gameId: string, playerId: string, move: Move): Promise<{ game: OnlineGameRecord }> {
  return requestJson('/api/games/move', {
    method: 'POST',
    body: JSON.stringify({ gameId, playerId, move }),
  });
}
