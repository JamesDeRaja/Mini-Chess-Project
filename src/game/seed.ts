import { BACK_RANK_PIECES, BOARD_FILES } from './constants.js';
import type { Board, Color, PieceType } from './types.js';

export const DIRECT_BACK_RANK_CODE_PATTERN = /^[KQRBN]{5}$/i;

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

export function normalizeSeed(seed: string): string {
  return seed.trim().replace(/\s+/g, '-').toLowerCase();
}

export function isValidBackRankCode(code: string): boolean {
  if (!DIRECT_BACK_RANK_CODE_PATTERN.test(code)) return false;
  const normalized = code.toUpperCase().split('');
  return ['K', 'Q', 'R', 'B', 'N'].every((pieceCode) => normalized.filter((value) => value === pieceCode).length === 1);
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
  const normalizedSeed = normalizeSeed(seed);
  return isValidBackRankCode(normalizedSeed) ? normalizedSeed.toUpperCase() : backRankCodeFromSeed(normalizedSeed);
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
