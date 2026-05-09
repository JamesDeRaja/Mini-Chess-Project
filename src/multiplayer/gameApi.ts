import type { Board, Color, GameStatus, Move, MoveRecord } from '../game/types';

export type OnlineGameRecord = {
  id: string;
  board: Board;
  turn: Color;
  status: GameStatus;
  white_player_id: string | null;
  black_player_id: string | null;
  move_history: MoveRecord[];
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

export function createOnlineGame(playerId: string): Promise<{ gameId: string }> {
  return requestJson('/api/games/create', {
    method: 'POST',
    body: JSON.stringify({ playerId }),
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
