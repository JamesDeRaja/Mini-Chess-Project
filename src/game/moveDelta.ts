import { applyMove } from './applyMove.js';
import { BOARD_FILES } from './constants.js';
import { index } from './coordinates.js';
import { createInitialBoard } from './createInitialBoard.js';
import type { Board, Color, Move, MoveDelta, MoveRecord, Piece, PieceType, PromotionPieceType, SquareCoord } from './types.js';

export type MoveHistoryEntry = MoveDelta | MoveRecord;

function isPieceType(piece: unknown): piece is PieceType {
  return piece === 'king' || piece === 'queen' || piece === 'rook' || piece === 'bishop' || piece === 'knight' || piece === 'pawn';
}

function isPromotionPiece(piece: unknown): piece is PromotionPieceType {
  return piece === 'queen' || piece === 'rook' || piece === 'bishop' || piece === 'knight';
}

export function coordToIndex(coord: SquareCoord): number {
  return index(coord.file, coord.rank);
}

export function indexToCoord(squareIndex: number): SquareCoord {
  return { file: squareIndex % BOARD_FILES, rank: Math.floor(squareIndex / BOARD_FILES) };
}

export function isMoveDelta(move: MoveHistoryEntry): move is MoveDelta {
  return typeof (move as MoveDelta).moveNumber === 'number' && typeof (move as MoveDelta).createdAt === 'string' && typeof (move as MoveDelta).from === 'object';
}

function fallbackPiece(type: unknown, color: Color, hasMoved = true): Piece {
  return {
    id: `${color}-${String(type)}-replayed`,
    type: isPieceType(type) ? type : 'pawn',
    color,
    hasMoved,
  };
}

export function moveDeltaToMove(board: Board, delta: MoveDelta): Move {
  const from = coordToIndex(delta.from);
  const to = coordToIndex(delta.to);
  const boardPiece = board[from]?.piece;
  const piece = boardPiece ? { ...boardPiece } : fallbackPiece(delta.piece, delta.color);
  const targetPiece = board[to]?.piece;
  const capturedPiece = targetPiece
    ? { ...targetPiece }
    : delta.captured
      ? fallbackPiece(delta.captured, delta.color === 'white' ? 'black' : 'white')
      : null;
  const promotionPiece = isPromotionPiece(delta.promotion) ? delta.promotion : undefined;

  return {
    from,
    to,
    piece,
    capturedPiece,
    isCapture: Boolean(capturedPiece ?? delta.captured),
    isPromotion: Boolean(promotionPiece),
    promotionPiece,
  };
}

export function legacyMoveRecordToMove(board: Board, record: MoveRecord): Move {
  const boardPiece = board[record.from]?.piece;
  const piece = boardPiece ? { ...boardPiece } : fallbackPiece(record.piece, record.color);
  const targetPiece = board[record.to]?.piece;
  const capturedPiece = targetPiece
    ? { ...targetPiece }
    : record.captured
      ? fallbackPiece(record.captured, record.color === 'white' ? 'black' : 'white')
      : null;

  return {
    from: record.from,
    to: record.to,
    piece,
    capturedPiece,
    isCapture: Boolean(capturedPiece ?? record.captured),
  };
}

export function applyMoveDelta(board: Board, delta: MoveDelta): Board {
  return applyMove(board, moveDeltaToMove(board, delta));
}

export function applyHistoryEntry(board: Board, entry: MoveHistoryEntry): Board {
  return isMoveDelta(entry) ? applyMoveDelta(board, entry) : applyMove(board, legacyMoveRecordToMove(board, entry));
}

export function replayMoves(initialBoard: Board, moveHistory: MoveHistoryEntry[] | null | undefined): Board {
  return (moveHistory ?? []).reduce((currentBoard, entry) => applyHistoryEntry(currentBoard, entry), initialBoard);
}

type RebuildOptions = {
  backRankCode?: string | null;
  fallbackBoard?: Board | null;
};

export function rebuildBoardFromHistory(moveHistory: MoveHistoryEntry[] | null | undefined, options: RebuildOptions): Board {
  if (options.backRankCode) return replayMoves(createInitialBoard({ backRankCode: options.backRankCode }), moveHistory);
  return options.fallbackBoard ?? createInitialBoard();
}
