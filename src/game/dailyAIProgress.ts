import type { Color } from './types.js';

export type DailyAIStage = 0 | 1 | 2 | 3 | 4;
export type DailyAIStars = 0 | 1 | 2 | 3;
export type DailyAIDifficulty = 'easy' | 'medium' | 'hard' | 'extreme';
export type DailyAIGameResult = 'win' | 'loss';

export type DailyAIProgress = {
  dateKey: string;
  stars: DailyAIStars;
  magicStarUnlocked: boolean;
  currentStage: DailyAIStage;
  gamesPlayed: number;
  wins: number;
  losses: number;
};

function storageKey(dateKey: string): string {
  return `daily-ai-progress-${dateKey}`;
}

function createDailyAIProgress(dateKey: string): DailyAIProgress {
  return {
    dateKey,
    stars: 0,
    magicStarUnlocked: false,
    currentStage: 0,
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
  };
}

function clampStars(value: unknown): DailyAIStars {
  return value === 1 || value === 2 || value === 3 ? value : 0;
}

function stageFromProgress(stars: DailyAIStars, magicStarUnlocked: boolean): DailyAIStage {
  if (magicStarUnlocked) return 4;
  return stars;
}

function sanitizeDailyAIProgress(dateKey: string, stored: unknown): DailyAIProgress {
  if (!stored || typeof stored !== 'object') return createDailyAIProgress(dateKey);
  const candidate = stored as Partial<DailyAIProgress>;
  if (candidate.dateKey !== dateKey) return createDailyAIProgress(dateKey);

  const stars = clampStars(candidate.stars);
  const magicStarUnlocked = candidate.magicStarUnlocked === true;
  return {
    dateKey,
    stars,
    magicStarUnlocked,
    currentStage: stageFromProgress(stars, magicStarUnlocked),
    gamesPlayed: Number.isFinite(candidate.gamesPlayed) ? Math.max(0, Math.floor(candidate.gamesPlayed ?? 0)) : 0,
    wins: Number.isFinite(candidate.wins) ? Math.max(0, Math.floor(candidate.wins ?? 0)) : 0,
    losses: Number.isFinite(candidate.losses) ? Math.max(0, Math.floor(candidate.losses ?? 0)) : 0,
  };
}

export function getDailyAIProgress(dateKey: string): DailyAIProgress {
  if (typeof localStorage === 'undefined') return createDailyAIProgress(dateKey);

  const rawProgress = localStorage.getItem(storageKey(dateKey));
  if (!rawProgress) return createDailyAIProgress(dateKey);

  try {
    return sanitizeDailyAIProgress(dateKey, JSON.parse(rawProgress));
  } catch {
    return createDailyAIProgress(dateKey);
  }
}

export function saveDailyAIProgress(progress: DailyAIProgress): DailyAIProgress {
  const sanitizedProgress = sanitizeDailyAIProgress(progress.dateKey, progress);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(storageKey(sanitizedProgress.dateKey), JSON.stringify(sanitizedProgress));
  }
  return sanitizedProgress;
}

export function resetDailyAIProgressIfNeeded(dateKey: string): DailyAIProgress {
  return getDailyAIProgress(dateKey);
}

export function getDailyAIDifficulty(progress: DailyAIProgress): DailyAIDifficulty {
  if (progress.currentStage === 0) return 'easy';
  if (progress.currentStage === 1) return 'medium';
  if (progress.currentStage === 2) return 'hard';
  return 'extreme';
}

export function getDailyAIPlayerColor(_progress: DailyAIProgress): Color {
  return 'white';
}

export function handleDailyAIGameResult(progress: DailyAIProgress, result: DailyAIGameResult): DailyAIProgress {
  const nextProgress: DailyAIProgress = {
    ...progress,
    gamesPlayed: progress.gamesPlayed + 1,
    wins: progress.wins + (result === 'win' ? 1 : 0),
    losses: progress.losses + (result === 'loss' ? 1 : 0),
  };

  if (result === 'win') {
    if (progress.currentStage < 3) {
      const nextStars = (progress.stars + 1) as DailyAIStars;
      nextProgress.stars = nextStars;
      nextProgress.currentStage = nextStars;
    } else {
      nextProgress.stars = 3;
      nextProgress.magicStarUnlocked = true;
      nextProgress.currentStage = 4;
    }
  }

  return saveDailyAIProgress(nextProgress);
}

export function getDailyAIStatusLine(progress: DailyAIProgress): string {
  if (progress.magicStarUnlocked) return 'Daily mastered';
  if (progress.stars === 0) return 'Easy bot awaits';
  if (progress.stars === 1) return 'Medium bot · Ascension I';
  if (progress.stars === 2) return 'Hard bot · Ascension II';
  return 'Final boss · Ascension III';
}
