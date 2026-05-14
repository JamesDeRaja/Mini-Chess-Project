import type { BotLevel } from './bot.js';
import type { DailyAIDifficulty, DailyAIProgress } from './dailyAIProgress.js';

export type PlayerPowerTier = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

const romanPowerTiers: Record<PlayerPowerTier, string> = {
  1: 'I',
  2: 'II',
  3: 'III',
  4: 'IV',
  5: 'V',
  6: 'VI',
  7: 'VII',
  8: 'VIII',
  9: 'IX',
  10: 'X',
};

const botLevelPower: Record<BotLevel, PlayerPowerTier> = {
  random: 1,
  weak: 3,
  medium: 5,
  strong: 8,
  powerful: 10,
};

const dailyDifficultyPower: Record<DailyAIDifficulty, PlayerPowerTier> = {
  random: 1,
  easy: 3,
  medium: 5,
  hard: 8,
  extreme: 10,
};

function clampPowerTier(value: number): PlayerPowerTier {
  return Math.min(10, Math.max(1, Math.round(value))) as PlayerPowerTier;
}

export function getPlayerPowerTier(input: { botLevel?: BotLevel; dailyDifficulty?: DailyAIDifficulty | null; dailyProgress?: DailyAIProgress | null }): PlayerPowerTier {
  const basePower = input.dailyDifficulty ? dailyDifficultyPower[input.dailyDifficulty] : input.botLevel ? botLevelPower[input.botLevel] : 5;
  const winBonus = Math.min(2, input.dailyProgress?.winStreak ?? 0);
  const lossPenalty = Math.min(2, input.dailyProgress?.lossStreak ?? 0);
  return clampPowerTier(basePower + winBonus - lossPenalty);
}

export function getPowerRomanNumeral(tier: PlayerPowerTier): string {
  return romanPowerTiers[tier];
}

export function getBestMoveChanceForPower(tier: PlayerPowerTier): number {
  return tier / 10;
}
