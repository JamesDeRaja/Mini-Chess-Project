import { backRankCodeFromSeed, getDailySeed, getUtcDateKey, randomBackRankCodeFromSeed } from './seed.js';

export type ShuffleMode = 'daily' | 'random';

export type ResolvedSeedSource = {
  mode: ShuffleMode;
  seed: string;
  backRankCode: string;
  label: string;
};

export const SHUFFLE_MODE_STORAGE_KEY = 'shuffleMode';

let pageSessionRandomGameSeed: string | null = null;

export function getCurrentShuffleMode(): ShuffleMode {
  if (typeof localStorage === 'undefined') return 'daily';
  return localStorage.getItem(SHUFFLE_MODE_STORAGE_KEY) === 'random' ? 'random' : 'daily';
}

export function setCurrentShuffleMode(mode: ShuffleMode): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(SHUFFLE_MODE_STORAGE_KEY, mode);
}

export function createRandomGameSeed(): string {
  const randomPart = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().replace(/-/g, '').slice(0, 16)
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
  return `random-${randomPart}`.slice(0, 32);
}

export function getPageSessionRandomGameSeed(): string {
  pageSessionRandomGameSeed ??= createRandomGameSeed();
  return pageSessionRandomGameSeed;
}

export function resolveSeedSourceForMode(mode: ShuffleMode, options: { dateKey?: string; randomSeed?: string } = {}): ResolvedSeedSource {
  if (mode === 'random') {
    const seed = options.randomSeed ?? getPageSessionRandomGameSeed();
    return { mode, seed, backRankCode: randomBackRankCodeFromSeed(seed), label: 'Random Shuffle' };
  }

  const dateKey = options.dateKey ?? getUtcDateKey();
  const seed = getDailySeed(dateKey);
  return { mode, seed, backRankCode: backRankCodeFromSeed(seed), label: 'Daily Shuffle' };
}
