import { BOARD_FILES, BOARD_RANKS } from './constants';
import { index, isInsideBoard } from './coordinates';
import type { Board, Color, Piece } from './types';

const rookDirections = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;
const bishopDirections = [[1, 1], [1, -1], [-1, 1], [-1, -1]] as const;
const queenDirections = [...rookDirections, ...bishopDirections] as const;
const knightOffsets = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]] as const;

function pieceAttacksSquare(board: Board, fromIndex: number, piece: Piece, targetIndex: number): boolean {
  const from = board[fromIndex];
  const target = board[targetIndex];
  const fileDelta = target.file - from.file;
  const rankDelta = target.rank - from.rank;

  if (piece.type === 'pawn') {
    const direction = piece.color === 'white' ? 1 : -1;
    return rankDelta === direction && Math.abs(fileDelta) === 1;
  }

  if (piece.type === 'knight') {
    return knightOffsets.some(([fileOffset, rankOffset]) => fileDelta === fileOffset && rankDelta === rankOffset);
  }

  if (piece.type === 'king') {
    return Math.max(Math.abs(fileDelta), Math.abs(rankDelta)) === 1;
  }

  const directions = piece.type === 'rook' ? rookDirections : piece.type === 'bishop' ? bishopDirections : queenDirections;
  for (const [fileStep, rankStep] of directions) {
    let file = from.file + fileStep;
    let rank = from.rank + rankStep;
    while (isInsideBoard(file, rank)) {
      const currentIndex = index(file, rank);
      if (currentIndex === targetIndex) return true;
      if (board[currentIndex].piece) break;
      file += fileStep;
      rank += rankStep;
    }
  }

  return false;
}

export function findKingIndex(board: Board, color: Color): number | null {
  const kingIndex = board.findIndex((square) => square.piece?.type === 'king' && square.piece.color === color);
  return kingIndex === -1 ? null : kingIndex;
}

export function isSquareAttacked(board: Board, squareIndex: number, byColor: Color): boolean {
  for (let currentIndex = 0; currentIndex < BOARD_FILES * BOARD_RANKS; currentIndex += 1) {
    const piece = board[currentIndex].piece;
    if (piece?.color === byColor && pieceAttacksSquare(board, currentIndex, piece, squareIndex)) {
      return true;
    }
  }
  return false;
}

export function isKingInCheck(board: Board, color: Color): boolean {
  const kingIndex = findKingIndex(board, color);
  if (kingIndex === null) return false;
  return isSquareAttacked(board, kingIndex, color === 'white' ? 'black' : 'white');
}
