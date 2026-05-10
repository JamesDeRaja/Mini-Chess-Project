import { BOARD_FILES } from './constants.js';
import type { Board, PieceType } from './types.js';

export type AscensionTier = 0 | 1 | 2 | 3;

export const ASCENSION_TIERS: AscensionTier[] = [0, 1, 2, 3];
export const DAILY_ASCENSION_PROGRESS_KEY = 'dailyAscensionProgress';

const ASCENSION_REMOVAL_ORDER: PieceType[] = ['knight', 'bishop', 'rook'];
const FULL_BACK_RANK_PIECES: PieceType[] = ['king', 'queen', 'rook', 'bishop', 'knight'];
const MAX_ASCENSION_TIER: AscensionTier = 3;

type DailyAscensionProgress = Record<string, AscensionTier>;

function clampAscensionTier(value: unknown): AscensionTier {
  if (value === 1 || value === 2 || value === 3) return value;
  return 0;
}

function readAscensionProgress(): DailyAscensionProgress {
  if (typeof localStorage === 'undefined') return {};

  const rawProgress = localStorage.getItem(DAILY_ASCENSION_PROGRESS_KEY);
  if (!rawProgress) return {};

  try {
    const parsed = JSON.parse(rawProgress) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    return Object.fromEntries(
      Object.entries(parsed).map(([dateKey, tier]) => [dateKey, clampAscensionTier(tier)]),
    );
  } catch {
    return {};
  }
}

function writeAscensionProgress(progress: DailyAscensionProgress) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(DAILY_ASCENSION_PROGRESS_KEY, JSON.stringify(progress));
}

export function getAscensionTierPieces(tier: AscensionTier): PieceType[] {
  const piecesToFeature = new Set(ASCENSION_REMOVAL_ORDER.slice(0, tier));
  return FULL_BACK_RANK_PIECES.filter((piece) => !piecesToFeature.has(piece));
}

export function removeAscensionPieces(board: Board, tier: AscensionTier): Board {
  const piecesToFeature = new Set(ASCENSION_REMOVAL_ORDER.slice(0, tier));
  if (piecesToFeature.size === 0) return board;

  return board.map((square, squareIndex) => {
    if (squareIndex >= BOARD_FILES) return square;
    if (square.piece?.color !== 'white' || !piecesToFeature.has(square.piece.type)) return square;
    return { ...square, piece: null };
  });
}

export function getUnlockedAscensionTier(dateKey: string): AscensionTier {
  return clampAscensionTier(readAscensionProgress()[dateKey]);
}

export function unlockAscensionTier(dateKey: string, completedTier: AscensionTier): AscensionTier {
  const nextUnlockedTier = Math.min(completedTier + 1, MAX_ASCENSION_TIER) as AscensionTier;
  const progress = readAscensionProgress();
  const unlockedTier = Math.max(getUnlockedAscensionTier(dateKey), nextUnlockedTier) as AscensionTier;
  writeAscensionProgress({ ...progress, [dateKey]: unlockedTier });
  return unlockedTier;
}

export function canPlayAscensionTier(dateKey: string, tier: AscensionTier): boolean {
  return tier <= getUnlockedAscensionTier(dateKey);
}
