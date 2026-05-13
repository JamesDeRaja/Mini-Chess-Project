const playerIdKey = 'miniShuffleChess.playerId';
const displayNameKey = 'miniShuffleChess.displayName';

const defaultDisplayNames = [
  'Amigo', 'Randomxo', 'Comrade', 'Buddy', 'Paloma', 'Chingu', 'Dost', 'Yaar', 'Sathi', 'Mitra',
  'Tomo', 'Tomodachi', 'Habibi', 'Habibti', 'Amica', 'Amico', 'Compadre', 'Compa', 'Parce', 'Kumpel',
  'Freund', 'Vriend', 'Kaveri', 'KaveriX', 'Sahib', 'Sahiba', 'Saheli', 'Sangi', 'Druzhok', 'Prijatelj',
  'Mafriend', 'Monami', 'AmiGoGo', 'LudoPal', 'RookAmigo', 'Knighto', 'Pawnbuddy', 'MateMigo', 'ShuffleMitra', 'TinyDost',
  'PocketPal', 'RandoMate', 'SeedSathi', 'BoardBuddy', 'ChessChingu', 'MiniAmigo', 'BlitzYaar', 'TempoTomo', 'ForkFriend', 'RookRafiq',
  'Rafiq', 'Sadiq', 'Zuma', 'Kito', 'Niko', 'Luma', 'Mika', 'Tavi', 'Kavi', 'Zuri',
  'Ayo', 'Bayo', 'Nia', 'Lio', 'Rio', 'Momo', 'Koko', 'Pipo', 'Tiko', 'Namu',
  'Sora', 'Yuki', 'Kuma', 'Hana', 'Lani', 'Noa', 'Iko', 'Oni', 'Pasha', 'Rumi',
  'Juno', 'Novi', 'Vela', 'Tala', 'Mira', 'Asha', 'Kira', 'Zeno', 'Beni', 'Dima',
  'Luka', 'Nuri', 'Sami', 'Tari', 'Omaro', 'Enzo', 'Mateo', 'Rico', 'SolMate', 'Wanderxo',
] as const;

function defaultNameIndex(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash % defaultDisplayNames.length;
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
  return defaultDisplayNames[defaultNameIndex(playerId)] ?? 'Amigo';
}

export function sanitizePlayerName(name: string): string {
  const withoutTags = name.replace(/<[^>]*>/g, '');
  const normalizedName = withoutTags.trim().replace(/\s+/g, ' ').slice(0, 20);
  return normalizedName || 'Anonymous Player';
}

export function getDisplayName(): string {
  if (typeof localStorage === 'undefined') return 'Anonymous Player';
  return localStorage.getItem(displayNameKey) || 'Anonymous Player';
}

export function saveDisplayName(name: string): string {
  const normalizedName = sanitizePlayerName(name);
  if (typeof localStorage !== 'undefined') localStorage.setItem(displayNameKey, normalizedName);
  return normalizedName;
}

export function hasCustomDisplayName(): boolean {
  return typeof localStorage !== 'undefined' && Boolean(localStorage.getItem(displayNameKey));
}
