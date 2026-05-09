import { BOARD_RANKS } from './constants';
import { index, isInsideBoard } from './coordinates';
import type { Board, Move, Piece, PromotionPieceType } from './types';

type Direction = [number, number];

const rookDirections: Direction[] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const bishopDirections: Direction[] = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const queenDirections: Direction[] = [...rookDirections, ...bishopDirections];
const knightOffsets: Direction[] = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];
const kingOffsets: Direction[] = queenDirections;

function makeMove(board: Board, from: number, to: number, piece: Piece, promotionPiece?: PromotionPieceType): Move | null {
  const capturedPiece = board[to].piece;
  if (capturedPiece?.color === piece.color || capturedPiece?.type === 'king') {
    return null;
  }
  const promotionRank = piece.color === 'white' ? BOARD_RANKS - 1 : 0;
  const isPromotion = piece.type === 'pawn' && board[to].rank === promotionRank;

  return {
    from,
    to,
    piece,
    capturedPiece,
    isCapture: Boolean(capturedPiece),
    isPromotion,
    promotionPiece: isPromotion ? promotionPiece ?? 'queen' : undefined,
  };
}

export function getSlidingMoves(board: Board, fromIndex: number, directions: Direction[]): Move[] {
  const fromSquare = board[fromIndex];
  const piece = fromSquare.piece;
  if (!piece) return [];

  const moves: Move[] = [];
  for (const [fileDelta, rankDelta] of directions) {
    let file = fromSquare.file + fileDelta;
    let rank = fromSquare.rank + rankDelta;

    while (isInsideBoard(file, rank)) {
      const to = index(file, rank);
      const target = board[to].piece;
      const move = makeMove(board, fromIndex, to, piece);
      if (move) moves.push(move);
      if (target) break;
      file += fileDelta;
      rank += rankDelta;
    }
  }
  return moves;
}

export function getKnightMoves(board: Board, fromIndex: number): Move[] {
  const fromSquare = board[fromIndex];
  const piece = fromSquare.piece;
  if (!piece) return [];

  return knightOffsets.flatMap(([fileDelta, rankDelta]) => {
    const file = fromSquare.file + fileDelta;
    const rank = fromSquare.rank + rankDelta;
    if (!isInsideBoard(file, rank)) return [];
    const move = makeMove(board, fromIndex, index(file, rank), piece);
    return move ? [move] : [];
  });
}

export function getKingMoves(board: Board, fromIndex: number): Move[] {
  const fromSquare = board[fromIndex];
  const piece = fromSquare.piece;
  if (!piece) return [];

  return kingOffsets.flatMap(([fileDelta, rankDelta]) => {
    const file = fromSquare.file + fileDelta;
    const rank = fromSquare.rank + rankDelta;
    if (!isInsideBoard(file, rank)) return [];
    const move = makeMove(board, fromIndex, index(file, rank), piece);
    return move ? [move] : [];
  });
}

export function getPawnMoves(board: Board, fromIndex: number): Move[] {
  const fromSquare = board[fromIndex];
  const piece = fromSquare.piece;
  if (!piece) return [];

  const moves: Move[] = [];
  const direction = piece.color === 'white' ? 1 : -1;
  const forwardRank = fromSquare.rank + direction;

  if (isInsideBoard(fromSquare.file, forwardRank)) {
    const forwardIndex = index(fromSquare.file, forwardRank);
    if (!board[forwardIndex].piece) {
      const move = makeMove(board, fromIndex, forwardIndex, piece);
      if (move) moves.push(move);
    }
  }

  for (const fileDelta of [-1, 1]) {
    const file = fromSquare.file + fileDelta;
    if (!isInsideBoard(file, forwardRank)) continue;
    const targetIndex = index(file, forwardRank);
    const target = board[targetIndex].piece;
    if (target && target.color !== piece.color && target.type !== 'king') {
      const move = makeMove(board, fromIndex, targetIndex, piece);
      if (move) moves.push(move);
    }
  }

  return moves;
}

export function getPseudoLegalMoves(board: Board, fromIndex: number): Move[] {
  const piece = board[fromIndex]?.piece;
  if (!piece) return [];

  switch (piece.type) {
    case 'king':
      return getKingMoves(board, fromIndex);
    case 'queen':
      return getSlidingMoves(board, fromIndex, queenDirections);
    case 'rook':
      return getSlidingMoves(board, fromIndex, rookDirections);
    case 'bishop':
      return getSlidingMoves(board, fromIndex, bishopDirections);
    case 'knight':
      return getKnightMoves(board, fromIndex);
    case 'pawn':
      return getPawnMoves(board, fromIndex);
  }
}
