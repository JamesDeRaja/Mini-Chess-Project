import type { Color } from './types.js';

export type DailyAIStage = 0 | 1 | 2 | 3 | 4;
export type DailyAIStars = 0 | 1 | 2 | 3;
export type DailyAIDifficulty = 'random' | 'easy' | 'medium' | 'hard' | 'extreme';
export type DailyAIGameResult = 'win' | 'loss';

export type DailyAIProgress = {
  dateKey: string;
  stars: DailyAIStars;
  magicStarUnlocked: boolean;
  currentStage: DailyAIStage;
  gamesPlayed: number;
  wins: number;
  losses: number;
  winStreak: number;
  lossStreak: number;
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
    winStreak: 0,
    lossStreak: 0,
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
    winStreak: Number.isFinite(candidate.winStreak) ? Math.max(0, Math.floor(candidate.winStreak ?? 0)) : 0,
    lossStreak: Number.isFinite(candidate.lossStreak) ? Math.max(0, Math.floor(candidate.lossStreak ?? 0)) : 0,
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

const adaptiveDifficulties: DailyAIDifficulty[] = ['random', 'easy', 'medium', 'hard', 'extreme'];

function clampDifficultyIndex(index: number): number {
  return Math.min(adaptiveDifficulties.length - 1, Math.max(0, index));
}

export function getDailyAIDifficulty(progress: DailyAIProgress): DailyAIDifficulty {
  const baseIndex = progress.currentStage === 0 ? 1 : progress.currentStage === 1 ? 2 : progress.currentStage === 2 ? 3 : 4;
  const lossAdjustment = progress.lossStreak >= 3 ? -2 : progress.lossStreak >= 2 ? -1 : 0;
  const winAdjustment = progress.winStreak >= 2 ? 1 : 0;
  return adaptiveDifficulties[clampDifficultyIndex(baseIndex + lossAdjustment + winAdjustment)];
}

export function getDailyAIPlayerColor(progress: DailyAIProgress): Color {
  if (progress.currentStage === 1 || progress.currentStage >= 3) return 'black';
  return 'white';
}

export function getNextDailyAIProgress(progress: DailyAIProgress, result: DailyAIGameResult): DailyAIProgress {
  const nextProgress: DailyAIProgress = {
    ...progress,
    gamesPlayed: progress.gamesPlayed + 1,
    wins: progress.wins + (result === 'win' ? 1 : 0),
    losses: progress.losses + (result === 'loss' ? 1 : 0),
    winStreak: result === 'win' ? progress.winStreak + 1 : 0,
    lossStreak: result === 'loss' ? progress.lossStreak + 1 : 0,
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

  return sanitizeDailyAIProgress(progress.dateKey, nextProgress);
}

export function handleDailyAIGameResult(progress: DailyAIProgress, result: DailyAIGameResult): DailyAIProgress {
  return saveDailyAIProgress(getNextDailyAIProgress(progress, result));
}

export function getDailyAIStatusLine(progress: DailyAIProgress): string {
  const difficulty = getDailyAIDifficulty(progress);
  if (progress.lossStreak >= 2) return `${difficulty[0].toUpperCase()}${difficulty.slice(1)} bot mercy mode`;
  if (progress.winStreak >= 2) return `${difficulty[0].toUpperCase()}${difficulty.slice(1)} bot is adapting`;
  if (progress.magicStarUnlocked) return 'Daily mastered';
  if (progress.stars === 0) return 'Easy bot awaits';
  if (progress.stars === 1) return 'Medium bot unlocked';
  if (progress.stars === 2) return 'Hard bot unlocked';
  return 'Final boss unlocked';
}
