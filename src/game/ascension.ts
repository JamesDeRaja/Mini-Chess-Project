import { BOARD_FILES } from './constants.js';
import type { Board, PieceType } from './types.js';

export type AscensionTier = 0 | 1 | 2 | 3;

const ASCENSION_REMOVAL_ORDER: PieceType[] = ['knight', 'bishop', 'rook'];
const FULL_BACK_RANK_PIECES: PieceType[] = ['king', 'queen', 'rook', 'bishop', 'knight'];

export function getAscensionTierPieces(tier: AscensionTier): PieceType[] {
  const piecesToFeature = new Set(ASCENSION_REMOVAL_ORDER.slice(0, tier));
  return FULL_BACK_RANK_PIECES.filter((piece) => !piecesToFeature.has(piece));
}

export function removeAscensionPieces(board: Board, tier: AscensionTier): Board {
  const piecesToFeature = new Set(ASCENSION_REMOVAL_ORDER.slice(0, tier));
  if (piecesToFeature.size === 0) return board;

  return board.map((square, squareIndex) => {
    if (squareIndex >= BOARD_FILES) return square;
    if (square.piece?.color !== 'white' || !piecesToFeature.has(square.piece.type)) return square;
    return { ...square, piece: null };
  });
}
