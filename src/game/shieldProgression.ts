import type { PlayerPowerTier } from './playerPower.js';

export const SHIELD_PIPS_PER_TIER = 5;

export type ShieldProgression = {
  tier: PlayerPowerTier;
  pips: number;
};

const STORAGE_KEY = 'pocket-shuffle-shield';

function clampTier(value: number): PlayerPowerTier {
  return Math.min(10, Math.max(1, Math.round(value))) as PlayerPowerTier;
}

function sanitize(data: unknown): ShieldProgression {
  if (!data || typeof data !== 'object') return { tier: 1, pips: 0 };
  const d = data as Record<string, unknown>;
  return {
    tier: clampTier(typeof d.tier === 'number' ? d.tier : 1),
    pips: Math.min(SHIELD_PIPS_PER_TIER - 1, Math.max(0, typeof d.pips === 'number' ? Math.floor(d.pips) : 0)),
  };
}

export function readShieldProgression(): ShieldProgression {
  if (typeof localStorage === 'undefined') return { tier: 1, pips: 0 };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return sanitize(raw ? JSON.parse(raw) : null);
  } catch {
    return { tier: 1, pips: 0 };
  }
}

export function saveShieldProgression(p: ShieldProgression): ShieldProgression {
  const s = sanitize(p);
  if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  return s;
}

export function applyShieldWin(p: ShieldProgression): ShieldProgression {
  if (p.tier >= 10) return p;
  const nextPips = p.pips + 1;
  if (nextPips >= SHIELD_PIPS_PER_TIER) {
    return { tier: clampTier(p.tier + 1), pips: 0 };
  }
  return { tier: p.tier, pips: nextPips };
}

export function applyShieldLoss(p: ShieldProgression): ShieldProgression {
  return { tier: p.tier, pips: Math.max(0, p.pips - 1) };
}
