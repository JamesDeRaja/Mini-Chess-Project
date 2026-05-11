const PLAYER_ID_KEY = 'miniShuffleChess.playerId';
const LEGACY_PLAYER_ID_KEY = 'mini_chess_player_id';

function createPlayerId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `anon-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getPlayerId(): string {
  const existingPlayerId = localStorage.getItem(PLAYER_ID_KEY) ?? localStorage.getItem(LEGACY_PLAYER_ID_KEY);
  if (existingPlayerId) {
    localStorage.setItem(PLAYER_ID_KEY, existingPlayerId);
    return existingPlayerId;
  }

  const playerId = createPlayerId();
  localStorage.setItem(PLAYER_ID_KEY, playerId);
  return playerId;
}
