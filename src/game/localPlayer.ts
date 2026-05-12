const playerIdKey = 'miniShuffleChess.playerId';
const displayNameKey = 'miniShuffleChess.displayName';

function shortSuffix(value: string) {
  return value.replace(/[^a-z0-9]/gi, '').slice(-5).toUpperCase() || Math.random().toString(36).slice(2, 7).toUpperCase();
}

function createPlayerId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `anon-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getAnonymousPlayerId(): string {
  if (typeof localStorage === 'undefined') return createPlayerId();
  const existing = localStorage.getItem(playerIdKey);
  if (existing) return existing;
  const playerId = createPlayerId();
  localStorage.setItem(playerIdKey, playerId);
  return playerId;
}

export function getDefaultDisplayName(playerId = getAnonymousPlayerId()) {
  return `Guest ${shortSuffix(playerId)}`;
}

export function getDisplayName(): string {
  if (typeof localStorage === 'undefined') return getDefaultDisplayName();
  return localStorage.getItem(displayNameKey) || getDefaultDisplayName();
}

export function saveDisplayName(name: string): string {
  const normalizedName = name.trim().replace(/\s+/g, ' ').slice(0, 24) || getDefaultDisplayName();
  if (typeof localStorage !== 'undefined') localStorage.setItem(displayNameKey, normalizedName);
  return normalizedName;
}

export function hasCustomDisplayName(): boolean {
  return typeof localStorage !== 'undefined' && Boolean(localStorage.getItem(displayNameKey));
}

export function clearDisplayName(): void {
  if (typeof localStorage !== 'undefined') localStorage.removeItem(displayNameKey);
}
