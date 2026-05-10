import { indexToCoord } from '../game/moveDelta.js';
import type { Board, Color, GameStatus, Move, MoveDelta, MoveRecord, PromotionPieceType } from '../game/types.js';


export type MatchmakingResponse =
  | { status: 'matched'; gameId: string }
  | { status: 'waiting'; queueId: string; seed: string; backRankCode: string }
  | { status: 'unavailable'; message: string };

export type OnlineGameRecord = {
  id: string;
  board: Board;
  turn: Color;
  status: GameStatus;
  white_player_id: string | null;
  black_player_id: string | null;
  move_history?: Array<MoveDelta | MoveRecord> | null;
  last_move?: MoveDelta | null;
  move_count?: number | null;
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

export function createOnlineGame(playerId: string): Promise<{ gameId: string; seed?: string; backRankCode?: string; dateKey?: string }> {
  return requestJson('/api/games/create', {
    method: 'POST',
    body: JSON.stringify({ playerId }),
  });
}

export function createDailyGame(playerId: string, dateKey?: string): Promise<{ gameId: string; seed: string; backRankCode: string; dateKey: string }> {
  return requestJson('/api/games/daily', {
    method: 'POST',
    body: JSON.stringify({ playerId, dateKey }),
  });
}

export function createSeededGame(playerId: string, seed: string): Promise<{ gameId: string; seed: string; backRankCode: string }> {
  return requestJson('/api/games/create-seeded', {
    method: 'POST',
    body: JSON.stringify({ playerId, seed }),
  });
}

export function findMatchmakingGame(playerId: string, seed: string, backRankCode: string): Promise<MatchmakingResponse> {
  return requestJson('/api/matchmaking/find', {
    method: 'POST',
    body: JSON.stringify({ playerId, seed, backRankCode }),
  });
}

export function cancelMatchmaking(playerId: string, queueId?: string): Promise<{ ok: boolean; message?: string }> {
  return requestJson('/api/matchmaking/cancel', {
    method: 'POST',
    body: JSON.stringify({ playerId, queueId }),
  });
}

export function joinOnlineGame(gameId: string, playerId: string): Promise<{ game: OnlineGameRecord; role: Color | 'spectator' }> {
  return requestJson(`/api/games/join?id=${encodeURIComponent(gameId)}`, {
    method: 'POST',
    body: JSON.stringify({ playerId }),
  });
}

export type SubmitMoveOptions = {
  promotion?: PromotionPieceType;
};

export function submitOnlineMove(gameId: string, playerId: string, move: Move, options: SubmitMoveOptions = {}): Promise<{ game: OnlineGameRecord }> {
  return requestJson('/api/games/move', {
    method: 'POST',
    body: JSON.stringify({
      gameId,
      playerId,
      from: indexToCoord(move.from),
      to: indexToCoord(move.to),
      promotion: options.promotion ?? move.promotionPiece,
    }),
  });
}
