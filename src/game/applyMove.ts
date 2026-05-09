import type { Board, Move, MoveRecord } from './types';

export function applyMove(board: Board, move: Move): Board {
  const nextBoard = board.map((square) => ({
    ...square,
    piece: square.piece ? { ...square.piece } : null,
  }));

  const movingPiece = {
    ...move.piece,
    type: move.isPromotion ? move.promotionPiece ?? 'queen' : move.piece.type,
    hasMoved: true,
  };

  nextBoard[move.from].piece = null;
  nextBoard[move.to].piece = movingPiece;
  return nextBoard;
}

export function createMoveRecord(move: Move): MoveRecord {
  return {
    from: move.from,
    to: move.to,
    piece: move.piece.type,
    color: move.piece.color,
    captured: move.capturedPiece?.type,
    timestamp: Date.now(),
  };
}
