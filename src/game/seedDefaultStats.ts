import { getCuratedSeedBySlug } from './curatedSeeds.js';

export type SeedHeatTier = 'New' | 'Warm' | 'Hot' | 'Featured' | 'Daily';

export type SeedDefaultStats = {
  defaultPlays: number;
  defaultShares: number;
  heat: SeedHeatTier;
};

export type SeedDisplayStats = SeedDefaultStats & {
  realPlays: number;
  realShares: number;
  displayedPlays: number;
  displayedShares: number;
  formattedPlays: string;
  formattedShares: string;
};

type RealSeedStats = {
  total_plays?: number | null;
  total_shares?: number | null;
};

type StatRange = {
  heat: SeedHeatTier;
  playMin: number;
  playMax: number;
  shareMin: number;
  shareMax: number;
  shareRatioMin: number;
  shareRatioMax: number;
};

const featuredSeedSlugs = new Set(['gotham-chaos', 'boss-battle', 'queen-rush', 'knight-panic', 'final-boss']);
const featuredSeedTags = new Set(['featured', 'promoted', 'viral', 'influencer', 'music', 'sports', 'celebrity']);

export function formatCompactSeedCount(value: number): string {
  const safeValue = Math.max(0, Math.floor(value));
  const units = [
    { value: 1_000_000_000, suffix: 'B' },
    { value: 1_000_000, suffix: 'M' },
    { value: 1_000, suffix: 'K' },
  ];

  for (let index = 0; index < units.length; index += 1) {
    const unit = units[index];
    if (safeValue >= unit.value) {
      const scaledValue = safeValue / unit.value;
      const roundedValue = scaledValue < 10 ? Math.round(scaledValue * 10) / 10 : Math.round(scaledValue);
      const largerUnit = units[index - 1];
      if (roundedValue >= 1000 && largerUnit) return formatCompactSeedCount(largerUnit.value);
      return `${String(roundedValue).replace(/\.0$/, '')}${unit.suffix}`;
    }
  }

  return String(safeValue);
}

function hashSeedText(seedText: string, salt: string): number {
  const input = `${salt}:${seedText.trim().toLowerCase()}`;
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function deterministicRange(seedText: string, salt: string, min: number, max: number): number {
  if (max <= min) return min;
  return min + (hashSeedText(seedText, salt) % (max - min + 1));
}

function deterministicRatio(seedText: string, min: number, max: number): number {
  const basisPoints = deterministicRange(seedText, 'share-ratio-basis-points', Math.round(min * 10000), Math.round(max * 10000));
  return basisPoints / 10000;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isDailySeed(seedSlug: string): boolean {
  return /^daily-\d{4}-\d{2}-\d{2}$/i.test(seedSlug);
}

function isFeaturedSeed(seedSlug: string): boolean {
  const curatedSeed = getCuratedSeedBySlug(seedSlug);
  return featuredSeedSlugs.has(seedSlug) || Boolean(curatedSeed?.tags.some((tag) => featuredSeedTags.has(tag)));
}

function isGeneratedRandomSeed(seedSlug: string): boolean {
  return !getCuratedSeedBySlug(seedSlug) && /^[a-z0-9]{6}$/i.test(seedSlug);
}

function getSeedHeatRange(seedSlug: string): StatRange {
  if (isDailySeed(seedSlug)) {
    return { heat: 'Daily', playMin: 1200, playMax: 9500, shareMin: 150, shareMax: 1400, shareRatioMin: 0.11, shareRatioMax: 0.16 };
  }

  if (isFeaturedSeed(seedSlug)) {
    return { heat: 'Featured', playMin: 25000, playMax: 48000, shareMin: 3500, shareMax: 6200, shareRatioMin: 0.14, shareRatioMax: 0.18 };
  }

  const curatedSeed = getCuratedSeedBySlug(seedSlug);
  if (curatedSeed) {
    const curatedTierRoll = deterministicRange(seedSlug, 'curated-seed-heat-tier', 0, 99);
    if (curatedTierRoll < 70) {
      return { heat: 'Warm', playMin: 5000, playMax: 12000, shareMin: 700, shareMax: 1900, shareRatioMin: 0.12, shareRatioMax: 0.16 };
    }
    if (curatedTierRoll < 95) {
      return { heat: 'Hot', playMin: 12100, playMax: 25000, shareMin: 1500, shareMax: 3500, shareRatioMin: 0.1, shareRatioMax: 0.16 };
    }
    return { heat: 'Featured', playMin: 25000, playMax: 48000, shareMin: 3500, shareMax: 6200, shareRatioMin: 0.14, shareRatioMax: 0.18 };
  }

  if (isGeneratedRandomSeed(seedSlug)) {
    return { heat: 'New', playMin: 180, playMax: 1200, shareMin: 20, shareMax: 140, shareRatioMin: 0.08, shareRatioMax: 0.18 };
  }

  const tierRoll = deterministicRange(seedSlug, 'seed-heat-tier', 0, 99);
  if (tierRoll < 70) {
    return { heat: 'New', playMin: 180, playMax: 1200, shareMin: 20, shareMax: 140, shareRatioMin: 0.08, shareRatioMax: 0.18 };
  }
  if (tierRoll < 95) {
    return { heat: 'Warm', playMin: 1210, playMax: 4800, shareMin: 150, shareMax: 700, shareRatioMin: 0.09, shareRatioMax: 0.17 };
  }
  return { heat: 'Hot', playMin: 4810, playMax: 25000, shareMin: 710, shareMax: 3500, shareRatioMin: 0.08, shareRatioMax: 0.15 };
}

export function getDefaultSeedStats(seedSlug: string): SeedDefaultStats {
  const range = getSeedHeatRange(seedSlug);
  const defaultPlays = deterministicRange(seedSlug, 'default-play-count', range.playMin, range.playMax);
  const proportionalShares = Math.round(defaultPlays * deterministicRatio(seedSlug, range.shareRatioMin, range.shareRatioMax));
  const defaultShares = clamp(proportionalShares, range.shareMin, range.shareMax);
  return { defaultPlays, defaultShares, heat: range.heat };
}

export function getDisplayedSeedStats(seedSlug: string, realStats?: RealSeedStats | null): SeedDisplayStats {
  const defaults = getDefaultSeedStats(seedSlug);
  const realPlays = Math.max(0, Math.floor(realStats?.total_plays ?? 0));
  const realShares = Math.max(0, Math.floor(realStats?.total_shares ?? 0));
  const displayedPlays = defaults.defaultPlays + realPlays;
  const displayedShares = defaults.defaultShares + realShares;
  return {
    ...defaults,
    realPlays,
    realShares,
    displayedPlays,
    displayedShares,
    formattedPlays: formatCompactSeedCount(displayedPlays),
    formattedShares: formatCompactSeedCount(displayedShares),
  };
}
