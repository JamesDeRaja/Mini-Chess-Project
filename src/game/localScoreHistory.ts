import { getAnonymousPlayerId, getDisplayName } from './localPlayer.js';
import type { Color, GameStatus } from './types.js';

export type CompletedScoreEntry = {
  id: string;
  playerId: string;
  displayName: string;
  seed: string;
  backRankCode: string | null;
  mode: string;
  side: Color;
  result: GameStatus;
  score: number;
  moves: number;
  createdAt: string;
};

const historyKey = 'miniShuffleChess.history';

function readHistory(): CompletedScoreEntry[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(historyKey) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((entry) => entry && typeof entry === 'object') as CompletedScoreEntry[] : [];
  } catch {
    return [];
  }
}

function writeHistory(entries: CompletedScoreEntry[]) {
  if (typeof localStorage !== 'undefined') localStorage.setItem(historyKey, JSON.stringify(entries.slice(-100)));
}

export function getLocalScoreHistory() {
  return readHistory();
}

export function scoreHistoryKey(entry: Pick<CompletedScoreEntry, 'seed' | 'mode' | 'side'>) {
  return `${entry.seed}:${entry.mode}:${entry.side}`;
}

export function getLocalBestScore(seed: string, mode: string, side: Color): CompletedScoreEntry | null {
  return readHistory()
    .filter((entry) => entry.seed === seed && entry.mode === mode && entry.side === side)
    .sort((a, b) => b.score - a.score || a.moves - b.moves || a.createdAt.localeCompare(b.createdAt))[0] ?? null;
}


export function getBestLocalScoreForSeed(seed: string, modes?: string[]): CompletedScoreEntry | null {
  const allowedModes = modes ? new Set(modes) : null;
  return readHistory()
    .filter((entry) => entry.seed === seed && (!allowedModes || allowedModes.has(entry.mode)))
    .sort((a, b) => b.score - a.score || a.moves - b.moves || a.createdAt.localeCompare(b.createdAt))[0] ?? null;
}

export function saveLocalScoreEntry(entry: Omit<CompletedScoreEntry, 'id' | 'playerId' | 'displayName' | 'createdAt'>): CompletedScoreEntry {
  const completedEntry: CompletedScoreEntry = {
    ...entry,
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `score-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    playerId: getAnonymousPlayerId(),
    displayName: getDisplayName(),
    createdAt: new Date().toISOString(),
  };
  const entries = readHistory();
  const existingBest = getLocalBestScore(entry.seed, entry.mode, entry.side);
  if (!existingBest || completedEntry.score > existingBest.score || (completedEntry.score === existingBest.score && completedEntry.moves < existingBest.moves)) {
    writeHistory([...entries, completedEntry]);
  } else {
    writeHistory(entries);
  }
  return completedEntry;
}
