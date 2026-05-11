import { BACK_RANK_PIECES, BOARD_FILES, BOARD_RANKS } from './constants.js';
import { pieceOrderFromBackRankCode } from './seed.js';
import { index } from './coordinates.js';
import type { Board, Color, Piece, PieceType } from './types.js';

function randomBackRankPieces(): PieceType[] {
  const pieces = Array.from({ length: BOARD_FILES }, () => BACK_RANK_PIECES[Math.floor(Math.random() * BACK_RANK_PIECES.length)]);
  if (!pieces.includes('king')) {
    pieces[Math.floor(Math.random() * pieces.length)] = 'king';
  }
  return pieces;
}

function makePiece(type: PieceType, color: Color, file: number, rank: number): Piece {
  return {
    id: `${color}-${type}-${file}-${rank}`,
    type,
    color,
    hasMoved: false,
  };
}

export function createEmptyBoard(): Board {
  return Array.from({ length: BOARD_FILES * BOARD_RANKS }, (_, squareIndex) => ({
    file: squareIndex % BOARD_FILES,
    rank: Math.floor(squareIndex / BOARD_FILES),
    piece: null,
  }));
}

type CreateInitialBoardOptions = {
  backRankCode?: string;
};

export function createInitialBoard(optionsOrWhiteOrder: CreateInitialBoardOptions | PieceType[] = randomBackRankPieces()): Board {
  const whiteOrder = Array.isArray(optionsOrWhiteOrder)
    ? optionsOrWhiteOrder
    : optionsOrWhiteOrder.backRankCode
      ? pieceOrderFromBackRankCode(optionsOrWhiteOrder.backRankCode)
      : randomBackRankPieces();
  const board = createEmptyBoard();
  const blackOrder = [...whiteOrder].reverse();

  for (let file = 0; file < BOARD_FILES; file += 1) {
    board[index(file, 0)].piece = makePiece(whiteOrder[file], 'white', file, 0);
    board[index(file, 1)].piece = makePiece('pawn', 'white', file, 1);
    board[index(file, 4)].piece = makePiece('pawn', 'black', file, 4);
    board[index(file, 5)].piece = makePiece(blackOrder[file], 'black', file, 5);
  }

  return board;
}
