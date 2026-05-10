import { BOARD_FILES, BOARD_RANKS } from '../game/constants.js';
import type { Board, Piece, SquareCoord } from '../game/types.js';

export type HomepagePieceMovePreview = {
  moves: number[];
  captures: number[];
};

function isInsideBoard(file: number, rank: number): boolean {
  return file >= 0 && file < BOARD_FILES && rank >= 0 && rank < BOARD_RANKS;
}

function squareIndex(file: number, rank: number): number {
  return rank * BOARD_FILES + file;
}

function addDirectionalPreview(
  board: Board,
  piece: Piece,
  from: SquareCoord,
  directions: SquareCoord[],
  moves: Set<number>,
  captures: Set<number>,
  repeat: boolean,
) {
  for (const direction of directions) {
    let file = from.file + direction.file;
    let rank = from.rank + direction.rank;

    while (isInsideBoard(file, rank)) {
      const targetIndex = squareIndex(file, rank);
      const targetPiece = board[targetIndex].piece;

      if (!targetPiece) moves.add(targetIndex);
      else if (targetPiece.color !== piece.color) captures.add(targetIndex);

      if (!repeat) break;
      file += direction.file;
      rank += direction.rank;
    }
  }
}

export function getHomepagePieceMoves(board: Board, selectedIndex: number): HomepagePieceMovePreview {
  const square = board[selectedIndex];
  const piece = square?.piece;
  if (!piece) return { moves: [], captures: [] };

  const moves = new Set<number>();
  const captures = new Set<number>();
  const orthogonalDirections = [
    { file: 0, rank: 1 },
    { file: 1, rank: 0 },
    { file: 0, rank: -1 },
    { file: -1, rank: 0 },
  ];
  const diagonalDirections = [
    { file: 1, rank: 1 },
    { file: 1, rank: -1 },
    { file: -1, rank: -1 },
    { file: -1, rank: 1 },
  ];

  if (piece.type === 'pawn') {
    const forward = piece.color === 'white' ? 1 : -1;
    const forwardRank = square.rank + forward;
    if (isInsideBoard(square.file, forwardRank)) {
      const forwardIndex = squareIndex(square.file, forwardRank);
      if (!board[forwardIndex].piece) moves.add(forwardIndex);
    }

    for (const fileOffset of [-1, 1]) {
      const file = square.file + fileOffset;
      if (isInsideBoard(file, forwardRank)) captures.add(squareIndex(file, forwardRank));
    }
  }

  if (piece.type === 'king') {
    addDirectionalPreview(board, piece, square, [...orthogonalDirections, ...diagonalDirections], moves, captures, false);
  }

  if (piece.type === 'queen') {
    addDirectionalPreview(board, piece, square, [...orthogonalDirections, ...diagonalDirections], moves, captures, true);
  }

  if (piece.type === 'rook') {
    addDirectionalPreview(board, piece, square, orthogonalDirections, moves, captures, true);
  }

  if (piece.type === 'bishop') {
    addDirectionalPreview(board, piece, square, diagonalDirections, moves, captures, true);
  }

  if (piece.type === 'knight') {
    addDirectionalPreview(
      board,
      piece,
      square,
      [
        { file: 1, rank: 2 },
        { file: 2, rank: 1 },
        { file: 2, rank: -1 },
        { file: 1, rank: -2 },
        { file: -1, rank: -2 },
        { file: -2, rank: -1 },
        { file: -2, rank: 1 },
        { file: -1, rank: 2 },
      ],
      moves,
      captures,
      false,
    );
  }

  for (const capture of captures) moves.delete(capture);
  moves.delete(selectedIndex);
  captures.delete(selectedIndex);

  return { moves: [...moves], captures: [...captures] };
}
