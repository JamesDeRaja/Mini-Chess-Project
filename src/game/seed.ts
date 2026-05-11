import { BACK_RANK_PIECES, BOARD_FILES } from './constants.js';
import type { Board, Color, PieceType } from './types.js';

export const DIRECT_BACK_RANK_CODE_PATTERN = /^[KQRBN]{5}$/i;
export const TEXT_SEED_PATTERN = /^[A-Za-z0-9-]{1,32}$/;

export const INVALID_SEED_HELP = 'Invalid seed. Use exactly K, Q, R, B, N once each, like QBKNR, or enter a simple text seed like boss-battle-1.';
export const INVALID_SEED_CHARACTERS = 'Use letters, numbers, and hyphens only.';

export type SeedValidationResult =
  | { ok: true; normalizedSeed: string; backRankCode: string; seedType: 'backRankCode' | 'text' }
  | { ok: false; error: string };

const codeToPiece: Record<string, PieceType> = {
  K: 'king',
  Q: 'queen',
  R: 'rook',
  B: 'bishop',
  N: 'knight',
};

const pieceToCode: Record<PieceType, string> = {
  king: 'K',
  queen: 'Q',
  rook: 'R',
  bishop: 'B',
  knight: 'N',
  pawn: 'P',
};

function hashString(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed: string): () => number {
  let state = hashString(seed) || 0x9e3779b9;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function normalizeSeedInput(seed: string): string {
  return seed.trim();
}

export function normalizeSeed(seed: string): string {
  const trimmedSeed = normalizeSeedInput(seed);
  return isBackRankCode(trimmedSeed) ? trimmedSeed.toUpperCase() : trimmedSeed.toLowerCase();
}

export function isBackRankCode(code: string): boolean {
  if (!DIRECT_BACK_RANK_CODE_PATTERN.test(code)) return false;
  const normalized = code.toUpperCase().split('');
  return ['K', 'Q', 'R', 'B', 'N'].every((pieceCode) => normalized.filter((value) => value === pieceCode).length === 1);
}

export function isValidTextSeed(seed: string): boolean {
  return TEXT_SEED_PATTERN.test(seed);
}

export function validateSeedInput(seed: string): SeedValidationResult {
  const trimmedSeed = normalizeSeedInput(seed);
  if (!trimmedSeed) return { ok: false, error: INVALID_SEED_HELP };

  if (isBackRankCode(trimmedSeed)) {
    const backRankCode = trimmedSeed.toUpperCase();
    return { ok: true, normalizedSeed: backRankCode, backRankCode, seedType: 'backRankCode' };
  }

  if (/^[KQRBN]{1,}$/i.test(trimmedSeed) || /^[A-Za-z]{5}$/.test(trimmedSeed) || (/^[KQRBN]{5}/i.test(trimmedSeed) && !isBackRankCode(trimmedSeed))) {
    return { ok: false, error: INVALID_SEED_HELP };
  }

  if (!Array.from(trimmedSeed).every((character) => character.charCodeAt(0) <= 127) || !/^[A-Za-z0-9-]+$/.test(trimmedSeed)) {
    return { ok: false, error: INVALID_SEED_CHARACTERS };
  }

  if (!isValidTextSeed(trimmedSeed)) {
    return { ok: false, error: 'Use 1 to 32 letters, numbers, and hyphens.' };
  }

  const normalizedSeed = trimmedSeed.toLowerCase();
  return { ok: true, normalizedSeed, backRankCode: backRankCodeFromSeed(normalizedSeed), seedType: 'text' };
}

export function createSeedFromInput(seed: string): SeedValidationResult {
  return validateSeedInput(seed);
}

export function isValidBackRankCode(code: string): boolean {
  return isBackRankCode(code);
}

export function pieceOrderFromBackRankCode(backRankCode: string): PieceType[] {
  const normalized = backRankCode.toUpperCase();
  if (!isValidBackRankCode(normalized)) {
    throw new Error('Invalid back-rank code');
  }
  return normalized.split('').map((pieceCode) => codeToPiece[pieceCode]);
}

export function backRankCodeFromPieceOrder(pieceOrder: PieceType[]): string {
  return pieceOrder.map((piece) => pieceToCode[piece]).join('');
}

export function backRankCodeFromSeed(seed: string): string {
  const random = seededRandom(seed);
  const pieces = [...BACK_RANK_PIECES];
  for (let index = pieces.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [pieces[index], pieces[swapIndex]] = [pieces[swapIndex], pieces[index]];
  }
  return backRankCodeFromPieceOrder(pieces);
}

export function resolveBackRankCode(seed: string): string {
  const validatedSeed = validateSeedInput(seed);
  if (!validatedSeed.ok) throw new Error(validatedSeed.error);
  return validatedSeed.backRankCode;
}

export function getUtcDateKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function getDailySeed(dateKey = getUtcDateKey()): string {
  return `daily-${dateKey}`;
}

export function deriveBackRankCodeFromBoard(board: Board): string | null {
  if (!Array.isArray(board) || board.length < BOARD_FILES) return null;
  const whiteBackRank = board.slice(0, BOARD_FILES).map((square) => square.piece?.type);
  if (whiteBackRank.some((piece) => !piece || piece === 'pawn')) return null;
  return backRankCodeFromPieceOrder(whiteBackRank as PieceType[]);
}

type MaterialMove = { color: Color; captured?: PieceType | null };

export function estimateMaterialScores(moveHistory: MaterialMove[] | null | undefined): { whiteScore: number; blackScore: number } {
  const values: Record<PieceType, number> = {
    king: 0,
    queen: 9,
    rook: 5,
    bishop: 3,
    knight: 3,
    pawn: 1,
  };

  return (moveHistory ?? []).reduce(
    (scores, move) => {
      if (!move.captured) return scores;
      return { ...scores, [move.color === 'white' ? 'whiteScore' : 'blackScore']: scores[move.color === 'white' ? 'whiteScore' : 'blackScore'] + values[move.captured] };
    },
    { whiteScore: 0, blackScore: 0 },
  );
}
