import { getUtcDateKey } from './seed.js';

const streakKey = 'miniShuffleChess.playStreak';

type PlayStreak = { count: number; lastPlayedDate: string | null };

function addUtcDays(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

export function getPlayStreak(todayKey = getUtcDateKey()): PlayStreak {
  if (typeof localStorage === 'undefined') return { count: 0, lastPlayedDate: null };
  try {
    const parsed = JSON.parse(localStorage.getItem(streakKey) ?? 'null') as PlayStreak | null;
    if (!parsed?.lastPlayedDate || !parsed.count) return { count: 0, lastPlayedDate: null };
    const yesterdayKey = addUtcDays(todayKey, -1);
    if (parsed.lastPlayedDate === todayKey || parsed.lastPlayedDate === yesterdayKey) return parsed;
    return { count: 0, lastPlayedDate: parsed.lastPlayedDate };
  } catch {
    return { count: 0, lastPlayedDate: null };
  }
}

export function recordPlayStreak(todayKey = getUtcDateKey()): PlayStreak {
  const current = getPlayStreak(todayKey);
  if (current.lastPlayedDate === todayKey) return current;
  const yesterdayKey = addUtcDays(todayKey, -1);
  const next = { count: current.lastPlayedDate === yesterdayKey ? current.count + 1 : 1, lastPlayedDate: todayKey };
  if (typeof localStorage !== 'undefined') localStorage.setItem(streakKey, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent('play-streak-updated'));
  return next;
}
