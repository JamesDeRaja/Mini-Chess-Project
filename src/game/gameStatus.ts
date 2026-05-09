import { isKingInCheck } from './check.js';
import { getAllLegalMoves } from './legalMoves.js';
import type { Board, Color, GameStatus } from './types.js';

export function getOpponent(color: Color): Color {
  return color === 'white' ? 'black' : 'white';
}

export function isCheckmate(board: Board, color: Color): boolean {
  return isKingInCheck(board, color) && getAllLegalMoves(board, color).length === 0;
}

export function isStalemate(board: Board, color: Color): boolean {
  return !isKingInCheck(board, color) && getAllLegalMoves(board, color).length === 0;
}

export function getStatusForTurn(board: Board, turn: Color): GameStatus {
  if (isCheckmate(board, turn)) {
    return turn === 'white' ? 'black_won' : 'white_won';
  }
  if (isStalemate(board, turn)) {
    return 'draw';
  }
  return 'active';
}
