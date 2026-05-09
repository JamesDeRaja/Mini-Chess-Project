const PLAYER_ID_KEY = 'mini_chess_player_id';

export function getPlayerId(): string {
  const existingPlayerId = localStorage.getItem(PLAYER_ID_KEY);
  if (existingPlayerId) return existingPlayerId;

  const playerId = crypto.randomUUID();
  localStorage.setItem(PLAYER_ID_KEY, playerId);
  return playerId;
}
