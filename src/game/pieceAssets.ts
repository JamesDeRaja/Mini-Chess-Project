import type { Color, Piece, PieceType } from './types.js';

const colorNameMap: Record<string, Color> = {
  w: 'white',
  white: 'white',
  b: 'black',
  black: 'black',
};

const pieceTypeNameMap: Record<string, PieceType> = {
  k: 'king',
  king: 'king',
  q: 'queen',
  queen: 'queen',
  r: 'rook',
  rook: 'rook',
  b: 'bishop',
  bishop: 'bishop',
  n: 'knight',
  knight: 'knight',
  p: 'pawn',
  pawn: 'pawn',
};

export const pieceFallbackSymbols: Record<Color, Record<PieceType, string>> = {
  white: {
    king: '♔',
    queen: '♕',
    rook: '♖',
    bishop: '♗',
    knight: '♘',
    pawn: '♙',
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

export function normalizePieceColor(color: string): Color {
  return colorNameMap[color.toLowerCase()] ?? 'white';
}

export function normalizePieceType(type: string): PieceType {
  return pieceTypeNameMap[type.toLowerCase()] ?? 'pawn';
}

export function getPieceImageSrc(piece: Pick<Piece, 'color' | 'type'> | { color: string; type: string }): string {
  const color = normalizePieceColor(piece.color);
  const type = normalizePieceType(piece.type);
  return `/pieces/${color}-${type}.png`;
}

export function getPieceFallbackSymbol(piece: Pick<Piece, 'color' | 'type'> | { color: string; type: string }): string {
  const color = normalizePieceColor(piece.color);
  const type = normalizePieceType(piece.type);
  return pieceFallbackSymbols[color][type];
}
