import { applyMove } from './applyMove';
import { isKingInCheck, isSquareAttacked } from './check';
import { pieceValues } from './constants';
import { getAllLegalMoves } from './legalMoves';
import type { Board, Color, Move } from './types';

function chooseRandom<T>(items: T[]): T | null {
  if (items.length === 0) return null;
  return items[Math.floor(Math.random() * items.length)];
}

export function getRandomBotMove(board: Board, color: Color = 'black'): Move | null {
  return chooseRandom(getAllLegalMoves(board, color));
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

export function getWeightedBotMove(board: Board, color: Color = 'black'): Move | null {
  const moves = getAllLegalMoves(board, color);
  if (moves.length === 0) return null;

  const topMoves = moves
    .map((move) => ({ move, score: scoreMove(board, move) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ move }) => move);

  return chooseRandom(topMoves);
}
