import type { Color, PieceType } from './types.js';

export const BOARD_FILES = 5;
export const BOARD_RANKS = 6;
export const BOARD_SIZE = BOARD_FILES * BOARD_RANKS;

export const BACK_RANK_PIECES: PieceType[] = ['king', 'queen', 'bishop', 'knight', 'rook'];
export const PROMOTION_PIECES = ['queen', 'rook', 'bishop', 'knight'] as const;

export const pieceValues: Record<PieceType, number> = {
  king: 1000,
  queen: 9,
  rook: 5,
  bishop: 3,
  knight: 3,
  pawn: 1,
};

export const pieceSymbols: Record<Color, Record<PieceType, string>> = {
  white: {
    king: '♚',
    queen: '♛',
    rook: '♜',
    bishop: '♝',
    knight: '♞',
    pawn: '♟',
  },
  black: {
    king: '♚',
    queen: '♛',
    rook: '♜',
    bishop: '♝',
    knight: '♞',
    pawn: '♟',
  },
};
