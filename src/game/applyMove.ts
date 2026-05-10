import type { Board, Move, MoveRecord } from './types.js';

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

type MoveRecordMetadata = {
  clientMoveId?: string;
  playerId?: string;
};

export function createMoveRecord(move: Move, metadata: MoveRecordMetadata = {}): MoveRecord {
  return {
    from: move.from,
    to: move.to,
    piece: move.piece.type,
    color: move.piece.color,
    captured: move.capturedPiece?.type,
    timestamp: Date.now(),
    clientMoveId: metadata.clientMoveId,
    playerId: metadata.playerId,
  };
}
