import { BACK_RANK_PIECES, BOARD_FILES, BOARD_RANKS } from './constants';
import { index } from './coordinates';
import { codeToBackRank, seedToBackRank } from './seedUtils';
import type { Board, Color, Piece, PieceType } from './types';

function shufflePieces(pieces: PieceType[]): PieceType[] {
  const shuffled = [...pieces];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
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

type BoardOptions = {
  /** Direct back-rank code like "KQRBN". Takes priority over seed. */
  backRankCode?: string;
  /** Any string seed → deterministic back-rank. */
  seed?: string;
};

export function createInitialBoard(options?: BoardOptions): Board {
  let whiteOrder: PieceType[];

  if (options?.backRankCode) {
    whiteOrder = codeToBackRank(options.backRankCode) ?? shufflePieces(BACK_RANK_PIECES);
  } else if (options?.seed) {
    whiteOrder = seedToBackRank(options.seed);
  } else {
    whiteOrder = shufflePieces(BACK_RANK_PIECES);
  }

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
