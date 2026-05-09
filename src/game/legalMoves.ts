import { applyMove } from './applyMove';
import { isKingInCheck } from './check';
import { BOARD_SIZE } from './constants';
import { getPseudoLegalMoves } from './movement';
import type { Board, Color, Move } from './types';

export function getLegalMoves(board: Board, from: number): Move[] {
  const piece = board[from]?.piece;
  if (!piece) return [];

  return getPseudoLegalMoves(board, from).filter((move) => {
    const nextBoard = applyMove(board, move);
    return !isKingInCheck(nextBoard, piece.color);
  });
}

export function getAllLegalMoves(board: Board, color: Color): Move[] {
  const moves: Move[] = [];
  for (let squareIndex = 0; squareIndex < BOARD_SIZE; squareIndex += 1) {
    if (board[squareIndex].piece?.color === color) {
      moves.push(...getLegalMoves(board, squareIndex));
    }
  }
  return moves;
}
