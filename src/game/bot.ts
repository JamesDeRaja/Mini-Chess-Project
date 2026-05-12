import { applyMove } from './applyMove.js';
import { isKingInCheck, isSquareAttacked } from './check.js';
import { pieceValues } from './constants.js';
import { getAllLegalMoves } from './legalMoves.js';
import type { Board, Color, Move } from './types.js';

export type BotLevel = 'weak' | 'medium' | 'powerful';

type ScoredMove = {
  move: Move;
  score: number;
  tieBreaker: number;
};

type BotMoveOptions = {
  avoidMoveKeys?: ReadonlySet<string>;
};

function chooseRandom<T>(items: T[]): T | null {
  if (items.length === 0) return null;
  return items[Math.floor(Math.random() * items.length)];
}

function chooseVariedMove(moves: Move[], avoidMoveKeys?: ReadonlySet<string>): Move | null {
  if (moves.length === 0) return null;
  const freshMoves = avoidMoveKeys ? moves.filter((move) => !avoidMoveKeys.has(getMoveIdentity(move))) : moves;
  return chooseRandom(freshMoves.length > 0 ? freshMoves : moves);
}

export function getMoveIdentity(move: Move): string {
  return `${move.piece.color}:${move.piece.type}:${move.from}-${move.to}:${move.promotionPiece ?? ''}`;
}

export function getRandomBotMove(board: Board, color: Color = 'black', options: BotMoveOptions = {}): Move | null {
  return chooseVariedMove(getAllLegalMoves(board, color), options.avoidMoveKeys);
}

export function scoreMove(board: Board, move: Move): number {
  let score = 0;
  const nextBoard = applyMove(board, move);
  const enemyColor = move.piece.color === 'white' ? 'black' : 'white';

  if (move.capturedPiece) score += pieceValues[move.capturedPiece.type] * 10;
  if (isKingInCheck(nextBoard, enemyColor)) score += 20;
  if (move.isPromotion) score += 80;
  if (isSquareAttacked(nextBoard, move.to, enemyColor)) score -= pieceValues[move.piece.type] * 5;

  return score;
}

function scoredMoves(board: Board, color: Color): ScoredMove[] {
  return getAllLegalMoves(board, color)
    .map((move) => ({ move, score: scoreMove(board, move), tieBreaker: Math.random() }))
    .sort((a, b) => b.score - a.score || a.tieBreaker - b.tieBreaker);
}

function rankedMoves(board: Board, color: Color): Move[] {
  return scoredMoves(board, color).map(({ move }) => move);
}

export function getWeightedBotMove(board: Board, color: Color = 'black', options: BotMoveOptions = {}): Move | null {
  const topMoves = rankedMoves(board, color).slice(0, 3);
  return chooseVariedMove(topMoves, options.avoidMoveKeys);
}

export function getBotMoveByLevel(board: Board, color: Color = 'black', level: BotLevel = 'medium', options: BotMoveOptions = {}): Move | null {
  if (level === 'weak') return getRandomBotMove(board, color, options);

  const moves = scoredMoves(board, color);
  if (moves.length === 0) return null;

  if (level === 'powerful') {
    const bestScore = moves[0].score;
    const strongMoves = moves.filter(({ score }) => score >= bestScore - 10).slice(0, 6).map(({ move }) => move);
    return chooseVariedMove(strongMoves, options.avoidMoveKeys);
  }

  return chooseVariedMove(moves.slice(0, Math.min(5, moves.length)).map(({ move }) => move), options.avoidMoveKeys);
}
