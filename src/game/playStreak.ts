import { getUtcDateKey } from './seed.js';

const streakKey = 'miniShuffleChess.playStreak';
const streakWindowMs = 24 * 60 * 60 * 1000;

type StoredPlayStreak = { count?: number; lastPlayedAt?: number | null; lastPlayedDate?: string | null };
type PlayStreak = { count: number; lastPlayedAt: number | null; lastPlayedDate: string | null };

function dateKeyFromTime(timeMs: number): string {
  return new Date(timeMs).toISOString().slice(0, 10);
}

function normalizeStoredStreak(stored: StoredPlayStreak | null): PlayStreak {
  const count = Math.max(0, Math.round(stored?.count ?? 0));
  const migratedTime = stored?.lastPlayedDate ? Date.parse(`${stored.lastPlayedDate}T00:00:00.000Z`) : NaN;
  const lastPlayedAt = typeof stored?.lastPlayedAt === 'number' ? stored.lastPlayedAt : Number.isFinite(migratedTime) ? migratedTime : null;
  return { count, lastPlayedAt, lastPlayedDate: lastPlayedAt ? dateKeyFromTime(lastPlayedAt) : stored?.lastPlayedDate ?? null };
}

export function getPlayStreak(nowMs = Date.now()): PlayStreak {
  if (typeof localStorage === 'undefined') return { count: 0, lastPlayedAt: null, lastPlayedDate: null };
  try {
    const parsed = JSON.parse(localStorage.getItem(streakKey) ?? 'null') as StoredPlayStreak | null;
    const current = normalizeStoredStreak(parsed);
    if (!current.lastPlayedAt || !current.count) return { count: 0, lastPlayedAt: current.lastPlayedAt, lastPlayedDate: current.lastPlayedDate };
    if (nowMs - current.lastPlayedAt <= streakWindowMs) return current;
    return { count: 0, lastPlayedAt: current.lastPlayedAt, lastPlayedDate: current.lastPlayedDate };
  } catch {
    return { count: 0, lastPlayedAt: null, lastPlayedDate: null };
  }
}

export function recordPlayStreak(nowMs = Date.now()): PlayStreak {
  const current = getPlayStreak(nowMs);
  const playedDate = getUtcDateKey(new Date(nowMs));
  const shouldIncrement = current.count === 0 || current.lastPlayedDate !== playedDate;
  const next = { count: shouldIncrement ? current.count + 1 : current.count, lastPlayedAt: nowMs, lastPlayedDate: playedDate };
  if (typeof localStorage !== 'undefined') localStorage.setItem(streakKey, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent('play-streak-updated'));
  return next;
}
