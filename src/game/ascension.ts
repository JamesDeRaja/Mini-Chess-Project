import { BOARD_FILES } from './constants.js';
import type { Board, Color, PieceType } from './types.js';

export type AscensionTier = 0 | 1 | 2 | 3;

const ASCENSION_REMOVAL_ORDER: PieceType[] = ['knight', 'bishop', 'rook'];
export function removeAscensionPieces(board: Board, tier: AscensionTier, color: Color): Board {
  const piecesToFeature = new Set(ASCENSION_REMOVAL_ORDER.slice(0, tier));
  if (piecesToFeature.size === 0) return board;

  return board.map((square, squareIndex) => {
    if (squareIndex < BOARD_FILES && color !== 'white') return square;
    if (squareIndex >= BOARD_FILES && color === 'white') return square;
    if (square.piece?.color !== color || !piecesToFeature.has(square.piece.type)) return square;
    return { ...square, piece: null };
  });
}
