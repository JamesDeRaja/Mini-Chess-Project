import type { PieceType } from './types';
import { BACK_RANK_PIECES } from './constants';

const PIECE_TO_CODE: Record<PieceType, string> = {
  king: 'K', queen: 'Q', rook: 'R', bishop: 'B', knight: 'N', pawn: 'P',
};
const CODE_TO_PIECE: Record<string, PieceType> = {
  K: 'king', Q: 'queen', R: 'rook', B: 'bishop', N: 'knight',
};

/** Deterministic u32 hash of a string. */
function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  }
  return h;
}

/** Fisher-Yates with a simple LCG seeded from the input hash. */
function seededShuffle<T>(items: T[], seed: number): T[] {
  const arr = [...items];
  let state = seed >>> 0;
  function next(n: number): number {
    state = Math.imul(state * 1664525 + 1013904223, 1) >>> 0;
    return state % n;
  }
  for (let i = arr.length - 1; i > 0; i--) {
    const j = next(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Convert a seed string → deterministic back-rank piece order. */
export function seedToBackRank(seed: string): PieceType[] {
  return seededShuffle([...BACK_RANK_PIECES], hashString(seed));
}

/** Convert a back-rank array → compact 5-letter code like "KQRBN". */
export function backRankToCode(pieces: PieceType[]): string {
  return pieces.map((p) => PIECE_TO_CODE[p]).join('');
}

/** Parse a 5-letter back-rank code back to a piece array. Returns null if invalid. */
export function codeToBackRank(code: string): PieceType[] | null {
  const pieces = code.toUpperCase().split('').map((c) => CODE_TO_PIECE[c]);
  if (pieces.length !== 5 || pieces.some((p) => !p)) return null;
  const has = new Set(pieces);
  const required: PieceType[] = ['king', 'queen', 'rook', 'bishop', 'knight'];
  if (!required.every((p) => has.has(p))) return null;
  return pieces as PieceType[];
}

/** Today's date key: "YYYY-MM-DD". */
export function todayDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Canonical seed string for a date key. */
export function dateKeyToSeed(dateKey: string): string {
  return `daily-${dateKey}`;
}

/** Full daily seed info from a date key (no network needed). */
export function getDailySeedInfo(dateKey: string): {
  dateKey: string;
  seed: string;
  backRankCode: string;
  backRank: PieceType[];
} {
  const seed = dateKeyToSeed(dateKey);
  const backRank = seedToBackRank(seed);
  const backRankCode = backRankToCode(backRank);
  return { dateKey, seed, backRankCode, backRank };
}
