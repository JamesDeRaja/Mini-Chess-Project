import { BOARD_FILES, BOARD_RANKS } from './constants.js';

export type BoardOrientation = 'white' | 'black';

export type SquareCenter = {
  x: number;
  y: number;
};

export function getSquareCenter(squareIndex: number, boardOrientation: BoardOrientation, boardSize = 100): SquareCenter {
  const file = squareIndex % BOARD_FILES;
  const rank = Math.floor(squareIndex / BOARD_FILES);
  const visualFile = boardOrientation === 'black' ? BOARD_FILES - 1 - file : file;
  const visualRank = boardOrientation === 'black' ? rank : BOARD_RANKS - 1 - rank;

  return {
    x: ((visualFile + 0.5) / BOARD_FILES) * boardSize,
    y: ((visualRank + 0.5) / BOARD_RANKS) * boardSize,
  };
}
